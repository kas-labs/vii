# Repository Operating Model

This document defines how the Vii monorepo should be organized and operated as implementation begins.

## Branches

- `main` is the protected integration branch.
- Feature and documentation work uses short-lived branches.
- Large architecture work may use stacked pull requests.
- Direct pushes to `main` should be disabled once branch protection is configured.

## Pull requests

Pull requests should be small enough to review, have a single primary purpose, and reference the relevant RFC or ADR when required.

Draft pull requests are encouraged for architecture and early implementation work.

## Ownership

Ownership should be assigned by area rather than by the entire repository.

Potential ownership groups include:

- Core and State
- diagnostics and protocols
- framework adapters
- CLI and generators
- UI and Registry
- Server and runtimes
- documentation and governance

A future `.github/CODEOWNERS` file should reflect actual maintainers rather than aspirational teams.

## Required checks

The initial repository checks should grow incrementally:

1. formatting and linting
2. TypeScript build
3. unit tests
4. package build and contents validation
5. consumer fixtures
6. compatibility and performance checks
7. security and provenance checks

Checks should only become required after they are reliable and maintainable.

## Stacked pull requests

Stacked PRs may be used when later documents or implementations depend on earlier unmerged work. Each PR must clearly identify its base branch and dependency order.

Before final merge, stacked branches should be retargeted or updated so each PR contains only its intended changes.

## Issue tracking

Issues should represent actionable work, reproducible defects, accepted roadmap items, or focused research questions. Broad ideas should begin as discussions or RFC drafts rather than implementation issues.

## Labels

A future label taxonomy may include:

- area:core
- area:adapter
- area:cli
- area:ui
- area:server
- type:bug
- type:feature
- type:docs
- type:rfc
- status:blocked
- status:needs-evidence

## Automation

Automation must remain inspectable and deterministic. Repository workflows must not introduce hidden source uploads, unreviewed code generation, or implicit release authority.
