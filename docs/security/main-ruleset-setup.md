# Planned `main` branch ruleset

This document prepares the repository's `main` branch protection posture. It is a setup guide, **not**
a repository setting and does not activate a ruleset. Do not create or enforce the ruleset until Task 8
has created the named checks and Task 10 has confirmed that each one reported success on the latest
commit. The repository must retain this inactive state if any check is missing, renamed, or failing.

## Preconditions

Before activation, a maintainer must verify all of the following in the GitHub UI for the latest commit
to `main`:

1. The checks below exist with their exact names and have passed:
   - `ci`
   - `compatibility`
   - `generated`
   - `CodeQL`
   - `dependency-review`
2. Every named workflow remains credential-free for normal validation and permits fork pull requests.
   In particular, normal CI runs `npm run clean-room:content`, not the owner-only
   `npm run bootstrap:audit` remote/fork audit.
3. The required checks are selectable by GitHub. A check that has never reported must not be made
   required, because an absent check can block all pull requests.
4. The administrator who enables the ruleset understands the applicable GitHub plan and any
   organization-level ruleset inheritance.

## Ruleset definition to create after verification

Create one active branch ruleset targeting the default branch `main` with these rules:

| Rule                       | Required setting                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Pull requests              | Require one approving review; dismiss stale approvals when new commits are pushed if repository policy permits. |
| Pull request conversations | Require all conversations to be resolved.                                                                       |
| Status checks              | Require the exact five checks listed above to pass before merging. Do not use similarly named status contexts.  |
| History                    | Require linear history.                                                                                         |
| Force pushes               | Disallow force pushes.                                                                                          |

Keep the bypass list empty except for a documented emergency repository-owner process. Do not grant a
bypass to automation merely to avoid a failing required check. This task intentionally does not define
tag rules, release rules, npm publication, release credentials, or trusted publishing; those belong to
Task 11.

## Activation record

When Task 10 activates this definition, record the date, ruleset name/ID, target, selected check names,
and the latest passing commit in the release/governance evidence. Do not record tokens, repository PATs,
or other credentials.
