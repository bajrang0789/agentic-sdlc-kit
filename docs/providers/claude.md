# Claude Code Carrier

Groundtrail renders a strict local-source Claude marketplace at `.claude-plugin/marketplace.json` and the plugin payload at `adapters/claude/groundtrail/`. The plugin includes `.claude-plugin/plugin.json` and eleven skills under `skills/groundtrail-*/SKILL.md`.

Use Claude Code's documented plugin marketplace workflow to add the repository marketplace and install the `groundtrail` plugin. The Groundtrail CLI does not modify Claude user-level marketplace or plugin state.

For project mode, `groundtrail install --provider claude --target <repository>` installs only the selected skills to `.claude/skills/groundtrail-*/SKILL.md`. This is distinct from plugin mode and is the only Claude mode recorded in the target-local installation manifest.

The skill body and carrier manifest preserve Groundtrail evidence rules, Control Points, revision freshness, and Action Band ceiling. Claude plugin metadata is not treated as a permission grant.

Official convention verified 2026-08-30: <https://code.claude.com/docs/en/plugin-marketplaces>, <https://code.claude.com/docs/en/plugins-reference>, and <https://code.claude.com/docs/en/skills>.
