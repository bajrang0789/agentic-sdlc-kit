// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { directoryTreeDigest } from '../../src/core/digests.js';
import { loadCanonicalCatalog } from '../../src/core/canonical-loader.js';
import { parseSkillFrontmatter } from '../../src/core/frontmatter.js';

const root = resolve(import.meta.dirname, '../..');
const providers = ['claude', 'codex', 'copilot', 'devin'] as const;

function skillRoot(provider: (typeof providers)[number]): string {
  if (provider === 'claude') return resolve(root, 'adapters/claude/groundtrail/skills');
  if (provider === 'codex') return resolve(root, 'adapters/codex/.agents/skills');
  if (provider === 'copilot') return resolve(root, 'adapters/copilot/.github/skills');
  return resolve(root, 'adapters/devin/.agents/skills');
}

function manifestPath(provider: (typeof providers)[number]): string {
  return provider === 'claude'
    ? resolve(root, 'adapters/claude/groundtrail/carrier-manifest.json')
    : resolve(root, 'adapters', provider, 'carrier-manifest.json');
}

describe('primary carrier parity', () => {
  it('retains identity, digest, evidence semantics, controls, freshness, and ceilings', async () => {
    const catalog = await loadCanonicalCatalog(root);
    for (const provider of providers) {
      const directories = (await readdir(skillRoot(provider), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      expect(directories).toEqual(catalog.skills.map((skill) => skill.directory));
      for (const skill of catalog.skills) {
        const content = await readFile(
          resolve(skillRoot(provider), skill.directory, 'SKILL.md'),
          'utf8',
        );
        expect(parseSkillFrontmatter(content).name).toBe(skill.directory);
        expect(content).toContain(`Canonical skill ID: \`${skill.id}\``);
        expect(content).toContain(skill.digest);
        expect(content).toContain(`Maximum Action Band: \`${skill.contract.actionBand.maximum}\``);
        expect(content).toContain(
          `Revision binding: \`${String(skill.contract.freshness.bindToRevision)}\``,
        );
        expect(content).toContain('A Claim Record never satisfies a Control Point.');
        for (const control of [
          ...skill.contract.controlPoints.enter,
          ...skill.contract.controlPoints.exit,
        ])
          expect(content).toContain(`\`${control}\``);
      }
    }
  });

  it('records the complete canonical contract and actual skill tree in every manifest', async () => {
    const catalog = await loadCanonicalCatalog(root);
    const canonicalTree = await directoryTreeDigest(resolve(root, 'skills'));
    for (const provider of providers) {
      const manifest = JSON.parse(await readFile(manifestPath(provider), 'utf8')) as {
        canonicalTreeDigest: string;
        canonicalSkills: Array<Record<string, unknown>>;
      };
      expect(manifest.canonicalTreeDigest).toBe(canonicalTree.digest);
      expect(manifest.canonicalSkills).toHaveLength(catalog.skills.length);
      for (const skill of catalog.skills) {
        const entry = manifest.canonicalSkills.find((candidate) => candidate.id === skill.id);
        expect(entry).toMatchObject({
          id: skill.id,
          version: skill.contract.version,
          digest: skill.digest,
          actionBand: skill.contract.actionBand.maximum,
          controlPoints: skill.contract.controlPoints,
          requires: skill.contract.requires,
          produces: skill.contract.produces,
          freshness: skill.contract.freshness,
          permissions: skill.contract.permissions,
        });
        expect(Array.isArray(entry?.reductions)).toBe(true);
      }
    }
  });

  it('uses explicit Devin ceilings without broadening shell execution', async () => {
    const catalog = await loadCanonicalCatalog(root);
    const manifest = JSON.parse(await readFile(manifestPath('devin'), 'utf8')) as {
      canonicalSkills: Array<{ id: string; reductions: string[] }>;
    };
    for (const skill of catalog.skills) {
      const content = await readFile(
        resolve(skillRoot('devin'), skill.directory, 'SKILL.md'),
        'utf8',
      );
      expect(content).toMatch(/allowed-tools:\n(?: {2}- (?:read|grep|glob|edit)\n?)+/u);
      expect(content).not.toContain('  - exec');
      if (skill.contract.permissions.filesystem === 'write') expect(content).toContain('  - edit');
      const entry = manifest.canonicalSkills.find((candidate) => candidate.id === skill.id);
      if (skill.contract.permissions.shell === 'allowlisted')
        expect(entry?.reductions).toContain(
          'shell:allowlisted reduced to no shell execution because verified Devin Skill frontmatter has no command-scoped exec ceiling',
        );
    }
  });
});
