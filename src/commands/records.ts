// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { loadCanonicalCatalog } from '../core/canonical-loader.js';
import { parseNdjson, validateRecordChain } from '../core/ndjson.js';
import { SchemaRegistry } from '../core/schemas.js';

export async function verifyRecords(
  root: string,
  path: string,
  checkpoint?: string,
): Promise<{ records: number; valid: true }> {
  const records = parseNdjson(await readFile(path));
  const registry = await SchemaRegistry.load();
  const trailSchema =
    'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/trail-record.schema.json';
  for (const record of records) registry.validate(trailSchema, record);
  const catalog = await loadCanonicalCatalog(root);
  validateRecordChain(records, catalog.method, parseCheckpoint(checkpoint));
  return { records: records.length, valid: true };
}

function parseCheckpoint(
  input: string | undefined,
): { sequence: number; digest: string } | undefined {
  if (input === undefined) return undefined;
  const match = /^(?<sequence>0|[1-9][0-9]*):(?<digest>[0-9a-f]{64})$/u.exec(input);
  if (match?.groups?.sequence === undefined || match.groups.digest === undefined)
    throw new Error('Checkpoint must be <sequence>:<lowercase-sha256-digest>.');
  return { sequence: Number(match.groups.sequence), digest: match.groups.digest };
}
