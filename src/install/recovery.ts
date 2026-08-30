// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path';
import { sha256 } from '../core/digests.js';
import { parseBoundedJson } from '../core/json.js';
import { GroundtrailError } from '../core/errors.js';
import { createControlDirectory } from '../security/paths.js';
import { InstallLock } from './lock.js';
import {
  claimRecovery,
  completeRecoveryClaim,
  listIncompleteJournals,
  writeJournal,
} from './journal.js';
import { manifestJson, readManifest, type InstallationManifest } from './manifest.js';
import {
  applyStagedOperations,
  rollbackOperations,
  writeManifestAtomically,
} from './transaction.js';

export async function recoverInstallation(
  target: string,
  transactionId: string,
  strategy: 'resume' | 'rollback',
  version: string,
): Promise<{ transactionId: string; strategy: string; phase: string }> {
  const control = await createControlDirectory(target);
  const lock = await InstallLock.acquire(control);
  try {
    const matches = (await listIncompleteJournals(control)).filter(
      ({ journal }) => journal.transactionId === transactionId,
    );
    if (matches.length !== 1)
      throw new GroundtrailError(
        'GT_RECOVERY_TRANSACTION_MISMATCH',
        'GT_RECOVERY_TRANSACTION_MISMATCH: transaction ID does not identify one incomplete journal.',
        1,
      );
    const selected = matches[0];
    if (selected === undefined || resolve(selected.journal.target) !== resolve(target))
      throw new GroundtrailError(
        'GT_RECOVERY_TARGET_MISMATCH',
        'Journal belongs to a different target.',
        1,
      );
    const manifest = await readManifest(control, version);
    const journal = selected.journal;
    if (journal.manifestDigest !== sha256(journal.priorManifest))
      throw new GroundtrailError(
        'GT_RECOVERY_JOURNAL_INVALID',
        'Journal prior manifest digest is invalid.',
        1,
      );
    const manifestDigest = sha256(manifestJson(manifest));
    const priorManifest = journal.manifestDigest;
    const nextManifest =
      journal.nextManifest === undefined ? undefined : sha256(journal.nextManifest);
    // A crash can occur after manifest rename and before the phase record. In
    // that window the next manifest is authoritative even if the journal still
    // reads "committing".
    if (
      manifestDigest !== priorManifest &&
      (nextManifest === undefined || manifestDigest !== nextManifest)
    )
      throw new GroundtrailError(
        'GT_RECOVERY_GENERATION_MISMATCH',
        'Installation manifest changed outside this transaction.',
        1,
      );
    if (manifestDigest === priorManifest && manifest.generation !== journal.priorGeneration)
      throw new GroundtrailError(
        'GT_RECOVERY_GENERATION_MISMATCH',
        'Installation manifest generation changed outside this transaction.',
        1,
      );
    const attempt = await claimRecovery(selected.directory, journal, strategy);
    if (strategy === 'rollback') {
      if (journal.phase !== 'planned' && journal.phase !== 'staged')
        await rollbackOperations(target, selected.directory, journal.operations);
      await writeManifestAtomically(control, asManifest(journal.priorManifest));
    } else if (journal.phase === 'backed-up' || journal.phase === 'committing') {
      const next = asManifest(journal.nextManifest);
      await applyStagedOperations(target, selected.directory, journal.operations);
      await writeManifestAtomically(control, next);
    } else if (journal.phase === 'manifest-written') {
      if (journal.nextManifest === undefined)
        throw new GroundtrailError(
          'GT_RECOVERY_JOURNAL_INVALID',
          'Journal lacks next manifest bytes.',
          1,
        );
      await applyStagedOperations(target, selected.directory, journal.operations);
      await writeManifestAtomically(control, asManifest(journal.nextManifest));
    } else if (journal.phase === 'staged') {
      throw new GroundtrailError(
        'GT_RECOVERY_UNPROVABLE',
        'A staged-only transaction cannot resume safely; use rollback.',
        1,
      );
    }
    await writeJournal(selected.directory, { ...journal, phase: 'completed' });
    await completeRecoveryClaim(selected.directory, attempt);
    return { transactionId, strategy, phase: 'completed' };
  } finally {
    await lock.release();
  }
}

function asManifest(source: string | undefined): InstallationManifest {
  if (source === undefined)
    throw new GroundtrailError(
      'GT_RECOVERY_JOURNAL_INVALID',
      'Journal lacks required manifest bytes.',
      1,
    );
  const parsed = parseBoundedJson(source);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new GroundtrailError('GT_RECOVERY_JOURNAL_INVALID', 'Journal manifest is invalid.', 1);
  return parsed as InstallationManifest;
}
