// SPDX-License-Identifier: Apache-2.0

import { TRAIL_RECORD_ORIGIN, trailRecordDigest } from './digests.js';
import { GroundtrailParseError, parseBoundedJson } from './json.js';
import type { MethodCatalog } from './catalog.js';

const MAX_RECORDS = 100_000;

export interface TrailRecord {
  readonly id: string;
  readonly threadId: string;
  readonly sequence: number;
  readonly priorDigest: string;
  readonly digest: string;
  readonly kind: 'lifecycle' | 'claim' | 'source' | 'control-decision' | 'handoff' | 'learning';
  readonly repository: { readonly revision: string };
  readonly transition?: { readonly from: string; readonly to: string };
  readonly revisionInvalidation?: {
    readonly fromRevision: string;
    readonly toRevision: string;
    readonly staleRecordIds: readonly string[];
  };
  readonly supersedesId?: string;
  readonly [key: string]: unknown;
}

export class RecordValidationError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly line?: number,
  ) {
    super(message);
    this.name = 'RecordValidationError';
  }
}

export function parseNdjson(input: Uint8Array | string): readonly TrailRecord[] {
  let text: string;
  try {
    text =
      typeof input === 'string' ? input : new TextDecoder('utf-8', { fatal: true }).decode(input);
  } catch {
    throw new RecordValidationError('GT_NDJSON_UTF8', 'NDJSON must be valid UTF-8.');
  }
  if (text.includes('\0'))
    throw new RecordValidationError('GT_NDJSON_NUL', 'NDJSON contains a NUL byte.');
  const lines = text.replace(/\r\n?/gu, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length === 0 || lines.length > MAX_RECORDS)
    throw new RecordValidationError(
      'GT_NDJSON_COUNT',
      'NDJSON record count is outside the allowed limit.',
    );
  return lines.map((line, index) => {
    if (line.length === 0)
      throw new RecordValidationError(
        'GT_NDJSON_BLANK',
        'Blank NDJSON records are not allowed.',
        index + 1,
      );
    try {
      const value = parseBoundedJson(line);
      if (!isRecord(value))
        throw new RecordValidationError(
          'GT_NDJSON_SHAPE',
          'NDJSON line must be a JSON object.',
          index + 1,
        );
      return value as TrailRecord;
    } catch (error) {
      if (error instanceof RecordValidationError) throw error;
      const message = error instanceof Error ? error.message : 'Invalid JSON.';
      const code = error instanceof GroundtrailParseError ? error.code : 'GT_NDJSON_JSON';
      throw new RecordValidationError(code, message, index + 1);
    }
  });
}

