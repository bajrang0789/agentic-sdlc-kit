// SPDX-License-Identifier: Apache-2.0

import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateComposition, type SkillContractLike } from './composition.js';
import { directoryTreeDigest } from './digests.js';
import { parseBoundedYaml, parseSkillFrontmatter, type SkillFrontmatter } from './frontmatter.js';
import { loadMethodCatalog, type MethodCatalog } from './catalog.js';
import { SchemaRegistry } from './schemas.js';

export const SKILL_CONTRACT_SCHEMA =
  'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/skill-contract.schema.json';

export interface CanonicalSkill {
  readonly id: string;
  readonly directory: string;
  readonly frontmatter: SkillFrontmatter;
  readonly contract: SkillContractLike & {
    readonly version: string;
    readonly stage: string;
    readonly summary: string;
  };
  readonly digest: string;
  readonly body: string;
}

export interface CanonicalCatalog {
  readonly root: string;
  readonly method: MethodCatalog;
  readonly skills: readonly CanonicalSkill[];
}

export class CanonicalLoadError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CanonicalLoadError';
  }
}

export async function loadCanonicalCatalog(repositoryRoot: string): Promise<CanonicalCatalog> {
  const root = resolve(repositoryRoot);
  const skillsRoot = join(root, 'skills');
  const [registry, method, children] = await Promise.all([
    SchemaRegistry.load(),
    loadMethodCatalog(join(root, 'method')),
    readdir(skillsRoot, { withFileTypes: true }),
  ]);
  const directories = children
    .filter((child) => child.isDirectory() && /^groundtrail-[a-z][a-z0-9-]*$/u.test(child.name))
    .map((child) => child.name)
    .sort();
  if (directories.length === 0)
    throw new CanonicalLoadError('GT_SKILLS_EMPTY', 'No canonical skills found.');
  const skills = await Promise.all(
    directories.map(async (directory): Promise<CanonicalSkill> => {
      const path = join(skillsRoot, directory);
      const [skillText, contractText, digest] = await Promise.all([
        readFile(join(path, 'SKILL.md'), 'utf8'),
        readFile(join(path, 'contract.yaml'), 'utf8'),
        directoryTreeDigest(path),
      ]);
      const frontmatter = parseSkillFrontmatter(skillText);
      const contractValue = parseBoundedYaml(contractText);
      try {
        registry.validate(SKILL_CONTRACT_SCHEMA, contractValue);
      } catch (error) {
        throw new CanonicalLoadError('GT_SKILL_SCHEMA', `${directory}: ${message(error)}`);
      }
      if (!isSkillContract(contractValue))
        throw new CanonicalLoadError('GT_SKILL_CONTRACT', `${directory}: invalid contract shape.`);
      const expectedName = `groundtrail-${contractValue.id}`;
      if (directory !== expectedName || frontmatter.name !== expectedName)
        throw new CanonicalLoadError(
          'GT_SKILL_IDENTITY',
          `${directory}: directory, frontmatter name, and contract ID must agree.`,
        );
      if (frontmatter.metadata?.['groundtrail-id'] !== contractValue.id)
        throw new CanonicalLoadError(
          'GT_SKILL_METADATA',
          `${directory}: groundtrail-id metadata must match.`,
        );
      return {
        id: contractValue.id,
        directory,
        frontmatter,
        contract: contractValue,
        digest: digest.digest,
        body: skillBody(skillText),
      };
    }),
  );
  try {
    validateComposition(
      skills.map((skill) => skill.contract),
      method,
    );
  } catch (error) {
    throw new CanonicalLoadError('GT_SKILL_COMPOSITION', message(error));
  }
  return { root, method, skills: skills.sort((a, b) => a.id.localeCompare(b.id, 'en')) };
}

export async function isCanonicalSkillDirectory(path: string): Promise<boolean> {
  try {
    return (
      (await lstat(join(path, 'SKILL.md'))).isFile() &&
      (await lstat(join(path, 'contract.yaml'))).isFile()
    );
  } catch {
    return false;
  }
}

function isSkillContract(value: unknown): value is CanonicalSkill['contract'] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.id === 'string' &&
    typeof input.version === 'string' &&
    typeof input.stage === 'string' &&
    typeof input.summary === 'string' &&
    isCompositionContract(input)
  );
}

function isCompositionContract(
  value: Record<string, unknown>,
): value is Record<string, unknown> & SkillContractLike {
  const hasStringArray = (candidate: unknown): candidate is readonly string[] =>
    Array.isArray(candidate) && candidate.every((entry) => typeof entry === 'string');
  const io = (
    candidate: unknown,
  ): candidate is { artifacts: readonly string[]; states: readonly string[] } =>
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate) &&
    hasStringArray((candidate as Record<string, unknown>).artifacts) &&
    hasStringArray((candidate as Record<string, unknown>).states);
  const object = (candidate: unknown): candidate is Record<string, unknown> =>
    typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
  return (
    io(value.requires) &&
    io(value.produces) &&
    object(value.composition) &&
    hasStringArray(value.composition.after) &&
    hasStringArray(value.composition.before) &&
    object(value.actionBand) &&
    typeof value.actionBand.maximum === 'string' &&
    object(value.permissions) &&
    object(value.controlPoints) &&
    hasStringArray(value.controlPoints.enter) &&
    hasStringArray(value.controlPoints.exit) &&
    object(value.freshness) &&
    typeof value.freshness.bindToRevision === 'boolean'
  );
}

function skillBody(source: string): string {
  const closing = source.indexOf('\n---', 3);
  if (!source.startsWith('---\n') || closing === -1)
    throw new CanonicalLoadError('GT_SKILL_FRONTMATTER', 'SKILL.md frontmatter is invalid.');
  return source.slice(closing + 5).replace(/^\n/u, '');
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown validation error.';
}
