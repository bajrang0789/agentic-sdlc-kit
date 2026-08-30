// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { claudeMarketplace } from '../src/carriers/claude.js';
import { rendererFor } from '../src/carriers/render-all.js';
import { PROVIDERS } from '../src/carriers/types.js';
import { loadCanonicalCatalog } from '../src/core/canonical-loader.js';
import { writeRegularFile } from '../src/install/transaction.js';

const root = resolve(import.meta.dirname, '..');
const generated = await mkdtemp(join(tmpdir(), 'groundtrail-carriers-'));
try {
  const catalog = await loadCanonicalCatalog(root);
  const ids = catalog.skills.map((skill) => skill.id);
  for (const provider of PROVIDERS) {
    const base = provider === 'claude' ? 'claude/groundtrail' : provider;
    for (const file of await rendererFor(provider).render(catalog, ids))
      await writeRegularFile(generated, `adapters/${base}/${file.path}`, file.content);
  }
  const marketplace = claudeMarketplace();
  await writeRegularFile(generated, marketplace.path, marketplace.content);
  const actual = await files(root, new Set(['adapters', '.claude-plugin']));
  const expected = await files(generated, new Set(['adapters', '.claude-plugin']));
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      'GT_CARRIER_DRIFT: committed carrier output differs from deterministic generation.',
    );
} finally {
  await rm(generated, { recursive: true, force: true });
}

async function files(
  rootDirectory: string,
  topLevel: ReadonlySet<string>,
): Promise<readonly string[]> {
  const paths: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const path = relative(rootDirectory, full).replaceAll('\\', '/');
        const content = await readFile(full);
        paths.push(`${path}\0${content.toString('base64')}`);
      }
    }
  }
  for (const name of [...topLevel].sort()) {
    const directory = join(rootDirectory, name);
    try {
      await walk(directory);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === 'ENOENT'
      )
        continue;
      throw error;
    }
  }
  return paths.sort();
}
