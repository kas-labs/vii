# Phase 0: Repository, Protocol, and Engineering-Context Foundation

## Objective

Create a reliable development base before implementing the first public runtime API.

Phase 0 must reduce future rework. It should not become an excuse to build every possible tool before product code begins.

The practical execution order, expected files, and PR sequence are defined in:

- `docs/implementation/PHASE_0_EXECUTION_PLAYBOOK.md`;
- `docs/implementation/FIRST_IMPLEMENTATION_BACKLOG.md`;
- `docs/implementation/REPOSITORY_TARGET_STRUCTURE.md`;
- `docs/roadmap/FOUNDATION_COVERAGE_AUDIT.md`.

## Scope

### Repository bootstrap

- pnpm workspace;
- Nx workspace orchestration;
- TypeScript strict mode;
- ESM-first package configuration;
- Vitest;
- ESLint;
- Prettier;
- package build and pack validation;
- documentation checks;
- GitHub Actions baseline.

### Initial workspace structure

```text
apps/
  playground/

packages/
  core/

fixtures/
  vanilla/

scripts/
  package-validation/

docs/
rfcs/
adr/
```

The exact package names may change through RFC review. Empty placeholder packages should not be created without a near-term use.

Protocol and Testing packages should be extracted only when the first implementation needs shared contracts or compliance utilities.

Intentloom configuration should remain outside runtime packages and should not require creation of a dedicated Vii package during Phase 0.

## Workstreams

### 1. Toolchain

- choose supported Node and pnpm versions;
- add version declarations;
- configure reproducible installation;
- define root scripts;
- configure affected-project execution through Nx;
- ensure local and CI commands use the same underlying tasks.

### 2. Package standards

Each package must define:

- purpose;
- public exports;
- stability level;
- runtime assumptions;
- side-effect policy;
- build output;
- test strategy;
- package content allowlist;
- owner.

### 3. Validation commands

Target developer commands:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack:check
pnpm validate
```

`pnpm validate` should become the single local equivalent of the required CI checks.

### 4. First real package

Create one buildable, runtime-neutral package before adding other package shells.

It must:

- emit ESM JavaScript;
- emit TypeScript declarations;
- use explicit exports;
- declare side effects intentionally;
- create a package tarball;
- pass package-content validation;
- contain no Intentloom, InLoom, agent, AI-provider, framework, DOM, or Node runtime dependency unless explicitly required by the package contract.

### 5. Consumer fixture

The Vanilla fixture must install packed local artifacts rather than import source files directly.

It validates:

- package exports;
- TypeScript declarations;
- ESM loading;
- tree-shaking assumptions;
- clean installation;
- basic runtime execution;
- absence of hidden network or AI requirements.

### 6. Documentation indexes

Maintain indexes for:

- architecture documents;
- implementation guides;
- RFCs;
- ADRs;
- roadmap phases;
- package status;
- agent and Intentloom integration policies.

### 7. Intentloom foundation profile

Create only the smallest development-time profile needed to validate shared engineering context.

It should reference, rather than duplicate:

- product boundaries;
- current roadmap phase;
- architecture map;
- RFC and ADR indexes;
- security and quality policies;
- task specification template;
- agent capabilities and approval rules.

The first validation scenarios are:

1. read-only documentation audit;
2. stale-context detection;
3. conflicting-instruction report;
4. documentation-only mutation with preview, approval, validation, and PR evidence.

This work must not block P0.1 through P0.8 or introduce a production runtime dependency.

## Recommended PR sequence

```text
P0.1 pnpm workspace
P0.2 TypeScript and ESM baseline
P0.3 lint, formatting, and Vitest
P0.4 Nx orchestration
P0.5 first buildable package
P0.6 package validation
P0.7 packed Vanilla fixture
P0.8 CI validation
P0.9 contributor setup and Phase 1 backlog
P0.10 optional Intentloom profile validation
```

P0.10 may run earlier as a documentation-only task, but it cannot delay the repository bootstrap sequence.

Each PR should be independently reviewable and should leave `pnpm validate` passing once that command exists.

## Deliverables

- functioning pnpm and Nx workspace;
- root validation commands;
- initial package template demonstrated by a real package;
- Vanilla consumer fixture;
- CI workflow for install, lint, typecheck, test, build, and package validation;
- package and documentation indexes;
- contributor setup instructions;
- Phase 1 backlog;
- Intentloom integration boundary and agent-governance documents;
- optional minimal Vii engineering profile validated without runtime coupling.

## Non-goals

Phase 0 does not include:

- complete State implementation;
- React, Angular, or Vue adapters;
- Vii Query;
- native component compiler;
- UI registry;
- Server implementation;
- deployment infrastructure;
- sophisticated release automation;
- broad runtime matrix;
- Nx plugin for consumer workspaces;
- autonomous code implementation;
- agent-controlled releases;
- cloud policy synchronization;
- mandatory AI or Intentloom usage.

## Exit checklist

- [ ] Fresh clone installs successfully.
- [ ] `pnpm validate` succeeds locally.
- [ ] CI runs the same validation tasks.
- [ ] At least one package is built and packed.
- [ ] The Vanilla fixture consumes the packed artifact.
- [ ] No package relies on unpublished workspace-only resolution in the fixture.
- [ ] Package exports and declarations are validated.
- [ ] Packed runtime artifacts contain no hidden Intentloom or AI requirement.
- [ ] Documentation navigation is usable.
- [ ] Contributor instructions explain the local workflow.
- [ ] Agent permissions, context precedence, approvals, and stop conditions are documented.
- [ ] Phase 1 issues include acceptance criteria and dependencies.
