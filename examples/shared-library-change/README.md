# Shared library change

This thread shows a direct shared-code impact plus inferred downstream reach. CI passed for revision `b27cf91`, then a material commit `c38da02` invalidated that evidence and returned work to implementation. The current Ground Packet, Reach Map, Control Point, and handoff are bound to the new revision; the historical chain remains immutable at the old revision.

## Safety focus

`invalid/mixed-revision-records.ndjson` contains individually well-formed, correctly digested records that mix revisions in one chain. It must fail chain validation with `GT_CHAIN_REVISION`.
