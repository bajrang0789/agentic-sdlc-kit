# Groundtrail origin

## Fixed requirements

Groundtrail is the original method distributed by `@bajrang0789/agentic-sdlc-kit`. It is an Apache-2.0,
provider-neutral file and skills distribution layer for evidence-led software delivery. It is not an SDLC
orchestration service: it has no server, database, webhooks, work queue, policy decision service,
credential broker, agent runner, deployment integration, or production control plane.

The package is TypeScript ESM for Node.js `>=22 <27`, uses an npm lockfile with exact registry-only
dependencies, and is offline by default. It has no telemetry, arbitrary template execution, agent
invocation, or secret access.

## Groundtrail vocabulary

| Term           | Meaning                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| Change Thread  | One traceable unit of intended software change from discovery through learning.                              |
| Ground Packet  | Versioned, provider-neutral context supplied to a session and bound to a repository revision.                |
| Trail Record   | One append-only lifecycle, claim, source, decision, or handoff record in a Change Thread.                    |
| Claim Record   | An assertion that can inform context but cannot satisfy a Control Point by itself.                           |
| Source Record  | Evidence from a configured authoritative source.                                                             |
| Control Point  | A policy and evidence condition for a lifecycle transition or external action.                               |
| Reach Map      | Service-impact metadata that distinguishes direct, dependency, runtime, data, security, and unknown effects. |
| Track State    | The explicit lifecycle state of a Change Thread.                                                             |
| Action Band    | The maximum allowed autonomy: `observe`, `recommend`, `workspace`, `gated`, or `delegated`.                  |
| Carrier        | A vendor-native adapter generated from canonical Groundtrail sources.                                        |
| Handoff Bundle | A compact transfer package with state, decisions, evidence references, freshness, and next Control Points.   |

Groundtrail validates and transports records. An external governance system remains authoritative for
organizational policy, lifecycle enforcement, deployment, and production decisions.
