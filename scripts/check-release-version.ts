// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import YAML from 'yaml';

interface PackageMetadata {
  readonly name: string;
  readonly version: string;
}

interface CarrierManifest {
  readonly version: string;
  readonly canonicalSkills: readonly { readonly id: string; readonly version: string }[];
}

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const packageMetadata = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8'),
) as PackageMetadata;
const version = packageMetadata.version;
if (!isSemver(version)) fail(`package.json has invalid version ${version}.`);

const manifest = JSON.parse(
  await readFile(resolve(root, '.release-please-manifest.json'), 'utf8'),
) as Record<string, unknown>;
if (manifest['.'] !== version) fail('Release Please manifest version does not match package.json.');

const cliSource = await readFile(resolve(root, 'src/cli.ts'), 'utf8');
const versionSource = await readFile(resolve(root, 'src/index.ts'), 'utf8');
if (
  !cliSource.includes("import { packageVersion } from './index.js';") ||
  !cliSource.includes('.version(packageVersion)')
)
  fail('CLI does not derive --version from the package version export.');
if (!versionSource.includes("require('../package.json')"))
  fail('Package version export does not read package.json.');

const cliPath = resolve(root, 'dist/cli.js');
const cliVersion = (
  await run(process.execPath, [cliPath, '--version'], { cwd: root })
).stdout.trim();
if (cliVersion !== version)
  fail(`CLI version ${cliVersion} does not match package.json ${version}.`);

for (const entry of await readdir(resolve(root, 'skills'), { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('groundtrail-')) continue;
  const contract = YAML.parse(
    await readFile(resolve(root, 'skills', entry.name, 'contract.yaml'), 'utf8'),
  ) as {
    version?: unknown;
  };
  if (contract.version !== version)
    fail(`${entry.name}/contract.yaml does not match package.json.`);
}

for (const path of [
  'adapters/claude/groundtrail/carrier-manifest.json',
  'adapters/codex/carrier-manifest.json',
  'adapters/copilot/carrier-manifest.json',
  'adapters/devin/carrier-manifest.json',
]) {
  const carrier = JSON.parse(await readFile(resolve(root, path), 'utf8')) as CarrierManifest;
  if (carrier.version !== version) fail(`${path} version does not match package.json.`);
  for (const skill of carrier.canonicalSkills)
    if (skill.version !== version)
      fail(`${path} canonical skill ${skill.id} does not match package.json.`);
}

const tag = process.env.GROUNDTRAIL_RELEASE_TAG;
if (tag !== undefined && tag !== `v${version}`)
  fail(`release tag ${tag} does not match expected v${version}.`);

console.log(`Release version agreement passed for ${packageMetadata.name}@${version}.`);

function isSemver(value: string): boolean {
  return /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
    value,
  );
}

function fail(message: string): never {
  throw new Error(`GT_RELEASE_VERSION_MISMATCH: ${message}`);
}
