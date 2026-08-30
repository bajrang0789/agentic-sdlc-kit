// SPDX-License-Identifier: Apache-2.0

import { cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { install } from '../../src/commands/install.js';
import { createControlDirectory } from '../../src/security/paths.js';
import { createJournal, readJournal } from '../../src/install/journal.js';
import { recoverInstallation } from '../../src/install/recovery.js';
import { emptyManifest, manifestJson, readManifest } from '../../src/install/manifest.js';

const root = resolve(import.meta.dirname, '../..');
const version = '0.1.0';

async function consumer(): Promise<string> {
  const target = await mkdtemp(join(tmpdir(), 'groundtrail-consumer-'));
  await cp(join(root, 'test/fixtures/consumer-repo'), target, { recursive: true });
  return target;
}

async function installProvider(
  target: string,
  providers: Array<'claude' | 'codex' | 'copilot' | 'devin'>,
  options: { skills?: string[]; replaceSelection?: boolean; dryRun?: boolean } = {},
) {
  return install(
    root,
    target,
    {
      providers,
      replaceSelection: options.replaceSelection ?? false,
      dryRun: options.dryRun ?? false,
      ...(options.skills === undefined ? {} : { skills: options.skills }),
    },
    version,
  );
}

describe('temporary consumer installations', () => {
  it('installs every supported provider alone and preserves unmanaged instructions', async () => {
    for (const provider of ['claude', 'codex', 'copilot', 'devin'] as const) {
      const target = await consumer();
      try {
        await installProvider(target, [provider]);
        expect(
          (await readManifest(join(target, '.groundtrail'), version)).providers[provider],
        ).toBeDefined();
        if (provider === 'codex') {
          const agents = await readFile(join(target, 'AGENTS.md'), 'utf8');
          expect(agents).toContain('Keep this unmanaged instruction intact.');
          expect(agents).toContain('<!-- groundtrail:start groundtrail:codex:v1 -->');
        }
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    }
  });

  it('supports all non-colliding combinations and preserves existing providers', async () => {
    for (const providers of [
      ['claude', 'codex'],
      ['claude', 'copilot'],
      ['claude', 'devin'],
      ['codex', 'copilot'],
      ['copilot', 'devin'],
      ['claude', 'codex', 'copilot'],
      ['claude', 'copilot', 'devin'],
    ] as const) {
      const target = await consumer();
      try {
        await installProvider(target, [...providers]);
        const manifest = await readManifest(join(target, '.groundtrail'), version);
        expect(Object.keys(manifest.providers).sort()).toEqual([...providers].sort());
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    }
  });

  it('rejects Codex and Devin from existing state before transaction staging or writes', async () => {
    for (const [first, second] of [
      ['codex', 'devin'],
      ['devin', 'codex'],
    ] as const) {
      const target = await consumer();
      try {
        await installProvider(target, [first]);
        const control = join(target, '.groundtrail');
        const before = await readFile(join(control, 'installation.json'), 'utf8');
        await expect(installProvider(target, [second])).rejects.toMatchObject({
          code: 'GT_INSTALL_COMBINATION_UNSUPPORTED',
        });
        expect(await readFile(join(control, 'installation.json'), 'utf8')).toBe(before);
        expect(await lstat(join(control, 'transactions'))).toBeDefined();
        expect((await readManifest(control, version)).providers[second]).toBeUndefined();
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    }
  });

  it('merges additive selections, replaces selected providers, and retains unrequested providers', async () => {
    const target = await consumer();
    try {
      await installProvider(target, ['claude'], { skills: ['repository-discovery'] });
      await installProvider(target, ['claude'], { skills: ['intent-framing'] });
      await installProvider(target, ['copilot'], { skills: ['change-charting'] });
      await installProvider(target, ['claude'], {
        skills: ['repository-discovery'],
        replaceSelection: true,
      });
      const manifest = await readManifest(join(target, '.groundtrail'), version);
      expect(manifest.providers.claude?.skills).toEqual(['repository-discovery']);
      expect(manifest.providers.copilot?.skills).toEqual(['change-charting']);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it('refuses unmanaged file conflicts and managed drift', async () => {
    const target = await consumer();
    try {
      const skill = join(
        target,
        '.claude',
        'skills',
        'groundtrail-repository-discovery',
        'SKILL.md',
      );
      await mkdir(join(skill, '..'), { recursive: true });
      await writeFile(skill, 'unmanaged content');
      await expect(
        installProvider(target, ['claude'], { skills: ['repository-discovery'] }),
      ).rejects.toMatchObject({ code: 'GT_INSTALL_UNMANAGED_CONFLICT' });
      await rm(join(target, '.claude'), { recursive: true, force: true });
      await installProvider(target, ['claude'], { skills: ['repository-discovery'] });
      await writeFile(
        join(target, '.claude', 'skills', 'groundtrail-repository-discovery', 'SKILL.md'),
        'drifted content',
      );
      await expect(
        installProvider(target, ['claude'], { skills: ['intent-framing'] }),
      ).rejects.toMatchObject({ code: 'GT_INSTALL_DRIFT' });
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it('removes only requested provider ownership and preserves unmanaged block files', async () => {
    const target = await consumer();
    try {
      await installProvider(target, ['codex']);
      await installProvider(target, ['codex'], {
        skills: ['none'],
        replaceSelection: true,
      });
      const agents = await readFile(join(target, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('Keep this unmanaged instruction intact.');
      expect(agents).not.toContain('<!-- groundtrail:start groundtrail:codex:v1 -->');
      expect(
        (await readManifest(join(target, '.groundtrail'), version)).providers.codex,
      ).toBeUndefined();
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it('uses the locked dry-run path before computing a consumer plan', async () => {
    const target = await consumer();
    try {
      await expect(installProvider(target, ['claude'], { dryRun: true })).resolves.toMatchObject({
        dryRun: true,
        generation: 0,
      });
      expect((await readManifest(join(target, '.groundtrail'), version)).generation).toBe(0);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it('recovers an abandoned exact transaction without trusting diagnostic process data', async () => {
    const target = await consumer();
    try {
      const control = await createControlDirectory(target);
      const created = await createJournal(control, target, 0, manifestJson(emptyManifest(version)));
      await writeFile(join(created.directory, 'diagnostic-pid.txt'), '999999\n');
      await expect(
        recoverInstallation(target, created.journal.transactionId, 'rollback', version),
      ).resolves.toMatchObject({
        transactionId: created.journal.transactionId,
        phase: 'completed',
      });
      expect((await readJournal(created.directory)).phase).toBe('completed');
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
