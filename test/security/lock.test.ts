import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { InstallLock } from '../../src/install/lock.js';

describe('installation locking', () => {
  it('creates and releases an OS advisory lock', async () => {
    const control = join(
      tmpdir(),
      `groundtrail-lock-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    await mkdir(control, { recursive: true });
    try {
      const lock = await InstallLock.acquire(control);
      await expect(InstallLock.acquire(control)).rejects.toMatchObject({
        code: 'GT_INSTALL_LOCK_HELD',
      });
      await lock.release();
      const reopened = await InstallLock.acquire(control);
      await reopened.release();
    } finally {
      await rm(control, { recursive: true, force: true });
    }
  });
});
