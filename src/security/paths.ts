// SPDX-License-Identifier: Apache-2.0

import { lstat, mkdir, realpath } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';

const WINDOWS_DEVICES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

export class UnsafePathError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'UnsafePathError';
  }
}

export function normalizeRelativePath(input: string): string {
  if (!input || isAbsolute(input) || input.includes('\0'))
    throw new UnsafePathError('GT_PATH_UNSAFE', 'Path must be a non-empty relative path.');
  const normalized = input.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..' || WINDOWS_DEVICES.test(segment),
    )
  )
    throw new UnsafePathError(
      'GT_PATH_UNSAFE',
      'Path contains traversal, an empty segment, or a reserved device name.',
    );
  if (normalized !== normalized.normalize('NFC'))
    throw new UnsafePathError('GT_PATH_UNSAFE', 'Path must use Unicode NFC.');
  return segments.join('/');
}

export async function createControlDirectory(target: string): Promise<string> {
  const root = resolve(target);
  const targetStat = await lstat(root).catch(() => undefined);
  if (targetStat === undefined || !targetStat.isDirectory() || targetStat.isSymbolicLink())
    throw new UnsafePathError(
      'GT_TARGET_UNSAFE',
      'Target must be an existing non-symlink directory.',
    );
  const control = resolve(root, '.groundtrail');
  await mkdir(control, { recursive: true, mode: 0o700 });
  await assertSafeExistingPath(root, '.groundtrail', true);
  return control;
}

export async function resolveTargetPath(
  root: string,
  relativePath: string,
  allowMissingLeaf = true,
): Promise<string> {
  const safe = normalizeRelativePath(relativePath);
  const absoluteRoot = resolve(root);
  const candidate = resolve(absoluteRoot, safe);
  if (
    relative(absoluteRoot, candidate).startsWith(`..${sep}`) ||
    relative(absoluteRoot, candidate) === '..'
  )
    throw new UnsafePathError('GT_PATH_ESCAPE', 'Path escapes the target root.');
  await assertSafeExistingPath(absoluteRoot, safe, allowMissingLeaf);
  return candidate;
}

export async function assertSafeExistingPath(
  root: string,
  relativePath: string,
  allowMissingLeaf = false,
): Promise<void> {
  const base = await realpath(root);
  const segments = normalizeRelativePath(relativePath).split('/');
  let current = base;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) continue;
    current = resolve(current, segment);
    const stat = await lstat(current).catch(() => undefined);
    if (stat === undefined) {
      if (allowMissingLeaf || index < segments.length - 1) return;
      return;
    }
    if (stat.isSymbolicLink() || (!stat.isDirectory() && index < segments.length - 1))
      throw new UnsafePathError(
        'GT_PATH_SYMLINK',
        'Target path contains a symlink or non-directory component.',
      );
    const actual = await realpath(current);
    if (actual !== base && !actual.startsWith(`${base}${sep}`))
      throw new UnsafePathError('GT_PATH_ESCAPE', 'Target path resolves outside the target root.');
  }
}

export function assertCaseUnique(paths: readonly string[]): void {
  const seen = new Set<string>();
  for (const path of paths) {
    const folded = path.toLocaleLowerCase('en-US');
    if (seen.has(folded))
      throw new UnsafePathError('GT_PATH_CASE_COLLISION', 'Paths collide by case.');
    seen.add(folded);
  }
}

export function safeBasename(path: string): string {
  return basename(normalizeRelativePath(path));
}
