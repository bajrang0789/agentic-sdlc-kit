# OpenAI Codex Carrier

Groundtrail renders repository guidance to `adapters/codex/AGENTS.md` and eleven Agent Skills to `adapters/codex/.agents/skills/groundtrail-*/SKILL.md`.

`groundtrail install --provider codex --target <repository>` copies selected skills to `.agents/skills/` and owns one delimited `groundtrail:codex:v1` block in the target root `AGENTS.md`. Content outside that block remains unmanaged.

Codex loads root instructions and more-specific nested `AGENTS.md` files according to its documented scope rules. The carrier's skill bodies, rather than undocumented frontmatter permissions, retain Groundtrail evidence, Control Point, freshness, and Action Band restrictions.

Official convention verified 2026-08-30: <https://developers.openai.com/codex/skills/create-skill/> and <https://developers.openai.com/codex/guides/agents-md.md>.
