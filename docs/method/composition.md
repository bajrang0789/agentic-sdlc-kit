# Composition and handoff

Skill contracts declare artifacts, state requirements, outputs, ordering edges, permission ceilings, Action Bands, Control Points, and revision freshness. A composition graph must be acyclic. A downstream skill can consume only artifacts declared by an upstream producer or the Ground Packet.

A Handoff Bundle transfers the current packet digest and Track State, completed work, changed paths, decisions, claims, source references, outstanding Control Points, unknowns, next skills, and freshness. A handoff does not imply approval, completion, or an authority transfer.
