// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path';
import { loadMethodCatalog } from '../src/core/catalog.js';
import { SchemaRegistry } from '../src/core/schemas.js';
import { readFile } from 'node:fs/promises';
import { parseBoundedYaml } from '../src/core/frontmatter.js';

const root = resolve(import.meta.dirname, '..');
const method = resolve(root, 'method');
const catalog = await loadMethodCatalog(method);
const schemas = await SchemaRegistry.load();
const stateCatalog = parseBoundedYaml(await readFile(resolve(method, 'track-states.yaml'), 'utf8'));
schemas.validate(
  'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/track-state.schema.json',
  stateCatalog,
);
if (
  !catalog.states.get('unframed')?.transitions.includes('framed') ||
  !catalog.states.get('observing')?.transitions.includes('completed')
) {
  throw new Error('Method catalog does not include the primary lifecycle.');
}
console.log('Groundtrail method catalogs are valid.');
