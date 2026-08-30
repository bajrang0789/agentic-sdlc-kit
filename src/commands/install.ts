// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { loadCanonicalCatalog } from '../core/canonical-loader.js';
import { treeDigest, sha256 } from '../core/digests.js';
import { GroundtrailError } from '../core/errors.js';
import { rendererFor } from '../carriers/render-all.js';
import type { Provider } from '../carriers/types.js';
import { createControlDirectory, resolveTargetPath } from '../security/paths.js';
import { InstallLock } from '../install/lock.js';
import { createJournal, listIncompleteJournals, writeJournal } from '../install/journal.js';
import {
  manifestJson,
  readManifest,
  type InstallationManifest,
  type ManagedEntry,
  type ProviderInstallation,
} from '../install/manifest.js';
import {
  managedBlock,
  removeManagedBlock,
  replaceManagedBlock,
} from '../install/managed-blocks.js';
import { planInstallation, type InstallRequest } from '../install/plan.js';
import {
  applyStagedOperations,
  backupOperations,
  preflightOperations,
  stageOperations,
  writeManifestAtomically,
  type TransactionOperation,
} from '../install/transaction.js';

interface DesiredEntry {
  readonly entry: ManagedEntry;
  readonly content: Uint8Array<ArrayBufferLike>;
}

export async function install(
  root: string,
  target: string,
  request: InstallRequest & { readonly dryRun: boolean },
  version: string,
): Promise<{ dryRun: boolean; operations: readonly TransactionOperation[]; generation: number }> {
  const catalog = await loadCanonicalCatalog(root);
  const control = await createControlDirectory(target);
  const lock = await InstallLock.acquire(control);
  try {
    const incomplete = await listIncompleteJournals(control);
    if (incomplete.length > 0)
      throw new GroundtrailError(
        'GT_INSTALL_RECOVERY_REQUIRED',
        `Recover transaction ${incomplete[0]?.journal.transactionId ?? 'unknown'} before installing.`,
        4,
      );
    const current = await readManifest(control, version);
    const requestedPlan = planInstallation(
      current,
      request,
      new Set(catalog.skills.map((skill) => skill.id)),
    );
    const rendered = new Map<Provider, readonly DesiredEntry[]>();
    const providers: Partial<Record<Provider, ProviderInstallation>> = {
      ...requestedPlan.providers,
    };
    for (const provider of requestedPlan.requestedProviders) {
      const selection = providers[provider];
      if (selection === undefined) continue;
      const files = await rendererFor(provider).render(catalog, selection.skills);
      const desired = await desiredEntries(target, provider, files);
      rendered.set(provider, desired);
      const payload = files.filter((file) => file.path !== 'carrier-manifest.json');
      providers[provider] = {
        ...selection,
        carrierDigest: treeDigest(
          payload.map((file) => ({ path: file.path, content: file.content })),
        ).digest,
      };
    }
    const nextEntries = mergeEntries(current, requestedPlan.requestedProviders, rendered);
    const operationPlan = await operationsFor(target, current.managedEntries, nextEntries);
    const { operations } = operationPlan;
    await preflightOperations(target, operations);
    if (request.dryRun) return { dryRun: true, operations, generation: current.generation };
    const next: InstallationManifest = {
      ...current,
      generation: current.generation + 1,
      packageVersion: version,
      providers,
      managedEntries: nextEntries.map((item) => item.entry),
    };
    const created = await createJournal(
      control,
      target,
      current.generation,
      manifestJson(current),
      operations,
    );
    const finalManifest: InstallationManifest = {
      ...next,
      lastCompletedTransaction: created.journal.transactionId,
    };
    const journal = { ...created.journal, nextManifest: manifestJson(finalManifest) };
    await writeJournal(created.directory, journal);
    await stageOperations(target, created.directory, operationPlan.bytes, operations);
    await writeJournal(created.directory, { ...journal, phase: 'staged' });
    await backupOperations(target, created.directory, operations);
    await writeJournal(created.directory, { ...journal, phase: 'backed-up' });
    await writeJournal(created.directory, { ...journal, phase: 'committing' });
    await applyStagedOperations(target, created.directory, operations);
    await writeManifestAtomically(control, finalManifest);
    await writeJournal(created.directory, { ...journal, phase: 'manifest-written' });
    await writeJournal(created.directory, { ...journal, phase: 'completed' });
    return { dryRun: false, operations, generation: finalManifest.generation };
  } finally {
    await lock.release();
  }
}

