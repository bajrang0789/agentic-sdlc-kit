// SPDX-License-Identifier: Apache-2.0

import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { claudeMarketplace } from '../src/carriers/claude.js';
import { rendererFor } from '../src/carriers/render-all.js';
import { PROVIDERS } from '../src/carriers/types.js';
import { loadCanonicalCatalog } from '../src/core/canonical-loader.js';
import { writeRegularFile } from '../src/install/transaction.js';

const root = resolve(import.meta.dirname, '..');
const adapters = resolve(root, 'adapters');

await rm(adapters, { recursive: true, force: true });
await mkdir(adapters, { recursive: true, mode: 0o755 });
const catalog = await loadCanonicalCatalog(root);
const ids = catalog.skills.map((skill) => skill.id);
for (const provider of PROVIDERS) {
  const base = provider === 'claude' ? 'claude/groundtrail' : provider;
  const files = await rendererFor(provider).render(catalog, ids);
  for (const file of files) await writeRegularFile(adapters, `${base}/${file.path}`, file.content);
}
const marketplace = claudeMarketplace();
await writeRegularFile(root, marketplace.path, marketplace.content);
