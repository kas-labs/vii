# RFC 0002: Core Store Contract

- Status: Draft
- Authors: Kas Labs
- Created: 2026-08-05

## Summary

Define the smallest public contract for a framework-agnostic Vii store.

## Motivation

The first Vii implementation requires a stable mental model that can be used directly in Vanilla TypeScript and adapted to React, Angular, Vue, and future environments without changing core semantics.

## Proposed direction

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

Creation:

```ts
const store = createStore(initialValue, {
  name: 'counter',
});
```

Derived state:

```ts
const doubled = select(store, value => value * 2);
```

Batching:

```ts
batch(() => {
  store.update(value => value + 1);
  store.update(value => value + 1);
});
```

## Semantics to resolve

Before acceptance, this RFC must define:

- listener notification order;
- re-entrant updates;
- errors thrown by listeners;
- update behavior after disposal;
- selector laziness;
- selector equality;
- batch failure behavior;
- whether `set` accepts an updater or only `update` does;
- development metadata and naming;
- snapshot requirements for framework adapters.

### Prototype decision: re-entrant updates

The State prototype uses a synchronous FIFO notification queue for writes made from listeners:

- an effective write commits its value immediately;
- notification of that value is queued when another notification is in progress;
- the current listener snapshot completes before the next queued value is notified;
- the outermost `set` or `update` drains the queue before returning;
- `Object.is`-equal writes do not enqueue notifications;
- listener errors are collected across the complete flush and reported after queued writes finish.

This prevents recursive listener interleaving and lost queued updates while keeping State synchronous.
The prototype does not yet define batching, Computed invalidation, or Scope disposal semantics.

## Default equality

`Object.is` is proposed as the default equality function.

Deep equality is not proposed as a default.

## Alternatives considered

### Reducer and action model

Rejected for the first API because it introduces a larger mental model and is not necessary for a minimal reactive core.

### Proxy-based deep reactivity

Rejected for Alpha because it complicates debugging, equality, serialization, SSR, framework interoperability, and memory analysis.

### Atom-only terminology

Not selected yet. `store` is currently the clearest general term for initial users.

## Compatibility

The contract must support:

- direct Vanilla TypeScript use;
- React external store snapshots;
- Angular Signals bridges;
- Vue shallow external state bridges;
- SSR request-scoped factories;
- structured diagnostics.

## Non-goals

- persistence;
- effects system;
- query cache;
- networking;
- global dependency injection;
- framework rendering.

## Validation plan

1. Implement a minimal prototype.
2. Build the same counter and todo flow in Vanilla, React, Angular, and Vue.
3. Run a shared adapter contract suite.
4. Measure bundle size, update cost, subscription cleanup, and type-check impact.
5. Revise the API before Alpha.
