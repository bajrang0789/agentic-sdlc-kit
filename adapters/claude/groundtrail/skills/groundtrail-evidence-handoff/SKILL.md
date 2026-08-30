---
name: groundtrail-evidence-handoff
description: "Create a compact, freshness-aware Handoff Bundle for another agent or human. Use whenever work changes hands, pauses, or needs a reviewable evidence summary."
license: Apache-2.0
---

<!-- Groundtrail carrier: id=evidence-handoff; version=0.1.0; canonical-digest=e8a01a43089d4e286b95a4b55668f33199059b14e9eacff887bdf9b0e402f865; action-band=recommend; freshness.bindToRevision=true -->

## Carrier contract

- Canonical skill ID: `evidence-handoff`; canonical SHA-256: `e8a01a43089d4e286b95a4b55668f33199059b14e9eacff887bdf9b0e402f865`.
- Maximum Action Band: `recommend`. Required Control Points: none.
- Required artifacts: `ground-packet`. Produced artifacts: `handoff-bundle`, `trail-record`.
- Revision binding: `true`. A Carrier may reduce capabilities but must not expand this contract.
# Evidence handoff

## Purpose

Transfer only the current, bounded context needed for a successor to resume safely, including freshness, unknowns, claims, sources, and next Control Points.

## When to use

Use after any lifecycle stage, before a pause, when responsibility changes, or whenever a recipient needs to verify what is current. It does not imply that the thread is complete.

## Required inputs

- Current Ground Packet and current Track State.

- Available repository map, chart, change references, decisions, Claim Record references, Source Record references, and Control Points.
- Recipient context, handoff purpose, and current repository revision.

## Stop and ask conditions

- Stop when the current revision, Track State, or next owner is absent.

- Ask when artifacts conflict or their freshness cannot be established.
- Do not conceal stale material, authorize the next action, or turn the bundle into proof of a Control Point.

## Procedure

1. Confirm the current repository identity, revision, Track State, and intended recipient.

2. Inventory completed work, changed paths, decisions, claims, Source Record references, and outstanding Control Points.
3. Mark each revision-bound item current, stale, superseded, missing, or unknown.
4. State the next safe skills, required inputs, and stop conditions without granting additional authority.
5. Produce a compact Handoff Bundle that links rather than duplicates authoritative sources.
6. Append or request the applicable handoff Trail Record through the record process.

## Outputs

- A Handoff Bundle with current state, revision, completed work, changed paths, decisions, claims, Source Record references, outstanding Control Points, known unknowns, next skills, and freshness.

- A handoff Trail Record reference when the record process supplies one.

## Evidence handling

- Keep Source Record references distinct from observations and conclusions. Check each supplied source against its authority, subject, repository identity, revision, and expiry before relying on it.
- Record an unsupported conclusion as a Claim Record or an unknown. A Claim Record never satisfies a Control Point.
- A material revision makes revision-bound context, decisions, evidence, and handoffs stale. Do not carry them forward as current; request or perform the required reevaluation.
- Do not declare a Control Point satisfied, approve a waiver, or elevate authority. Those decisions require a current Source Record from an allowed authority under applicable policy.

## Action Band restrictions

The stated band is a ceiling, not a grant. Apply the most restrictive ceiling from this contract, the Ground Packet, applicable policy, the Reach Map, and available Source Records. Do not expand scope, permissions, or authority. Do not treat this skill as authorization for any external action.

## Composition

May compose after every stage without creating a lifecycle transition. It packages upstream material for repository discovery, planning, implementation, assessment, release, observation, or learning and never implies completion.

## Failure behavior

Return a partial bundle that names unavailable or stale artifacts. A recipient must re-establish current context rather than treating omissions as approval.

## Example

After verification, the bundle lists changed parser files, a local test claim, a pending CI Source Record, an unresolved shared-library reach question, and change assessment as the next skill. It does not mark verification complete.
