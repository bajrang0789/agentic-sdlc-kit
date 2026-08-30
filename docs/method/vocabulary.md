# Vocabulary

- **Change Thread:** one traceable unit of intended software change from discovery through learning.
- **Ground Packet:** versioned provider-neutral context that binds intent and constraints to a repository revision.
- **Trail Record:** one append-only lifecycle, claim, source, decision, or handoff record in a Change Thread.
- **Claim Record:** an agent or human assertion that is useful context but cannot satisfy a Control Point itself.
- **Source Record:** evidence issued by a configured authoritative source, such as CI, code review, scanner, deployment system, or telemetry provider.
- **Control Point:** a policy/evidence condition required before a lifecycle transition or external action.
- **Reach Map:** service-impact metadata that separates direct, dependency, runtime, data, security, and unknown effects.
- **Track State:** the explicit lifecycle state of a Change Thread.
- **Action Band:** the maximum allowed autonomy: `observe`, `recommend`, `workspace`, `gated`, or `delegated`.
- **Carrier:** a vendor-native adapter generated from canonical Groundtrail sources.
- **Handoff Bundle:** a compact transfer package containing state, unresolved decisions, claims, source references, freshness, and next Control Points.

These definitions are normative for repository-authored Groundtrail content.
