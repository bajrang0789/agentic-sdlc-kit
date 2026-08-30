// SPDX-License-Identifier: Apache-2.0

import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { treeDigest } from '../core/digests.js';
import type { CanonicalCatalog, CanonicalSkill } from '../core/canonical-loader.js';
import type { RenderedFile } from './types.js';
import { packageVersion } from '../index.js';

export type SkillReduction = readonly string[];

export function selectSkills(catalog: CanonicalCatalog, ids: readonly string[]): CanonicalSkill[] {
  const selected = new Set(ids);
  return catalog.skills.filter((skill) => selected.has(skill.id));
}

export function normalizedText(value: string): Uint8Array {
  return Buffer.from(value.replace(/\r\n?/gu, '\n'), 'utf8');
}

export function canonicalSkillBody(skill: CanonicalSkill, reductions: SkillReduction = []): string {
  const capabilityLine =
    reductions.length === 0
      ? ''
      : `- Carrier capability reductions: ${reductions.map((reduction) => `\`${reduction}\``).join(', ')}.\n`;
  return [
    `<!-- Groundtrail carrier: id=${skill.id}; version=${skill.contract.version}; canonical-digest=${skill.digest}; action-band=${skill.contract.actionBand.maximum}; freshness.bindToRevision=${String(skill.contract.freshness.bindToRevision)} -->`,
    '',
    '## Carrier contract',
    '',
    `- Canonical skill ID: \`${skill.id}\`; canonical SHA-256: \`${skill.digest}\`.`,
    `- Maximum Action Band: \`${skill.contract.actionBand.maximum}\`. Required Control Points: ${controlPoints(skill)}.`,
    `- Required artifacts: ${artifacts(skill.contract.requires.artifacts)}. Produced artifacts: ${artifacts(skill.contract.produces.artifacts)}.`,
    `- Revision binding: \`${String(skill.contract.freshness.bindToRevision)}\`. A Carrier may reduce capabilities but must not expand this contract.`,
    capabilityLine,
  ].join('\n');
}

export function skillMarkdown(
  skill: CanonicalSkill,
  frontmatter: readonly [string, string][],
  reductions: SkillReduction = [],
): Uint8Array {
  const yaml = frontmatter
    .map(([key, value]) => (value.startsWith('\n') ? `${key}:${value}` : `${key}: ${value}`))
    .join('\n');
  return normalizedText(
    `---\n${yaml}\n---\n\n${canonicalSkillBody(skill, reductions)}${skill.body}`,
  );
}

export async function carrierManifest(
  provider: string,
  catalog: CanonicalCatalog,
  selected: readonly CanonicalSkill[],
  payload: readonly RenderedFile[],
  capabilityReductions: readonly string[],
  reductionsForSkill: (skill: CanonicalSkill) => SkillReduction = () => [],
): Promise<RenderedFile> {
  const tree = treeDigest(payload.map((file) => ({ path: file.path, content: file.content })));
  const canonicalTree = await canonicalSkillTree(catalog, selected);
  const content = `${JSON.stringify(
    {
      apiVersion: 'agentic-sdlc-kit/v1',
      provider,
      version: packageVersion,
      canonicalSkills: selected.map((skill) => ({
        id: skill.id,
        version: skill.contract.version,
        digest: skill.digest,
        actionBand: skill.contract.actionBand.maximum,
        controlPoints: skill.contract.controlPoints,
        requires: skill.contract.requires,
        produces: skill.contract.produces,
        freshness: skill.contract.freshness,
        permissions: skill.contract.permissions,
        reductions: reductionsForSkill(skill),
      })),
      canonicalTreeDigest: canonicalTree.digest,
      payloadTreeDigest: tree.digest,
      files: tree.files,
      capabilityReductions: [...capabilityReductions].sort(),
    },
    null,
    2,
  )}\n`;
  return { path: 'carrier-manifest.json', content: normalizedText(content) };
}

export function artifacts(values: readonly string[]): string {
  return values.length === 0 ? 'none' : values.map((value) => `\`${value}\``).join(', ');
}

export async function canonicalSkillTree(
  catalog: CanonicalCatalog,
  selected: readonly CanonicalSkill[],
): Promise<ReturnType<typeof treeDigest>> {
  const canonicalRoot = join(catalog.root, 'skills');
  const entries: { path: string; content: Uint8Array }[] = [];
  for (const skill of selected)
    await collectFiles(canonicalRoot, join(canonicalRoot, skill.directory), entries);
  return treeDigest(entries);
}

async function collectFiles(
  root: string,
  directory: string,
  entries: { path: string; content: Uint8Array }[],
): Promise<void> {
  for (const child of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, child.name);
    const stat = await lstat(full);
    if (stat.isDirectory()) {
      await collectFiles(root, full, entries);
      continue;
    }
    if (!stat.isFile() || stat.nlink !== 1)
      throw new Error(
        `GT_CARRIER_CANONICAL_TREE: canonical skill tree contains a non-regular entry.`,
      );
    entries.push({
      path: relative(root, full).replaceAll('\\', '/'),
      content: await readFile(full),
    });
  }
}

function controlPoints(skill: CanonicalSkill): string {
  const controls = [...skill.contract.controlPoints.enter, ...skill.contract.controlPoints.exit];
  return controls.length === 0 ? 'none' : controls.map((value) => `\`${value}\``).join(', ');
}
