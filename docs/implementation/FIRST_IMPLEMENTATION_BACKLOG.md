# First Implementation Backlog

Status: Proposed execution order

## Purpose

This backlog gives developers and AI agents a concrete starting sequence after the documentation stack is reviewed.

Tasks are ordered by dependency. Later work should not begin merely because it looks more interesting.

## Milestone P0: Repository foundation

### P0.1 Initialize pnpm workspace

Deliverables:

- root `package.json`;
- `pnpm-workspace.yaml`;
- package manager and Node versions;
- clean installation instructions.

Acceptance:

- fresh clone installs with a frozen lockfile;
- no unnecessary install scripts;
- workspace packages are discovered.

### P0.2 Add strict TypeScript and ESM baseline

Deliverables:

- `tsconfig.base.json`;
- package build configuration;
- declaration output configuration;
- public export conventions.

Acceptance:

- a sample package typechecks and builds;
- Core does not require DOM or Node globals;
- output is ESM.

### P0.3 Add formatting, linting, and Vitest

Deliverables:

- root commands;
- shared lint configuration;
- deterministic formatting check;
- one passing sample test.

Acceptance:

```bash
pnpm format:check
pnpm lint
pnpm test
```

run successfully from the repository root.

### P0.4 Configure Nx task orchestration

Deliverables:

- project discovery;
- task dependencies;
- affected execution documentation;
- root `validate` command.

Acceptance:

- Nx is used only as repository tooling;
- runtime packages do not depend on Nx;
- local and CI tasks use the same commands.

### P0.5 Create first buildable package

Deliverables:

- `packages/core`;
- explicit exports;
- declarations;
- package README;
- package stability marker.

Acceptance:

- package builds;
- package tarball is created;
- tarball contains only expected files.

### P0.6 Add clean package installation test

Deliverables:

- temporary installation script;
- import smoke test;
- undeclared dependency check.

Acceptance:

- public entry point imports from the tarball;
- declarations resolve;
- no source alias is used.

### P0.7 Add Vanilla fixture

Deliverables:

- minimal TypeScript application;
- tarball installation;
- typecheck, build, and runtime smoke test.

Acceptance:

- fixture behaves like an external consumer;
- fixture passes without workspace source imports.

### P0.8 Add CI validation

Deliverables:

- GitHub Actions workflow;
- frozen installation;
- validation and fixture checks.

Acceptance:

- CI invokes the documented local commands;
- package and fixture validation are required evidence.

## Milestone P1: Basic State

### P1.1 Implement State read and write

Acceptance:

- initial value;
- `get`, `set`, and `update` behavior;
- `Object.is` equality;
- runtime and type tests.

### P1.2 Implement subscriptions

Acceptance:

- deterministic notification order;
- idempotent unsubscribe;
- subscribe and unsubscribe during notification are tested;
- listener errors have documented behavior.

### P1.3 Resolve re-entrant updates

Deliverables:

- focused prototype tests;
- ADR or RFC update if semantics change;
- documented processing order.

### P1.4 Implement Computed

Acceptance:

- dependency tracking;
- invalidation and caching;
- cycle detection;
- disposal behavior;
- no unnecessary recomputation.

### P1.5 Implement Batch

Acceptance:

- nested batching;
- deterministic commit;
- same-State repeated writes;
- error behavior;
- one effective propagation boundary.

### P1.6 Implement Scope and disposal

Acceptance:

- owned subscriptions are released;
- child Scopes are released;
- disposal is idempotent;
- cleanup errors are structured;
- lifecycle tests demonstrate no retained listeners.

### P1.7 Add minimal diagnostics

Acceptance:

- stable event types;
- causal identifiers where practical;
- no raw values by default;
- bounded storage;
- disabled diagnostics do not change behavior.

### P1.8 Expand Vanilla fixture

Acceptance:

- State, Computed, Batch, and Scope are used from the packed artifact;
- documentation example matches executable code;
- package installation remains clean.

### P1.9 Establish performance baselines

Measure:

- State creation;
- writes;
- subscriber fan-out;
- computed chains;
- batch propagation;
- disposal;
- diagnostics overhead.

Acceptance:

- methodology and environment are recorded;
- results are baselines, not unsupported marketing claims.

## Milestone P2: Adapters

### P2.1 Create shared adapter compliance suite

The suite verifies:

- current value reading;
- update delivery;
- equality behavior;
- cleanup;
- batching;
- request isolation where relevant.

### P2.2 React adapter

Use React's external-store integration rather than a second Vii runtime.

### P2.3 Angular adapter

Bridge to Angular Signals and DI scopes without importing Angular into Core.

### P2.4 Vue adapter

Expose Vii values through a shallow Vue integration without duplicating dependency tracking.

Each adapter requires a packed consumer fixture.

## Milestone P3: CLI foundation

### P3.1 Project and package-manager detection

### P3.2 `vii init`

### P3.3 `vii add state`

### P3.4 `vii doctor`

### P3.5 Machine-readable plans and output

All modifying commands must support dry-run and report every changed file.

## Backlog rules

A task should not start until:

- its dependency tasks are complete;
- acceptance criteria are clear;
- required architecture documents have been read;
- security and compatibility impacts are identified;
- the task can be reviewed independently.

A task is not complete when code merely compiles. It is complete when its required behavior, lifecycle, package, documentation, and consumer evidence exist.
