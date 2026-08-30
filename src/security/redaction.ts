// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';

export function redactDiagnostic(value: string): string {
  const home = homedir();
  return value.replaceAll(home, '<home>').replace(/(?:[A-Za-z]:)?[/\\][^\s"']+/gu, '<path>');
}
