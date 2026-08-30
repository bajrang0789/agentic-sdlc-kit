---
name: groundtrail-intent-framing
description: "Turn supplied intent, acceptance criteria, constraints, and repository findings into a revision-bound Ground Packet. Use after repository discovery or when intent is incomplete or stale."
allowed-tools:
  - read
  - grep
  - glob
---

<!-- Groundtrail carrier: id=intent-framing; version=0.1.0; canonical-digest=60847ff06158806ed83c91eaa3ea6b93d0950bc1ab389aaed82ccd55356adcfd; action-band=recommend; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `intent-framing`; canonical SHA-256: `60847ff06158806ed83c91eaa3ea6b93d0950bc1ab389aaed82ccd55356adcfd`.
- Maximum Action Band: `recommend`. Required Control Points: `context-bounded`.
- Required artifacts: `ground-packet`, `repository-map`. Produced artifacts: `ground-packet`, `requirement-map`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
- Carrier capability reductions: `network denial retained as procedure restriction; no verified Skill tool ceiling`.
# Intent framing

## Purpose

Bind the requested outcome to testable acceptance criteria, constraints, repository context, and explicit unknowns without deciding policy or inventing authority.

## When to use

Use after repository discovery and before change charting. Reuse it when acceptance criteria, constraints, or the repository revision change materially.

## Required inputs

- A repository map bound to the current revision.

- Requested outcome, acceptance criteria, constraints, and available policy references.
- Current Change Thread identity and any supplied Reach Map context.

## Stop and ask conditions

- Stop when the intended outcome, acceptance criteria, repository identity, or revision is missing.

- Ask when constraints conflict or a human-only decision is needed.
- Do not resolve uncertainty by silently broadening scope or declaring a Control Point met.

## Procedure

1. Verify that the repository map and supplied inputs bind to the current repository revision.

2. Restate the intended outcome as observable acceptance criteria and identify non-goals.
3. Capture technical, security, operational, and policy constraints separately from assumptions.
4. Carry forward Reach Map information with its observed, inferred, or unknown classification.
5. Assemble a Ground Packet that names applicable Control Points, Action Band ceiling, and known unknowns.
6. Mark stale prior material and record any questions that must be answered before planning.

## Outputs

- A revision-bound Ground Packet with intent, acceptance criteria, constraints, applicable Control Points, Action Band ceiling, and known unknowns.

- A requirement map linking each acceptance criterion to its source or status.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

Consumes repository discovery and precedes change charting. It does not itself authorize implementation or advance an unmet Control Point.

## Failure behavior

Produce a constrained draft marked `needs_input` when required intent cannot be obtained. Preserve conflicting inputs as separate claims or references rather than choosing one without authority.

## Example

A request to reject malformed upload names becomes criteria for rejection behavior, messages, and tests. A missing retention requirement is listed as an unknown rather than assumed.
