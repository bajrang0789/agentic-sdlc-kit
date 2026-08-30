# Control Points

A Control Point is a named condition before a lifecycle transition or an external action. Outcomes are `pending`, `satisfied`, `failed`, `waived`, and `stale`.

A satisfied Control Point names one or more current Source Record IDs. Claim Record IDs are invalid in `satisfiedBy`. Policy identifies the acceptable source types, issuers, revision binding, and freshness rules.

A waiver is not an informal exception. It requires a Source Record from an authorized human or policy system and records a reason, scope, expiry, and revision binding. A waiver becomes stale on a material revision or expiry.

Groundtrail evaluates data consistency; an external governance system decides organizational authorization.
