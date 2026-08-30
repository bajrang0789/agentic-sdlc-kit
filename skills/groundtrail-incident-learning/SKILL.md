---
name: groundtrail-incident-learning
description: Convert incident evidence into bounded follow-up work without rewriting prior records. Use after an incident, regression, rollback, or completed observation with lessons to preserve.
license: Apache-2.0
compatibility: Requires incident or observation materials and read access; no commands, network, external mutation, or production access is required.
metadata:
  groundtrail-contract: '1'
  groundtrail-id: 'incident-learning'
---

# Incident learning

## Purpose

Capture evidence-led learning and propose new bounded Change Threads while preserving the append-only history of the affected thread.

## When to use

Use after a regression, rollback, incident response, or completed observation when evidence supports follow-up work. It is not a substitute for incident command or production remediation.

## Required inputs

- Current or closed Ground Packet, relevant Trail Record references, and the observation record when available.
- Supplied incident, deployment, telemetry, or observation Source Record references and source-record references.
- Known remediation decisions, owners, and policy constraints.

## Stop and ask conditions

- Stop if the incident evidence cannot be linked to a repository revision, affected thread, or source authority.

- Ask for an authorized owner when a learning item needs prioritization or policy interpretation.
- Do not edit, delete, or reinterpret historical Trail Records; do not perform remediation.

## Procedure

1. Verify each incident or observation source, its subject, timing, and revision relevance.

2. Separate observed sequence, contributing factors, claims, and unresolved questions.
3. Identify bounded preventive, detective, or recovery follow-up outcomes.
4. Propose a new Change Thread for each follow-up and link it with `supersedesThreadId` or the applicable relationship; do not reopen or rewrite the released thread.
5. Append a learning record through the proper record process, preserving references to supporting sources.
6. Hand off ownership, priority questions, and next Control Points.

## Outputs

- A learning record that retains evidence references and known unknowns.

- Linked Change Thread proposals for bounded follow-up work.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Follows production observation or incident evidence and can send new threads to repository discovery. It never composes by mutating completed, released, or rolled-back records.

## Failure behavior

Produce a partial learning record if causal support is incomplete. Label hypotheses as claims and schedule evidence collection rather than presenting a retrospective narrative as a source.

## Example

After a rollback, telemetry and deployment sources show a parsing regression. The learning record proposes a new Change Thread for boundary tests and links it to the released thread without changing the original records.
