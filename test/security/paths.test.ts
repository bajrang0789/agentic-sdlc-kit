import { describe, expect, it } from 'vitest';
import { assertCaseUnique, normalizeRelativePath } from '../../src/security/paths.js';

describe('target path protections', () => {
  it('rejects traversal, absolute paths, device names, and decomposed Unicode', () => {
    expect(() => normalizeRelativePath('../escape')).toThrow(/traversal/i);
    expect(() => normalizeRelativePath('/escape')).toThrow(/relative/i);
    expect(() => normalizeRelativePath('NUL.txt')).toThrow(/device/i);
    expect(() => normalizeRelativePath('e\u0301.txt')).toThrow(/NFC/i);
  });

  it('rejects case-fold collisions before writes', () => {
    expect(() => assertCaseUnique(['AGENTS.md', 'agents.md'])).toThrow(/collide/i);
  });
});
