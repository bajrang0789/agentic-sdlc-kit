---
name: groundtrail-security-assessment
description: "Assess threat boundaries, dependency changes, secret exposure, unsafe defaults, and security evidence. Use when a charted or implemented change could affect security or when policy requires security review."
allowed-tools:
  - read
  - grep
  - glob
  - edit
---

<!-- Groundtrail carrier: id=security-assessment; version=0.1.0; canonical-digest=951a0c5af4ae535ed2316c385e309d9221bd9c49be699f34b92639a376494253; action-band=workspace; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `security-assessment`; canonical SHA-256: `951a0c5af4ae535ed2316c385e309d9221bd9c49be699f34b92639a376494253`.
- Maximum Action Band: `workspace`. Required Control Points: none.
- Required artifacts: `ground-packet`, `change-chart`, `verification-matrix`, `source-record-reference`. Produced artifacts: `claim-record`, `security-findings`, `required-source-list`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
- Carrier capability reductions: `shell:allowlisted reduced to no shell execution because verified Devin Skill frontmatter has no command-scoped exec ceiling`, `network denial retained as procedure restriction; no verified Skill tool ceiling`.
# Security assessment

## Purpose

Identify security-relevant change effects and evidence needs without handling secrets, altering policy, or claiming a security gate is passed.

## When to use

Use after verification planning or implementation and before change assessment when the Reach Map, constraints, or policy identify a security concern. It may also be invoked for a focused security reassessment after revision changes.

## Required inputs

- Current Ground Packet, change chart, changed paths, and available Reach Map.

- Dependency and configuration change references.
- Supplied security policy, threat assumptions, and Source Record references.

## Stop and ask conditions

- Stop when scope contains credentials or sensitive production material not authorized for inspection.

- Stop when threat ownership, required authority, or security acceptance criteria are absent.
- Do not access secret stores, contact scanners over a network, waive controls, or remediate outside the chart.

## Procedure

1. Verify revision binding and identify security and data boundaries from the packet and Reach Map.

2. Inspect charted code, dependency, and configuration changes for secret exposure, unsafe defaults, input handling, authorization boundaries, and dependency implications.
3. Do not run local checks in this Devin carrier; request an authorized local check and record its result as a claim or supplied Source Record.
4. Produce a required-source list for later Control Points, naming the needed Source Record types, allowed authorities, and freshness expectations without issuing Source Records.
5. State findings, unknowns, and recommended remediation or escalation without asserting release suitability.

## Outputs

- Security findings with scope, rationale, and evidence classification.

- A required-source list for security-relevant Control Points.
- Claim Record references and source-record references that identify supplied evidence without issuing or altering Source Records.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes bounded implementation and verification material, then precedes change assessment. It can be repeated on new revisions or when a new security boundary appears.

## Failure behavior

Escalate with a bounded description when sensitive material or a suspected exposure is found. Avoid reproducing secret values in records. Preserve the unknown or finding and request an authorized response.

## Example

A dependency update changes parser behavior. The assessment notes a new denial-of-service concern, records the absent scanner source as a gap, and asks for a current authorized scan rather than declaring the dependency safe.
