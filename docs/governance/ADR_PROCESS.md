# Architecture Decision Record Process

Architecture Decision Records capture important internal technical decisions that do not require a full public RFC.

## Use an ADR when

- selecting repository tooling
- choosing an internal implementation strategy
- defining a package build approach
- recording a dependency decision
- documenting why one technical option was rejected
- changing an earlier internal decision

Use an RFC instead when the decision changes public APIs, protocols, package boundaries, compatibility, security defaults, or user migrations.

## File naming

```text
adr/NNNN-short-title.md
```

Numbers are sequential and never reused.

## Required sections

- Status
- Context
- Decision
- Consequences
- Alternatives considered
- References

## Status values

- Proposed
- Accepted
- Superseded
- Deprecated
- Rejected

## Lifecycle

1. Create the ADR as Proposed.
2. Discuss it in a pull request.
3. Validate assumptions with a prototype when needed.
4. Mark it Accepted when the associated change is approved.
5. Create a new ADR to supersede an accepted decision. Do not rewrite history silently.

## Scope

ADRs explain why a decision was made. They are not substitutes for user documentation, implementation plans, or API reference material.
