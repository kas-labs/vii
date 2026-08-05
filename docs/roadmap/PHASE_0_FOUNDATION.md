# Phase 0: Repository and Protocol Foundation

## Objective

Create a reliable development base before implementing the first public runtime API.

Phase 0 must reduce future rework. It should not become an excuse to build every possible tool before product code begins.

The practical execution order, expected files, and PR sequence are defined in:

- `docs/implementation/PHASE_0_EXECUTION_PLAYBOOK.md`;
- `docs/implementation/FIRST_IMPLEMENTATION_BACKLOG.md`;
- `docs/implementation/REPOSITORY_TARGET_STRUCTURE.md`.

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
- pass package-content validation.

### 5. Consumer fixture

The Vanilla fixture must install packed local artifacts rather than import source files directly.

It validates:

- package exports;
- TypeScript declarations;
- ESM loading;
- tree-shaking assumptions;
- clean installation;
- basic runtime execution.

### 6. Documentation indexes

Maintain indexes for:

- architecture documents;
- implementation guides;
- RFCs;
- ADRs;
- roadmap phases;
- package status.

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
```

Each PR should be independently reviewable and should leave `pnpm validate` passing once that command exists.

## Deliverables

- functioning pnpm and Nx workspace;
- root validation commands;
- initial package template demonstrated by a real package;
- Vanilla consumer fixture;
- CI workflow for install, lint, typecheck, test, build, and package validation;
- package and documentation indexes;
- contributor setup instructions;
- Phase 1 backlog.

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
- Nx plugin for consumer workspaces.

## Exit checklist

- [ ] Fresh clone installs successfully.
- [ ] `pnpm validate` succeeds locally.
- [ ] CI runs the same validation tasks.
- [ ] At least one package is built and packed.
- [ ] The Vanilla fixture consumes the packed artifact.
- [ ] No package relies on unpublished workspace-only resolution in the fixture.
- [ ] Package exports and declarations are validated.
- [ ] Documentation navigation is usable.
- [ ] Contributor instructions explain the local workflow.
- [ ] Phase 1 issues include acceptance criteria and dependencies.
