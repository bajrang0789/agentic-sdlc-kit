# Security-sensitive change

This release-ready thread uses the gated Action Band. Its scanner and independent reviewer records are Source Records. A narrowly scoped waiver is issued by an authorized human, is revision-bound, and expires. The agent's security assessment is preserved as a Claim Record only.

## Safety focus

`invalid/control-point-agent-claim-as-evidence.json` names the agent claim in `satisfiedBy`. The schema accepts an identifier, but the chain-aware evidence check must reject it with `GT_CONTROL_POINT_CLAIM`; only a Source Record can satisfy a Control Point.
