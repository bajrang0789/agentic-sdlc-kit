// SPDX-License-Identifier: Apache-2.0

import type { MethodCatalog } from './catalog.js';

export interface SkillContractLike {
  readonly id: string;
  readonly requires: { readonly artifacts: readonly string[]; readonly states: readonly string[] };
  readonly produces: { readonly artifacts: readonly string[]; readonly states: readonly string[] };
  readonly composition: { readonly after: readonly string[]; readonly before: readonly string[] };
  readonly actionBand: { readonly maximum: string };
  readonly permissions: Readonly<Record<string, string>>;
  readonly controlPoints: { readonly enter: readonly string[]; readonly exit: readonly string[] };
  readonly freshness: { readonly bindToRevision: boolean };
}

export class CompositionError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CompositionError';
  }
}

export function validateComposition(
  contracts: readonly SkillContractLike[],
  catalog: MethodCatalog,
): void {
  const byId = new Map(contracts.map((contract) => [contract.id, contract]));
  if (byId.size !== contracts.length)
    throw new CompositionError('GT_COMPOSITION_DUPLICATE', 'Skill IDs must be unique.');
  const edges = new Map<string, Set<string>>(
    contracts.map((contract) => [contract.id, new Set<string>()]),
  );
  for (const contract of contracts) {
    validateContractReferences(contract, catalog);
    for (const predecessor of contract.composition.after)
      addEdge(edges, predecessor, contract.id, byId);
    for (const successor of contract.composition.before)
      addEdge(edges, contract.id, successor, byId);
  }
  assertAcyclic(edges);
  for (const contract of contracts) {
    for (const artifact of contract.requires.artifacts) {
      if (!catalog.artifacts.has(artifact))
        throw new CompositionError('GT_COMPOSITION_ARTIFACT', `Unknown artifact ${artifact}.`);
      if (artifact === 'ground-packet') continue;
      const producers = contracts.filter((candidate) =>
        candidate.produces.artifacts.includes(artifact),
      );
      if (producers.length === 0)
        throw new CompositionError(
          'GT_COMPOSITION_UNPRODUCED_ARTIFACT',
          `No skill produces ${artifact}.`,
        );
    }
  }
}

function validateContractReferences(contract: SkillContractLike, catalog: MethodCatalog): void {
  if (!catalog.actionBands.has(contract.actionBand.maximum))
    throw new CompositionError(
      'GT_COMPOSITION_BAND',
      `Unknown Action Band ${contract.actionBand.maximum}.`,
    );
  for (const state of [...contract.requires.states, ...contract.produces.states])
    if (!catalog.states.has(state))
      throw new CompositionError('GT_COMPOSITION_STATE', `Unknown state ${state}.`);
  for (const point of [...contract.controlPoints.enter, ...contract.controlPoints.exit])
    if (!catalog.controlPointTypes.has(point))
      throw new CompositionError('GT_COMPOSITION_CONTROL_POINT', `Unknown Control Point ${point}.`);
  const rank = catalog.actionBands.get(contract.actionBand.maximum) ?? -1;
  if (rank < 2 && contract.permissions.filesystem === 'write')
    throw new CompositionError(
      'GT_PERMISSION_MONOTONICITY',
      'Filesystem write requires workspace or higher.',
    );
  if (rank < 3 && contract.permissions.externalMutation !== 'deny')
    throw new CompositionError(
      'GT_PERMISSION_MONOTONICITY',
      'External mutation requires gated or higher.',
    );
}

function addEdge(
  edges: Map<string, Set<string>>,
  from: string,
  to: string,
  contracts: ReadonlyMap<string, SkillContractLike>,
): void {
  if (!contracts.has(from) || !contracts.has(to))
    throw new CompositionError(
      'GT_COMPOSITION_REFERENCE',
      `Composition references unknown skill ${!contracts.has(from) ? from : to}.`,
    );
  edges.get(from)?.add(to);
}

function assertAcyclic(edges: ReadonlyMap<string, ReadonlySet<string>>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id))
      throw new CompositionError('GT_COMPOSITION_CYCLE', `Composition contains a cycle at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of edges.keys()) visit(id);
}
