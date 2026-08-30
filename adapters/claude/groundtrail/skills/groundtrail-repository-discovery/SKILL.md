---
name: groundtrail-repository-discovery
description: "Map an unfamiliar repository, its commands, boundaries, and unresolved context before requirements or implementation work. Use when starting a Change Thread or when repository context is stale."
license: Apache-2.0
---

<!-- Groundtrail carrier: id=repository-discovery; version=0.1.0; canonical-digest=293705e2f39e623e1d6f1282d30eeb7c4c86d7165bc1aceef8b204c861e4c723; action-band=observe; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `repository-discovery`; canonical SHA-256: `293705e2f39e623e1d6f1282d30eeb7c4c86d7165bc1aceef8b204c861e4c723`.
- Maximum Action Band: `observe`. Required Control Points: `context-bounded`.
- Required artifacts: `ground-packet`. Produced artifacts: `repository-map`, `trail-record`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
# Repository discovery

## Purpose

Create a bounded repository map that tells later work what was inspected, what it means, and what remains unknown.

## When to use

Use at the start of a Change Thread, after a material revision invalidates prior context, or whenever the supplied repository map is missing or no longer trustworthy.

## Required inputs

- A Ground Packet or equivalent change identifier, repository identity, and revision.

- Read access to the local repository and any supplied constraints.
- Any prior repository map only as stale context until its revision binding is checked.

## Stop and ask conditions

- Stop when the repository identity or revision is absent, the requested scope is ambiguous, or required paths are inaccessible; record the gap and request the missing input.

- Stop rather than infer ownership, runtime behavior, or command safety from filenames alone.
- Do not run commands, write files, access a network, or change external systems.

## Procedure

1. Confirm the repository identity, material revision, requested outcome, and local boundary.

2. Inspect the supplied files and repository structure needed to locate entry points, configuration, tests, documentation, and ownership clues.
3. Separate observed facts from inferred relationships and unknowns; retain a source path for each observation.
4. Identify likely validation commands only when documented in inspected material; label unverified commands as candidates.
5. Produce the repository map and append a Trail Record describing the bounded discovery result.

## Outputs

- A revision-bound repository map with inspected areas, boundaries, command candidates, ownership clues, and known unknowns.

- A Trail Record reference that records the discovery outcome; it is not source evidence for a Control Point.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Run before intent framing. Its repository map supplies bounded context to intent framing and later planning. It may be repeated when the revision changes.

## Failure behavior

Return a partial map marked with its coverage and unknowns when inspection cannot finish. Move the Change Thread to `needs_input` or `blocked` only through the applicable recorded process; do not conceal the missing context.

## Example

For a revision that adds a parser module, the map identifies the parser directory, its unit tests, a documented local test candidate, and an uninspected deployment path. The deployment path remains an unknown, not a claim of no impact.
