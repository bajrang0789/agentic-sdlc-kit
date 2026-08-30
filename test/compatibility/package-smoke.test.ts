// SPDX-License-Identifier: Apache-2.0

import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '../..');

async function command(command: string, args: readonly string[], cwd: string): Promise<string> {
  const result = await execFile(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 60_000,
  });
  return result.stdout;
}

function npmInvocation(
  args: readonly string[],
  platform: NodeJS.Platform,
  npmExecPath: string | undefined,
): { command: string; args: readonly string[] } {
  if (npmExecPath) return { command: process.execPath, args: [npmExecPath, ...args] };
  return { command: platform === 'win32' ? 'npm.cmd' : 'npm', args };
}

async function npmCommand(args: readonly string[], cwd: string): Promise<string> {
  const invocation = npmInvocation(args, process.platform, process.env.npm_execpath);
  return command(invocation.command, invocation.args, cwd);
}

describe('packed npm tarball', () => {
  it('resolves npm without a shell on Windows', () => {
    expect(npmInvocation(['pack'], 'win32', 'C:\\npm\\npm-cli.js')).toEqual({
      command: process.execPath,
      args: ['C:\\npm\\npm-cli.js', 'pack'],
    });
    expect(npmInvocation(['pack'], 'win32', undefined)).toEqual({
      command: 'npm.cmd',
      args: ['pack'],
    });
  });

  it('contains only distributable content and runs offline CLI smoke commands', async () => {
    const temporary = await mkdtemp(join(tmpdir(), 'groundtrail-pack-'));
    try {
      await npmCommand(['run', 'build'], root);
      const packed = (await npmCommand(['pack', '--json'], root)).trim();
      const metadata = JSON.parse(packed) as Array<{
        filename: string;
        files: Array<{ path: string }>;
      }>;
      const tarball = metadata[0];
      expect(tarball).toBeDefined();
      if (tarball === undefined) throw new Error('npm pack did not create a tarball.');
      const allowedRoots = new Set(['dist', 'schemas', 'skills', 'method', 'adapters']);
      for (const file of tarball.files) {
        const top = file.path.split('/', 1)[0] ?? '';
        expect(
          allowedRoots.has(top) ||
            ['package.json', 'README.md', 'LICENSE', 'NOTICE'].includes(file.path),
        ).toBe(true);
        expect(file.path).not.toMatch(/^(?:test|src|\.github)(?:\/|$)/u);
      }
      await npmCommand(
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(root, tarball.filename)],
        temporary,
      );
      const cliPath = join(
        temporary,
        'node_modules',
        '@bajrang0789',
        'agentic-sdlc-kit',
        'dist',
        'cli.js',
      );
      const groundtrail = (args: readonly string[]) =>
        command(process.execPath, [cliPath, ...args], temporary);
      await expect(groundtrail(['--version'])).resolves.toContain('0.1.0');
      const listed = JSON.parse(await groundtrail(['list', '--json'])) as {
        skills: unknown[];
      };
      expect(listed.skills).toHaveLength(11);
      await expect(
        groundtrail([
          'validate',
          join(temporary, 'node_modules', '@bajrang0789', 'agentic-sdlc-kit', 'skills'),
          '--kind',
          'skill',
        ]),
      ).resolves.toContain('"valid": true');
      const output = join(temporary, 'rendered');
      await expect(
        groundtrail(['render', '--provider', 'claude', '--output', output]),
      ).resolves.toContain('claude');
      const target = join(temporary, 'target');
      await command(
        process.execPath,
        ['-e', "require('node:fs').mkdirSync(process.argv[1])", target],
        temporary,
      );
      await expect(
        groundtrail(['install', '--provider', 'claude', '--target', target, '--dry-run', '--json']),
      ).resolves.toContain('"dryRun":true');
      await expect(
        groundtrail([
          'install',
          'recover',
          '--target',
          target,
          '--transaction',
          '00000000-0000-4000-8000-000000000000',
          '--strategy',
          'rollback',
        ]),
      ).rejects.toMatchObject({ code: 1 });
    } finally {
      for (const file of await readdir(root)) {
        if (file.endsWith('.tgz')) await rm(join(root, file), { force: true });
      }
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);
});