export function installRequest(
  providers: readonly Provider[],
  skills: readonly string[] | undefined,
  replaceSelection: boolean,
): InstallRequest {
  return { providers, ...(skills === undefined ? {} : { skills }), replaceSelection };
}

async function desiredEntries(
  target: string,
  provider: Provider,
  files: readonly { path: string; content: Uint8Array }[],
): Promise<readonly DesiredEntry[]> {
  const result: DesiredEntry[] = [];
  for (const file of files) {
    const path = installedPath(provider, file.path);
    if (path === undefined) continue;
    if (isManagedBlock(provider, file.path)) {
      const blockId = `groundtrail:${provider}:v1`;
      const existing = await readTarget(target, path);
      const content = Buffer.from(
        replaceManagedBlock(
          existing,
          blockId,
          blockContent(Buffer.from(file.content).toString('utf8')),
        ),
      );
      result.push({
        entry: {
          path,
          kind: 'block',
          blockId,
          owners: [provider],
          digest: sha256(
            managedBlock(blockId, blockContent(Buffer.from(file.content).toString('utf8'))),
          ),
        },
        content,
      });
    } else
      result.push({
        entry: { path, kind: 'file', owners: [provider], digest: sha256(file.content) },
        content: file.content,
      });
  }
  return result;
}

function mergeEntries(
  current: InstallationManifest,
  requested: readonly Provider[],
  rendered: ReadonlyMap<Provider, readonly DesiredEntry[]>,
): DesiredEntry[] {
  const requestedSet = new Set(requested);
  const preserved: DesiredEntry[] = current.managedEntries
    .filter((entry) => entry.owners.every((owner) => !requestedSet.has(owner)))
    .map((entry) => ({ entry, content: new Uint8Array(0) }));
  const desired = [...preserved];
  for (const entries of rendered.values()) desired.push(...entries);
  const keys = new Set<string>();
  for (const item of desired) {
    const key = `${item.entry.kind}:${item.entry.path}:${item.entry.blockId ?? ''}`;
    if (keys.has(key))
      throw new GroundtrailError(
        'GT_INSTALL_OWNERSHIP_COLLISION',
        'Providers propose the same managed entry.',
        1,
      );
    keys.add(key);
  }
  return desired.sort((left, right) => left.entry.path.localeCompare(right.entry.path, 'en'));
}

