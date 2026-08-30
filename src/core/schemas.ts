// SPDX-License-Identifier: Apache-2.0

import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { ErrorObject, ValidateFunction } from 'ajv';

interface AjvInstance {
  addSchema(schema: object): void;
  getSchema(id: string): ValidateFunction | undefined;
}

interface AjvConstructor {
  new (options: Record<string, unknown>): AjvInstance;
}

const require = createRequire(import.meta.url);
const Ajv2020 = (require('ajv/dist/2020.js') as { default: AjvConstructor }).default;
const addFormats = (require('ajv-formats') as { default: (ajv: AjvInstance) => AjvInstance })
  .default;

export const SCHEMA_DIRECTORY = new URL('../../schemas/v1/', import.meta.url);

export class SchemaValidationError extends Error {
  public constructor(
    public readonly code: string,
    public readonly errors: readonly ErrorObject[],
  ) {
    super(
      errors
        .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
        .join('; '),
    );
    this.name = 'SchemaValidationError';
  }
}

export class SchemaRegistry {
  private readonly validators = new Map<string, ValidateFunction>();

  public static async load(directory = SCHEMA_DIRECTORY): Promise<SchemaRegistry> {
    const registry = new SchemaRegistry();
    const paths = (await readdir(directory)).filter((name) => name.endsWith('.schema.json')).sort();
    const schemas = await Promise.all(
      paths.map(
        async (path) => JSON.parse(await readFile(new URL(path, directory), 'utf8')) as object,
      ),
    );
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      strictRequired: false,
      validateFormats: true,
      loadSchema: undefined,
    });
    addFormats(ajv);
    for (const schema of schemas) ajv.addSchema(schema);
    for (const schema of schemas) {
      const id = (schema as { $id?: unknown }).$id;
      if (typeof id !== 'string') throw new Error(`Schema is missing $id.`);
      const validator = ajv.getSchema(id);
      if (validator === undefined) throw new Error(`Schema did not compile: ${id}`);
      registry.validators.set(id, validator);
    }
    return registry;
  }

  public validate(schemaId: string, value: unknown): void {
    const validator = this.validators.get(schemaId);
    if (validator === undefined) throw new Error(`Unknown local schema: ${schemaId}`);
    if (!validator(value))
      throw new SchemaValidationError('GT_SCHEMA_INVALID', validator.errors ?? []);
  }

  public has(schemaId: string): boolean {
    return this.validators.has(schemaId);
  }

  public ids(): readonly string[] {
    return [...this.validators.keys()].sort();
  }
}
