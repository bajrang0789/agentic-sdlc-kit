// SPDX-License-Identifier: Apache-2.0

import { createRequire } from 'node:module';

interface PackageMetadata {
  readonly version: string;
}

/** Reads package metadata when the package is loaded, avoiding a duplicated source literal. */
function loadPackageMetadata(): PackageMetadata {
  const require = createRequire(import.meta.url);
  return require('../package.json') as PackageMetadata;
}

/** The package manifest is the single runtime source for the Groundtrail version. */
export const packageVersion = loadPackageMetadata().version;