async function operationsFor(
  target: string,
  oldEntries: readonly ManagedEntry[],
  nextEntries: readonly DesiredEntry[],
): Promise<{
  readonly operations: readonly TransactionOperation[];
  readonly bytes: ReadonlyMap<string, Uint8Array>;
}> {
  const desired = new Map(nextEntries.map((item) => [entryKey(item.entry), item]));
  const old = new Map(oldEntries.map((entry) => [entryKey(entry), entry]));
  const operations: TransactionOperation[] = [];
  const bytes = new Map<string, Uint8Array>();
  for (const [key, entry] of old) {
    if (desired.has(key)) continue;
    const priorDigest = await diskDigest(target, entry);
    if (entry.kind === 'file') {
      operations.push({ action: 'delete', path: entry.path, priorDigest });
      continue;
    }
    const existing = await readFile(await resolveTargetPath(target, entry.path, false), 'utf8');
    const content = Buffer.from(removeManagedBlock(existing, entry.blockId ?? ''));
    operations.push({
      action: 'update',
      path: entry.path,
      priorDigest,
      desiredDigest: sha256(content),
    });
    bytes.set(entry.path, content);
  }
  for (const [key, item] of desired) {
    if (item.content.length === 0) continue;
    const before = old.get(key);
    const priorDigest = before === undefined ? undefined : await diskDigest(target, before);
    if (before === undefined) {
      const existing = await readFile(await resolveTargetPath(target, item.entry.path, true)).catch(
        () => undefined,
      );
      if (item.entry.kind === 'block' && existing !== undefined)
        operations.push({
          action: 'update',
          path: item.entry.path,
          priorDigest: sha256(existing),
          desiredDigest: sha256(item.content),
        });
      else
        operations.push({
          action: 'create',
          path: item.entry.path,
          desiredDigest: sha256(item.content),
        });
      bytes.set(item.entry.path, new Uint8Array(item.content));
    } else if (priorDigest !== sha256(item.content)) {
      if (priorDigest === undefined)
        throw new GroundtrailError('GT_INSTALL_DRIFT', 'Managed entry is absent.', 1);
      operations.push({
        action: 'update',
        path: item.entry.path,
        priorDigest,
        desiredDigest: sha256(item.content),
      });
      bytes.set(item.entry.path, new Uint8Array(item.content));
    }
  }
  const paths = new Set<string>();
  for (const operation of operations) {
    if (paths.has(operation.path))
      throw new GroundtrailError(
        'GT_INSTALL_OWNERSHIP_COLLISION',
        'Multiple managed entries would update the same target file.',
        1,
      );
    paths.add(operation.path);
  }
  return {
    operations: operations.sort((left, right) => left.path.localeCompare(right.path, 'en')),
    bytes,
  };
}

async function diskDigest(target: string, entry: ManagedEntry): Promise<string> {
  const content = await readFile(await resolveTargetPath(target, entry.path, false));
  const actual =
    entry.kind === 'file'
      ? sha256(content)
      : sha256(extractManagedBlock(content.toString('utf8'), entry.blockId ?? ''));
  if (actual !== entry.digest)
    throw new GroundtrailError(
      'GT_INSTALL_DRIFT',
      'Managed target bytes differ from the recorded digest.',
      1,
    );
  return entry.kind === 'file' ? actual : sha256(content);
}

function entryKey(entry: ManagedEntry): string {
  return `${entry.kind}:${entry.path}:${entry.blockId ?? ''}`;
}
function installedPath(provider: Provider, renderedPath: string): string | undefined {
  if (renderedPath === 'carrier-manifest.json' || renderedPath.startsWith('optional/'))
    return undefined;
  return provider === 'claude'
    ? renderedPath.startsWith('skills/')
      ? `.claude/${renderedPath}`
      : undefined
    : renderedPath;
}
function isManagedBlock(provider: Provider, path: string): boolean {
  return (
    (provider === 'codex' && path === 'AGENTS.md') ||
    (provider === 'copilot' && path === '.github/copilot-instructions.md')
  );
}
function blockContent(content: string): string {
  return content
    .replace(/^<!-- groundtrail:start [^\n]+ -->\n?/u, '')
    .replace(/\n?<!-- groundtrail:end [^\n]+ -->\n?$/u, '')
    .replace(/^# Groundtrail Method\n\n/u, '');
}
function extractManagedBlock(content: string, blockId: string): string {
  const start = `<!-- groundtrail:start ${blockId} -->`;
  const end = `<!-- groundtrail:end ${blockId} -->`;
  const from = content.indexOf(start);
  const to = content.indexOf(end);
  if (from < 0 || to < from)
    throw new GroundtrailError(
      'GT_MANAGED_BLOCK_CONFLICT',
      'Managed block markers are malformed.',
      1,
    );
  return content.slice(from, to + end.length);
}
async function readTarget(root: string, path: string): Promise<string> {
  try {
    return await readFile(await resolveTargetPath(root, path, true), 'utf8');
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'ENOENT'
    )
      return '';
    throw error;
  }
}
