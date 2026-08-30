// SPDX-License-Identifier: Apache-2.0

import { loadCanonicalCatalog } from '../core/canonical-loader.js';
import { PROVIDERS, type Provider } from '../carriers/types.js';

export async function listSkills(root: string, provider?: Provider): Promise<unknown> {
  const catalog = await loadCanonicalCatalog(root);
  return {
    skills: catalog.skills.map((skill) => ({
      id: skill.id,
      name: skill.frontmatter.name,
      stage: skill.contract.stage,
      actionBand: skill.contract.actionBand.maximum,
      composition: skill.contract.composition,
      providers: provider === undefined ? [...PROVIDERS] : [provider],
      availability: 'renderer-pending',
    })),
  };
}
