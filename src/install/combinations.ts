// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '../carriers/types.js';

export class CombinationError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CombinationError';
  }
}

export function validateProviderCombination(providers: Iterable<Provider>): void {
  const selected = new Set(providers);
  if (selected.has('codex') && selected.has('devin'))
    throw new CombinationError(
      'GT_INSTALL_COMBINATION_UNSUPPORTED',
      'Codex and Devin cannot be installed together because their skill paths collide.',
    );
}
