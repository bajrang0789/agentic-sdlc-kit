import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const fullSha = /^[a-f0-9]{40}$/;

async function workflow(name: string): Promise<Record<string, unknown>> {
  const content = await readFile(resolve(root, '.github/workflows', name), 'utf8');
  const document = parseDocument(content, { uniqueKeys: true });
  expect(document.errors).toEqual([]);
  return document.toJS() as Record<string, unknown>;
}

function actionReferences(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(actionReferences);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      key === 'uses' && typeof child === 'string' ? [child] : actionReferences(child),
    );
  }
  return [];
}

function actionSha(reference: string): string {
  const separator = reference.lastIndexOf('@');
  return separator === -1 ? '' : (reference.slice(separator + 1).split(/[\s#]/, 1)[0] ?? '');
}

describe('security workflows', () => {
  it('uses immutable full-SHA action references', async () => {
    const workflows = await Promise.all([
      workflow('ci.yml'),
      workflow('generated.yml'),
      workflow('codeql.yml'),
      workflow('dependency-review.yml'),
    ]);
    const references = workflows.flatMap(actionReferences);

    expect(references).not.toHaveLength(0);
    for (const reference of references) {
      expect(actionSha(reference), `${reference} must be pinned to a full commit SHA`).toMatch(
        fullSha,
      );
    }
  });

  it('grants only necessary workflow permissions', async () => {
    const codeql = await workflow('codeql.yml');
    const dependencyReview = await workflow('dependency-review.yml');

    expect(codeql.permissions).toEqual({
      contents: 'read',
      'security-events': 'write',
    });
    expect(dependencyReview.permissions).toEqual({ contents: 'read' });
  });

  it('uses the required credential-free CI matrix and full Ubuntu compatibility suite', async () => {
    const ci = await workflow('ci.yml');
    expect(ci.permissions).toEqual({ contents: 'read' });
    const jobs = ci.jobs as Record<string, Record<string, unknown>>;
    expect(jobs.ci?.name).toBe('ci');
    expect(jobs.compatibility?.name).toBe('compatibility');
    expect(jobs.ci?.strategy).toMatchObject({
      matrix: { os: ['ubuntu-latest', 'macos-latest', 'windows-latest'], node: ['22', '24'] },
    });
  });

  it('keeps publication credentials out of security workflow configuration', async () => {
    for (const name of ['ci.yml', 'generated.yml', 'codeql.yml', 'dependency-review.yml']) {
      const content = await readFile(resolve(root, '.github/workflows', name), 'utf8');
      expect(content).not.toMatch(/\b(?:NPM_TOKEN|NODE_AUTH_TOKEN|PAT)\b/);
    }
  });
});
