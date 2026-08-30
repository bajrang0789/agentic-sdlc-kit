# Security policy

## Supported versions

Before the first release, security fixes are prepared on the default development branch. Released versions
will be listed here with their support status.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub’s private security advisory reporting
for this repository when available. Include the affected version, reproduction details, impact, and any
suggested mitigation. Do not include credentials, access tokens, private keys, or production data.

Maintainers will acknowledge receipt, investigate, and coordinate disclosure. They may ask for a minimal
reproducer or a redacted proof of impact. Public disclosure should wait until maintainers and reporters
agree that users have had a reasonable opportunity to update or mitigate.

## Security posture and boundary

Groundtrail is a local file and skills distribution layer, not a governance service or agent runner. Its
intended runtime posture is offline by default: no telemetry, secret-store access, agent invocation,
arbitrary template execution, shell execution, or network access by the CLI. Host providers may execute
an installed skill under their own policy; that activity is not performed, authorized beyond the canonical
contract ceiling, or attested by the Groundtrail CLI.

Groundtrail validates supplied records and preserves evidence references. It does not establish the trust
of an issuer, a supplied checkpoint, an agent session, a GitHub workflow log, or a user assertion. A Claim
Record never satisfies a Control Point. Only a current Source Record from an authority permitted by the
applicable external policy can do so.

## Threat model

The project treats repositories, installed targets, skill inputs, generated artifacts, dependencies, and
external evidence references as potentially hostile. The following table defines the relevant boundaries
and the required mitigations.

| Threat                                         | Boundary and impact                                                                                                                                                       | Required mitigation                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Malicious skill files                          | A skill can attempt to widen permissions, induce unsafe host-provider actions, or disguise unsupported conclusions as evidence.                                           | Validate frontmatter and `contract.yaml` identity, composition, permission monotonicity, Action Band ceiling, and Control Points. Canonical skills contain no executable scripts. Treat unsupported conclusions as claims or unknowns, never Source Records. Review canonical source changes before regenerated Carriers.                              |
| YAML bombs and parser abuse                    | Alias expansion, deeply nested input, duplicate keys, or oversized documents can exhaust resources or create ambiguous contracts.                                         | Parse only bounded YAML through the repository parser; impose documented input/alias/depth limits; reject malformed or ambiguous input before validation. Keep tests for parser limits and fail closed when a safe parse cannot be established.                                                                                                        |
| Traversal, path escape, and symlinks           | Crafted target paths, symlinks, junctions, devices, case collisions, or Unicode variants could cause installation outside its target or overwrite unrelated data.         | Normalize and validate relative NFC paths; reject traversal, absolute paths, platform device names, symlink/junction escapes, non-regular payload entries, and case-fold collisions. Resolve the target root and verify every staged and managed path remains beneath it before writing.                                                               |
| Installer journals and managed-file clobbering | A concurrent, interrupted, or malicious transaction could overwrite unmanaged content, misrepresent ownership, or erase recovery evidence.                                | Acquire an OS-held lock before reading mutable installation state; reread and validate locked state; stage only after planning succeeds; journal transitions with digests; write manifests last with atomic rename. Never infer ownership from a filename, overwrite unmanaged content, force drifted content, or delete mismatched recovery evidence. |
| Instruction injection                          | Repository text, issues, skill bodies, generated outputs, and external documents may contain instructions intended to override the Ground Packet, policy, or Action Band. | Treat all such material as untrusted data unless explicitly authorized by the active Ground Packet and canonical contract. Do not grant tool access, execute instructions, disclose secrets, alter policy, or treat prose as evidence merely because it is present in an input.                                                                        |
| Secret leakage                                 | Logs, manifests, artifacts, prompts, test fixtures, and workflow configuration can expose environment values or credentials.                                              | The CLI must not read secret stores or persist environment values. Installation manifests must not contain tokens, prompts, repository contents, or user identity. Redact diagnostics as needed; use no repository PAT, `NPM_TOKEN`, or `NODE_AUTH_TOKEN`. Security workflows receive only the minimum GitHub token permissions.                       |
| Dependency or action compromise                | A compromised registry package, lockfile change, transitive package, or mutable GitHub Action tag can execute untrusted code in development or CI.                        | Use exact npm versions plus lockfile integrity data; reject VCS/file/HTTP dependency specs in the provenance check; review Dependabot updates; run dependency review on pull requests. Pin every third-party GitHub Action to a verified full commit SHA and record it in provenance documentation.                                                    |
| Generated-artifact drift                       | A manually edited Carrier or stale generated output can diverge from canonical skills while appearing authoritative.                                                      | Generate adapters deterministically from canonical sources; retain canonical and payload digests in carrier manifests; run generated-output checks in CI once available. Do not edit generated adapters directly; regenerate and review the canonical source change instead.                                                                           |
| False evidence authority                       | A manipulated record chain, workflow output, checkpoint, agent claim, or stale revision can be presented as proof that a Control Point passed.                            | Validate record structure, digest continuity, revision binding, freshness, allowed transitions, and issuer/source requirements. A digest chain is tamper-evident, not independently immutable: durable assurance requires an externally trusted checkpoint or authority. Agent sessions and Claim Records cannot satisfy Control Points.               |

## Maintainer handling expectations

Security fixes should include focused regression coverage where practical. Changes to parsing, path handling,
symlink protections, locks, journals, provenance checks, generated outputs, evidence validation, and
workflow permissions require security review before merge. Maintainers must not weaken a canonical skill’s
permission ceiling, Action Band, evidence requirements, or source authority through a Carrier.

The planned `main` ruleset is documented in
[`docs/security/main-ruleset-setup.md`](docs/security/main-ruleset-setup.md). It remains inactive until the
reserved CI checks have reported successful results as described there. Release/tag policy and npm trusted
publishing are intentionally outside this pre-release security preparation.
