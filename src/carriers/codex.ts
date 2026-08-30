// SPDX-License-Identifier: Apache-2.0

import type { CanonicalCatalog } from '../core/canonical-loader.js';
import type { CarrierRenderer, RenderedFile } from './types.js';
import { carrierManifest, normalizedText, selectSkills, skillMarkdown } from './shared.js';

const reductions = [
  'Codex skill frontmatter has no documented tool ceiling; canonical permissions remain instructions and manifest metadata.',
];

export const codexRenderer: CarrierRenderer = {
  provider: 'codex',
  async render(
    catalog: CanonicalCatalog,
    ids: readonly string[],
  ): Promise<readonly RenderedFile[]> {
    const skills = selectSkills(catalog, ids);
    const payload: RenderedFile[] = [
      {
        path: 'AGENTS.md',
        content: normalizedText(`<!-- groundtrail:start codex:v1 -->
# Groundtrail Method

Use the repository-local Groundtrail skills in \`.agents/skills/\` when their activation conditions apply. Keep claims separate from Source Records: a Claim Record never satisfies a Control Point. Bind material work to the current repository revision and stop when the requested Action Band or evidence is unavailable.
<!-- groundtrail:end codex:v1 -->
`),
      },
      ...skills.map((skill) => ({
        path: `.agents/skills/${skill.directory}/SKILL.md`,
        content: skillMarkdown(skill, [
          ['name', skill.directory],
          ['description', JSON.stringify(skill.frontmatter.description)],
        ]),
      })),
    ];
    return [...payload, await carrierManifest('codex', catalog, skills, payload, reductions)];
  },
};
