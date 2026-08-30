// SPDX-License-Identifier: Apache-2.0

import { SchemaRegistry } from '../src/core/schemas.js';

const registry = await SchemaRegistry.load();
if (registry.ids().length !== 11)
  throw new Error(`Expected eleven v1 schemas, found ${registry.ids().length}.`);
console.log(`Compiled ${registry.ids().length} Groundtrail schemas offline.`);
