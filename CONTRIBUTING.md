# Contributing to Vii

Vii welcomes focused, evidence-based contributions that preserve the project's small-core strategy.

## Before contributing

Read:

- `AGENTS.md`
- `PROJECT_STATE.md`
- the latest entry in `DUTY_WATCH.md`
- `README.md`
- `ROADMAP.md`
- `docs/strategy/PRODUCT_BOUNDARIES.md`
- `docs/governance/CODE_QUALITY_STANDARDS.md`
- `docs/governance/RFC_PROCESS.md`
- `docs/governance/API_STABILITY.md`
- `docs/quality/TEST_STRATEGY.md`

Before changing implementation code, inspect the affected package boundaries, existing tests, relevant RFCs/ADRs, formatted file size, expected growth, bundle/package impact, and lifecycle implications.

## Contribution types

Contributions may include:

- documentation corrections;
- test coverage;
- benchmarks;
- reproducible bug reports;
- framework adapter fixtures;
- implementation work for an accepted RFC;
- RFC proposals;
- ADR updates.

## Small changes

Small fixes may be proposed directly when they do not change public behavior, architecture, package boundaries, security/privacy expectations, compatibility policy, or migration requirements.

## Changes requiring an RFC

An RFC is required for:

- new public APIs;
- new packages;
- new official adapters;
- public protocol changes;
- registry/schema changes;
- new runtime or platform support tiers;
- changes to privacy or security defaults;
- changes that create migration work for users.

## Architecture and code quality

Follow `docs/governance/CODE_QUALITY_STANDARDS.md`.

Default guardrails for hand-written production code:

- prefer files at or below 250 formatted lines;
- begin refactoring review above 300 lines;
- do not create or substantially expand a production file beyond 400 lines without an approved documented exception;
- prefer functions at or below 40 lines and do not exceed 80 lines without an approved exception;
- do not grow existing oversized files by default;
- add or update tests for every behavior change and regression tests for bug fixes when safely expressible;
- preserve dependency direction toward stable core contracts;
- keep React, Angular, tooling, devtools UI, host/platform, filesystem, network, and provider-specific concerns at explicit edges;
- keep framework adapters thin and dependent on core, never the reverse;
- use SOLID, Clean Architecture, DRY, KISS, YAGNI, and composition to reduce coupling, not to create unused layers or abstractions.

For relevant runtime changes, explicitly review allocation/disposal, subscriptions, retained references, batching, deterministic ordering, SSR safety, tree-shaking, bundle impact, package artifacts, and diagnostics overhead.

## Delivery workflow

1. Create a focused branch using `<type>/<short-kebab-description>`.
2. Allowed branch types are `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`, `security`, `release`, `revert`, and `dogfood`. Use `dogfood` only for validated repository self-use or integration cycles.
3. Do not use actor/tool/model prefixes such as `codex/`, `claude/`, `agent/`, `bot/`, or personal-name prefixes.
4. Keep every commit atomic and independently reviewable. Keep implementation, its tests, and required documentation together. Split unrelated features, refactors, formatting-only changes, CI changes, and release metadata.
5. Use a Conventional Commit subject: `<type>(<optional-scope>): <summary>`.
6. Run relevant focused checks and `git diff --check` locally when available.
7. Run `pnpm validate` before pushing implementation changes.
8. Open a pull request that records scope, validation, architecture/package impact, compatibility, decomposition evidence, exceptions, bundle/memory/SSR impact when relevant, and documentation/migration impact.
9. Update `DUTY_WATCH.md` before the task is considered complete.
10. Update `PROJECT_STATE.md` when durable repository state changed.
11. Merge only after required checks and review pass.

## Quality requirements

The repository uses pnpm. Enable Corepack or install pnpm 10.12.4, then run:

```bash
pnpm install --frozen-lockfile
pnpm validate
```

The root validation surface runs formatting, linting, type checking, tests, builds, and packed-artifact validation. The Vanilla fixture is validated from the packed Core artifact so it does not depend on workspace source imports.

Changes may also require:

- unit and integration tests;
- adapter compliance tests;
- consumer fixture tests;
- package-content validation;
- type tests;
- accessibility checks;
- performance/benchmark evidence;
- bundle or tree-shaking evidence;
- memory lifecycle/disposal evidence;
- SSR checks;
- security/privacy review.

The exact checks depend on the affected package.

## Pull request expectations

A pull request should include:

- a clear problem statement;
- the smallest reasonable change;
- tests or evidence appropriate to the change;
- architecture/package-boundary impact;
- public API and compatibility impact;
- bundle, memory, SSR, tree-shaking, and diagnostics impact when relevant;
- documentation updates when public behavior changes;
- migration notes when applicable;
- any code-quality exception and its review trigger;
- no unrelated refactoring.

Do not open a pull request with known failures unless the pull request explicitly exists to diagnose/fix those failures and clearly states the current failing evidence.

## Authorship and attribution

Commit and pull request text must not contain tool/AI attribution.

Forbidden examples include:

- `Co-Authored-By:` trailers naming an assistant, model, agent, or bot;
- `Generated with ...` or `Made with ...` footers;
- any line whose purpose is to credit a coding tool rather than describe the change.

The commit author field records authorship. Commit messages and pull requests describe the change only.

When automation such as dependency tooling adds its own co-author trailer, remove the trailer from the final squash/merge message before confirming the merge.

## AI-assisted contributions

AI tools may be used, but the contributor remains responsible for correctness, licensing, security, tests, maintainability, and understanding the submitted change. Generated code must not introduce hidden dependencies, copied proprietary material, unverifiable claims, hidden telemetry, or undocumented network behavior.

AI assistance does not relax RFC, architecture, quality, validation, or authorship rules.

## Review behavior

Review is technical and evidence-based. Maintainers may request a smaller scope, prototype evidence, an RFC/ADR, decomposition, additional compatibility tests, benchmark evidence, or lifecycle/bundle analysis before accepting a change.

## License and authorship

By contributing, you confirm that you have the right to submit the work under the Apache License 2.0.
