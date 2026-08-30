---
name: groundtrail-change-assessment
description: "Independently assess correctness, maintainability, scope, evidence freshness, and unresolved risk. Use when verification material is available and the builder’s work needs review."
license: Apache-2.0
---

<!-- Groundtrail carrier: id=change-assessment; version=0.1.0; canonical-digest=9bb6d98206c5f43f267700c73a9d632784cace8c761a880a6d594a2a1ea46f10; action-band=recommend; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `change-assessment`; canonical SHA-256: `9bb6d98206c5f43f267700c73a9d632784cace8c761a880a6d594a2a1ea46f10`.
- Maximum Action Band: `recommend`. Required Control Points: `verification-sources-current`, `assessment-complete`.
- Required artifacts: `ground-packet`, `change-chart`, `verification-matrix`, `claim-record`, `security-findings`, `required-source-list`. Produced artifacts: `claim-record`, `trail-record`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
# Change assessment

## Purpose

Provide an independent, bounded assessment that exposes findings and recommends next Control Point decisions without self-approving delivery.

## When to use

Use after verification and security assessment, before release readiness, or after a material revision makes an earlier assessment stale.

## Required inputs

- Current Ground Packet, change chart, changed-path references, and verification matrix.

- Current Reach Map, security findings, required-source list, and supplied Claim Record and Source Record references.
- Assessment criteria or policy supplied by the responsible authority.

## Stop and ask conditions

- Stop when the reviewer cannot access enough material to make the scope of assessment clear.

- Ask for an independent reviewer if the assessor also performed the change and policy requires separation.
- Do not rewrite implementation, approve release, or turn a finding into satisfied evidence.

## Procedure

1. Verify all reviewed material binds to the current revision.

2. Compare changed scope and behavior with the Ground Packet, chart, and requirements.
3. Assess correctness, maintainability, test coverage, evidence freshness, Reach Map treatment, security findings, required source needs, and unresolved risks.
4. Classify findings by observed support, claim, or unknown, and link each to affected criteria.
5. Recommend whether remediation, more verification, or a Control Point decision is needed.
6. Record an assessment outcome that can be handed to the authorized decision process.

## Outputs

- Assessment findings with severity, scope, and evidence classification.

- Control Point recommendations, never self-issued approvals.
- Claim Record or Trail Record references documenting the independent review.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes verification and security assessment and precedes release readiness. A required change routes to bounded implementation through the lifecycle process.

## Failure behavior

Report an incomplete assessment with the missing material. If evidence is stale, recommend reevaluation and do not reuse the old conclusion for the new revision.

## Example

An assessor notes that parser tests cover rejection but not an error-message compatibility criterion. The finding requests verification; it does not say the verification Control Point failed unless an authoritative source says so.
