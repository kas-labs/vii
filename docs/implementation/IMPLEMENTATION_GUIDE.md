# Vii Implementation Guide

Status: Working implementation guidance

## Purpose

This guide turns Vii architecture into an implementation order for developers and AI agents.

Architecture documents define the allowed product direction. This guide defines what to build first, what evidence is required, and when work must stop for an RFC or ADR.

## Implementation order

```text
Repository foundation
→ Core package
→ basic State
→ notification semantics
→ Computed and Batch
→ Scope and disposal
→ Diagnostics
→ packed Vanilla fixture
→ framework adapters
→ CLI foundation
→ real application validation
```

Do not skip directly to the native renderer, `.vii` compiler, SSR framework, Query, UI registry, Nx plugin, or custom bundler.

## Current implementation boundary

The first implementation slice contains:

1. reproducible monorepo setup;
2. one runtime-neutral package;
3. deterministic State primitives;
4. Scope and disposal;
5. bounded diagnostics;
6. a packed Vanilla consumer fixture;
7. adapters after Core semantics are stable;
8. a small deterministic CLI.

Outside this slice:

- native components and DOM renderer;
- SSR, hydration, streaming, and Router;
- Query, Form, and UI Registry;
- Bun, Rspack, and Nx integrations;
- desktop and mobile packages;
- AI-required functionality.

## Implementation rules

### Build vertical slices

Every step should produce executable evidence.

Preferred:

```text
behavior
+ tests
+ package build
+ fixture usage
+ documentation
```

Avoid empty future packages or broad placeholder abstractions.

### Keep Core runtime-neutral

Core must not import DOM, Node, framework, CLI, build-tool, Devtools UI, or AI-provider code.

### Keep behavior explicit

Canonical State usage should show that a value is reactive:

```ts
const count = state(0);

count.set(10);
count.update(value => value + 1);
```

Compiler sugar may come later, but Core behavior must work without a compiler.

### Maintain one semantic model

Vanilla, React, Angular, Vue, future TSX, and future `.vii` components share one State engine, Scope model, diagnostics protocol, and error model.

Adapters translate host integration. They do not create alternative runtimes.

## First public behavior

Begin with the smallest readable contract:

```ts
interface ReadableState<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}

interface WritableState<T> extends ReadableState<T> {
  set(value: T): void;
  update(updater: (current: T) => T): void;
}
```

The exact names remain experimental until prototype tests confirm them.

Do not add persistence, async state, proxy reactivity, middleware, framework hooks, or server caching to the first State implementation.

## Required evidence

A behavior is complete only when supported by relevant evidence:

- runtime tests;
- type tests;
- lifecycle and cleanup tests;
- packed artifact installation;
- consumer fixture usage;
- documentation;
- compatibility notes;
- security review for new trust boundaries.

## Pull request scope

Prefer one independently testable capability per PR.

Good:

```text
State read and write
+ equality tests
+ package fixture
```

Too broad:

```text
State + Query + renderer + SSR + CLI
```

## When to stop for a decision record

Open or update an RFC or ADR when work would:

- change public State semantics;
- create a new official package;
- introduce a framework dependency into Core;
- change security defaults;
- add hidden I/O;
- begin the native renderer or SSR implementation;
- make a compatibility or performance promise without evidence.

## First meaningful release

The first release is successful when developers can install Vii, create and derive State, dispose resources, understand update causes, and use the same semantics in Vanilla and supported adapters.
