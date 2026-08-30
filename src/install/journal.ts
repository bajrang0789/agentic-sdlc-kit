// SPDX-License-Identifier: Apache-2.0

import { mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256 } from '../core/digests.js';
import type { TransactionOperation } from './transaction.js';

export type JournalPhase =
  'planned' | 'staged' | 'backed-up' | 'committing' | 'manifest-written' | 'completed';

export interface InstallJournal {
  readonly transactionId: string;
  readonly target: string;
  readonly priorGeneration: number;
  readonly phase: JournalPhase;
  readonly manifestDigest: string;
  readonly priorManifest: string;
  readonly operations: readonly TransactionOperation[];
  readonly nextManifest?: string;
}

interface RecoveryClaim {
  readonly transactionId: string;
  readonly recoveryAttemptId: string;
  readonly strategy: 'resume' | 'rollback';
  readonly preClaimJournalDigest: string;
  readonly supersedesRecoveryAttemptId?: string;
  readonly completed?: boolean;
}

export class JournalError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'JournalError';
  }
}

export async function listIncompleteJournals(
  controlDirectory: string,
): Promise<readonly { directory: string; journal: InstallJournal }[]> {
  const root = join(controlDirectory, 'transactions');
  const directories = await readdir(root, { withFileTypes: true }).catch((error: unknown) => {
    if (isNotFound(error)) return [];
    throw error;
  });
  const result: { directory: string; journal: InstallJournal }[] = [];
  for (const entry of directories) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    const journal = await readJournal(directory);
    if (journal.phase !== 'completed') result.push({ directory, journal });
  }
  return result;
}

export async function createJournal(
  controlDirectory: string,
  target: string,
  priorGeneration: number,
  manifest: string,
  operations: readonly TransactionOperation[] = [],
): Promise<{ directory: string; journal: InstallJournal }> {
  const transactionId = randomUUID();
  const transactions = join(controlDirectory, 'transactions');
  await mkdir(transactions, { recursive: true, mode: 0o700 });
  const directory = join(transactions, transactionId);
  await mkdir(directory, { recursive: false, mode: 0o700 });
  const journal: InstallJournal = {
    transactionId,
    target,
    priorGeneration,
    phase: 'planned',
    manifestDigest: sha256(manifest),
    priorManifest: manifest,
    operations,
  };
  await writeJournal(directory, journal);
  return { directory, journal };
}

export async function readJournal(directory: string): Promise<InstallJournal> {
  const value: unknown = JSON.parse(await readFile(join(directory, 'journal.json'), 'utf8'));
  if (!isJournal(value))
    throw new JournalError('GT_JOURNAL_INVALID', 'Transaction journal has an invalid shape.');
  return value;
}

export async function writeJournal(directory: string, journal: InstallJournal): Promise<void> {
  await atomicJson(join(directory, 'journal.json'), journal);
}

/**
 * The target OS lock serializes callers. The first claim is exclusive-create;
 * a claim left after a crash is validated and atomically superseded rather than
 * being judged by PID liveness.
 */
export async function claimRecovery(
  directory: string,
  journal: InstallJournal,
  strategy: 'resume' | 'rollback',
): Promise<string> {
  const path = join(directory, 'recovery-claim.json');
  const attemptId = randomUUID();
  const preClaimJournalDigest = sha256(JSON.stringify(journal));
  const claim: RecoveryClaim = {
    transactionId: journal.transactionId,
    recoveryAttemptId: attemptId,
    strategy,
    preClaimJournalDigest,
  };
  try {
    const handle = await open(path, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(claim, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    return attemptId;
  } catch (error: unknown) {
    if (!isExists(error)) throw error;
  }
  const previous = await readRecoveryClaim(path);
  if (
    previous.transactionId !== journal.transactionId ||
    previous.preClaimJournalDigest !== preClaimJournalDigest
  )
    throw new JournalError(
      'GT_RECOVERY_CLAIM_INVALID',
      'Existing recovery claim does not match the journal.',
    );
  await atomicJson(path, {
    ...claim,
    supersedesRecoveryAttemptId: previous.recoveryAttemptId,
  });
  return attemptId;
}

export async function completeRecoveryClaim(directory: string, attemptId: string): Promise<void> {
  const path = join(directory, 'recovery-claim.json');
  const claim = await readRecoveryClaim(path);
  if (claim.recoveryAttemptId !== attemptId)
    throw new JournalError(
      'GT_RECOVERY_CLAIM_INVALID',
      'Recovery claim was superseded before completion.',
    );
  await atomicJson(path, { ...claim, completed: true });
}

export async function removeJournal(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: false });
}

async function atomicJson(path: string, value: object): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

async function readRecoveryClaim(path: string): Promise<RecoveryClaim> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!isRecoveryClaim(value))
    throw new JournalError('GT_RECOVERY_CLAIM_INVALID', 'Recovery claim has an invalid shape.');
  return value;
}

function isJournal(value: unknown): value is InstallJournal {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).transactionId === 'string' &&
    typeof (value as Record<string, unknown>).target === 'string' &&
    typeof (value as Record<string, unknown>).priorGeneration === 'number' &&
    ['planned', 'staged', 'backed-up', 'committing', 'manifest-written', 'completed'].includes(
      (value as Record<string, unknown>).phase as string,
    ) &&
    typeof (value as Record<string, unknown>).manifestDigest === 'string' &&
    typeof (value as Record<string, unknown>).priorManifest === 'string' &&
    Array.isArray((value as Record<string, unknown>).operations) &&
    ((value as Record<string, unknown>).nextManifest === undefined ||
      typeof (value as Record<string, unknown>).nextManifest === 'string')
  );
}

function isRecoveryClaim(value: unknown): value is RecoveryClaim {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).transactionId === 'string' &&
    typeof (value as Record<string, unknown>).recoveryAttemptId === 'string' &&
    ((value as Record<string, unknown>).strategy === 'resume' ||
      (value as Record<string, unknown>).strategy === 'rollback') &&
    typeof (value as Record<string, unknown>).preClaimJournalDigest === 'string' &&
    ((value as Record<string, unknown>).supersedesRecoveryAttemptId === undefined ||
      typeof (value as Record<string, unknown>).supersedesRecoveryAttemptId === 'string') &&
    ((value as Record<string, unknown>).completed === undefined ||
      typeof (value as Record<string, unknown>).completed === 'boolean')
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ENOENT'
  );
}

function isExists(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'EEXIST'
  );
}
