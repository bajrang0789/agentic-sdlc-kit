# Governance boundary

Groundtrail produces exchange artifacts and provider-neutral agent instructions. It validates record structure, digest continuity, references, and stated method constraints.

Groundtrail does not operate an organizational policy engine, lifecycle enforcer, deployment controller, production-control plane, source of authority, credential broker, server, database, webhook receiver, queue, agent runner, or checkpoint service. It does not decide whether a named issuer is trusted in an organization.

An external governance system remains authoritative for organizational trust configuration, lifecycle enforcement, policy evaluation, approvals, deployment, production decisions, and checkpoint trust. Groundtrail can transport that system’s Source Records and validate that they meet a configured contract; it cannot replace their authority.
