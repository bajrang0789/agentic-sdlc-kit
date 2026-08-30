# Third-party components

Groundtrail uses the following npm registry packages. Package versions are pinned exactly in
`package.json` and resolved with integrity data in `package-lock.json`.

## Runtime

| Package        | Purpose                                                 | License    |
| -------------- | ------------------------------------------------------- | ---------- |
| `ajv`          | JSON Schema validation                                  | MIT        |
| `ajv-formats`  | JSON Schema format validation                           | MIT        |
| `canonicalize` | RFC 8785 JSON Canonicalization Scheme implementation    | Apache-2.0 |
| `commander`    | Local CLI argument parsing                              | MIT        |
| `fd-lock`      | OS-held advisory descriptor locking for installer state | Apache-2.0 |
| `yaml`         | YAML parsing and serialization                          | ISC        |

`fd-lock@2.2.0` was selected from the npm registry on 2026-08-30. Its documented descriptor API uses the native `fs-native-extensions` backend, provides non-blocking acquisition, and is tested by the dependency for Node. It is the narrowest actively maintained registry package reviewed that provides a held descriptor lock rather than PID/lockfile emulation; the installer uses it only for `.groundtrail/install.lock`.

`canonicalize@4.0.0` was selected from the npm registry after review against RFC 8785. Immutable
Groundtrail vectors and independent cross-language verification are introduced in the later digest task;
the dependency remains subject to those checks before it is used for normative digest generation.

## Development

| Package family                              | Purpose                                |
| ------------------------------------------- | -------------------------------------- |
| `typescript`, `@types/node`                 | Type checking and Node.js declarations |
| `tsx`                                       | Local TypeScript script execution      |
| `vitest`                                    | Test execution                         |
| `eslint`, `@eslint/js`, `typescript-eslint` | Linting                                |
| `prettier`                                  | Formatting                             |

## GitHub Actions

The security workflows use only the following official GitHub Actions. Each reference is a full immutable
commit SHA resolved from the action repository's official release tag on 2026-08-30; the tag is a review
label, not the workflow reference.

| Action                             | Verified release tag | Full commit SHA                            | Purpose                                                         |
| ---------------------------------- | -------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `actions/checkout`                 | `v5.0.0`             | `08c6903cd8c0fde910a37f88322edcfb5dd907a8` | Check out the pull request or default-branch source for CodeQL. |
| `github/codeql-action/init`        | `v3`                 | `6f5948dfacef28e207b48d0905cf90c03365536d` | Initialize JavaScript/TypeScript CodeQL analysis.               |
| `github/codeql-action/analyze`     | `v3`                 | `6f5948dfacef28e207b48d0905cf90c03365536d` | Upload CodeQL analysis results.                                 |
| `actions/dependency-review-action` | `v4.9.0`             | `2031cfc080254a8a887f58cffee85186f0e49e48` | Review pull-request dependency changes.                         |
| `googleapis/release-please-action` | `v4.2.0`             | `a02a34c4d625f9be7cb89156071d8567266a2445` | Prepare manifest-mode release proposals.                        |
| `actions/setup-node`               | `v4.3.0`             | `cdca7365b2dadb8aad0a33bc7601856ffabcc48e` | Set up the locked Node.js publish environment.                  |
| `anchore/sbom-action`              | `v0.20.8`            | `aa0e114b2e19480f157109b9922bda359bd98b90` | Produce an SPDX SBOM for a later trusted release.               |
| `actions/attest-build-provenance`  | `v3.0.0`             | `977bb373ede98d70efdf65b84cb5f73e068dcc2a` | Produce GitHub build provenance attestations.                   |

No workflow uses a floating action tag, a repository PAT, `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or another
publishing secret. The prepared release workflow uses an ephemeral `GITHUB_TOKEN` only to upload release
evidence and npm trusted publishing/OIDC only after the external npm mapping is configured. Dependabot
manages npm and GitHub Actions update pull requests. The security workflows use `contents: read`; CodeQL
additionally receives only `security-events: write` to upload its results.
