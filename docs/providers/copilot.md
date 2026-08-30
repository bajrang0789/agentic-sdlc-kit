# GitHub Copilot Carrier

Groundtrail renders repository-wide instructions to `.github/copilot-instructions.md`, a path-specific instruction file at `.github/instructions/groundtrail.instructions.md`, eleven skills under `.github/skills/groundtrail-*/SKILL.md`, and four focused profiles under `.github/agents/groundtrail-*.agent.md`.

The planner and verifier profiles use read-only tool aliases. The builder profile may read, edit, and execute local checks. The release steward is read-only and does not bypass release Control Points. These profiles are ceilings, not authority grants.

`groundtrail install --provider copilot --target <repository>` owns Groundtrail skills, the Groundtrail instruction file, Groundtrail-named agent profiles, and a delimited block in `copilot-instructions.md`; it does not own unrelated Copilot customization.

Official convention verified 2026-08-30: <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills>, <https://docs.github.com/en/copilot/reference/custom-agents-configuration>, and <https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide>.
