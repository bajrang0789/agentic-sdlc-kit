---
name: groundtrail-change-charting
description: "Create an ordered, testable implementation chart with dependencies, reach considerations, and Control Points. Use when a framed Change Thread is ready to plan bounded work."
license: Apache-2.0
---

<!-- Groundtrail carrier: id=change-charting; version=0.1.0; canonical-digest=7c6453e8696e90fd3ff5e8906ffb59a80f8b9ed8a039ab2e95c46cb40a4cbb3a; action-band=recommend; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `change-charting`; canonical SHA-256: `7c6453e8696e90fd3ff5e8906ffb59a80f8b9ed8a039ab2e95c46cb40a4cbb3a`.
- Maximum Action Band: `recommend`. Required Control Points: `context-bounded`, `implementation-chart-approved`.
- Required artifacts: `ground-packet`, `repository-map`, `requirement-map`. Produced artifacts: `change-chart`, `reach-map`, `trail-record`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
# Change charting

## Purpose

Turn a framed change into a small, reviewable sequence of implementation and verification steps while making dependencies, risk, and decision points visible.

## When to use

Use after intent framing and before bounded implementation. Re-plan whenever a material revision, acceptance criterion, or Reach Map change invalidates the current chart.

## Required inputs

- A current Ground Packet and repository map.

- Requirement map, current revision, and available Reach Map details.
- Supplied policy constraints and Control Point definitions.

## Stop and ask conditions

- Stop and ask when scope cannot be bounded, dependencies are unknown enough to alter the plan, or a required decision lacks an authorized owner.

- Do not convert a proposed patch into applied work.
- Do not mark the implementation chart approved yourself.

## Procedure

1. Confirm the packet, repository map, and requirements are current for the revision.

2. Break the outcome into ordered changes, each with affected areas, dependencies, and a testable result.
3. Map observed impact separately from inferred and unknown reach.
4. Identify validation layers and the Source Records later stages must seek.
5. Name the Control Points that guard implementation, assessment, release, and observation.
6. Record risks, alternatives, and unresolved decisions; publish the chart as a recommendation.

## Outputs

- A revision-bound change chart with ordered scope, dependencies, validation intent, and Control Points.

- Risk notes recorded as claims or unknowns when no authoritative source supports them.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes intent framing and precedes bounded implementation. Security assessment and verification use its boundaries; evidence handoff may package it at any point.

## Failure behavior

Return a partial chart with blocked decisions and do not recommend execution of unbounded work. If the packet is stale, request reframing instead of patching the old chart.

## Example

A chart separates a filename validation change, focused parser tests, and an integration check. It identifies a shared error helper as inferred reach and requests confirmation before modifying it.
