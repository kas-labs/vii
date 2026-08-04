# Phase 0: Repository and Protocol Foundation

## Objective

Create a reliable development base before implementing the first public runtime API.

Phase 0 must reduce future rework. It should not become an excuse to build every possible tool before product code begins.

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
  docs/
  playground/

packages/
  core/
  protocol/
  testing/

fixtures/
  vanilla/

scripts/
  validation/

docs/
rfcs/
adr/
```

The exact package names may change through RFC review. Empty placeholder packages should not be created without a near-term use.

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

### 4. Consumer fixture

The Vanilla fixture must install packed local artifacts rather than import source files directly.

It validates:

- package exports;
- TypeScript declarations;
- ESM loading;
- tree-shaking assumptions;
- clean installation;
- basic runtime execution.

### 5. Documentation indexes

Add indexes for:

- architecture documents;
- RFCs;
- ADRs;
- roadmap phases;
- package status.

## Deliverables

- functioning pnpm and Nx workspace;
- root validation commands;
- initial package template;
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
- UI registry;
- Server implementation;
- deployment infrastructure;
- sophisticated release automation;
- broad runtime matrix.

## Exit checklist

- [ ] Fresh clone installs successfully.
- [ ] `pnpm validate` succeeds locally.
- [ ] CI runs the same validation tasks.
- [ ] At least one package is built and packed.
- [ ] The Vanilla fixture consumes the packed artifact.
- [ ] No package relies on unpublished workspace-only resolution in the fixture.
- [ ] Package exports and declarations are validated.
- [ ] Documentation navigation is usable.
- [ ] Phase 1 issues include acceptance criteria and dependencies.
