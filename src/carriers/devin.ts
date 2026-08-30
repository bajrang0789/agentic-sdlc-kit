// SPDX-License-Identifier: Apache-2.0

import type { CanonicalCatalog, CanonicalSkill } from '../core/canonical-loader.js';
import type { CarrierRenderer, RenderedFile } from './types.js';
import {
  carrierManifest,
  normalizedText,
  selectSkills,
  skillMarkdown,
  type SkillReduction,
} from './shared.js';

const reductions = [
  'Devin allowed-tools is an additional tool ceiling; session and provider policy remain authoritative.',
  'No verified Skill frontmatter syntax command-scopes exec or enforces the canonical network and external-mutation ceilings.',
  'Skills with canonical shell:allowlisted are rendered without exec. They remain valid for inspection, editing where permitted, evidence collection, and requesting an authorized local check.',
];

export const devinRenderer: CarrierRenderer = {
  provider: 'devin',
  async render(
    catalog: CanonicalCatalog,
    ids: readonly string[],
  ): Promise<readonly RenderedFile[]> {
    const skills = selectSkills(catalog, ids);
    const payload: RenderedFile[] = [
      ...skills.map((skill) => ({
        path: `.agents/skills/${skill.directory}/SKILL.md`,
        content: skillMarkdown(
          devinSkill(skill),
          [
            ['name', skill.directory],
            ['description', JSON.stringify(skill.frontmatter.description)],
            ['allowed-tools', `\n  - ${allowedTools(skill).join('\n  - ')}`],
          ],
          reductionsForSkill(skill),
        ),
      })),
      ...knowledgeExports(),
      ...skills.map(playbook),
      {
        path: 'optional/export-guide.md',
        content: normalizedText(`# Optional Devin exports

The files in \`optional/knowledge/\` and \`optional/playbooks/\` are portable source exports, not installed repository-native Skills. Devin documentation describes Knowledge and Playbooks as separately managed product surfaces; this package does not call Devin APIs or claim that copying a Markdown file installs either surface. Use the current Devin product UI or documented API workflow after reviewing each export against the target organization policy.
`),
      },
    ];
    return [
      ...payload,
      await carrierManifest('devin', catalog, skills, payload, reductions, reductionsForSkill),
    ];
  },
};

function devinSkill(skill: CanonicalSkill): CanonicalSkill {
  if (skill.contract.permissions.shell !== 'allowlisted') return skill;
  return {
    ...skill,
    body: skill.body.replace(
      /Run only allowlisted local checks([^\n.]*)\./gu,
      'Do not run local checks in this Devin carrier; request an authorized local check and record its result as a claim or supplied Source Record.',
    ),
  };
}

function allowedTools(skill: CanonicalSkill): readonly string[] {
  const permissions = skill.contract.permissions;
  const tools = ['read', 'grep', 'glob'];
  if (permissions.filesystem === 'write') tools.push('edit');
  if (permissions.filesystem === 'read' && permissions.shell !== 'deny')
    throw new Error(
      `GT_DEVIN_UNREPRESENTABLE: ${skill.id} has an invalid read-only shell allowance.`,
    );
  return tools;
}

function reductionsForSkill(skill: CanonicalSkill): SkillReduction {
  const reductionsForSkill: string[] = [];
  if (skill.contract.permissions.shell === 'allowlisted')
    reductionsForSkill.push(
      'shell:allowlisted reduced to no shell execution because verified Devin Skill frontmatter has no command-scoped exec ceiling',
    );
  if (skill.contract.permissions.network === 'deny')
    reductionsForSkill.push(
      'network denial retained as procedure restriction; no verified Skill tool ceiling',
    );
  if (skill.contract.permissions.externalMutation !== 'deny')
    reductionsForSkill.push(
      'external mutation retained as procedure restriction; no verified Skill tool ceiling',
    );
  return reductionsForSkill;
}

function knowledgeExports(): readonly RenderedFile[] {
  return [
    {
      path: 'optional/knowledge/groundtrail-method.md',
      content: normalizedText(
        '# Groundtrail Method\n\nGroundtrail is an evidence-led, provider-neutral method for Change Threads. It distinguishes Claim Records from Source Records and binds material context to a repository revision.\n',
      ),
    },
    {
      path: 'optional/knowledge/evidence-rules.md',
      content: normalizedText(
        '# Evidence rules\n\nA Claim Record never satisfies a Control Point. Only a current Source Record from an allowed authority can satisfy one. Unsupported conclusions remain claims or unknowns.\n',
      ),
    },
    {
      path: 'optional/knowledge/vocabulary.md',
      content: normalizedText(
        '# Vocabulary\n\nA Ground Packet supplies bounded context. A Trail Record is append-only lifecycle evidence. A Handoff Bundle transfers current state, freshness, and next Control Points.\n',
      ),
    },
  ];
}

function playbook(skill: CanonicalSkill): RenderedFile {
  const forbidden = [
    'Do not broaden permissions, Action Bands, or evidence authority.',
    'Do not treat a Claim Record as Control Point evidence.',
  ];
  return {
    path: `optional/playbooks/${skill.directory}.devin.md`,
    content: normalizedText(`# ${skill.directory}

## Outcome

${skill.contract.summary}

## Procedure

Use the primary repository-native skill \`${skill.directory}\` and retain its current revision binding and evidence rules.

## Specifications

Maximum Action Band: \`${skill.contract.actionBand.maximum}\`. Required Control Points: ${[...skill.contract.controlPoints.enter, ...skill.contract.controlPoints.exit].join(', ') || 'none'}.

## Advice

Label unsupported conclusions as claims or unknowns and prepare a freshness-aware handoff when work pauses.

## Forbidden Actions

${forbidden.map((entry) => `- ${entry}`).join('\n')}

## Required from User

A current Ground Packet, the relevant repository revision, and any policy-required authority or Source Records.
`),
  };
}
