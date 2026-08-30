// SPDX-License-Identifier: Apache-2.0

import { copyFile, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256 } from '../core/digests.js';
import { GroundtrailError } from '../core/errors.js';
import { assertSafeExistingPath, assertCaseUnique, resolveTargetPath } from '../security/paths.js';
import { manifestJson, type InstallationManifest } from './manifest.js';

export interface TransactionOperation {
  readonly action: 'create' | 'update' | 'delete';
  readonly path: string;
  readonly desiredDigest?: string;
  readonly priorDigest?: string;
}

export async function writeManifestAtomically(
  controlDirectory: string,
  manifest: InstallationManifest,
): Promise<void> {
  const path = join(controlDirectory, 'installation.json');
  const temporary = join(controlDirectory, `installation.${randomUUID()}.tmp`);
  await writeFile(temporary, manifestJson(manifest), { mode: 0o644 });
  await rename(temporary, path);
}

export async function preflightOperations(
  root: string,
  operations: readonly TransactionOperation[],
): Promise<void> {
  assertCaseUnique(operations.map((operation) => operation.path));
  for (const operation of operations) {
    const path = await resolveTargetPath(root, operation.path, true);
    const stat = await lstat(path).catch(() => undefined);
    if (stat !== undefined && (!stat.isFile() || stat.isSymbolicLink()))
      throw new GroundtrailError(
        'GT_INSTALL_TARGET_UNSAFE',
        'Managed target must be a regular file.',
        3,
      );
    const digest = stat === undefined ? undefined : sha256(await readFile(path));
    if (operation.action === 'create' && digest !== undefined)
      throw new GroundtrailError(
        'GT_INSTALL_UNMANAGED_CONFLICT',
        'Refusing to overwrite an unmanaged existing file.',
        1,
      );
    if (
      (operation.action === 'update' || operation.action === 'delete') &&
      digest !== operation.priorDigest
    )
      throw new GroundtrailError(
        'GT_INSTALL_DRIFT',
        'Managed target bytes differ from the recorded digest.',
        1,
      );
  }
}

export async function stageOperations(
  root: string,
  journalDirectory: string,
  files: ReadonlyMap<string, Uint8Array>,
  operations: readonly TransactionOperation[],
): Promise<void> {
  const stage = join(journalDirectory, 'stage');
  await mkdir(stage, { recursive: true, mode: 0o700 });
  for (const operation of operations) {
    if (operation.action === 'delete') continue;
    const content = files.get(operation.path);
    if (content === undefined)
      throw new GroundtrailError('GT_TRANSACTION_STAGE', 'Missing staged content.', 4);
    const destination = join(stage, operation.path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, content, { mode: 0o644 });
    if (sha256(await readFile(destination)) !== operation.desiredDigest)
      throw new GroundtrailError(
        'GT_TRANSACTION_STAGE',
        'Staged bytes do not match the planned digest.',
        4,
      );
  }
  void root;
}

