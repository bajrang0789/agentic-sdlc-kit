import { describe, expect, it } from 'vitest';
import {
  canonicalizeJcs,
  normalizeTreePath,
  sha256,
  TRAIL_RECORD_ORIGIN,
  treeDigest,
} from '../../src/core/digests.js';

describe('digest primitives', () => {
  it('uses the fixed lowercase trail origin', () => {
    expect(TRAIL_RECORD_ORIGIN).toBe(
      'fe9a17fed1d85c7b4ab3f33d739e3a8cdd5a2b5159bd1de7af8a03da13394566',
    );
  });

  it('applies RFC 8785 JCS through the selected implementation', () => {
    expect(canonicalizeJcs({ z: 1, a: ['x', true] })).toBe('{"a":["x",true],"z":1}');
  });

  it('normalizes text and frames paths without ambiguity', () => {
    const lf = treeDigest([{ path: 'notes/a.txt', content: Buffer.from('first\nsecond\n') }]);
    const crlf = treeDigest([
      { path: 'notes/a.txt', content: Buffer.from('\uFEFFfirst\r\nsecond\r\n') },
    ]);
    expect(lf.digest).toBe(crlf.digest);
    expect(() => normalizeTreePath('../escape.txt')).toThrow(/invalid segment/i);
    expect(() => normalizeTreePath('e\u0301.txt')).toThrow(/NFC/i);
  });

  it('uses lowercase SHA-256', () => {
    expect(sha256('groundtrail')).toMatch(/^[0-9a-f]{64}$/u);
  });
});

it('rejects lone surrogate values before JCS hashing', () => {
  expect(() => canonicalizeJcs({ value: '\ud800' })).toThrow(/surrogate/i);
});
