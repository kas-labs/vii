# Contributing to Vii

Vii welcomes focused, evidence-based contributions that preserve the project's small-core strategy.

## Before contributing

Read:

- `README.md`
- `ROADMAP.md`
- `docs/strategy/PRODUCT_BOUNDARIES.md`
- `docs/governance/RFC_PROCESS.md`
- `docs/governance/API_STABILITY.md`
- `docs/quality/TEST_STRATEGY.md`

## Contribution types

Contributions may include:

- documentation corrections
- test coverage
- benchmarks
- reproducible bug reports
- framework adapter fixtures
- implementation work for an accepted RFC
- RFC proposals
- ADR updates

## Small changes

Small fixes may be proposed directly when they do not change public behavior, architecture, package boundaries, security expectations, or compatibility policy.

## Changes requiring an RFC

An RFC is required for:

- new public APIs
- new packages
- new official adapters
- public protocol changes
- registry schema changes
- new runtime or platform support tiers
- changes to privacy or security defaults
- changes that create migration work for users

## Pull request expectations

A pull request should include:

- a clear problem statement
- the smallest reasonable change
- tests or evidence appropriate to the change
- documentation updates when public behavior changes
- migration notes when applicable
- no unrelated refactoring

## Quality requirements

The repository uses pnpm. Enable Corepack or install pnpm 10.12.4, then run:

```bash
pnpm install --frozen-lockfile
pnpm validate
```

The root validation surface runs formatting, linting, type checking, tests, builds, and packed
artifact validation. The Vanilla fixture is validated from the packed Core artifact so it does not
depend on workspace source imports.

Changes may be required to pass:

- unit and integration tests
- adapter compliance tests
- consumer fixture tests
- package-content validation
- type tests
- accessibility checks
- performance checks
- security review

The exact checks depend on the affected package.

## AI-assisted contributions

AI tools may be used, but the contributor remains responsible for correctness, licensing, security, tests, and understanding the submitted change. Generated code must not introduce hidden dependencies, copied proprietary material, or unverifiable claims.

## Review behavior

Review is technical and evidence-based. Maintainers may request a smaller scope, prototype evidence, an RFC, or additional compatibility tests before accepting a change.

## License and authorship

By contributing, you confirm that you have the right to submit the work under the repository license once one is selected and added to the project.
