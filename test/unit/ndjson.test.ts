import { describe, expect, it } from 'vitest';
import { trailRecordDigest } from '../../src/core/digests.js';
import {
  parseNdjson,
  validateControlPointEvidence,
  validateRecordChain,
  type TrailRecord,
} from '../../src/core/ndjson.js';

function record(
  sequence: number,
  priorDigest: string,
  id: string,
  kind: TrailRecord['kind'] = 'claim',
): TrailRecord {
  const input = {
    apiVersion: 'agentic-sdlc-kit/v1',
    id,
    threadId: 'thread-1',
    sequence,
    priorDigest,
    digest: '0'.repeat(64),
    kind,
    recordedAt: '2026-08-30T00:00:00Z',
    actor: { id: 'actor-1', type: 'agent' },
    repository: { id: 'repo-1', revision: 'abc1234' },
  } as unknown as TrailRecord;
  return { ...input, digest: trailRecordDigest(input) };
}

describe('Trail Record chains', () => {
  it('validates a genesis and contiguous source record chain', () => {
    const first = record(
      0,
      'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566',
      'claim-1',
    );
    const second = record(1, first.digest, 'source-1', 'source');
    validateRecordChain([first, second], undefined, { sequence: 1, digest: second.digest });
    validateControlPointEvidence({ status: 'satisfied', satisfiedBy: ['source-1'] }, [
      first,
      second,
    ]);
  });

  it('rejects bad origin, gaps, and Claim Records as evidence', () => {
    const first = record(
      0,
      'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566',
      'claim-1',
    );
    expect(() => validateRecordChain([{ ...first, priorDigest: '0'.repeat(64) }])).toThrow(
      /priorDigest/i,
    );
    expect(() => validateRecordChain([{ ...first, sequence: 1 }])).toThrow(/contiguous/i);
    expect(() =>
      validateControlPointEvidence({ status: 'satisfied', satisfiedBy: ['claim-1'] }, [first]),
    ).toThrow(/not a Source Record/i);
  });

  it('allows an explicit pre-release revision invalidation only when returning to implementation', () => {
    const first = record(
      0,
      'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566',
      'frame',
      'lifecycle',
    );
    const source = {
      ...record(1, first.digest, 'source', 'source'),
      transition: { from: 'implementing', to: 'verifying' },
    } as TrailRecord;
    const sourceWithDigest = { ...source, digest: trailRecordDigest(source) };
    const invalidationInput = {
      ...record(2, sourceWithDigest.digest, 'invalidate', 'control-decision'),
      revisionInvalidation: {
        fromRevision: 'abc1234',
        toRevision: 'def5678',
        staleRecordIds: ['source'],
      },
    } as TrailRecord;
    const invalidation = {
      ...invalidationInput,
      digest: trailRecordDigest(invalidationInput),
    };
    const returnedInput = {
      ...record(3, invalidation.digest, 'return', 'lifecycle'),
      repository: { id: 'repo-1', revision: 'def5678' },
      transition: { from: 'verifying', to: 'implementing' },
    } as TrailRecord;
    const returned = { ...returnedInput, digest: trailRecordDigest(returnedInput) };
    expect(() =>
      validateRecordChain([first, sourceWithDigest, invalidation, returned]),
    ).not.toThrow();
    const invalidBadInput = {
      ...invalidation,
      revisionInvalidation: {
        ...invalidation.revisionInvalidation,
        staleRecordIds: ['missing'],
      },
    } as TrailRecord;
    const invalidBad = { ...invalidBadInput, digest: trailRecordDigest(invalidBadInput) };
    expect(() => validateRecordChain([first, sourceWithDigest, invalidBad, returned])).toThrow(
      /invalidation/i,
    );
  });

  it('parses NDJSON without blank records', () => {
    const first = record(
      0,
      'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566',
      'claim-1',
    );
    expect(parseNdjson(JSON.stringify(first)).length).toBe(1);
    expect(() => parseNdjson(`${JSON.stringify(first)}\n\n`)).toThrow(/Blank/i);
  });
});

it('requires supersession references to point backward', () => {
  const first = record(
    0,
    'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566',
    'claim-1',
  );
  const second = { ...record(1, first.digest, 'claim-2'), supersedesId: 'missing' };
  expect(() => validateRecordChain([first, second])).toThrow(/supersedes/i);
});
