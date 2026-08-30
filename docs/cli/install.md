# Install Groundtrail Carriers safely

The `groundtrail install` command installs selected generated Carrier files into a local target repository. It is offline by default: the CLI makes no network calls, runs no shell commands, invokes no skill content, reads no secret store, and emits no telemetry.

Start with a plan:

```sh
groundtrail install --provider codex --target ../service --dry-run
```

A dry run obtains the same target lock, rereads installation state, merges the requested selection with preserved providers, and validates the complete provider set. To acquire that lock safely, it may create the CLI-owned `.groundtrail/` control directory and regular `.groundtrail/install.lock` file before locking. It reports the planned create, update, or removal operations without writing a journal, installation manifest, transaction staging area, backup, or Carrier file.

After review, remove `--dry-run`:

```sh
groundtrail install \
  --provider codex --provider copilot \
  --target ../service \
  --skill repository-discovery --skill intent-framing
```

## Provider targets and ownership

The CLI records every actual project install in `.groundtrail/installation.json` in the target repository. It records provider mode, selected canonical skill IDs, Carrier selection digest, managed paths or blocks, owners, file digests, and the last completed transaction. It never stores environment values, tokens, prompts, repository contents, or user identity.

| Provider       | Installed target content                                                                                                             | Ownership boundary                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Claude Code    | `.claude/skills/groundtrail-*/SKILL.md`                                                                                              | Only the selected Groundtrail project skills                                             |
| Codex          | `.agents/skills/groundtrail-*/SKILL.md` and one `groundtrail:codex:v1` block in root `AGENTS.md`                                     | Selected skills and the delimited block; other `AGENTS.md` bytes remain unmanaged        |
| GitHub Copilot | `.github/skills/groundtrail-*`, Groundtrail instruction file, Groundtrail agent profiles, and one block in `copilot-instructions.md` | Groundtrail-named files and the delimited block; unrelated customization stays unmanaged |
| Devin          | `.agents/skills/groundtrail-*/SKILL.md`                                                                                              | Primary skills only; optional Knowledge and Playbook exports are not installed           |

Claude plugin mode is different: use Claude Code’s native plugin manager with the repository marketplace. The Groundtrail CLI validates and renders plugin content but does not change a user-level marketplace registry, plugin state, or target manifest for a plugin it did not install.

## Supported combinations

| Provider set                         | Status      | Rule                                                                                                                                             |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any single provider in project mode  | Supported   | The provider owns only its declared files and blocks.                                                                                            |
| Claude plus Codex, Copilot, or Devin | Supported   | Claude uses `.claude/skills/`, so no native-path collision occurs.                                                                               |
| Codex plus Copilot                   | Supported   | `.agents/` and `.github/` are separately owned.                                                                                                  |
| Copilot plus Devin                   | Supported   | `.github/` and `.agents/` are separately owned.                                                                                                  |
| Codex plus Devin                     | Unsupported | Both need provider-specific files under `.agents/skills/`; the command stops with `GT_INSTALL_COMBINATION_UNSUPPORTED` before staging or writes. |

A Claude native plugin can coexist with any target-local project install because Claude’s manager owns the plugin state and Groundtrail records only work it performs in the target.

## Selection and update rules

Without `--skill`, a new provider request selects every canonical skill. Repeating `--provider` requests one atomic provider set.

- `--skill <short-id>` is additive by default: it adds or updates only those requested skills and preserves other selections for that provider.
- `--replace-selection` changes each requested provider to exactly the supplied skills. Other providers remain unchanged.
- Use `--skill none --replace-selection` to explicitly remove a requested provider’s selection.
- Unmanaged existing files are never adopted or overwritten. Drifted managed files and malformed managed-block markers are conflicts, not overwrite opportunities.
- A managed entry can be changed or removed only according to its recorded owner. Filename similarity is not ownership.
- MVP rejects a manifest containing `sharedEntries` or more than one owner on an entry with `GT_MANIFEST_SHARED_UNSUPPORTED`; no generated supported provider combination emits shared ownership.

The installer validates the full resulting provider set after it obtains the OS-held lock and rereads current state. This prevents a later partial request from bypassing the Codex-and-Devin collision rule.

## Transaction and recovery

The command locks the target through `.groundtrail/install.lock` before it trusts mutable state. A real install writes a transaction journal under `.groundtrail/transactions/` and writes the installation manifest last. If an earlier transaction is incomplete, a new install changes nothing and reports the transaction that needs recovery.

Use the exact transaction identifier and choose a strategy only after reviewing the target state:

```sh
groundtrail install recover \
  --target ../service \
  --transaction <transaction-id> \
  --strategy resume

# Or, when recorded backups and target digests support restoration:
groundtrail install recover \
  --target ../service \
  --transaction <transaction-id> \
  --strategy rollback
```

Recovery obtains the same lock, requires one matching incomplete journal for that target and generation, and creates an atomic recovery claim. It does not trust process IDs as proof that a transaction is abandoned. If the original installer holds the lock, recovery fails without mutation. If recorded digests do not prove a safe next step, stop and preserve the journal for manual investigation.

The transaction mechanism stages and backs up regular files under the target-local `.groundtrail/transactions/<id>/` directory, checks recorded digests before resume/rollback, and writes the manifest last. It is limited to local regular files on the target filesystem. Node does not expose descriptor-relative `openat`/`renameat` APIs, so the CLI rechecks resolved path components immediately before each mutation but cannot claim a race-free guarantee against a hostile concurrent filesystem mutator. It refuses symlinks, special files, digest drift, and unsupported recovery phases rather than overclaiming safety. It does not claim global multi-file atomicity, crash-proof network-filesystem behavior, or recovery after out-of-band edits.

## Provider-specific notes

Read [Claude Code](../providers/claude.md), [Codex](../providers/codex.md), [Copilot](../providers/copilot.md), and [Devin](../providers/devin.md) before selecting a provider. Provider/session policy remains authoritative; an installed Carrier is a ceiling and does not grant autonomy or external-action authority.