export async function backupOperations(
  root: string,
  journalDirectory: string,
  operations: readonly TransactionOperation[],
): Promise<void> {
  const backup = join(journalDirectory, 'backup');
  await mkdir(backup, { recursive: true, mode: 0o700 });
  for (const operation of operations) {
    if (operation.priorDigest === undefined) continue;
    const source = await resolveTargetPath(root, operation.path, false);
    const destination = join(backup, operation.path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await copyFile(source, destination);
    if (sha256(await readFile(destination)) !== operation.priorDigest)
      throw new GroundtrailError(
        'GT_TRANSACTION_BACKUP',
        'Backup bytes do not match the recorded digest.',
        4,
      );
  }
}

type OperationState = 'prior' | 'desired';

/**
 * Each interrupted target must still be either the recorded prior bytes or the
 * desired bytes. No recovery action is permitted over an unrelated third state.
 */
export async function validateOperationStates(
  root: string,
  journalDirectory: string,
  operations: readonly TransactionOperation[],
): Promise<ReadonlyMap<TransactionOperation, OperationState>> {
  const states = new Map<TransactionOperation, OperationState>();
  for (const operation of operations) {
    const destination = await resolveTargetPath(root, operation.path, true);
    const current = await readFile(destination).catch((error: unknown) => {
      if (isNotFound(error)) return undefined;
      throw error;
    });
    if (operation.action === 'create') {
      if (current === undefined) states.set(operation, 'prior');
      else if (sha256(current) === operation.desiredDigest) states.set(operation, 'desired');
      else throw recoveryMismatch(operation.path);
      await validateStage(journalDirectory, operation);
      continue;
    }
    if (operation.action === 'delete') {
      if (current === undefined) states.set(operation, 'desired');
      else if (sha256(current) === operation.priorDigest) states.set(operation, 'prior');
      else throw recoveryMismatch(operation.path);
      await validateBackup(journalDirectory, operation);
      continue;
    }
    if (current === undefined) throw recoveryMismatch(operation.path);
    const digest = sha256(current);
    if (digest === operation.priorDigest) states.set(operation, 'prior');
    else if (digest === operation.desiredDigest) states.set(operation, 'desired');
    else throw recoveryMismatch(operation.path);
    await validateStage(journalDirectory, operation);
    await validateBackup(journalDirectory, operation);
  }
  return states;
}

export async function applyStagedOperations(
  root: string,
  journalDirectory: string,
  operations: readonly TransactionOperation[],
): Promise<void> {
  const states = await validateOperationStates(root, journalDirectory, operations);
  for (const operation of operations) {
    if (states.get(operation) === 'desired') continue;
    const destination = await resolveTargetPath(root, operation.path, true);
    if (operation.action === 'delete') {
      await rm(destination, { force: false });
      continue;
    }
    const source = join(journalDirectory, 'stage', operation.path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o755 });
    await assertSafeExistingPath(root, operation.path, true);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await copyFile(source, temporary);
    await rename(temporary, destination);
  }
}

export async function rollbackOperations(
  root: string,
  journalDirectory: string,
  operations: readonly TransactionOperation[],
): Promise<void> {
  const states = await validateOperationStates(root, journalDirectory, operations);
  for (const operation of [...operations].reverse()) {
    if (states.get(operation) === 'prior') continue;
    const destination = await resolveTargetPath(root, operation.path, true);
    if (operation.action === 'create') {
      await rm(destination, { force: false });
      continue;
    }
    const source = join(journalDirectory, 'backup', operation.path);
    await mkdir(dirname(destination), { recursive: true, mode: 0o755 });
    await copyFile(source, destination);
  }
}

async function validateStage(
  journalDirectory: string,
  operation: TransactionOperation,
): Promise<void> {
  if (operation.action === 'delete') return;
  const source = join(journalDirectory, 'stage', operation.path);
  const staged = await readFile(source).catch(() => undefined);
  if (staged === undefined || sha256(staged) !== operation.desiredDigest)
    throw new GroundtrailError(
      'GT_RECOVERY_DIGEST_MISMATCH',
      'Staged content changed after planning.',
      1,
    );
}

async function validateBackup(
  journalDirectory: string,
  operation: TransactionOperation,
): Promise<void> {
  if (operation.priorDigest === undefined) return;
  const source = join(journalDirectory, 'backup', operation.path);
  const backup = await readFile(source).catch(() => undefined);
  if (backup === undefined || sha256(backup) !== operation.priorDigest)
    throw new GroundtrailError(
      'GT_RECOVERY_DIGEST_MISMATCH',
      'Backup content changed after planning.',
      1,
    );
}

function recoveryMismatch(path: string): GroundtrailError {
  return new GroundtrailError(
    'GT_RECOVERY_DIGEST_MISMATCH',
    `Target ${path} contains bytes unrelated to the transaction.`,
    1,
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ENOENT'
  );
}

export async function writeRegularFile(
  root: string,
  relativePath: string,
  content: Uint8Array,
): Promise<void> {
  const path = await resolveTargetPath(root, relativePath, true);
  await mkdir(dirname(path), { recursive: true, mode: 0o755 });
  await assertSafeExistingPath(root, relativePath, true);
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, { mode: 0o644 });
  await rename(temporary, path);
}
