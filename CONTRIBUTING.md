# Contributing to Groundtrail

Thank you for improving Groundtrail Method. Groundtrail is an original, provider-neutral distribution layer for evidence-led skills and records. Contributions must preserve its canonical contracts, its governance boundary, and independent authorship.

## Before opening a change

1. Read the relevant method and schema documentation.
2. Keep work within a Change Thread-sized scope and record assumptions as claims or unknowns, not Source Records.
3. Do not copy, mirror, adapt, or import third-party prose, code, skill bundles, visual assets, Git history, or vendor examples.
4. Do not add a server, database, webhook, work queue, credential broker, agent runner, deployment integration, telemetry, secret access, or network client to the CLI.
5. Do not include credentials, private repository content, personal data, or production evidence in issues, fixtures, commits, or generated output.

## Canonical-first authoring

`skills/`, `method/`, and `schemas/` are canonical inputs. `adapters/` and `.claude-plugin/marketplace.json` are deterministic Carrier outputs.

- Change the canonical source first.
- Regenerate Carriers with `npm run carriers:generate`.
- Commit the resulting generated artifacts with their canonical digest metadata.
- Verify them with `npm run carriers:check`.

Do **not** hand-edit files under `adapters/`. CI treats a mismatch between those files and a clean render as generated-artifact drift. A Carrier may reduce a capability to fit a provider, but must never expand a canonical permission, Action Band, Control Point, evidence authority, or artifact contract.

## Local checks

Use Node.js `>=22 <27` and npm. Run focused checks while iterating, then run the full local gate before requesting review:

```sh
npm ci
npm run check
npm pack --dry-run
```

`npm run check` is credential-free and includes content provenance, formatting, linting, types, method and skill validation, schemas, Carrier reproducibility, and tests. The owner-only `npm run bootstrap:audit` is intentionally separate because it examines repository-origin conditions that contributor forks do not share.

For documentation-only work, at minimum run:

```sh
npm run format:check
npm run clean-room:content
```

## Tests, examples, and evidence

Add or update focused tests when changing executable behavior, schemas, record rules, installation behavior, or Carrier rendering. Keep examples schema-valid and pair a safety-critical example with a narrow invalid fixture.

A Claim Record can describe a test observation or review conclusion, but it cannot satisfy a Control Point. A Source Record must identify its configured authority, subject revision, result, collection method, and freshness. A material revision makes revision-bound evidence stale until reevaluated.

## Installation contract changes

The target-local `.groundtrail/installation.json` manifest is an ownership record, not a place to store prompts, tokens, identities, repository contents, or secret values. Do not weaken these installer properties:

- start with `--dry-run` and review its plan;
- never overwrite or silently adopt unmanaged target content;
- preserve unrequested provider selections during partial updates;
- reject Codex plus Devin because their provider-specific `.agents/skills/` outputs collide;
- keep managed blocks delimited and preserve unmanaged bytes;
- use the OS-held target lock and transaction-specific recovery rather than PID guesses.

See [CLI installation](docs/cli/install.md) for user-facing behavior.

## Pull requests and review

Explain the intended outcome, affected method artifacts, compatibility impact, validation performed, and any remaining unknowns. Keep unrelated formatting and cleanup out of the change. Reviewers should confirm that canonical sources remain the authority, Carrier changes are generated, evidence claims are accurately labeled, and the governance boundary is intact.

The prepared branch-ruleset guide is not an active repository setting. It must not be activated until the named checks have reported successfully; see [the setup guide](docs/security/main-ruleset-setup.md).

## Reporting conduct or security concerns

Use the process in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for conduct concerns. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in public issues or pull requests.
