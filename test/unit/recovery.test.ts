import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createControlDirectory } from '../../src/security/paths.js';
import { sha256 } from '../../src/core/digests.js';
import {
  claimRecovery,
  createJournal,
  readJournal,
  writeJournal,
} from '../../src/install/journal.js';
import { emptyManifest, manifestJson } from '../../src/install/manifest.js';
import { InstallLock } from '../../src/install/lock.js';
import { recoverInstallation } from '../../src/install/recovery.js';

const version = '0.1.0';

async function abandonedPlannedTransaction(): Promise<{
  target: string;
  control: string;
  directory: string;
  transactionId: string;
}> {
  const target = await mkdtemp(join(tmpdir(), 'groundtrail-recovery-'));
  const control = await createControlDirectory(target);
  const created = await createJournal(control, target, 0, manifestJson(emptyManifest(version)));
  return {
    target,
    control,
    directory: created.directory,
    transactionId: created.journal.transactionId,
  };
}

describe('transaction recovery', () => {
  it('refuses an active installer lock and recovers an abandoned matching planned journal', async () => {
    const { target, control, directory, transactionId } = await abandonedPlannedTransaction();
    const lock = await InstallLock.acquire(control);
    await expect(
      recoverInstallation(target, transactionId, 'rollback', version),
    ).rejects.toMatchObject({ code: 'GT_INSTALL_LOCK_HELD' });
    await lock.release();
    await expect(
      recoverInstallation(target, transactionId, 'rollback', version),
    ).resolves.toMatchObject({ phase: 'completed' });
    expect((await readJournal(directory)).phase).toBe('completed');
    await rm(target, { recursive: true, force: true });
  });

  it('resumes backed-up and committing operations only over recorded prior or desired bytes', async () => {
    const { target, control, directory } = await abandonedPlannedTransaction();
    try {
      const previous = Buffer.from('prior bytes');
      const desired = Buffer.from('desired bytes');
      await writeFile(join(target, 'managed.txt'), previous);
      const journal = await readJournal(directory);
      const operations = [
        {
          action: 'update' as const,
          path: 'managed.txt',
          priorDigest: sha256(previous),
          desiredDigest: sha256(desired),
        },
      ];
      await mkdir(join(directory, 'stage'), { recursive: true });
      await mkdir(join(directory, 'backup'), { recursive: true });
      await writeFile(join(directory, 'stage', 'managed.txt'), desired);
      await writeFile(join(directory, 'backup', 'managed.txt'), previous);
      const next = { ...emptyManifest(version), generation: 1 };
      await writeJournal(directory, {
        ...journal,
        operations,
        nextManifest: manifestJson(next),
        phase: 'backed-up',
      });
      await expect(
        recoverInstallation(target, journal.transactionId, 'resume', version),
      ).resolves.toMatchObject({ phase: 'completed' });
      expect(await readFile(join(target, 'managed.txt'), 'utf8')).toBe('desired bytes');

      const secondOperations = [
        {
          action: 'update' as const,
          path: 'managed.txt',
          priorDigest: sha256(desired),
          desiredDigest: sha256(Buffer.from('later desired bytes')),
        },
      ];
      const committing = await createJournal(
        control,
        target,
        1,
        manifestJson(next),
        secondOperations,
      );
      await mkdir(join(committing.directory, 'stage'), { recursive: true });
      await mkdir(join(committing.directory, 'backup'), { recursive: true });
      await writeFile(join(committing.directory, 'stage', 'managed.txt'), 'later desired bytes');
      await writeFile(join(committing.directory, 'backup', 'managed.txt'), desired);
      await writeJournal(committing.directory, {
        ...committing.journal,
        phase: 'committing',
        nextManifest: manifestJson({ ...next, generation: 2 }),
      });
      await writeFile(join(target, 'managed.txt'), 'third-party bytes');
      await expect(
        recoverInstallation(target, committing.journal.transactionId, 'rollback', version),
      ).rejects.toMatchObject({ code: 'GT_RECOVERY_DIGEST_MISMATCH' });
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it('requires an exact transaction ID and atomically supersedes an abandoned matching claim', async () => {
    const { target, directory } = await abandonedPlannedTransaction();
    await expect(
      recoverInstallation(target, '00000000-0000-4000-8000-000000000000', 'resume', version),
    ).rejects.toThrow(/TRANSACTION_MISMATCH/);
    const journal = await readJournal(directory);
    const first = await claimRecovery(directory, journal, 'resume');
    const second = await claimRecovery(directory, journal, 'rollback');
    const claim = JSON.parse(
      await readFile(join(directory, 'recovery-claim.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(second).not.toBe(first);
    expect(claim.supersedesRecoveryAttemptId).toBe(first);
    await rm(target, { recursive: true, force: true });
  });
});
