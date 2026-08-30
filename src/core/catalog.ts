// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseBoundedYaml } from './frontmatter.js';

export interface TrackState {
  readonly id: string;
  readonly terminal: boolean;
  readonly sideState: boolean;
  readonly transitions: readonly string[];
}

export interface MethodCatalog {
  readonly states: ReadonlyMap<string, TrackState>;
  readonly actionBands: ReadonlyMap<string, number>;
  readonly controlPointTypes: ReadonlySet<string>;
  readonly artifacts: ReadonlySet<string>;
}

export class CatalogError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}

export async function loadMethodCatalog(root: string): Promise<MethodCatalog> {
  const [statesSource, bandsSource, controlSource, catalogSource] = await Promise.all([
    readYaml(join(root, 'track-states.yaml')),
    readYaml(join(root, 'action-bands.yaml')),
    readYaml(join(root, 'control-point-types.yaml')),
    readYaml(join(root, 'catalog.yaml')),
  ]);
  const states = arrayField(statesSource, 'states').map((state) => {
    if (
      !isRecord(state) ||
      typeof state.id !== 'string' ||
      typeof state.terminal !== 'boolean' ||
      typeof state.sideState !== 'boolean'
    ) {
      throw new CatalogError('GT_CATALOG_STATE', 'Track state has an invalid shape.');
    }
    const transitions = stringArray(state.transitions, 'state transitions');
    return [
      state.id,
      { id: state.id, terminal: state.terminal, sideState: state.sideState, transitions },
    ] as const;
  });
  const stateMap = new Map(states);
  if (stateMap.size !== states.length)
    throw new CatalogError('GT_CATALOG_DUPLICATE_STATE', 'Track state IDs must be unique.');
  for (const state of stateMap.values())
    for (const target of state.transitions)
      if (!stateMap.has(target))
        throw new CatalogError('GT_CATALOG_EDGE', `Unknown lifecycle target: ${target}.`);
  const bandEntries: [string, number][] = arrayField(bandsSource, 'bands').map(
    (band): [string, number] => {
      if (!isRecord(band) || typeof band.id !== 'string' || !Number.isSafeInteger(band.rank))
        throw new CatalogError('GT_CATALOG_BAND', 'Action Band has an invalid shape.');
      return [band.id, Number(band.rank)];
    },
  );
  const controlPointTypes = new Set(
    arrayField(controlSource, 'controlPointTypes').map((point) => {
      if (!isRecord(point) || typeof point.id !== 'string')
        throw new CatalogError('GT_CATALOG_CONTROL_POINT', 'Control Point has an invalid shape.');
      return point.id;
    }),
  );
  return {
    states: stateMap,
    actionBands: new Map(bandEntries),
    controlPointTypes,
    artifacts: new Set(stringArray(catalogSource.artifacts, 'artifacts')),
  };
}

export function assertLifecycleEdge(catalog: MethodCatalog, from: string, to: string): void {
  if (!catalog.states.get(from)?.transitions.includes(to))
    throw new CatalogError('GT_LIFECYCLE_EDGE', `Transition ${from} -> ${to} is not allowed.`);
}

async function readYaml(path: string): Promise<Record<string, unknown>> {
  const value = parseBoundedYaml(await readFile(path, 'utf8'));
  if (!isRecord(value))
    throw new CatalogError('GT_CATALOG_SHAPE', `${path} must be a YAML object.`);
  return value;
}

function arrayField(value: Record<string, unknown>, field: string): unknown[] {
  if (!Array.isArray(value[field]))
    throw new CatalogError('GT_CATALOG_SHAPE', `${field} must be an array.`);
  return value[field];
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    throw new CatalogError('GT_CATALOG_SHAPE', `${label} must be strings.`);
  return value as string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
