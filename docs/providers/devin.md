# Devin Carrier

Groundtrail's primary Devin surface is eleven repository-native skills at `.agents/skills/groundtrail-*/SKILL.md`. Each renders explicit `allowed-tools` YAML from the canonical filesystem ceiling:

- read-only skills: `read`, `grep`, `glob`;
- local-write skills: the read-only tools plus `edit`.

The official Skill `allowed-tools` grammar supports tool names but does not provide a command-scoped `exec` ceiling. Devin CLI permission rules can scope `Exec(prefix)` in CLI configuration, but those rules are not verified as a repository Skill frontmatter field. The three canonical skills with `shell: allowlisted` therefore render without `exec`: bounded implementation, verification matrix, and security assessment. This is a stricter, explicit reduction: they remain valid for inspection, editing where permitted, evidence collection, and requesting an authorized local check, but cannot run a check themselves.

`allowed-tools` is an additional ceiling only. Provider and session policy remain authoritative. Devin does not document separate Skill tool ceilings for standalone network or external-mutation restrictions, so these remain explicit procedure restrictions and per-skill manifest reductions. The renderer never substitutes unrestricted `exec` for canonical `shell: allowlisted`.

`groundtrail install --provider devin --target <repository>` installs primary skills only. It does not install optional Knowledge or Playbook exports. The `optional/` files are source exports; use Devin's current product workflow to add them after policy review. Groundtrail makes no API calls and requests no Devin credentials.

Codex and Devin cannot be installed together because both require provider-specific skill files under `.agents/skills/`.

Official convention verified 2026-08-30: <https://docs.devin.ai/product-guides/skills>, <https://docs.devin.ai/cli/extensibility/skills/creating-skills>, <https://docs.devin.ai/product-guides/creating-playbooks>, and <https://docs.devin.ai/product-guides/knowledge>.
