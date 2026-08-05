# Repository Target Structure

Status: Planned structure, created incrementally

## Purpose

This document shows where code should live as Vii grows.

It is a target map, not an instruction to create every directory immediately. A directory or package should be created only when the current implementation phase needs it.

## Phase 0 structure

```text
vii/
├── .github/
│   └── workflows/
├── apps/
│   └── playground/
├── packages/
│   └── core/
├── fixtures/
│   └── vanilla/
├── scripts/
│   └── package-validation/
├── docs/
├── rfcs/
├── adr/
├── package.json
├── pnpm-workspace.yaml
├── nx.json
└── tsconfig.base.json
```

Only `packages/core` is required initially. Protocol or Testing packages should be extracted when real shared contracts justify them.

## Core package direction

```text
packages/core/
├── src/
│   ├── state/
│   ├── computed/
│   ├── batch/
│   ├── scope/
│   ├── diagnostics/
│   └── index.ts
├── test/
├── type-test/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

Create subdirectories only when they contain real implementation. The first State PR may begin with fewer files.

## Adapter stage

After State Alpha semantics are stable:

```text
packages/
├── core/
├── react/
├── angular/
├── vue/
└── adapter-testing/

fixtures/
├── vanilla/
├── react-vite/
├── angular/
└── vue-vite/
```

`adapter-testing` contains the shared compliance suite. Core never depends on it.

## CLI stage

```text
packages/
├── cli-core/
├── cli/
└── create-vii/
```

Responsibilities:

```text
cli-core
  project analysis, plans, generators, migrations, validation

cli
  terminal commands and output

create-vii
  minimal new-project entry point
```

The CLI engine should operate against an abstract workspace interface so future Nx and IDE integrations can reuse it.

## Planned module stage

Packages should be added only after their RFC, consumer, and quality plan exist.

Potential structure:

```text
packages/
├── query/
├── devtools-protocol/
├── devtools-ui/
├── router/
├── form/
├── ui-core/
└── registry/
```

These packages are not part of Phase 0 or the first State implementation.

## Native framework research stage

Only after earlier phases are validated:

```text
packages/
├── component-contracts/
├── compiler-core/
├── compiler-vii/
├── web-runtime/
├── app/
├── build-core/
├── build-vite/
└── nx/
```

Possible responsibilities:

```text
component-contracts
  Component IR and renderer-neutral contracts

compiler-core
  parsing-independent transformations and diagnostics

compiler-vii
  `.vii` SFC parser and compiler

web-runtime
  DOM bindings, hydration, and browser lifecycle

app
  routes, layouts, loaders, SSR, and route rules

build-core
  environment graph, route graph, manifests, engine contracts

build-vite
  Vite and Rolldown integration

nx
  optional Nx generators, inferred tasks, and migrations
```

This structure remains Research or Vision until approved implementation work begins.

## Dependency direction

```text
applications and fixtures
        ↓
adapters, CLI, build integrations
        ↓
product modules
        ↓
Core contracts, Scope, diagnostics
```

Forbidden examples:

- Core importing React;
- State importing Query;
- runtime packages importing CLI;
- compiler contracts importing Vite;
- production packages importing test helpers;
- adapters implementing their own State graph.

## Naming guidance

Use package names that describe responsibility, not internal technology.

Prefer:

```text
core
react
query
cli-core
build-vite
```

Avoid vague packages such as:

```text
common
utils
shared2
misc
helpers
```

Shared code should be extracted only after two real consumers need the same stable contract.

## Feature organization in applications

Reference applications should demonstrate feature ownership:

```text
src/
├── app/
├── features/
│   ├── users/
│   │   ├── components/
│   │   ├── state/
│   │   ├── services/
│   │   └── tests/
│   └── billing/
└── shared/
```

`shared` should contain genuinely cross-feature code, not code whose owner is unclear.

## File creation rule

Before adding a new file or package, identify:

- its responsibility;
- its owner;
- its direct dependencies;
- its consumer;
- its test location;
- its stability level;
- its removal path.

If these cannot be answered, the abstraction is probably premature.
