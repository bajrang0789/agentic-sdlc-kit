# Small web change

This completed Change Thread adds a small profile notice. The agent's local-check statement is a Claim Record, while the current CI result is separately represented as a Source Record and satisfies the verification Control Point.

## Safety focus

`invalid/control-point-claim-as-evidence.json` intentionally replaces the CI record ID with the agent claim ID. It is structurally shaped like a Control Point but must fail the chain-aware evidence check with `GT_CONTROL_POINT_CLAIM`.
