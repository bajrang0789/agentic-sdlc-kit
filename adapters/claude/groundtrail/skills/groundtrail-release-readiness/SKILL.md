---
name: groundtrail-release-readiness
description: "Assemble release scope, rollback conditions, required approvals, and deployment evidence expectations. Use when an assessed change is being prepared for an explicitly authorized release decision."
license: Apache-2.0
---

<!-- Groundtrail carrier: id=release-readiness; version=0.1.0; canonical-digest=55b785b8bd8730bb561c1e4b64234ae4efc1d85ad98de87034a53c66e3c38fd9; action-band=gated; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `release-readiness`; canonical SHA-256: `55b785b8bd8730bb561c1e4b64234ae4efc1d85ad98de87034a53c66e3c38fd9`.
- Maximum Action Band: `gated`. Required Control Points: `assessment-complete`, `release-authorized`.
- Required artifacts: `ground-packet`, `verification-matrix`, `claim-record`, `source-record-reference`, `security-findings`, `required-source-list`. Produced artifacts: `release-packet`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
# Release readiness

## Purpose

Prepare a release packet that makes the authorized release decision, rollback conditions, and remaining evidence requirements inspectable; it does not perform an implied release.

## When to use

Use after assessment is complete and before a separately authorized release action. Repeat when revision-bound assessment or verification material becomes stale.

## Required inputs

- Current Ground Packet, assessment outcome, verification matrix, security findings, required-source list, and source-record references.

- Release policy, rollback expectations, approver identities or roles, and explicitly listed external actions.
- Current revision and proposed release scope.

## Stop and ask conditions

- Stop if the release action is not explicitly listed, a required Control Point is pending, stale, failed, or unknown, or rollback conditions are missing.

- Ask for an authorized decision or waiver when policy requires one.
- Never deploy, publish, merge, or mutate an external system merely because this skill was invoked.

## Procedure

1. Verify release scope and every revision-bound input are current.

2. Assemble release contents, dependencies, affected reach, owner contacts, observation expectations, and rollback triggers.
3. List required Control Points, allowed Source Record authorities, expiry rules, and unresolved evidence.
4. State the exact external action only if it is named in the Ground Packet and its Control Point status is supplied by an authorized process.
5. Produce a release packet with a clear recommendation and any block conditions.
6. If an explicit gated action is actually requested, recheck the listed action, current Source Records, policy, and effective Action Band immediately before it; otherwise stop at the packet.

## Outputs

- A revision-bound release packet with scope, rollback conditions, observation plan, and current evidence references.

- Release Control Point requirements and a recommendation that remains subject to authorized decision.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes change assessment and precedes production observation after an external release transition. It does not replace the governance system that transitions `release_ready` to `releasing`.

## Failure behavior

Return a blocked release packet with each missing or stale prerequisite. Do not guess approvers, convert claims into approvals, or execute an unlisted recovery action.

## Example

The packet names the parser release scope, a rollback trigger for elevated error rates, a current assessment source requirement, and a pending release authorization. It is release-ready documentation, not a deployment command.
