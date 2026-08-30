# Track States

`method/track-states.yaml` is the state catalog. Its primary path is:

`unframed -> framed -> planned -> implementing -> verifying -> assessing -> release_ready -> releasing -> observing -> completed`

`needs_input` records absent required input and resumes only to its recorded prior state. `blocked` requires a current Source Record or an authorized waiver before resuming. `changes_required` returns to `implementing`. `release_failed` may return to `planned`, `releasing`, or `rolled_back` with evidence. `regressed` may return to `rolled_back` or `implementing`; `rolled_back` then follows policy to a listed state. `cancelled` is terminal and requires an appended reason record.

A material revision while verifying, assessing, or release-ready uses an appended `control-decision` Trail Record with `revisionInvalidation`. It records the old and new revisions plus every stale revision-bound Source Record, Control Point decision, and Handoff Bundle reference, then the next lifecycle record returns the thread to `implementing` or `verifying` at the new revision. A post-release revision starts a new linked Change Thread.
