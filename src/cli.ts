#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { Command } from 'commander';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageVersion } from './index.js';
import { listSkills } from './commands/list.js';
import { validatePath, type ValidationKind } from './commands/validate.js';
import { renderCarriers } from './commands/render.js';
import { verifyRecords } from './commands/records.js';
import { install, installRequest } from './commands/install.js';
import { recoverInstallation } from './install/recovery.js';
import { isProvider, PROVIDERS, type Provider } from './carriers/types.js';
import { redactDiagnostic } from './security/redaction.js';
import { asGroundtrailError } from './core/errors.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const program = new Command();
program
  .name('groundtrail')
  .description('Offline Groundtrail canonical-skill validation and installation tooling.')
  .version(packageVersion);

program
  .command('list')
  .option('--provider <provider>')
  .option('--json')
  .action(async (options: { provider?: string; json?: boolean }) => {
    const provider = parseProvider(options.provider);
    print(await listSkills(packageRoot, provider), options.json);
  });

program
  .command('validate <path>')
  .option(
    '--kind <kind>',
    'auto|skill|packet|records|handoff|carrier|installation|reach-map|control-point|source-record',
    'auto',
  )
  .option('--json')
  .action(async (path: string, options: { kind: ValidationKind; json?: boolean }) => {
    print(await validatePath(packageRoot, path, options.kind), options.json);
  });

program
  .command('render')
  .requiredOption('--provider <provider>', 'claude|codex|copilot|devin|all')
  .requiredOption('--output <directory>')
  .option('--skill <id...>')
  .option('--clean')
  .option('--json')
  .action(
    async (options: {
      provider: string;
      output: string;
      skill?: string[];
      clean?: boolean;
      json?: boolean;
    }) => {
      const parsed = options.provider === 'all' ? 'all' : parseProvider(options.provider);
      if (parsed === undefined) throw usage('A provider is required.');
      print(
        await renderCarriers(
          packageRoot,
          parsed,
          options.output,
          options.skill,
          options.clean ?? false,
        ),
        options.json,
      );
    },
  );

const installCommand = program.command('install');
installCommand
  .requiredOption('--provider <provider...>', `one or more: ${PROVIDERS.join(', ')}`)
  .requiredOption('--target <repository>')
  .option('--mode <mode>', 'project only', 'project')
  .option('--skill <id...>')
  .option('--replace-selection')
  .option('--dry-run')
  .option('--json')
  .action(
    async (options: {
      provider: string[];
      target: string;
      mode: string;
      skill?: string[];
      replaceSelection?: boolean;
      dryRun?: boolean;
      json?: boolean;
    }) => {
      if (options.mode !== 'project') throw usage('Only --mode project is supported.');
      const providers = options.provider.map((provider) => parseProvider(provider));
      if (providers.some((provider) => provider === undefined))
        throw usage('Every provider is required.');
      print(
        await install(
          packageRoot,
          options.target,
          {
            ...installRequest(
              providers as Provider[],
              options.skill,
              options.replaceSelection ?? false,
            ),
            dryRun: options.dryRun ?? false,
          },
          packageVersion,
        ),
        options.json,
      );
    },
  );
installCommand
  .command('recover')
  .requiredOption('--target <repository>')
  .requiredOption('--transaction <transaction-id>')
  .requiredOption('--strategy <strategy>', 'resume|rollback')
  .option('--json')
  .action(
    async (options: {
      target: string;
      transaction: string;
      strategy: 'resume' | 'rollback';
      json?: boolean;
    }) => {
      if (options.strategy !== 'resume' && options.strategy !== 'rollback')
        throw usage('Strategy must be resume or rollback.');
      print(
        await recoverInstallation(
          options.target,
          options.transaction,
          options.strategy,
          packageVersion,
        ),
        options.json,
      );
    },
  );

const records = program.command('records');
records
  .command('verify <records>')
  .option('--checkpoint <sequence:digest>')
  .option('--json')
  .action(async (path: string, options: { checkpoint?: string; json?: boolean }) => {
    print(await verifyRecords(packageRoot, path, options.checkpoint), options.json);
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const normalized = asGroundtrailError(error);
  const message = redactDiagnostic(normalized.message);
  const json = process.argv.includes('--json');
  if (json) console.error(JSON.stringify({ valid: false, code: normalized.code, message }));
  else console.error(`${normalized.code}: ${message}`);
  process.exitCode = normalized.exitCode;
}

function parseProvider(value: string | undefined): Provider | undefined {
  if (value === undefined) return undefined;
  if (!isProvider(value)) throw usage(`Provider must be one of ${PROVIDERS.join(', ')}.`);
  return value;
}

function print(value: unknown, json = false): void {
  console.log(json ? JSON.stringify(value) : format(value));
}

function format(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function usage(message: string): Error & { exitCode: number } {
  return Object.assign(new Error(message), { exitCode: 2 });
}
