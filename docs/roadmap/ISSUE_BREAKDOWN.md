# Initial Issue Breakdown

## Purpose

This document translates Phase 0 and the beginning of Phase 1 into independently reviewable work items.

Issue numbers are intentionally not embedded here because they may be created or reordered after the documentation stack is merged.

## Epic A: Repository bootstrap

### A1. Initialize pnpm workspace

Acceptance criteria:

- root `package.json` and workspace configuration;
- package manager version declared;
- clean install succeeds;
- no unnecessary lifecycle scripts.

### A2. Initialize Nx orchestration

Acceptance criteria:

- projects are discovered;
- lint, typecheck, test, build, and validation targets can be run from the root;
- affected execution is documented.

### A3. Configure TypeScript strict ESM baseline

Acceptance criteria:

- shared base configuration;
- package-specific configurations;
- declaration output tested;
- no CommonJS dependency in Core package design.

### A4. Configure linting and formatting

Acceptance criteria:

- ESLint and Prettier commands;
- deterministic CI behavior;
- editor-independent checks.

### A5. Configure Vitest baseline

Acceptance criteria:

- unit test target;
- coverage available but not used as the only quality measure;
- test utilities can be shared without coupling packages.

## Epic B: Package foundation

### B1. Create package template

Acceptance criteria:

- package metadata checklist;
- explicit `exports`;
- `sideEffects` decision;
- artifact allowlist;
- README and stability declaration.

### B2. Bootstrap Core package shell

Acceptance criteria:

- no public State implementation yet unless covered by accepted prototype scope;
- package builds and emits declarations;
- no DOM or Node globals.

### B3. Bootstrap Protocol package shell

Acceptance criteria:

- protocol versioning convention documented;
- schemas remain runtime-neutral;
- diagnostics protocol can evolve without requiring UI dependencies.

### B4. Bootstrap Testing package shell

Acceptance criteria:

- internal contract-test helpers;
- no production runtime dependency from Core to Testing.

## Epic C: Consumer validation

### C1. Create Vanilla fixture

Acceptance criteria:

- fixture is not resolved through workspace source aliases;
- installs a packed artifact;
- runs typecheck, build, and basic runtime test.

### C2. Add package-content validation

Acceptance criteria:

- unexpected files fail validation;
- declarations and source maps follow policy;
- package metadata is inspected before release.

### C3. Add installation smoke test

Acceptance criteria:

- install in a temporary clean directory;
- import public entry point;
- verify no undeclared runtime dependency.

## Epic D: CI and repository operations

### D1. Add baseline GitHub Actions workflow

Acceptance criteria:

- install, lint, typecheck, test, build, and pack checks;
- dependency caching does not compromise reproducibility;
- workflow commands match local commands.

### D2. Add pull request template

Acceptance criteria:

- scope, tests, docs, risks, compatibility, and security prompts;
- RFC or ADR links where required.

### D3. Add issue templates

Acceptance criteria:

- bug report;
- feature proposal;
- RFC tracking;
- documentation issue.

## Epic E: State prototype preparation

### E1. Resolve notification order

Deliverable:

- prototype evidence and accepted RFC update or ADR.

### E2. Resolve re-entrant update behavior

Deliverable:

- tests for allowed, deferred, or rejected behavior.

### E3. Resolve derived-value evaluation model

Deliverable:

- eager versus lazy prototype with performance and ergonomics evidence.

### E4. Define first diagnostics events

Deliverable:

- minimal event schema for store creation, update, subscription, derived computation, batching, and disposal.

## Issue quality checklist

Every implementation issue should include:

- problem or outcome;
- scope and non-goals;
- acceptance criteria;
- dependencies;
- tests required;
- documentation required;
- compatibility impact;
- security or privacy considerations;
- completion evidence.
