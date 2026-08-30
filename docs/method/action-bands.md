# Action Bands

The effective Action Band is the most restrictive limit from the skill, user or session authority, applicable policy, Reach Map, and available Source Records.

| Band        | Maximum behavior                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observe`   | Read supplied files and produce analysis records. No writes, commands, network, or external mutation.                                                                 |
| `recommend` | Propose plans, patches, tests, and decisions. Do not apply changes or mutate external systems.                                                                        |
| `workspace` | Edit a local worktree and run allowlisted local checks. Do not push, mutate pull requests, merge, release, deploy, or access production.                              |
| `gated`     | Perform an explicitly listed external action only after its Control Point is satisfied.                                                                               |
| `delegated` | Perform policy-scoped actions explicitly delegated in the Ground Packet. It cannot expand scope, change policy, self-approve evidence, or bypass human-only controls. |

A Carrier may reduce an Action Band to fit its host, but never broaden the canonical ceiling.
