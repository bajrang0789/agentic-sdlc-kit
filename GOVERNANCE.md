# Groundtrail governance

Groundtrail Method supplies portable artifacts and provider-neutral instructions. It does not govern an organization’s repositories, trust configuration, approvals, deployments, production systems, or releases.

## Maintainer responsibilities

Maintainers steward the canonical method, schemas, skills, Carrier generator, release preparation, and project health. They must:

- preserve the rule that a Claim Record never satisfies a Control Point;
- keep canonical sources authoritative and review generated Carrier output for parity or stricter reductions;
- protect repository identity, revision freshness, append-only Trail Record semantics, and schema identity;
- keep the CLI offline by default and free of telemetry, credential access, arbitrary template execution, shell invocation, and agent invocation;
- maintain independently authored repository content and registry-only dependencies;
- coordinate security fixes privately until a safe disclosure is ready.

No maintainer action changes the external governance boundary. A configured external authority—not this repository, a Carrier, or an agent session—decides which Source Records are trusted and whether a Control Point is satisfied.

## Decisions and changes

Material method changes should state the affected vocabulary, schemas, canonical skills, Carriers, examples, versioning impact, and evidence implications. Changes that broaden an Action Band, modify evidence requirements, alter lifecycle edges, weaken installation safety, or change a schema’s validation meaning require explicit maintainer review and focused validation.

An incompatible published schema change requires a new schema identity. A carrier that cannot faithfully express the canonical ceiling must reduce capability or fail generation; it must not imply a broader permission.

## Community participation

Contributors follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Use GitHub Issues and Discussions for public project work, excluding private security reports. See [SUPPORT.md](SUPPORT.md) and [SECURITY.md](SECURITY.md).

## Prepared repository controls

The document at [`docs/security/main-ruleset-setup.md`](docs/security/main-ruleset-setup.md) is a prepared setup guide, not proof of an enabled GitHub ruleset. It must remain inactive until the listed checks exist with their exact names and have passed on the latest commit. Tag rules and release configuration are likewise prepared separately; consult [`docs/releasing.md`](docs/releasing.md). Do not represent a prepared document as an activated GitHub or npm setting.
