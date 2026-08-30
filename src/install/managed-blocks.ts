// SPDX-License-Identifier: Apache-2.0

import { sha256 } from '../core/digests.js';

export class ManagedBlockError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ManagedBlockError';
  }
}

export function managedBlock(blockId: string, content: string): string {
  return `<!-- groundtrail:start ${blockId} -->\n${content.replace(/\r\n?/gu, '\n').replace(/\n?$/u, '\n')}<!-- groundtrail:end ${blockId} -->`;
}

export function replaceManagedBlock(existing: string, blockId: string, content: string): string {
  const marker = managedBlock(blockId, content);
  const start = `<!-- groundtrail:start ${blockId} -->`;
  const end = `<!-- groundtrail:end ${blockId} -->`;
  const first = existing.indexOf(start);
  const last = existing.indexOf(end);
  if (first === -1 && last === -1)
    return `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}${marker}\n`;
  if (
    first === -1 ||
    last === -1 ||
    last < first ||
    existing.indexOf(start, first + start.length) !== -1
  )
    throw new ManagedBlockError(
      'GT_MANAGED_BLOCK_CONFLICT',
      'Managed block markers are malformed or duplicated.',
    );
  return `${existing.slice(0, first)}${marker}${existing.slice(last + end.length)}`;
}

export function removeManagedBlock(existing: string, blockId: string): string {
  const start = `<!-- groundtrail:start ${blockId} -->`;
  const end = `<!-- groundtrail:end ${blockId} -->`;
  const first = existing.indexOf(start);
  const last = existing.indexOf(end);
  if (
    first === -1 ||
    last === -1 ||
    last < first ||
    existing.indexOf(start, first + start.length) !== -1
  )
    throw new ManagedBlockError(
      'GT_MANAGED_BLOCK_CONFLICT',
      'Managed block markers are malformed or duplicated.',
    );
  const after = last + end.length;
  const separator = existing.slice(after, after + 1) === '\n' ? 1 : 0;
  return `${existing.slice(0, first)}${existing.slice(after + separator)}`;
}

export function managedBlockDigest(content: string): string {
  return sha256(content.replace(/\r\n?/gu, '\n'));
}
