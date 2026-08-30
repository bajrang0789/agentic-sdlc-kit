// SPDX-License-Identifier: Apache-2.0

import { close as closeCallback, constants, open as openCallback } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import FDLock from 'fd-lock';
import { assertSafeExistingPath } from '../security/paths.js';

/** Holds an advisory OS lock on the open install.lock descriptor. */
export class InstallLock {
  private constructor(private readonly lock: FDLock) {}

  public static async acquire(controlDirectory: string): Promise<InstallLock> {
    const path = join(controlDirectory, 'install.lock');
    // The control directory is the only permitted pre-lock location. Recheck the
    // stable lock file before opening so a symlink/non-regular replacement fails.
    await assertSafeExistingPath(controlDirectory, 'install.lock', true);
    const descriptor = await promisify(openCallback)(
      path,
      constants.O_RDWR | constants.O_CREAT | noFollowFlag(),
      0o600,
    );
    let lock: FDLock | undefined;
    try {
      await assertSafeExistingPath(controlDirectory, 'install.lock');
      lock = new FDLock(descriptor, { wait: false });
      await lock.ready();
      return new InstallLock(lock);
    } catch (error) {
      // FDLock owns and closes the descriptor after construction. Before that,
      // close this descriptor ourselves so failed attempts cannot leak it.
      if (lock === undefined) await closeDescriptor(descriptor);
      if (error instanceof Error && /could not be locked/iu.test(error.message))
        throw new InstallLockError(
          'GT_INSTALL_LOCK_HELD',
          'An installer or recovery process holds the target lock.',
        );
      throw error;
    }
  }

  public async release(): Promise<void> {
    await this.lock.close();
  }
}

function noFollowFlag(): number {
  // O_NOFOLLOW is unavailable on Windows and not exposed by every Node build.
  // When available, make a replacement of install.lock by a symlink fail at open.
  return process.platform === 'win32' ? 0 : (constants.O_NOFOLLOW ?? 0);
}

async function closeDescriptor(descriptor: number): Promise<void> {
  await promisify(closeCallback)(descriptor).catch(() => undefined);
}

export class InstallLockError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InstallLockError';
  }
}
