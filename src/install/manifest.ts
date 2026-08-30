// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseBoundedJson } from '../core/json.js';
import { sha256 } from '../core/digests.js';
import type { Provider, ProviderMode } from '../carriers/types.js';

export const INSTALLATION_API_VERSION = 'agentic-sdlc-kit/installation/v1';
export const INSTALLATION_MANIFEST_VERSION = 1;

export interface ProviderInstallation {
  readonly mode: ProviderMode;
  readonly skills: readonly string[];
  readonly carrierDigest: string;
}

export interface ManagedEntry {
  readonly path: string;
  readonly kind: 'file' | 'block';
  readonly blockId?: string;
  readonly owners: readonly Provider[];
  readonly digest: string;
}

export interface InstallationManifest {
  readonly apiVersion: typeof INSTALLATION_API_VERSION;
  readonly manifestVersion: typeof INSTALLATION_MANIFEST_VERSION;
  readonly generation: number;
  readonly packageVersion: string;
  readonly providers: Readonly<Partial<Record<Provider, ProviderInstallation>>>;
  readonly managedEntries: readonly ManagedEntry[];
  readonly sharedEntries?: readonly ManagedEntry[];
  readonly lastCompletedTransaction?: string;
}

export class ManifestError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ManifestError';
  }
}

export function emptyManifest(version: string): InstallationManifest {
  return {
    apiVersion: INSTALLATION_API_VERSION,
    manifestVersion: INSTALLATION_MANIFEST_VERSION,
    generation: 0,
    packageVersion: version,
    providers: {},
    managedEntries: [],
  };
}

export async function readManifest(
  controlDirectory: string,
  version: string,
): Promise<InstallationManifest> {
  const path = join(controlDirectory, 'installation.json');
  let source: string;
  try {
    source = await readFile(path, 'utf8');
  } catch (error: unknown) {
    if (isNotFound(error)) return emptyManifest(version);
    throw error;
  }
  const manifest = parseBoundedJson(source);
  if (!isManifest(manifest))
    throw new ManifestError('GT_MANIFEST_INVALID', 'Installation manifest has an invalid shape.');
  if (
    manifest.apiVersion !== INSTALLATION_API_VERSION ||
    manifest.manifestVersion !== INSTALLATION_MANIFEST_VERSION
  )
    throw new ManifestError(
      'GT_MANIFEST_VERSION',
      'Installation manifest version is not supported.',
    );
  validateManifest(manifest);
  return manifest;
}

export function manifestJson(manifest: InstallationManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function carrierDigest(provider: Provider, skills: readonly string[]): string {
  return sha256(`groundtrail:carrier-selection:v1\0${provider}\0${[...skills].sort().join('\0')}`);
}

function validateManifest(manifest: InstallationManifest): void {
  if (!Number.isSafeInteger(manifest.generation) || manifest.generation < 0)
    throw new ManifestError(
      'GT_MANIFEST_INVALID',
      'Manifest generation must be a non-negative safe integer.',
    );
  for (const [provider, installation] of Object.entries(manifest.providers)) {
    if (
      !['claude', 'codex', 'copilot', 'devin'].includes(provider) ||
      !isProviderInstallation(installation)
    )
      throw new ManifestError(
        'GT_MANIFEST_INVALID',
        'Manifest contains an invalid provider installation.',
      );
  }
  if (
    manifest.sharedEntries !== undefined ||
    manifest.managedEntries.some((entry) => entry.owners.length !== 1)
  )
    throw new ManifestError(
      'GT_MANIFEST_SHARED_UNSUPPORTED',
      'Multi-owner and shared installation state is unsupported by this version.',
    );
  const entries = manifest.managedEntries;
  const paths = new Set<string>();
  for (const entry of entries) {
    if (!isManagedEntry(entry) || paths.has(`${entry.kind}:${entry.path}:${entry.blockId ?? ''}`))
      throw new ManifestError(
        'GT_MANIFEST_INVALID',
        'Manifest contains invalid or duplicate managed entries.',
      );
    paths.add(`${entry.kind}:${entry.path}:${entry.blockId ?? ''}`);
  }
}

function isManifest(value: unknown): value is InstallationManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).apiVersion === INSTALLATION_API_VERSION &&
    (value as Record<string, unknown>).manifestVersion === INSTALLATION_MANIFEST_VERSION &&
    typeof (value as Record<string, unknown>).generation === 'number' &&
    typeof (value as Record<string, unknown>).packageVersion === 'string' &&
    isObject((value as Record<string, unknown>).providers) &&
    Array.isArray((value as Record<string, unknown>).managedEntries) &&
    ((value as Record<string, unknown>).sharedEntries === undefined ||
      Array.isArray((value as Record<string, unknown>).sharedEntries))
  );
}

function isProviderInstallation(value: unknown): value is ProviderInstallation {
  return (
    isObject(value) &&
    value.mode === 'project' &&
    Array.isArray(value.skills) &&
    value.skills.every((skill) => typeof skill === 'string') &&
    typeof value.carrierDigest === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.carrierDigest)
  );
}

function isManagedEntry(value: unknown): value is ManagedEntry {
  return (
    isObject(value) &&
    typeof value.path === 'string' &&
    (value.kind === 'file' || value.kind === 'block') &&
    (value.blockId === undefined || typeof value.blockId === 'string') &&
    Array.isArray(value.owners) &&
    value.owners.every((owner) =>
      ['claude', 'codex', 'copilot', 'devin'].includes(owner as string),
    ) &&
    typeof value.digest === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.digest)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ENOENT'
  );
}
