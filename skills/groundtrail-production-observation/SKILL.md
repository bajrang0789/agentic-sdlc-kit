---
name: groundtrail-production-observation
description: Compare deployed behavior and telemetry Source Records with expected outcomes. Use after a release transition when post-release evidence is available for observation.
license: Apache-2.0
compatibility: Requires supplied deployment and telemetry Source Records with read access; no commands, network, external mutation, or production access is required.
metadata:
  groundtrail-contract: '1'
  groundtrail-id: 'production-observation'
---

# Production observation

## Purpose

Evaluate supplied production evidence against the expected outcome and recommend a lifecycle outcome without operating production systems.

## When to use

Use after an authorized external release transition, during the observation window, or when a regression report requires a revision-bound comparison.

## Required inputs

- Current Ground Packet and release packet.

- Supplied deployment, telemetry, incident, or operational Source Record references.
- Expected outcomes, observation window, rollback conditions, and Reach Map context.

## Stop and ask conditions

- Stop when no authoritative deployed-revision or telemetry source is supplied, when sources are stale, or when the observed revision cannot be matched to the packet.

- Escalate urgent indicators through the designated incident path; do not attempt production access or rollback.
- Do not call a release successful based on an agent observation alone.

## Procedure

1. Confirm the deployed subject and source revision match the release packet.

2. Check source authority, observation time, expiry, and coverage against the defined window.
3. Compare expected outcomes and rollback triggers with observed behavior, retaining confidence and unknowns.
4. Distinguish a Source Record result from the skill’s interpretation.
5. Produce an observation record and source-record references for the supplied evidence, then propose `completed`, continued observation, `regressed`, or `blocked` for the authorized lifecycle process.
6. Hand off anomalies with the current evidence references and next Control Points.

## Outputs

- An observation record bound to deployment and revision sources.
- Source-record references that identify the supplied deployment, telemetry, incident, or operational evidence without issuing or altering Source Records.
- An outcome decision proposal, never a self-executed state transition or production action.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Follows release readiness and an external releasing transition. A regression may feed incident learning and a linked implementation path without rewriting the released thread.

## Failure behavior

Report inconclusive observation with missing sources, stale timing, or unknown reach. If supplied sources indicate harm, preserve the evidence references and request the authorized incident or rollback action.

## Example

Telemetry sources show the deployed parser revision and normal error rates during its stated window. The skill proposes `completed`; the lifecycle decision remains with the authorized process.
