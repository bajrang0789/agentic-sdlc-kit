// SPDX-License-Identifier: Apache-2.0

import type { CarrierRenderer, Provider } from './types.js';
import { claudeRenderer } from './claude.js';
import { codexRenderer } from './codex.js';
import { copilotRenderer } from './copilot.js';
import { devinRenderer } from './devin.js';

const renderers: Readonly<Record<Provider, CarrierRenderer>> = {
  claude: claudeRenderer,
  codex: codexRenderer,
  copilot: copilotRenderer,
  devin: devinRenderer,
};

export function rendererFor(provider: Provider): CarrierRenderer {
  return renderers[provider];
}
