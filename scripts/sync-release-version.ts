// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import YAML from 'yaml';

interface PackageMetadata {
  readonly version: string;
}

const root = resolve(import.meta.dirname, '..');
const packageMetadata = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8'),
) as PackageMetadata;
const version = packageMetadata.version;
if (!isSemver(version))
  throw new Error(`GT_RELEASE_VERSION_INVALID: package.json has invalid version ${version}.`);

const skillsRoot = resolve(root, 'skills');
for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('groundtrail-')) continue;
  const path = resolve(skillsRoot, entry.name, 'contract.yaml');
  const source = await readFile(path, 'utf8');
  const document = YAML.parseDocument(source, { uniqueKeys: true });
  if (document.errors.length > 0)
    throw new Error(`GT_RELEASE_VERSION_INVALID: ${path} is invalid YAML.`);
  document.set('version', version);
  await writeFile(path, document.toString({ lineWidth: 0 }), 'utf8');
}

function isSemver(value: string): boolean {
  return /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
    value,
  );
}
