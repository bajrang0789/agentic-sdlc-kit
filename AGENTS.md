# Groundtrail repository guidance

## Foundation boundary

Groundtrail is an original, provider-neutral method and distribution package. Keep repository-authored
content independent. Do not import, mirror, or adapt another project’s files, prose, brand assets, or
Git history.

## Working rules

- Use Apache-2.0 for repository-authored deliverables unless a future documented exception is approved.
- Keep package dependencies exact and registry-only.
- Do not add submodules, gitlinks, vendored trees, network clients, secret access, telemetry, or agent
  invocation to the CLI.
- Run `npm run clean-room:content` before proposing changes that add content or package metadata.
- Keep generated Carrier output deterministic and include canonical digest metadata. Author canonical
  sources first; do not manually edit `adapters/`.

## Current implementation state

The repository contains the Groundtrail method catalogs, schemas, canonical skills, generated provider
Carriers, examples, and offline CLI. Canonical sources live in `skills/`, `method/`, and `schemas/`; the
committed Carrier output under `adapters/` is generated. See `README.md`, `docs/cli/`, and
`docs/releasing.md` for public usage and prepared release guidance.
