# Production regression

This completed release thread includes deployment and telemetry Source Records. Telemetry identifies a regression, the thread moves through `regressed` to `rolled_back`, and incident learning creates a new linked Change Thread instead of revising the released history.

## Safety focus

`invalid/regression-completed-without-rollback.ndjson` attempts to move directly from `regressed` to `completed`. It must fail lifecycle validation with `GT_CHAIN_LIFECYCLE`.
