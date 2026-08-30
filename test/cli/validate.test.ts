import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePath } from '../../src/commands/validate.js';

const root = resolve(import.meta.dirname, '../..');

describe('validate command', () => {
  it('auto-validates an example directory recursively', async () => {
    const source = join(root, 'examples');
    const temporary = await mkdtemp(join(tmpdir(), 'groundtrail-example-'));
    await cp(source, temporary, { recursive: true });
    await expect(validatePath(root, temporary, 'auto')).resolves.toMatchObject({
      kind: 'examples',
      valid: true,
    });
  });

  it('rejects a schema-valid Carrier manifest whose canonical contract is tampered', async () => {
    const temporary = await mkdtemp(join(tmpdir(), 'groundtrail-carrier-'));
    const carrier = join(root, 'adapters', 'claude', 'groundtrail');
    await cp(carrier, temporary, { recursive: true });
    const path = join(temporary, 'carrier-manifest.json');
    const manifest = JSON.parse(await readFile(path, 'utf8')) as {
      canonicalSkills: Array<{ actionBand: string }>;
    };
    manifest.canonicalSkills[0]!.actionBand = 'delegated';
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    await expect(validatePath(root, temporary, 'carrier')).rejects.toMatchObject({
      code: 'GT_CARRIER_SEMANTIC',
    });
  });

  it('recognizes standalone reach maps, control points, and source records', async () => {
    await expect(
      validatePath(root, join(root, 'examples/small-web-change/reach-map.json'), 'auto'),
    ).resolves.toMatchObject({ kind: 'reach-map' });
    await expect(
      validatePath(
        root,
        join(root, 'examples/small-web-change/invalid/control-point-claim-as-evidence.json'),
        'auto',
      ),
    ).rejects.toMatchObject({ code: 'GT_CONTROL_POINT_SOURCE_MISSING' });
    const temporary = await mkdtemp(join(tmpdir(), 'groundtrail-source-'));
    const source = {
      apiVersion: 'agentic-sdlc-kit/v1',
      id: 'ci-source',
      issuer: { id: 'ci', type: 'ci' },
      sourceType: 'ci',
      subject: { id: 'repo', revision: 'abc1234' },
      evidenceType: 'test',
      result: 'pass',
      observedAt: '2026-08-30T00:00:00Z',
      collectionMethod: 'automated',
    };
    await writeFile(join(temporary, 'source-record.json'), JSON.stringify(source));
    await expect(
      validatePath(root, join(temporary, 'source-record.json'), 'auto'),
    ).resolves.toMatchObject({ kind: 'source-record' });
  });
});
