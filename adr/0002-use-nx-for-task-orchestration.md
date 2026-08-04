# ADR 0002: Use Nx for task orchestration

- Status: Proposed
- Date: 2026-08-05

## Context

Vii needs package graph awareness, affected-project execution, caching, repeatable validation targets, and future support for application and fixture projects. The orchestration layer must not dictate Vii runtime architecture or require every package to use framework-specific generators.

## Decision

Use Nx for repository task orchestration, dependency graph analysis, caching, and affected execution.

Nx will initially coordinate a small explicit target set:

- `lint`
- `typecheck`
- `test`
- `build`
- `pack`
- `validate-package`

Project configuration should remain understandable without deep Nx-specific abstractions. Custom executors and generators are added only when repeated repository needs justify them.

## Consequences

### Positive

- dependency-aware task execution;
- local and CI caching;
- affected project validation;
- support for packages, fixtures, tools, and future applications in one graph.

### Negative

- additional tooling and configuration surface;
- risk of repository logic becoming overly Nx-specific;
- upgrades require compatibility maintenance.

## Alternatives considered

- pnpm scripts only;
- Turborepo;
- Lage;
- custom task runner.

## Related records

- `docs/architecture/MONOREPO_BOOTSTRAP.md`
- `docs/roadmap/PHASE_0_FOUNDATION.md`
