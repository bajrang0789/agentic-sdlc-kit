---
name: groundtrail-security-assessment
description: Assess threat boundaries, dependency changes, secret exposure, unsafe defaults, and security evidence. Use when a charted or implemented change could affect security or when policy requires security review.
license: Apache-2.0
compatibility: Requires a local worktree, current change materials, and allowlisted local checks; no network, secret access, or external mutation is required.
metadata:
  groundtrail-contract: '1'
  groundtrail-id: 'security-assessment'
---

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
3. Run only allowlisted local checks and record their output as claims unless an allowed authority issued a Source Record.
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
