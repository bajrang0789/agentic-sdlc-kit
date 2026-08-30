// SPDX-License-Identifier: Apache-2.0

import type { CanonicalCatalog } from '../core/canonical-loader.js';
import type { CarrierRenderer, RenderedFile } from './types.js';
import { carrierManifest, normalizedText, selectSkills, skillMarkdown } from './shared.js';
import { packageVersion } from '../index.js';

const reductions = [
  'Claude plugin skill metadata does not encode canonical permission ceilings; the carrier body preserves them.',
];

export const claudeRenderer: CarrierRenderer = {
  provider: 'claude',
  async render(
    catalog: CanonicalCatalog,
    ids: readonly string[],
  ): Promise<readonly RenderedFile[]> {
    const skills = selectSkills(catalog, ids);
    const payload: RenderedFile[] = [
      {
        path: '.claude-plugin/plugin.json',
        content: normalizedText(
          `${JSON.stringify(
            {
              name: 'groundtrail',
              description: 'Evidence-led Groundtrail Method skills for bounded software delivery.',
              version: packageVersion,
              author: { name: 'Groundtrail Method maintainers' },
              homepage: 'https://github.com/bajrang0789/agentic-sdlc-kit',
              repository: 'https://github.com/bajrang0789/agentic-sdlc-kit',
              license: 'Apache-2.0',
              keywords: ['groundtrail', 'evidence', 'sdlc'],
            },
            null,
            2,
          )}\n`,
        ),
      },
      ...skills.map((skill) => ({
        path: `skills/${skill.directory}/SKILL.md`,
        content: skillMarkdown(skill, [
          ['name', skill.directory],
          ['description', JSON.stringify(skill.frontmatter.description)],
          ['license', 'Apache-2.0'],
        ]),
      })),
    ];
    return [...payload, await carrierManifest('claude', catalog, skills, payload, reductions)];
  },
};

export function claudeMarketplace(): RenderedFile {
  return {
    path: '.claude-plugin/marketplace.json',
    content: normalizedText(
      `${JSON.stringify(
        {
          name: 'groundtrail-marketplace',
          owner: { name: 'Groundtrail Method maintainers' },
          plugins: [
            {
              name: 'groundtrail',
              source: './adapters/claude/groundtrail',
              strict: true,
            },
          ],
        },
        null,
        2,
      )}\n`,
    ),
  };
}
