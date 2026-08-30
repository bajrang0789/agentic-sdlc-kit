// SPDX-License-Identifier: Apache-2.0

import type { CanonicalCatalog, CanonicalSkill } from '../core/canonical-loader.js';
import type { CarrierRenderer, RenderedFile } from './types.js';
import { carrierManifest, normalizedText, selectSkills, skillMarkdown } from './shared.js';

type AgentProfile = {
  readonly name: string;
  readonly description: string;
  readonly skills: readonly string[];
  readonly tools: readonly string[];
};

const reductions = [
  'Copilot skill frontmatter has no documented permission ceiling; canonical permissions remain in skill bodies and manifest metadata.',
  'Focused custom agents use the strictest available tool alias set for their assigned skills.',
];

export const copilotRenderer: CarrierRenderer = {
  provider: 'copilot',
  async render(
    catalog: CanonicalCatalog,
    ids: readonly string[],
  ): Promise<readonly RenderedFile[]> {
    const skills = selectSkills(catalog, ids);
    const payload: RenderedFile[] = [
      {
        path: '.github/copilot-instructions.md',
        content: normalizedText(`# Groundtrail Method

Use the repository-local \`.github/skills/groundtrail-*\` skills when their activation conditions apply. A Claim Record never satisfies a Control Point. Treat unsupported conclusions as claims or unknowns, bind work to the current revision, and do not exceed the canonical Action Band.
`),
      },
      {
        path: '.github/instructions/groundtrail.instructions.md',
        content: normalizedText(`---
applyTo: "**"
---

For Groundtrail artifacts, preserve canonical IDs, evidence semantics, Control Points, revision freshness, and Action Bands. A provider configuration cannot grant authority beyond the relevant canonical contract.
`),
      },
      ...skills.map((skill) => ({
        path: `.github/skills/${skill.directory}/SKILL.md`,
        content: skillMarkdown(skill, [
          ['name', skill.directory],
          ['description', JSON.stringify(skill.frontmatter.description)],
        ]),
      })),
      ...profiles(skills).map((profile) => agentFile(profile, skills)),
    ];
    return [...payload, await carrierManifest('copilot', catalog, skills, payload, reductions)];
  },
};

function profiles(skills: readonly CanonicalSkill[]): readonly AgentProfile[] {
  const present = new Set(skills.map((skill) => skill.id));
  const assigned = (ids: readonly string[]): string[] => ids.filter((id) => present.has(id));
  return [
    {
      name: 'planner',
      description:
        'Frame and chart bounded Groundtrail changes without applying workspace mutations.',
      skills: assigned([
        'repository-discovery',
        'intent-framing',
        'change-charting',
        'evidence-handoff',
      ]),
      tools: ['read'],
    },
    {
      name: 'builder',
      description: 'Implement an approved bounded Groundtrail change and run allowed local checks.',
      skills: assigned(['bounded-implementation', 'verification-matrix', 'security-assessment']),
      tools: ['read', 'edit', 'execute'],
    },
    {
      name: 'verifier',
      description: 'Assess evidence and verification without inheriting builder write authority.',
      skills: assigned([
        'verification-matrix',
        'security-assessment',
        'change-assessment',
        'evidence-handoff',
      ]),
      tools: ['read'],
    },
    {
      name: 'release-steward',
      description:
        'Prepare release readiness and observation records without bypassing Control Points.',
      skills: assigned([
        'release-readiness',
        'production-observation',
        'incident-learning',
        'evidence-handoff',
      ]),
      tools: ['read'],
    },
  ];
}

function agentFile(profile: AgentProfile, skills: readonly CanonicalSkill[]): RenderedFile {
  const selected = profile.skills
    .map((id) => skills.find((skill) => skill.id === id))
    .filter(isSkill);
  const details = selected
    .map(
      (skill) =>
        `- \`${skill.directory}\`: maximum Action Band \`${skill.contract.actionBand.maximum}\`.`,
    )
    .join('\n');
  return {
    path: `.github/agents/groundtrail-${profile.name}.agent.md`,
    content: normalizedText(`---
description: ${JSON.stringify(profile.description)}
tools: [${profile.tools.map((tool) => JSON.stringify(tool)).join(', ')}]
---

# Groundtrail ${profile.name}

Use only these relevant repository skills:
${details || '- No selected skill is available for this partial render.'}

A Claim Record never satisfies a Control Point. Keep evidence current for the bound revision, respect the most restrictive Action Band, and stop rather than broadening authority.
`),
  };
}

function isSkill(value: CanonicalSkill | undefined): value is CanonicalSkill {
  return value !== undefined;
}