export function validateRecordChain(
  records: readonly TrailRecord[],
  catalog?: MethodCatalog,
  checkpoint?: { sequence: number; digest: string },
): void {
  if (records.length === 0)
    throw new RecordValidationError('GT_CHAIN_EMPTY', 'A chain requires record zero.');
  const ids = new Set<string>();
  const seenIds = new Set<string>();
  const threadId = records[0]?.threadId;
  let previousDigest = TRAIL_RECORD_ORIGIN;
  let revision: string | undefined;
  let currentState: string | undefined;
  let pendingRevision: string | undefined;
  const revisionBoundIds = new Set<string>();
  for (const [index, record] of records.entries()) {
    const line = index + 1;
    if (record.sequence !== index || !Number.isSafeInteger(record.sequence))
      throw new RecordValidationError(
        'GT_CHAIN_SEQUENCE',
        'Record sequences must be contiguous beginning at zero.',
        line,
      );
    if (record.threadId !== threadId)
      throw new RecordValidationError(
        'GT_CHAIN_THREAD',
        'All records must have the same Change Thread ID.',
        line,
      );
    if (record.supersedesId !== undefined && !seenIds.has(record.supersedesId))
      throw new RecordValidationError(
        'GT_CHAIN_SUPERSEDES',
        'supersedesId must reference an earlier Trail Record.',
        line,
      );
    if (ids.has(record.id))
      throw new RecordValidationError('GT_CHAIN_ID', 'Record IDs must be unique.', line);
    ids.add(record.id);
    seenIds.add(record.id);
    if (record.priorDigest !== previousDigest)
      throw new RecordValidationError(
        index === 0 ? 'GT_CHAIN_ORIGIN' : 'GT_CHAIN_PRIOR_DIGEST',
        'Record priorDigest does not link to the expected digest.',
        line,
      );
    if (!/^[0-9a-f]{64}$/u.test(record.digest))
      throw new RecordValidationError(
        'GT_CHAIN_DIGEST_FORMAT',
        'Record digest must be lowercase SHA-256 hex.',
        line,
      );
    if (trailRecordDigest(record) !== record.digest)
      throw new RecordValidationError(
        'GT_CHAIN_DIGEST',
        'Record self-digest does not match JCS content.',
        line,
      );
    const recordRevision = record.repository?.revision;
    if (typeof recordRevision !== 'string')
      throw new RecordValidationError(
        'GT_CHAIN_REVISION',
        'Record repository revision is required.',
        line,
      );
    if (revision === undefined) revision = recordRevision;
    else if (revision !== recordRevision) {
      if (pendingRevision !== recordRevision)
        throw new RecordValidationError(
          'GT_CHAIN_REVISION',
          'A Change Thread revision requires an explicit invalidation record.',
          line,
        );
      revision = recordRevision;
      pendingRevision = undefined;
    }
    if (record.revisionInvalidation !== undefined) {
      const invalidation = record.revisionInvalidation;
      if (
        record.kind !== 'control-decision' ||
        currentState === undefined ||
        !['verifying', 'assessing', 'release_ready'].includes(currentState) ||
        invalidation.fromRevision !== revision ||
        invalidation.toRevision === revision ||
        invalidation.staleRecordIds.some((id) => !revisionBoundIds.has(id))
      )
        throw new RecordValidationError(
          'GT_CHAIN_REVISION_INVALIDATION',
          'Revision invalidation must name prior records while verifying through release readiness.',
          line,
        );
      pendingRevision = invalidation.toRevision;
    }
    if (record.transition !== undefined) {
      if (
        pendingRevision !== undefined &&
        !['implementing', 'verifying'].includes(record.transition.to)
      )
        throw new RecordValidationError(
          'GT_CHAIN_REVISION_INVALIDATION',
          'Revision invalidation must return to implementing or verifying.',
          line,
        );
      if (currentState !== undefined && record.transition.from !== currentState)
        throw new RecordValidationError(
          'GT_CHAIN_LIFECYCLE_CONTINUITY',
          'Lifecycle transition must begin at the preceding lifecycle state.',
          line,
        );
      if (
        catalog !== undefined &&
        !catalog.states.get(record.transition.from)?.transitions.includes(record.transition.to)
      )
        throw new RecordValidationError(
          'GT_CHAIN_LIFECYCLE',
          'Record transition is not an allowed lifecycle edge.',
          line,
        );
      currentState = record.transition.to;
    }
    if (record.kind === 'source' || record.kind === 'control-decision' || record.kind === 'handoff')
      revisionBoundIds.add(record.id);
    previousDigest = record.digest;
  }
  if (checkpoint !== undefined) {
    const record = records[checkpoint.sequence];
    if (record?.digest !== checkpoint.digest)
      throw new RecordValidationError(
        'GT_CHECKPOINT_MISMATCH',
        'Checkpoint is not an exact record digest.',
      );
  }
}

export function validateControlPointEvidence(
  controlPoint: { status: string; satisfiedBy?: readonly string[] },
  records: readonly TrailRecord[],
): void {
  if (controlPoint.status !== 'satisfied') return;
  if (controlPoint.satisfiedBy === undefined || controlPoint.satisfiedBy.length === 0)
    throw new RecordValidationError(
      'GT_CONTROL_POINT_SOURCES',
      'Satisfied Control Point requires a Source Record.',
    );
  const kinds = new Map(records.map((record) => [record.id, record.kind]));
  for (const id of controlPoint.satisfiedBy)
    if (kinds.get(id) !== 'source')
      throw new RecordValidationError(
        'GT_CONTROL_POINT_CLAIM',
        `Control Point satisfiedBy ${id} is not a Source Record.`,
      );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
