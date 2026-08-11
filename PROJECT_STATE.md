# Vii Project State

This document records durable repository state that future maintainers and coding agents should know before changing the project. It is not a changelog and should not duplicate transient task details.

## Current product direction

Vii is a lightweight, observable, AI-ready TypeScript ecosystem developed by Kas Labs. The project follows a small-core strategy and evolves incrementally rather than beginning as a full framework.

Current architectural priorities include:

- framework-agnostic core behavior;
- explicit lifecycle and disposal;
- predictable reactive semantics;
- small bundle and low runtime overhead;
- SSR-safe and tree-shakable packages;
- evidence-backed performance and compatibility claims;
- thin framework adapters;
- first-class diagnostics without hidden telemetry;
- public API stability through RFC/ADR governance.

The current implementation includes the State Core surface through P1.9, the initial P2.1 shared
adapter compliance suite, and the initial P2.2 React adapter: State reads/writes and subscriptions,
re-entrant updates, Computed, Batch, Scope ownership/disposal, bounded opt-in Diagnostics, and a
reproducible local performance baseline suite. These APIs remain experimental.
The Vanilla consumer fixture exercises State, Computed, Batch, and Scope, and the package-validation
script verifies those behaviors after installing the packed Core artifact into a clean temporary
consumer. The baseline suite measures State creation/writes, subscriber fan-out, Computed chains,
batch propagation, subscription disposal, Scope cleanup, and Diagnostics overhead without adding a
runtime dependency or numeric release budget. The adapter suite is private and provisional: it
checks the adapter-facing snapshot, selection, batching, cleanup, disposal, request-isolation,
server-snapshot, and type-inference behaviors against a Core-backed reference adapter while RFC 0005
remains Draft. The private React adapter exposes `useVii` through React's external-store integration,
including selector/equality overloads and server snapshots; it keeps React at the peer boundary and
leaves request-isolated store creation and hydration data to the application. A packed React artifact
is validated in a clean consumer fixture alongside the packed Core artifact.

## Repository operating model

- Default branch: `main`.
- Development happens on focused branches using `<type>/<short-kebab-description>`.
- Conventional Commit subjects are required by project policy.
- Tool/AI attribution such as `Co-Authored-By` and generated-by footers is forbidden in commit and PR text.
- Meaningful tasks must update `DUTY_WATCH.md` with an accurate handoff.
- Durable architecture, package maturity, validation-surface, or roadmap changes must update this document.
- Public API, package, protocol, compatibility, privacy, security, or migration changes follow the RFC/ADR governance rules.

## Quality baseline

The canonical quality baseline is `docs/governance/CODE_QUALITY_STANDARDS.md`.

Key defaults:

- production files target <= 250 formatted lines;
- refactoring review begins above 300 lines;
- new/substantially expanded production files require an exception above 400 lines;
- functions target <= 40 lines and require review/exception above 80 lines;
- behavior changes require tests;
- bug fixes require regression tests when safely expressible;
- core must not depend on framework adapters;
- framework/platform concerns belong at explicit edges;
- bundle, memory lifecycle, SSR safety, tree-shaking, package artifacts, and diagnostics are product-level concerns.

## Validation baseline

The repository root validation command is:

```bash
pnpm validate
```

It currently covers formatting, linting, type checking, tests, builds, and packed-artifact validation.
The focused Core performance command is `pnpm benchmark:core`; it records raw results under
`benchmarks/results/` with methodology in `docs/quality/CORE_PERFORMANCE_BASELINE.md`.
The focused adapter command is `pnpm --filter @vii/adapter-testing test`; the full suite is included
in `pnpm validate`. React adapter checks also include `pnpm --filter @vii/react test` and the packed
React clean-consumer fixture.

Repository governance CI additionally checks branch naming and forbidden authorship/tool-attribution metadata for pull requests and their commits.

## Source-of-truth documents

Use the following ownership model rather than duplicating rules:

- product direction and entry point: `README.md`, `ROADMAP.md`;
- repository agent/maintainer workflow: `AGENTS.md`;
- contribution/delivery workflow: `CONTRIBUTING.md`;
- durable repository state: `PROJECT_STATE.md`;
- per-task handoff: `DUTY_WATCH.md`;
- code quality and architecture baseline: `docs/governance/CODE_QUALITY_STANDARDS.md`;
- product boundaries: `docs/strategy/PRODUCT_BOUNDARIES.md`;
- API compatibility: `docs/governance/API_STABILITY.md`;
- RFC process: `docs/governance/RFC_PROCESS.md`;
- ADR process: `docs/governance/ADR_PROCESS.md`;
- package lifecycle: `docs/governance/PACKAGE_LIFECYCLE.md`;
- release policy: `docs/governance/RELEASE_POLICY.md`;
- testing: `docs/quality/TEST_STRATEGY.md`.

## Update rule

Update this file only when a change remains important after the current task is forgotten. Put transient status, exact commands, partial work, next steps, and recovery notes in `DUTY_WATCH.md` instead.
