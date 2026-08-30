// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import canonicalize from 'canonicalize';

export const TRAIL_RECORD_ORIGIN =
  'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566';
const TREE_DOMAIN = Buffer.from('groundtrail:directory-tree:v1\0', 'utf8');
const TEXT_EXTENSIONS = new Set(['.json', '.yaml', '.yml', '.md', '.txt']);

export class DigestError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DigestError';
  }
}

export function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function canonicalizeJcs(value: unknown): string {
  if (containsLoneSurrogate(value))
    throw new DigestError(
      'GT_JCS_SURROGATE',
      'JCS values must not contain lone UTF-16 surrogates.',
    );
  const canonical = canonicalize(value);
  if (canonical === undefined)
    throw new DigestError('GT_JCS_INVALID', 'Value is not valid I-JSON for JCS.');
  return canonical;
}

export function trailRecordDigest(record: Readonly<Record<string, unknown>>): string {
  const withoutDigest = { ...record };
  delete withoutDigest.digest;
  return sha256(canonicalizeJcs(withoutDigest));
}

export function normalizeTextBytes(content: Uint8Array): Buffer {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    throw new DigestError('GT_TREE_UTF8', 'Declared text file is not valid UTF-8.');
  }
  return Buffer.from(text.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n'), 'utf8');
}

export function normalizeTreePath(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    normalized !== normalized.normalize('NFC')
  ) {
    throw new DigestError(
      'GT_TREE_PATH',
      'Tree path must be non-empty, relative, slash-separated, and NFC.',
    );
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new DigestError('GT_TREE_PATH', 'Tree path contains an invalid segment.');
  }
  return normalized;
}

export function treeDigest(entries: readonly { path: string; content: Uint8Array }[]): {
  digest: string;
  files: readonly { path: string; digest: string }[];
} {
  const normalized = entries.map((entry) => {
    const path = normalizeTreePath(entry.path);
    const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
    const content = TEXT_EXTENSIONS.has(extension)
      ? normalizeTextBytes(entry.content)
      : Buffer.from(entry.content);
    return { path, content };
  });
  normalized.sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
  if (normalized.some((entry, index) => index > 0 && entry.path === normalized[index - 1]?.path)) {
    throw new DigestError('GT_TREE_DUPLICATE_PATH', 'Tree has duplicate paths.');
  }
  const leaves = normalized.map(({ path, content }) =>
    Buffer.concat([u64(Buffer.byteLength(path)), Buffer.from(path), u64(content.length), content]),
  );
  return {
    digest: sha256(Buffer.concat([TREE_DOMAIN, ...leaves])),
    files: normalized.map(({ path, content }) => ({ path, digest: sha256(content) })),
  };
}

export async function directoryTreeDigest(
  root: string,
  exclude = new Set<string>(),
): Promise<{ digest: string; files: readonly { path: string; digest: string }[] }> {
  const rootPath = resolve(root);
  const entries: { path: string; content: Uint8Array }[] = [];
  async function walk(directory: string): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true });
    for (const child of children) {
      const fullPath = resolve(directory, child.name);
      const rel = normalizeTreePath(relative(rootPath, fullPath).split(sep).join('/'));
      if (exclude.has(rel)) continue;
      const stat = await lstat(fullPath);
      if (stat.isDirectory()) await walk(fullPath);
      else if (stat.isFile() && stat.nlink === 1)
        entries.push({ path: rel, content: await readFile(fullPath) });
      else
        throw new DigestError(
          'GT_TREE_SPECIAL_FILE',
          `Tree contains a non-regular or linked entry: ${rel}.`,
        );
    }
  }
  await walk(rootPath);
  return treeDigest(entries);
}

function u64(value: number): Buffer {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new DigestError('GT_TREE_LENGTH', 'Tree framing length is invalid.');
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(value));
  return buffer;
}

function containsLoneSurrogate(value: unknown): boolean {
  if (typeof value === 'string') return hasLoneSurrogate(value);
  if (Array.isArray(value)) return value.some(containsLoneSurrogate);
  if (value !== null && typeof value === 'object')
    return Object.entries(value).some(
      ([key, child]) => hasLoneSurrogate(key) || containsLoneSurrogate(child),
    );
  return false;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}
