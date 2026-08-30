# Releasing Groundtrail

This document describes the intended release path. Repository files can prepare configuration, but they do not prove that an npm package, npm trusted publisher, GitHub ruleset, tag ruleset, immutable-release setting, release, checksum, SBOM, or attestation currently exists. A release steward must verify each external setting in the relevant service before acting.

Groundtrail has one SemVer version across the methodology, schemas, canonical skills, generated Carriers, and CLI. `package.json` is the package-derived runtime source for the CLI and Carrier generator. A release tag is `vX.Y.Z`; its version must match `package.json`, `.release-please-manifest.json`, every canonical skill contract, and every generated Carrier manifest.

## Release boundary

The release steward uses an owner-controlled checkout and an authorized release path. Groundtrail release automation must never use `NPM_TOKEN`, `NODE_AUTH_TOKEN`, a repository PAT, an npm publishing secret, or a persistent credential stored in project files, GitHub secrets, workflow logs, shell history, or `.npmrc`.

The CLI and normal CI remain credential-free. A later publish workflow is designed to use npm trusted publishing with GitHub Actions OIDC and an ephemeral `GITHUB_TOKEN` with only the permissions needed to create release assets and attestations. OIDC publishing is not a substitute for externally configuring the exact npm trusted-publisher mapping.

## Initial public `0.1.0` bootstrap

`0.1.0` is deliberately manual. Do not let the later OIDC release workflow publish it.

Before any publication, a verified scope owner must, from a clean accepted owner checkout:

1. Verify npm identity without printing credentials. Use interactive npm web login and required 2FA, then confirm `npm whoami` is `bajrang0789` for the personal scope, or verify the documented organization owner/membership status if npm models the scope differently.
2. Confirm `@bajrang0789/agentic-sdlc-kit` is available and abort if the scope or account does not match the expected owner. Do not publish under a different account or scope.
3. Recheck repository identity with the owner-only bootstrap audit; then run `npm ci`, `npm run check`, `npm pack --dry-run`, inspect package contents, and run `npm publish --dry-run`.
4. Create a GitHub **tag ruleset** targeting `v*` before the tag exists. It must restrict tag creation, update, and deletion to the authorized release path or documented bypass actors and prevent moving an existing release tag. Use a tag ruleset, not deprecated tag protection. Record the exact GitHub-supported rules and bypass process as release evidence.
5. Publish exactly `0.1.0` manually with interactive npm authentication and `npm publish --access public`. Do not run this command from CI.
6. Create `v0.1.0` through the authorized tag-ruleset path. Attach the verified package tarball, SHA-256 checksums, SPDX SBOM, and provenance evidence to the GitHub Release when those artifacts are available and verified.

The manual bootstrap checklist is a procedure, not a statement that any step has happened.

## Prepare trusted publishing after bootstrap

Only after `@bajrang0789/agentic-sdlc-kit@0.1.0` exists, configure npm trusted publishing for this exact GitHub owner, repository, and `.github/workflows/release.yml` workflow. Confirm the package’s publishing-access settings and enable the strongest documented setting that remains compatible with trusted publishing, disallows token publishing, and retains required 2FA.

Record non-secret configuration evidence, including verification date and intended owner/repository/workflow relationship. Do not record token values, account identifiers beyond the public package scope, OIDC token contents, or credential screenshots.

Before every later release, recheck:

- the npm scope owner/access and trusted-publisher mapping;
- the package, repository, workflow, and intended version identities;
- the `v*` tag ruleset and its authorized bypass behavior;
- current provider convention research and Carrier reproducibility;
- whether GitHub immutable releases are available and compatible. If not, record only the guarantees actually provided by the tag ruleset; do not claim release immutability.

## Release-version synchronization

Release Please owns the package and release-manifest version update. Before its release proposal is merged, run the deterministic synchronization command from the proposal branch:

```sh
npm run release:sync-version
npm run release:check-version
```

`release:sync-version` reads `package.json`, rewrites every canonical skill `contract.yaml` version to that value, and regenerates all Carriers. Commit those canonical and generated changes with the proposal. `release:check-version` builds the CLI, verifies its `--version`, and fails unless `package.json`, the Release Please manifest, CLI, all skill contracts, and all Carrier manifests agree. The trusted-publish job runs the same agreement check with the checked-out `vX.Y.Z` tag and fails when that tag differs from `package.json`.

## Later releases through OIDC

After bootstrap and trusted-publisher configuration, use the prepared manual-dispatch workflow for versions greater than `0.1.0`. It does not run on arbitrary branch pushes. Select `prepare` to run Release Please in manifest mode. Select `publish` and supply an existing `vX.Y.Z` tag only to retry npm publication when Release Please has already created the tag/release but the prior publish failed.

Both paths require the manual `0.1.0` bootstrap to be verifiably present. The publish path then:

1. checks out the exact release tag, rejects `0.1.0`, rejects a tag/package mismatch, and rejects any version npm already reports as published;
2. installs from the lockfile, runs the release-version agreement check and `npm run check`, inspects `npm pack --dry-run`, and builds a tarball;
3. creates SHA-256 checksums and an SPDX SBOM;
4. publishes with npm trusted publishing/OIDC and provenance behavior supported by npm at release time, with `id-token: write` and no npm token environment variable;
5. attaches the tarball, checksum, and SBOM to the matching GitHub Release; and
6. creates GitHub build provenance attestations and verifies them using the current `gh attestation verify` workflow where available.

A retry is safe only before npm has accepted the version. Once npm reports that version, the workflow refuses to publish it again while still permitting a steward to use externally approved release-asset recovery procedures.

Release Please configuration and the workflow are prepared in this repository, but external trusted-publisher, tag-ruleset, immutable-release, and release settings require deliberate administrator action. Do not activate them merely because the files exist.

## Versioning and changelog

Use Conventional Commit-compatible release notes where practical and review generated release notes for Groundtrail vocabulary, evidence accuracy, and scope. Update [`CHANGELOG.md`](../CHANGELOG.md) for release-facing context that cannot be safely inferred. Do not release direct modifications to generated `adapters/`; regenerate from canonical sources and verify `npm run carriers:check` first.
