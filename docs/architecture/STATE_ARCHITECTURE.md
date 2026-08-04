# Vii State Architecture

Status: Draft

## Purpose

Vii State is the first runtime layer of the Vii ecosystem. It provides a small, deterministic, framework-agnostic model for storing values, deriving values, observing changes, and explaining why updates occurred.

Vii State is not a complete application framework. It must work independently in Vanilla TypeScript and connect to React, Angular, Vue, and future environments through thin adapters.

## Design goals

- Small and tree-shakable runtime
- No framework dependency in the core
- No hidden network or telemetry behavior
- Synchronous and deterministic state propagation by default
- Explicit ownership and cleanup
- Strong TypeScript inference
- SSR-safe construction
- Structured diagnostics from the beginning
- Stable behavior across adapters

## Non-goals for State Alpha

- Persistence
- Distributed state
- CRDTs
- Undo and redo
- Collaborative synchronization
- Deep proxy reactivity
- Middleware marketplaces
- UI rendering
- Query caching
- AI runtime dependencies

## Initial public model

The first API should remain intentionally small.

```ts
interface Readable<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}

interface Writable<T> extends Readable<T> {
  set(value: T | ((current: T) => T)): void;
  update(updater: (current: T) => T): void;
}
```

Possible usage:

```ts
import { createStore, select, batch } from '@kas-labs/vii';

const counter = createStore(0, { name: 'counter' });
const doubled = select(counter, value => value * 2);

batch(() => {
  counter.update(value => value + 1);
  counter.update(value => value + 1);
});
```

The exact API remains subject to RFC review and prototype validation.

## Internal node model

Each reactive node should have at least:

- stable identifier;
- optional developer name;
- current version;
- lifecycle status;
- subscribers;
- dependencies;
- dependents;
- equality strategy;
- owning scope, when applicable;
- diagnostic metadata.

The runtime must not require storing full values inside diagnostics.

## Update flow

A store update follows this conceptual sequence:

1. Read the current value.
2. Produce or receive the next value.
3. Compare values using `Object.is` by default.
4. Skip propagation when the value is equal.
5. Increment the node version.
6. Mark affected derived nodes as dirty.
7. Recompute only observed derived values that require recomputation.
8. Commit the current transaction or batch.
9. Notify subscribers in a defined order.
10. Emit diagnostic events.

The exact notification order and re-entrancy behavior must be defined before Alpha.

## Selectors and derived values

Selectors must:

- support custom equality;
- avoid recomputation when dependencies have not changed;
- be lazy where possible;
- expose explicit lifecycle behavior;
- be disposed when their scope is disposed;
- report recomputation and skip reasons to diagnostics.

The runtime should not silently retain unobserved derived nodes forever.

## Batching

Batching groups multiple writes into one propagation boundary.

Requirements:

- nested batches;
- deterministic commit order;
- no lost updates;
- predictable error handling;
- clear diagnostics for batch start, commit, and failure.

The State core should remain synchronous by default. Framework adapters may coordinate with framework scheduling, but must not alter core semantics.

## Equality

Default equality:

```ts
Object.is(previous, next)
```

Custom equality may be provided for selectors and advanced cases. Deep equality must not be a default behavior.

## Errors

State errors should use structured Vii error codes and include:

- stable code;
- human-readable message;
- recoverability information;
- relevant node or scope identifier;
- documentation reference where available.

## SSR

State creation must be request-safe.

A mutable application store must never become a process-wide singleton by default on a server. Request-scoped factories and explicit hydration contracts are required before SSR is considered supported.

## Framework adapters

Adapters translate Vii subscriptions into native framework mechanisms.

- React: external store integration
- Angular: Signals-oriented bridge
- Vue: shallow external state bridge
- Vanilla: direct subscription

Adapters must not implement a second state engine.

## Quality gates for State Alpha

State Alpha is ready only when:

- Vanilla usage works without adapters;
- React, Angular, and Vue pass the same contract suite;
- subscriptions clean up reliably;
- SSR request isolation is demonstrated;
- bundle and memory measurements are reproducible;
- diagnostic causes are visible;
- documentation explains the mental model in one page;
- no Alpha API exists only for hypothetical future use.
