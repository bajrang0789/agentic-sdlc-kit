import { describe, expect, it } from 'vitest';
import { validateControlPointSources } from '../../src/core/evidence.js';

const source = {
  id: 'source-1',
  issuer: { id: 'ci-main', type: 'ci' },
  sourceType: 'ci',
  subject: { id: 'repo', revision: 'abc1234' },
  result: 'pass',
  observedAt: '2026-08-30T00:00:00Z',
};
const control = {
  id: 'checks',
  status: 'satisfied',
  requiredSourceTypes: ['ci'],
  requiredIssuers: ['ci-main'],
  revision: 'abc1234',
  freshnessRequired: true,
  satisfiedBy: ['source-1'],
};

describe('Control Point source resolution', () => {
  it('requires current authoritative matching source records', () => {
    expect(() => validateControlPointSources(control, [source])).not.toThrow();
    expect(() =>
      validateControlPointSources({ ...control, satisfiedBy: ['claim-1'] }, [source]),
    ).toThrow(/missing/i);
    expect(() =>
      validateControlPointSources(control, [
        { ...source, subject: { ...source.subject, revision: 'other' } },
      ]),
    ).toThrow(/revision/i);
    expect(() => validateControlPointSources(control, [{ ...source, result: 'fail' }])).toThrow(
      /result/i,
    );
    expect(() =>
      validateControlPointSources({ ...control, requiredSourceTypes: ['ci', 'scanner'] }, [source]),
    ).toThrow(/type scanner/i);
    expect(() =>
      validateControlPointSources({ ...control, requiredIssuers: ['ci-main', 'security-scan'] }, [
        source,
      ]),
    ).toThrow(/security-scan/i);
  });

  it('requires a current, authorized, approved waiver source record', () => {
    const waiverControl = {
      ...control,
      status: 'waived',
      requiredSourceTypes: ['approval'],
      requiredIssuers: ['steward'],
      waiver: {
        sourceRecordId: 'waiver-1',
        revision: 'abc1234',
        expiresAt: '2026-09-01T00:00:00Z',
      },
    };
    const waiverSource = {
      ...source,
      id: 'waiver-1',
      issuer: { id: 'steward', type: 'authorized-human' },
      sourceType: 'approval',
      result: 'approved',
      expiresAt: '2026-09-01T00:00:00Z',
    };
    expect(() =>
      validateControlPointSources(waiverControl, [waiverSource], new Date('2026-08-30T00:00:00Z')),
    ).not.toThrow();
    expect(() => validateControlPointSources(waiverControl, [])).toThrow(/missing/i);
    expect(() =>
      validateControlPointSources(
        waiverControl,
        [{ ...waiverSource, issuer: { id: 'steward', type: 'ci' } }],
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toThrow(/authorized/i);
    expect(() =>
      validateControlPointSources(
        waiverControl,
        [{ ...waiverSource, subject: { ...source.subject, revision: 'other' } }],
        new Date('2026-08-30T00:00:00Z'),
      ),
    ).toThrow(/revision/i);
    expect(() =>
      validateControlPointSources(waiverControl, [waiverSource], new Date('2026-09-01T00:00:00Z')),
    ).toThrow(/expired/i);
  });
});
