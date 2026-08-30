// SPDX-License-Identifier: Apache-2.0

import { lstat, readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { loadCanonicalCatalog, isCanonicalSkillDirectory } from '../core/canonical-loader.js';
import { parseNdjson, validateRecordChain } from '../core/ndjson.js';
import { parseBoundedJson } from '../core/json.js';
import { SchemaRegistry } from '../core/schemas.js';
import { readManifest } from '../install/manifest.js';
import { directoryTreeDigest } from '../core/digests.js';
import { canonicalSkillTree } from '../carriers/shared.js';
import { GroundtrailError } from '../core/errors.js';
import {
  validateControlPointSources,
  type ControlPoint,
  type SourceRecord,
} from '../core/evidence.js';
import { packageVersion } from '../index.js';

export type ValidationKind =
  | 'auto'
  | 'skill'
  | 'packet'
  | 'records'
  | 'handoff'
  | 'carrier'
  | 'installation'
  | 'reach-map'
  | 'control-point'
  | 'source-record';

export async function validatePath(
  root: string,
  path: string,
  kind: ValidationKind,
): Promise<{ kind: string; valid: true; files?: number }> {
  const absolute = resolve(path);
  const stat = await lstat(absolute);
  if (stat.isDirectory() && kind === 'auto') {
    const children = await readdir(absolute);
    if (isExampleDirectory(children)) return validateExampleDirectory(root, absolute);
    if (children.some((child) => child !== 'invalid')) return validateExampleTree(root, absolute);
  }
  const detected = kind === 'auto' ? await detectKind(absolute) : kind;
  if (detected === 'carrier' && (await lstat(absolute)).isDirectory())
    return validateCarrierDirectory(root, absolute);
  if (detected === 'skill') {
    const skillRoot =
      basename(absolute) === 'skills' ? resolve(absolute, '..') : resolve(absolute, '../..');
    await loadCanonicalCatalog(skillRoot);
    return { kind: detected, valid: true };
  }
  if (detected === 'records') {
    const records = parseNdjson(await readFile(absolute));
    const registry = await SchemaRegistry.load();
    const trailSchema =
      'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/trail-record.schema.json';
    for (const record of records) registry.validate(trailSchema, record);
    const catalog = await loadCanonicalCatalog(root);
    validateRecordChain(records, catalog.method);
    return { kind: detected, valid: true };
  }
  if (detected === 'installation') {
    const control =
      basename(absolute) === 'installation.json'
        ? resolve(absolute, '..')
        : join(absolute, '.groundtrail');
    await readManifest(control, packageVersion);
    return { kind: detected, valid: true };
  }
  const schema = schemaFor(detected);
  if (schema === undefined) throw new Error(`Cannot infer validation kind for ${path}.`);
  const registry = await SchemaRegistry.load();
  const artifact = parseBoundedJson(await readFile(absolute));
  registry.validate(schema, artifact);
  if (detected === 'control-point')
    await validateStandaloneControlPointEvidence(absolute, artifact as ControlPoint);
  return { kind: detected, valid: true };
}

async function validateExampleTree(
  root: string,
  directory: string,
): Promise<{ kind: string; valid: true; files: number }> {
  const directories = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name !== 'invalid')
    .map((entry) => join(directory, entry.name));
  if (directories.length === 0) throw new Error('Directory contains no example directories.');
  let files = 0;
  for (const child of directories)
    files += (await validateExampleDirectory(root, child)).files ?? 0;
  return { kind: 'examples', valid: true, files };
}

async function validateExampleDirectory(
  root: string,
  directory: string,
): Promise<{ kind: string; valid: true; files: number }> {
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.json') || name.endsWith('.ndjson'))
    .sort();
  if (files.length === 0)
    throw new Error('Example directory has no supported Groundtrail artifacts.');
  for (const name of files) await validatePath(root, join(directory, name), 'auto');
  await validateExampleEvidence(directory);
  return { kind: 'example', valid: true, files: files.length };
}

async function detectKind(path: string): Promise<ValidationKind> {
  const stat = await lstat(path);
  if (stat.isDirectory()) {
    if (await isCanonicalSkillDirectory(path)) return 'skill';
    const children = await readdir(path);
    if (children.includes('carrier-manifest.json')) return 'carrier';
    if (children.includes('installation.json')) return 'installation';
    if (basename(path) === 'skills') return 'skill';
    throw new Error('Directory is not a recognized Groundtrail artifact.');
  }
  const name = basename(path);
  if (name === 'installation.json') return 'installation';
  if (path.endsWith('.ndjson')) return 'records';
  if (name.includes('ground-packet') || name.includes('packet')) return 'packet';
  if (name.includes('handoff')) return 'handoff';
  if (name === 'reach-map.json') return 'reach-map';
  if (name === 'control-points.json' || name.startsWith('control-point-')) return 'control-point';
  if (name === 'source-record.json' || name.startsWith('source-record-')) return 'source-record';
  if (name.includes('carrier-manifest')) return 'carrier';
  throw new Error('Cannot infer artifact kind; specify --kind.');
}

async function validateExampleEvidence(directory: string): Promise<void> {
  const controlPath = join(directory, 'control-points.json');
  const controls = await readJson(controlPath).catch(() => undefined);
  if (controls === undefined) return;
  const sources = await loadSourceRecords(join(directory, 'source-records'));
  const values = Array.isArray(controls) ? controls : [controls];
  for (const control of values) validateControlPointSources(control as ControlPoint, sources);
}

async function validateStandaloneControlPointEvidence(
  controlPath: string,
  control: ControlPoint,
): Promise<void> {
  const sources = await loadSourceRecords(join(resolve(controlPath, '..'), 'source-records'));
  validateControlPointSources(control, sources);
}

