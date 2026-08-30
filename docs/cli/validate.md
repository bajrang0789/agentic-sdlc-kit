# Validate Groundtrail artifacts

`groundtrail validate` checks supplied local artifacts against Groundtrail’s canonical contracts. The command reads local files only; it does not fetch schemas, invoke agents, execute skill content, access secrets, or infer trust from a file’s location.

```sh
groundtrail validate ./skills --kind skill
groundtrail validate ./examples
groundtrail validate ./examples/small-web-change/ground-packet.json
groundtrail validate ./adapters --kind carrier
```

Use `--json` for machine-readable output. The `--kind` option accepts `auto`, `skill`, `packet`, `records`, `handoff`, `carrier`, `installation`, `reach-map`, `control-point`, and `source-record`.

## What validation means

- **Canonical skills:** frontmatter identity, contract identity, composition, permissions, Action Bands, declared artifacts, and method references agree.
- **Records and packets:** JSON Schema contracts, lifecycle semantics, revision binding, and referenced method constraints hold.
- **Carrier manifests:** provider identity, canonical skill digests, payload-tree digest, normalized file digests, and declared capability reductions have the documented shape.
- **Installation manifests:** the versioned target-local ownership state has a supported shape. Validation does not repair target files or claim that a provider accepted them.

Schemas use repository-controlled `$id` values under `schemas/v1/`. The registry maps these IDs to package-local files and does not fetch `$ref` targets over the network. A published schema ID is an immutable identity: incompatible validation changes require a new schema identity rather than reuse of the v1 URL.

## Limits of a valid result

A valid structure is not an approval, a release decision, or evidence authority. Groundtrail does not decide whether an issuer is trusted, whether a supplied checkpoint is durable, or whether a host provider will apply an artifact. Those determinations stay with the relevant external governance system and provider/session policy.

Use [record verification](records.md) for append-only Trail Record chain checks and [installation guidance](install.md) for a non-writing install plan.
