# Monorepo Bootstrap Architecture

## Decision context

Vii requires multiple packages, framework adapters, fixtures, tools, and documentation. The repository should support this structure without forcing every project to share runtime dependencies.

## Proposed foundation

- pnpm workspaces for dependency installation and workspace linking;
- Nx for task orchestration, project graph, caching, and affected execution;
- TypeScript strict mode;
- ESM-first packages;
- Vitest for initial unit and contract testing;
- ESLint and Prettier;
- packed-artifact consumer fixtures;
- GitHub Actions for baseline validation.

## Dependency direction

```text
fixtures and applications
        ↓
adapters, integrations, and tools
        ↓
modules
        ↓
core and protocols
```

Core and protocol packages must not depend on applications, framework adapters, CLI packages, or fixtures.

## Initial project groups

### Packages

Potential initial packages:

- Core;
- Protocol;
- Testing utilities.

A package is created only when implementation work needs the boundary.

### Applications

- documentation site;
- playground.

These may begin after the foundational tasks are reliable.

### Fixtures

Fixtures represent external consumers and should avoid privileged workspace resolution.

The initial fixture is Vanilla TypeScript. Framework fixtures are introduced with their adapters.

## Task model

Each package should expose only relevant tasks from this set:

- lint;
- typecheck;
- test;
- build;
- pack-check;
- benchmark;
- docs-check.

The root `validate` task composes the stable required tasks.

## Caching policy

Caching is allowed for deterministic tasks. Publication, security checks, and clean-install verification should not rely solely on cached results.

## Version policy

Tool versions must be declared and updated intentionally. Automated updates may open proposals, but updates that affect package output, TypeScript behavior, or release semantics require review evidence.

## Package output

Every publishable package should define:

- explicit public `exports`;
- type declaration paths;
- ESM output;
- package content allowlist;
- side-effect declaration;
- supported runtime tier;
- stability level.

## Fixture isolation

A consumer fixture must not pass only because it can access source files or undeclared workspace dependencies.

Preferred validation:

1. build package;
2. create package archive;
3. install archive into fixture or temporary consumer;
4. typecheck and build fixture;
5. run a minimal behavior test.

## Bootstrap limits

Do not add during initial bootstrap unless required by an accepted issue:

- custom bundler;
- custom test runner;
- custom package manager;
- large documentation platform integration;
- release automation that publishes externally;
- all future package placeholders.
