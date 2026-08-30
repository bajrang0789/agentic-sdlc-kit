// SPDX-License-Identifier: Apache-2.0

import type { CanonicalCatalog } from '../core/canonical-loader.js';

export const PROVIDERS = ['claude', 'codex', 'copilot', 'devin'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type ProviderMode = 'project';

export interface RenderedFile {
  readonly path: string;
  readonly content: Uint8Array;
}

export interface CarrierRenderer {
  readonly provider: Provider;
  render(catalog: CanonicalCatalog, skills: readonly string[]): Promise<readonly RenderedFile[]>;
}

export class CarrierUnsupportedError extends Error {
  public constructor(public readonly provider: Provider) {
    super(`${provider} Carrier rendering is not available in this build.`);
    this.name = 'CarrierUnsupportedError';
  }
}

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}
