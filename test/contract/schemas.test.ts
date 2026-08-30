import { describe, expect, it } from 'vitest';
import { SchemaRegistry } from '../../src/core/schemas.js';

const controlPointSchema =
  'https://raw.githubusercontent.com/bajrang0789/agentic-sdlc-kit/main/schemas/v1/control-point.schema.json';

describe('schema registry', () => {
  it('compiles all package-local v1 schemas without fetching references', async () => {
    const registry = await SchemaRegistry.load();
    expect(registry.ids()).toHaveLength(11);
  });

  it('requires sources for satisfied control points', async () => {
    const registry = await SchemaRegistry.load();
    expect(() =>
      registry.validate(controlPointSchema, {
        apiVersion: 'agentic-sdlc-kit/v1',
        id: 'verification-sources-current',
        version: '1',
        status: 'satisfied',
        requiredSourceTypes: ['ci'],
        requiredIssuers: ['ci-main'],
        revision: 'abc1234',
        decidedAt: '2026-08-30T00:00:00Z',
        satisfiedBy: [],
      }),
    ).toThrow(/must NOT have fewer than 1 items/i);
  });
});
