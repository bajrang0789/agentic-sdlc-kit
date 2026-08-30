// SPDX-License-Identifier: Apache-2.0

import { carrierDigest, type InstallationManifest, type ProviderInstallation } from './manifest.js';
import { validateProviderCombination } from './combinations.js';
import type { Provider } from '../carriers/types.js';

export interface InstallRequest {
  readonly providers: readonly Provider[];
  readonly skills?: readonly string[];
  readonly replaceSelection: boolean;
}

export interface InstallPlan {
  readonly providers: Readonly<Partial<Record<Provider, ProviderInstallation>>>;
  readonly requestedProviders: readonly Provider[];
  readonly operations: readonly string[];
}

export function planInstallation(
  manifest: InstallationManifest,
  request: InstallRequest,
  validSkills: ReadonlySet<string>,
): InstallPlan {
  if (request.providers.length === 0) throw new Error('At least one provider is required.');
  const requested = [...new Set(request.providers)].sort();
  const supplied = request.skills === undefined ? undefined : [...new Set(request.skills)].sort();
  if (supplied?.includes('none') && (supplied.length !== 1 || !request.replaceSelection))
    throw new Error(
      '--skill none requires --replace-selection and cannot be combined with another skill.',
    );
  const selection = supplied?.[0] === 'none' ? [] : supplied;
  for (const skill of selection ?? [])
    if (!validSkills.has(skill)) throw new Error(`Unknown canonical skill: ${skill}.`);
  const providers: Partial<Record<Provider, ProviderInstallation>> = { ...manifest.providers };
  const operations: string[] = [];
  for (const provider of requested) {
    const current = manifest.providers[provider];
    const nextSkills =
      selection === undefined
        ? (current?.skills ?? [...validSkills].sort())
        : request.replaceSelection
          ? selection
          : [...new Set([...(current?.skills ?? []), ...selection])].sort();
    if (nextSkills.length === 0) {
      delete providers[provider];
      operations.push(`remove ${provider} selection`);
      continue;
    }
    providers[provider] = {
      mode: 'project',
      skills: nextSkills,
      carrierDigest: carrierDigest(provider, nextSkills),
    };
    operations.push(
      `${current === undefined ? 'create' : 'update'} ${provider} (${nextSkills.join(', ')})`,
    );
  }
  validateProviderCombination(Object.keys(providers) as Provider[]);
  return { providers, requestedProviders: requested, operations };
}
