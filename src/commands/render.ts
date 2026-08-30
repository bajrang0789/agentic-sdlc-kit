// SPDX-License-Identifier: Apache-2.0

import { mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { rendererFor } from '../carriers/render-all.js';
import { PROVIDERS, type Provider } from '../carriers/types.js';
import { loadCanonicalCatalog } from '../core/canonical-loader.js';
import { writeRegularFile } from '../install/transaction.js';

export async function renderCarriers(
  root: string,
  provider: Provider | 'all',
  output: string,
  skills: readonly string[] | undefined,
  clean: boolean,
): Promise<{ providers: readonly Provider[]; output: string }> {
  const catalog = await loadCanonicalCatalog(root);
  const selected =
    skills === undefined ? catalog.skills.map((skill) => skill.id) : [...new Set(skills)].sort();
  for (const id of selected)
    if (!catalog.skills.some((skill) => skill.id === id))
      throw new Error(`Unknown canonical skill: ${id}.`);
  const out = resolve(output);
  const children = await readdir(out).catch((error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'ENOENT'
    )
      return [];
    throw error;
  });
  if (children.length > 0) {
    if (clean)
      throw new Error(
        '--clean requires a prior Groundtrail render manifest; no unmanaged output was removed.',
      );
    throw new Error('Render output must be a new directory.');
  }
  await mkdir(out, { recursive: true, mode: 0o755 });
  const providers = provider === 'all' ? [...PROVIDERS] : [provider];
  for (const current of providers) {
    const files = await rendererFor(current).render(catalog, selected);
    for (const file of files) await writeRegularFile(out, join(current, file.path), file.content);
  }
  return { providers, output: out };
}
