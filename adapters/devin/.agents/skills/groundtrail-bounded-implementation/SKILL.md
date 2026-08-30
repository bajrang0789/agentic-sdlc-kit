---
name: groundtrail-bounded-implementation
description: "Implement only the approved change chart scope while recording decisions, deviations, and current revision references. Use when local workspace authority and implementation prerequisites are available."
allowed-tools:
  - read
  - grep
  - glob
  - edit
---

<!-- Groundtrail carrier: id=bounded-implementation; version=0.1.0; canonical-digest=bb9cf5cb608ae0e060abc80312e02049cfef3938bc42126bba14c0f538f1f6c8; action-band=workspace; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `bounded-implementation`; canonical SHA-256: `bb9cf5cb608ae0e060abc80312e02049cfef3938bc42126bba14c0f538f1f6c8`.
- Maximum Action Band: `workspace`. Required Control Points: `implementation-chart-approved`.
- Required artifacts: `ground-packet`, `change-chart`. Produced artifacts: `claim-record`, `handoff-bundle`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
- Carrier capability reductions: `shell:allowlisted reduced to no shell execution because verified Devin Skill frontmatter has no command-scoped exec ceiling`, `network denial retained as procedure restriction; no verified Skill tool ceiling`.
# Bounded implementation

## Purpose

Apply the smallest local change that fulfills the chart while retaining a traceable account of decisions and deviations.

## When to use

Use after a current change chart is approved by the applicable process. Re-enter only with a refreshed chart when a material change invalidates prior work.

## Required inputs

- A current Ground Packet and approved change chart.

- A writable local worktree at the bound revision.
- Explicitly allowlisted local checks, if any, and a defined scope boundary.

## Stop and ask conditions

- Stop before changing anything when the chart, authorization, revision, or workspace boundary is missing or stale.

- Stop when a needed change falls outside the chart; record the deviation and request a revised chart.
- Do not push, open or modify reviews, merge, release, deploy, use secrets, or mutate external systems.

## Procedure

1. Reconfirm the current revision, scope, Action Band, and chart approval.

2. Inspect affected files before editing and keep changes within charted paths and stated deviations.
3. Apply the minimum local edits needed for the documented outcome.
4. Do not run local checks in this Devin carrier; request an authorized local check and record its result as a claim or supplied Source Record.
5. Record implementation decisions, deviations, changed paths, and outstanding work as Claim Records or Trail Records.
6. Update the Handoff Bundle inputs with freshness and unresolved decisions.

## Outputs

- Local patch or change references limited to the charted scope.

- Claim Record references for implementation decisions and deviations.
- An updated Handoff Bundle or the information required to produce one.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes change charting and precedes verification. A deviation returns to change charting; it does not silently alter downstream obligations.

## Failure behavior

Leave the workspace in its current safely saved state when blocked. Report changed paths, unrun checks, and the exact reason for stopping. Do not compensate by widening permissions or externalizing the change.

## Example

The chart permits edits in one parser and its tests. A request to change a shared formatter is recorded as an out-of-scope deviation, so no formatter edit is applied.
