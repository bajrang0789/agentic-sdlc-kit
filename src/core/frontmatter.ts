// SPDX-License-Identifier: Apache-2.0

import { parseDocument } from 'yaml';

export const MAX_TEXT_BYTES = 1_048_576;
const MAX_ALIASES = 16;

export interface SkillFrontmatter {
  readonly name: string;
  readonly description: string;
  readonly license?: string;
  readonly compatibility?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export class FrontmatterError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FrontmatterError';
  }
}

export function parseBoundedYaml(text: string): unknown {
  assertText(text);
  const document = parseDocument(text, { uniqueKeys: true, prettyErrors: false });
  if (document.errors.length > 0) {
    throw new FrontmatterError('GT_YAML_INVALID', document.errors[0]?.message ?? 'Invalid YAML.');
  }
  if (document.warnings.length > 0) {
    throw new FrontmatterError(
      'GT_YAML_WARNING',
      document.warnings[0]?.message ?? 'Unsupported YAML construct.',
    );
  }
  return document.toJS({ maxAliasCount: MAX_ALIASES });
}

export function parseSkillFrontmatter(text: string): SkillFrontmatter {
  assertText(text);
  const normalized = text.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(normalized);
  if (!match)
    throw new FrontmatterError(
      'GT_FRONTMATTER_MISSING',
      'SKILL.md must begin with a YAML frontmatter block.',
    );
  const value = parseBoundedYaml(match[1] ?? '');
  if (!isRecord(value))
    throw new FrontmatterError('GT_FRONTMATTER_SHAPE', 'Frontmatter must be a YAML object.');
  const name = requiredString(value, 'name', 64);
  if (!/^groundtrail-[a-z][a-z0-9-]{0,62}$/u.test(name)) {
    throw new FrontmatterError(
      'GT_FRONTMATTER_NAME',
      'Frontmatter name must be a groundtrail lowercase kebab-case name.',
    );
  }
  const description = requiredString(value, 'description', 1024);
  if (description.length === 0)
    throw new FrontmatterError('GT_FRONTMATTER_DESCRIPTION', 'Description must not be empty.');
  const metadata = value.metadata === undefined ? undefined : parseMetadata(value.metadata);
  return {
    name,
    description,
    ...(value.license === undefined ? {} : { license: requiredString(value, 'license', 256) }),
    ...(value.compatibility === undefined
      ? {}
      : { compatibility: requiredString(value, 'compatibility', 2048) }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

function assertText(text: string): void {
  if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES)
    throw new FrontmatterError('GT_TEXT_TOO_LARGE', 'Text input exceeds the byte limit.');
  if (text.includes('\0'))
    throw new FrontmatterError('GT_TEXT_NUL', 'Text input contains a NUL byte.');
}

function parseMetadata(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value))
    throw new FrontmatterError('GT_FRONTMATTER_METADATA', 'metadata must be an object of strings.');
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string')
      throw new FrontmatterError('GT_FRONTMATTER_METADATA', `metadata.${key} must be a string.`);
    result[key] = entry;
  }
  return result;
}

function requiredString(value: Record<string, unknown>, key: string, maxLength: number): string {
  const entry = value[key];
  if (typeof entry !== 'string' || entry.length > maxLength)
    throw new FrontmatterError('GT_FRONTMATTER_FIELD', `${key} must be a bounded string.`);
  return entry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
