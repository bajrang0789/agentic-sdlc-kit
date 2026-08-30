---
name: groundtrail-verification-matrix
description: "Map acceptance criteria and Reach Map entries to test layers, then collect current source references and claims. Use after bounded implementation or when verification coverage needs reevaluation."
---

<!-- Groundtrail carrier: id=verification-matrix; version=0.1.0; canonical-digest=150baa91aaaba2e54715352e46e5cc0d5a77f09841cc9d2c2ec61b06200716af; action-band=workspace; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `verification-matrix`; canonical SHA-256: `150baa91aaaba2e54715352e46e5cc0d5a77f09841cc9d2c2ec61b06200716af`.
- Maximum Action Band: `workspace`. Required Control Points: `verification-sources-current`.
- Required artifacts: `ground-packet`, `change-chart`, `claim-record`. Produced artifacts: `verification-matrix`, `claim-record`, `source-record-reference`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
# Verification matrix

## Purpose

Make verification coverage explicit and distinguish test observations from authoritative verification evidence.

## When to use

Use after bounded implementation, after a material revision, or when an acceptance criterion and its validation layer are not clearly linked.

## Required inputs

- A current Ground Packet, requirement map, change chart, and Reach Map context.

- Changed-path references and documented or allowlisted local checks.
- Any supplied Source Record references from authorized verification systems.

## Stop and ask conditions

- Stop and ask when an acceptance criterion lacks a feasible test layer, expected evidence authority is unknown, or the revision changed.

- Do not claim local output satisfies a Control Point.
- Do not access remote systems or credentials to manufacture evidence.

## Procedure

1. Recheck revision binding for requirements, changes, and supplied sources.

2. Create a matrix from acceptance criteria and Reach Map entries to unit, integration, contract, manual, or operational validation layers as appropriate.
3. Run only allowlisted local checks and capture their outcomes as claims or local observations.
4. Create source-record references to supplied current Source Records by issuer, subject, revision, result, and expiry; do not issue, alter, or represent the referenced Source Records as skill output.
5. Identify uncovered criteria, untested inferred reach, and evidence that must be collected by an authorized system.
6. Recommend the status of verification Control Points without satisfying them yourself.

## Outputs

- A revision-bound verification matrix.

- Claim Record references for local observations and coverage reasoning.
- Source-record references that identify supplied Source Records without issuing or altering them, plus explicit gaps where they are absent.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes bounded implementation and precedes security and change assessment. It may send an incomplete matrix back to implementation or charting through a recorded decision.

## Failure behavior

Return the matrix with uncovered rows and mark verification incomplete. If a check cannot run, retain the reason and required next source instead of substituting confidence for evidence.

## Example

A matrix ties malformed-name criteria to parser unit tests and upload integration tests. A local passing run is a claim; the current CI result is listed separately as the Source Record sought for the verification Control Point.
