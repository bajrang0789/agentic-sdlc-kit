import { describe, expect, it } from 'vitest';
import { planInstallation } from '../../src/install/plan.js';
import { emptyManifest } from '../../src/install/manifest.js';

describe('installation planning', () => {
  const skills = new Set(['repository-discovery', 'intent-framing']);

  it('preserves unrequested providers and merges an additive selection', () => {
    const manifest = {
      ...emptyManifest('0.1.0'),
      providers: {
        claude: {
          mode: 'project' as const,
          skills: ['repository-discovery'],
          carrierDigest: 'a'.repeat(64),
        },
      },
    };
    const plan = planInstallation(
      manifest,
      { providers: ['copilot'], skills: ['intent-framing'], replaceSelection: false },
      skills,
    );
    expect(plan.providers.claude?.skills).toEqual(['repository-discovery']);
    expect(plan.providers.copilot?.skills).toEqual(['intent-framing']);
  });

  it('rejects complete-set Codex and Devin combinations', () => {
    const manifest = {
      ...emptyManifest('0.1.0'),
      providers: {
        codex: {
          mode: 'project' as const,
          skills: ['repository-discovery'],
          carrierDigest: 'a'.repeat(64),
        },
      },
    };
    expect(() =>
      planInstallation(manifest, { providers: ['devin'], replaceSelection: false }, skills),
    ).toThrow(/Codex and Devin/i);
  });

  it('requires an explicit empty replacement selection', () => {
    expect(() =>
      planInstallation(
        emptyManifest('0.1.0'),
        { providers: ['claude'], skills: ['none'], replaceSelection: false },
        skills,
      ),
    ).toThrow(/replace-selection/i);
  });
});