async function loadSourceRecords(directory: string): Promise<readonly SourceRecord[]> {
  const files = await readdir(directory).catch((error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'ENOENT'
    )
      return [];
    throw error;
  });
  const registry = await SchemaRegistry.load();
  const sourceSchema =
    'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/source-record.schema.json';
  return Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map(async (file) => {
        const source = await readJson(join(directory, file));
        registry.validate(sourceSchema, source);
        return source as SourceRecord;
      }),
  );
}

async function validateCarrierDirectory(
  root: string,
  directory: string,
): Promise<{ kind: string; valid: true; files: number }> {
  const manifests = await carrierManifestDirectories(directory);
  if (manifests.length === 0)
    throw new GroundtrailError(
      'GT_CARRIER_MANIFEST_MISSING',
      'Carrier directory has no carrier manifest.',
      1,
    );
  let files = 0;
  for (const manifestDirectory of manifests)
    files += await validateSingleCarrierDirectory(root, manifestDirectory);
  return { kind: 'carrier', valid: true, files };
}

interface CarrierManifest {
  readonly canonicalSkills: readonly {
    readonly id: string;
    readonly version: string;
    readonly digest: string;
    readonly actionBand: string;
    readonly controlPoints: unknown;
    readonly requires: unknown;
    readonly produces: unknown;
    readonly freshness: unknown;
    readonly permissions: unknown;
    readonly reductions: unknown;
  }[];
  readonly canonicalTreeDigest: string;
  readonly payloadTreeDigest: string;
  readonly files: readonly { readonly path: string; readonly digest: string }[];
}

async function validateSingleCarrierDirectory(root: string, directory: string): Promise<number> {
  const manifest = (await readJson(join(directory, 'carrier-manifest.json'))) as CarrierManifest;
  const registry = await SchemaRegistry.load();
  registry.validate(schemaFor('carrier') as string, manifest);
  const catalog = await loadCanonicalCatalog(root);
  const selected = manifest.canonicalSkills.map((declared) => {
    const skill = catalog.skills.find((candidate) => candidate.id === declared.id);
    if (skill === undefined)
      throw carrierSemanticError('Unknown canonical skill in Carrier manifest.');
    if (
      declared.version !== skill.contract.version ||
      declared.digest !== skill.digest ||
      declared.actionBand !== skill.contract.actionBand.maximum ||
      !sameJson(declared.controlPoints, skill.contract.controlPoints) ||
      !sameJson(declared.requires, skill.contract.requires) ||
      !sameJson(declared.produces, skill.contract.produces) ||
      !sameJson(declared.freshness, skill.contract.freshness) ||
      !sameJson(declared.permissions, skill.contract.permissions)
    )
      throw carrierSemanticError(`Carrier manifest contract differs for ${declared.id}.`);
    if (
      !Array.isArray(declared.reductions) ||
      declared.reductions.some((item) => typeof item !== 'string')
    )
      throw carrierSemanticError(`Carrier manifest reductions are invalid for ${declared.id}.`);
    return skill;
  });
  if ((await canonicalSkillTree(catalog, selected)).digest !== manifest.canonicalTreeDigest)
    throw new GroundtrailError(
      'GT_CARRIER_CANONICAL_TREE_DIGEST',
      'Carrier canonical tree digest does not match current contracts.',
      1,
    );
  const tree = await directoryTreeDigest(directory, new Set(['carrier-manifest.json']));
  if (tree.digest !== manifest.payloadTreeDigest)
    throw new GroundtrailError(
      'GT_CARRIER_TREE_DIGEST',
      'Carrier payload tree digest does not match bytes.',
      1,
    );
  const declared = new Map(manifest.files.map((file) => [file.path, file.digest]));
  for (const file of tree.files)
    if (declared.get(file.path) !== file.digest)
      throw new GroundtrailError(
        'GT_CARRIER_FILE_DIGEST',
        `Carrier file digest does not match ${file.path}.`,
        1,
      );
  if (declared.size !== tree.files.length)
    throw new GroundtrailError(
      'GT_CARRIER_FILE_SET',
      'Carrier manifest file set differs from payload.',
      1,
    );
  return tree.files.length;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function carrierSemanticError(message: string): GroundtrailError {
  return new GroundtrailError('GT_CARRIER_SEMANTIC', message, 1);
}

async function carrierManifestDirectories(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const result: string[] = [];
  if (entries.some((entry) => entry.isFile() && entry.name === 'carrier-manifest.json'))
    result.push(directory);
  for (const entry of entries)
    if (entry.isDirectory())
      result.push(...(await carrierManifestDirectories(join(directory, entry.name))));
  return result.sort();
}

async function readJson(path: string): Promise<unknown> {
  return parseBoundedJson(await readFile(path));
}

function isExampleDirectory(children: readonly string[]): boolean {
  return children.some(
    (name) =>
      name.endsWith('.ndjson') ||
      [
        'ground-packet.json',
        'reach-map.json',
        'control-points.json',
        'handoff-bundle.json',
      ].includes(name),
  );
}

function schemaFor(kind: ValidationKind): string | undefined {
  const base = 'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/';
  const names: Partial<Record<ValidationKind, string>> = {
    packet: 'ground-packet.schema.json',
    handoff: 'handoff-bundle.schema.json',
    carrier: 'carrier-manifest.schema.json',
    'reach-map': 'reach-map.schema.json',
    'control-point': 'control-point.schema.json',
    'source-record': 'source-record.schema.json',
  };
  const name = names[kind];
  return name === undefined ? undefined : `${base}${name}`;
}
