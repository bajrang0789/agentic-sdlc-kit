// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';

const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;
const providerRoots = {
  claude: 'adapters/claude/groundtrail',
  codex: 'adapters/codex',
  copilot: 'adapters/copilot',
  devin: 'adapters/devin',
} as const;
const textExtensions = new Set(['.json', '.md', '.txt', '.yaml', '.yml']);
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const digestPattern = /^[a-f0-9]{64}$/;
const allowedDocumentationHosts = new Set([
  'agentskills.io',
  'api.github.com',
  'code.claude.com',
  'datatracker.ietf.org',
  'developers.openai.com',
  'docs.devin.ai',
  'docs.github.com',
  'docs.npmjs.com',
  'eslint.org',
  'git-scm.com',
  'json-schema.org',
  'nodejs.org',
  'prettier.io',
  'typescript-eslint.io',
  'typescriptlang.org',
  'vitest.dev',
  'www.apache.org',
  'www.rfc-editor.org',
  'www.typescriptlang.org',
]);
const externalAssetExtensions = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);
const externalBrandName = /(anthropic|claude|copilot|devin|github|openai|codex)/i;
const copiedProseMarkers = [
  /permission is hereby granted, free of charge, to any person obtaining a copy/i,
  /the software is provided ["']as is["'], without warranty of any kind/i,
  /licensed under the apache license, version 2\.0 \(the ["']license["']\);/i,
  /redistribution and use in source and binary forms, with or without modification/i,
  /neither the name of .+ nor the names of its contributors/i,
];

type Provider = keyof typeof providerRoots;

type IndexEntry = {
  readonly mode: string;
  readonly path: string;
  readonly stage: string;
};

type ManifestFile = {
  readonly digest: string;
  readonly path: string;
};

type CarrierManifest = {
  readonly canonicalTreeDigest?: unknown;
  readonly files?: unknown;
  readonly payloadTreeDigest?: unknown;
  readonly provider?: unknown;
};

function reportFailures(messages: readonly string[]): void {
  process.stderr.write('Content provenance check failed:\n');
  for (const message of messages) process.stderr.write(`- ${message}\n`);
  process.exitCode = 1;
}

function runGit(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runGitBytes(root: string, args: readonly string[]): Buffer {
  return execFileSync('git', ['-C', root, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function indexEntries(root: string): readonly IndexEntry[] {
  return runGit(root, ['ls-files', '--stage', '-z'])
    .split('\0')
    .filter(Boolean)
    .flatMap((entry): readonly IndexEntry[] => {
      const match = /^(\d+) [0-9a-f]{40} (\d+)\t(.+)$/u.exec(entry);
      return match === null ? [] : [{ mode: match[1]!, stage: match[2]!, path: match[3]! }];
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function readStagedFile(root: string, path: string): Buffer {
  return runGitBytes(root, ['show', `:${path}`]);
}

function sha256(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeContent(path: string, content: Uint8Array): Buffer {
  if (!textExtensions.has(extname(path).toLowerCase())) return Buffer.from(content);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    throw new Error(`${path} is not valid UTF-8 text`);
  }
  return Buffer.from(text.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n'), 'utf8');
}

function treeDigest(
  entries: readonly ManifestFile[],
  contentFor: (path: string) => Buffer,
): string {
  const leaves = [...entries]
    .sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)))
    .map(({ path }) => {
      const content = normalizeContent(path, contentFor(path));
      return Buffer.concat([
        u64(Buffer.byteLength(path)),
        Buffer.from(path),
        u64(content.length),
        content,
      ]);
    });
  return sha256(Buffer.concat([Buffer.from('groundtrail:directory-tree:v1\0', 'utf8'), ...leaves]));
}

function u64(value: number): Buffer {
  const result = Buffer.alloc(8);
  result.writeBigUInt64BE(BigInt(value));
  return result;
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    path === path.normalize('NFC') &&
    path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
  );
}

function isAllowedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;
  if (url.hostname === 'github.com')
    return url.pathname.startsWith('/bajrang0789/agentic-sdlc-kit');
  if (url.hostname === 'registry.npmjs.org') {
    return url.pathname.includes('/-/') && url.pathname.endsWith('.tgz');
  }
  if (url.hostname === 'raw.githubusercontent.com') {
    return (
      /^\/bajrang0789\/agentic-sdlc-kit\/main\/schemas\/v1\/(?:[a-z0-9-]+\.schema\.json)?$/u.test(
        url.pathname,
      ) || url.pathname === '/googleapis/release-please/main/schemas/config.json'
    );
  }
  return allowedDocumentationHosts.has(url.hostname);
}

function isNpmRegistryTarball(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'registry.npmjs.org' &&
      url.pathname.includes('/-/') &&
      url.pathname.endsWith('.tgz')
    );
  } catch {
    return false;
  }
}

function checkDependencyMetadata(content: Buffer, errors: string[]): void {
  const packageJson = parseJson(content, 'package.json', errors);
  if (!isRecord(packageJson)) return;

  for (const section of dependencySections) {
    const dependencies = packageJson[section];
    if (dependencies === undefined) continue;
    if (!isRecord(dependencies)) {
      errors.push(`package.json ${section} must be an object`);
      continue;
    }

    for (const [name, specification] of Object.entries(dependencies)) {
      if (typeof specification !== 'string' || !exactVersion.test(specification)) {
        errors.push(
          `package.json ${section}.${name} must use an exact npm registry version, not ${String(specification)}`,
        );
      }
    }
  }
}

function checkTextContent(path: string, content: string, errors: string[]): void {
  if (path !== 'LICENSE' && path !== 'scripts/check-content-provenance.ts') {
    for (const marker of copiedProseMarkers) {
      if (marker.test(content))
        errors.push(`${path} contains a copied third-party license or prose marker`);
    }
  }

  for (const rawUrl of content.matchAll(/https?:\/\/[^\s<>"')\]}]+/g)) {
    const url = rawUrl[0].replace(/[.,;:]+$/, '');
    if (!isAllowedUrl(url)) {
      errors.push(
        `${path} contains a URL outside official documentation or npm registry tarball allowlists: ${url}`,
      );
    }
  }
}

function checkLockfile(content: Buffer, errors: string[]): void {
  const lockfile = parseJson(content, 'package-lock.json', errors);
  if (lockfile === undefined) return;

  function inspect(value: unknown, path: string): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, `${path}[${index}]`));
      return;
    }
    if (!isRecord(value)) return;

    for (const [key, entry] of Object.entries(value)) {
      const entryPath = `${path}.${key}`;
      if (key === 'resolved' && typeof entry === 'string' && !isNpmRegistryTarball(entry)) {
        errors.push(`${entryPath} must be an npm registry tarball URL`);
      }
      if (
        key === 'version' &&
        typeof entry === 'string' &&
        /^(?:file:|git\+|https?:|github:)/u.test(entry)
      ) {
        errors.push(`${entryPath} must not use a VCS, file, or HTTP dependency specification`);
      }
      if (key === 'link' && entry === true)
        errors.push(`${entryPath} must not reference a local linked dependency`);
      inspect(entry, entryPath);
    }
  }

  inspect(lockfile, 'package-lock');
}

function checkCarriers(root: string, paths: readonly string[], errors: string[]): void {
  const actualPaths = new Set(paths);
  const manifestRoots = new Map<string, Provider>();
  for (const [provider, providerRoot] of Object.entries(providerRoots) as [Provider, string][]) {
    const manifestPath = `${providerRoot}/carrier-manifest.json`;
    const hasPayload = paths.some((path) => path.startsWith(`${providerRoot}/`));
    if (hasPayload && !actualPaths.has(manifestPath)) {
      errors.push(`${providerRoot} has generated payloads but no owning carrier-manifest.json`);
    }
    if (actualPaths.has(manifestPath)) manifestRoots.set(providerRoot, provider);
  }

  for (const path of paths) {
    if (!path.startsWith('adapters/')) continue;
    if (
      ![...manifestRoots.keys()].some(
        (rootPath) => path === rootPath || path.startsWith(`${rootPath}/`),
      )
    ) {
      errors.push(`${path} is outside a known generated Carrier root`);
    }
  }

  for (const [providerRoot, provider] of manifestRoots) {
    const manifestPath = `${providerRoot}/carrier-manifest.json`;
    const manifest = parseJson(readStagedFile(root, manifestPath), manifestPath, errors);
    if (!isRecord(manifest)) continue;
    const carrierManifest = manifest as CarrierManifest;
    if (carrierManifest.provider !== provider) {
      errors.push(`${manifestPath} provider must be ${provider}`);
    }
    if (
      typeof carrierManifest.canonicalTreeDigest !== 'string' ||
      !digestPattern.test(carrierManifest.canonicalTreeDigest)
    ) {
      errors.push(`${manifestPath} must contain a canonicalTreeDigest`);
    }
    if (
      typeof carrierManifest.payloadTreeDigest !== 'string' ||
      !digestPattern.test(carrierManifest.payloadTreeDigest)
    ) {
      errors.push(`${manifestPath} must contain a payloadTreeDigest`);
    }

    const files = manifestFiles(carrierManifest.files, manifestPath, errors);
    const expected = new Set(files.map((file) => file.path));
    const payloadPaths = paths
      .filter((path) => path.startsWith(`${providerRoot}/`) && path !== manifestPath)
      .map((path) => path.slice(providerRoot.length + 1));

    for (const path of payloadPaths) {
      if (!expected.has(path))
        errors.push(`${providerRoot}/${path} is not listed by ${manifestPath}`);
    }
    for (const file of files) {
      if (!payloadPaths.includes(file.path)) {
        errors.push(`${manifestPath} lists a missing payload file: ${file.path}`);
        continue;
      }
      const content = readStagedFile(root, `${providerRoot}/${file.path}`);
      if (sha256(normalizeContent(file.path, content)) !== file.digest) {
        errors.push(`${providerRoot}/${file.path} does not match its manifest digest`);
      }
    }
    if (typeof carrierManifest.payloadTreeDigest === 'string' && files.length > 0) {
      const actualDigest = treeDigest(files, (path) =>
        readStagedFile(root, `${providerRoot}/${path}`),
      );
      if (actualDigest !== carrierManifest.payloadTreeDigest) {
        errors.push(`${manifestPath} payloadTreeDigest does not match listed payloads`);
      }
    }
  }

  checkClaudeMarketplace(root, paths, actualPaths, manifestRoots, errors);
}

function manifestFiles(
  value: unknown,
  manifestPath: string,
  errors: string[],
): readonly ManifestFile[] {
  if (!Array.isArray(value)) {
    errors.push(`${manifestPath} files must be an array`);
    return [];
  }

  const seen = new Set<string>();
  const files: ManifestFile[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.digest !== 'string') {
      errors.push(`${manifestPath} files entries must contain path and digest strings`);
      continue;
    }
    if (
      !isSafeRelativePath(entry.path) ||
      !digestPattern.test(entry.digest) ||
      seen.has(entry.path)
    ) {
      errors.push(`${manifestPath} has an invalid or duplicate payload entry: ${entry.path}`);
      continue;
    }
    seen.add(entry.path);
    files.push({ path: entry.path, digest: entry.digest });
  }
  return files;
}

function checkClaudeMarketplace(
  root: string,
  paths: readonly string[],
  actualPaths: ReadonlySet<string>,
  manifests: ReadonlyMap<string, Provider>,
  errors: string[],
): void {
  const marketplacePath = '.claude-plugin/marketplace.json';
  const marketplacePaths = paths.filter((path) => path.startsWith('.claude-plugin/'));
  if (marketplacePaths.length === 0) return;
  if (!actualPaths.has(marketplacePath)) {
    errors.push('.claude-plugin payloads require .claude-plugin/marketplace.json');
    return;
  }
  if (marketplacePaths.some((path) => path !== marketplacePath)) {
    errors.push('.claude-plugin contains an unexpected generated file');
  }
  if (!manifests.has(providerRoots.claude)) {
    errors.push('.claude-plugin marketplace requires the Claude carrier manifest');
    return;
  }

  const marketplace = parseJson(readStagedFile(root, marketplacePath), marketplacePath, errors);
  if (!isRecord(marketplace) || !Array.isArray(marketplace.plugins)) {
    errors.push(`${marketplacePath} must contain a plugins array`);
    return;
  }
  const linked = marketplace.plugins.filter(
    (plugin) =>
      isRecord(plugin) &&
      plugin.name === 'groundtrail' &&
      plugin.source === './adapters/claude/groundtrail' &&
      plugin.strict === true,
  );
  if (linked.length !== 1 || marketplace.plugins.length !== 1) {
    errors.push(
      `${marketplacePath} must contain exactly one strict Groundtrail Claude Carrier linkage`,
    );
  }
}

function parseJson(content: Buffer, path: string, errors: string[]): unknown {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    errors.push(`${path} cannot be parsed as UTF-8 JSON: ${detail}`);
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const entries = indexEntries(root);
const paths = entries.map((entry) => entry.path);
const errors: string[] = [];

for (const entry of entries) {
  if (entry.stage !== '0') errors.push(`${entry.path} has unresolved index stages`);
  if (entry.mode === '160000') errors.push(`${entry.path} is a gitlink`);
  if (entry.mode !== '100644' && entry.mode !== '100755' && entry.mode !== '160000') {
    errors.push(`${entry.path} is not a regular tracked file`);
  }
}
if (paths.includes('.gitmodules')) errors.push('.gitmodules is tracked');

if (paths.includes('package.json'))
  checkDependencyMetadata(readStagedFile(root, 'package.json'), errors);
if (paths.includes('package-lock.json'))
  checkLockfile(readStagedFile(root, 'package-lock.json'), errors);

for (const path of paths) {
  const extension = extname(path).toLowerCase();
  if (
    externalAssetExtensions.has(extension) &&
    (externalBrandName.test(path) || /(?:brand|icon|logo)/iu.test(path))
  ) {
    errors.push(`${path} appears to be an external brand asset`);
  }

  const bytes = readStagedFile(root, path);
  if (bytes.includes(0) || path === 'LICENSE' || path === 'package-lock.json') continue;
  try {
    checkTextContent(path, new TextDecoder('utf-8', { fatal: true }).decode(bytes), errors);
  } catch {
    errors.push(`${path} is not valid UTF-8 text`);
  }
}

checkCarriers(root, paths, errors);

if (errors.length > 0) reportFailures(errors);
else console.log(`Content provenance check passed for ${paths.length} staged tracked files.`);
