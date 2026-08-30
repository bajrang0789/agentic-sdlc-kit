# Evidence and freshness

Claims and sources are different records. A Claim Record may contain a useful human or agent assertion, but it is never evidence authority and never satisfies a Control Point. A Source Record identifies an allowed issuer, source system, subject revision, result, collection method, and expiry.

Source evidence is current only when its revision binding equals the material revision, its expiry has not passed, and its issuer and type are permitted by the relevant Control Point. A changed revision marks revision-bound evidence stale rather than deleting it. A subsequent record records reevaluation or supersession.

Trail Records are append-only NDJSON. Sequence starts at zero, record zero uses the fixed origin digest, and each later record links to the immediately prior digest. This makes edits detectable, not immutable: durable assurance requires an externally trusted checkpoint, such as a signed release, CI attestation, transparency-log entry, or governance-system record. Groundtrail can compare a supplied checkpoint but neither publishes checkpoints nor establishes their trust.
