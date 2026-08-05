# Vii Reactivity and Streams

Status: Draft

## Purpose

This document defines the intended separation between reactive state, derived state, asynchronous resources, server state, and event streams.

Vii should provide a small signal-based mental model for ordinary application state without forcing users into reducer boilerplate, RxJS for simple values, or a large NgRx-style architecture.

## Core principle

Different abstractions answer different questions.

```text
State      What is the current value?
Computed   What value is derived from other current values?
Resource   What asynchronous operation is owned by this scope?
Query      What remote data is cached and how fresh is it?
Stream     What sequence of events occurs over time?
```

These concepts may interoperate. They should not be collapsed into one universal primitive.

## Initial reactive vocabulary

The long-term public vocabulary should remain small:

```text
state
computed
store
action
batch
effect
scope
resource
```

State Alpha may begin with fewer names. The exact naming must be validated through prototypes.

## State

A State value is readable, writable, subscribable, and versioned.

Candidate API:

```ts
const count = state(0);

count();
count.set(10);
count.update(value => value + 1);

const unsubscribe = count.subscribe(value => {
  console.log(value);
});
```

A function-like read is recommended because it makes dependency tracking explicit while preserving concise usage.

Alternative `.get()` naming may remain available internally or for compatibility, but the ecosystem should teach one canonical form.

## Computed values

```ts
const doubled = computed(() => count() * 2);
```

Computed values should be:

- lazily evaluated where possible;
- cached while observed;
- invalidated by dependency versions;
- read-only;
- scope-owned;
- observable in diagnostics;
- disposed when no longer owned or observed.

A computed value should replace effect-driven derived state.

## Automatic dependency tracking

When a reactive read occurs inside a tracked computation, Vii records the dependency.

```text
count
  -> doubled
  -> exact view binding
```

Tracking is synchronous and deterministic. Reads occurring after an `await`, timer, or unrelated callback are not automatically part of the original tracking frame.

Asynchronous work should use `resource`, `query`, or explicit stream subscriptions rather than relying on hidden async tracking.

## Store

A Store is a named composition boundary, not a second state engine.

```ts
export const counter = store('counter', () => {
  const count = state(0);
  const doubled = computed(() => count() * 2);

  function increment() {
    count.update(value => value + 1);
  }

  function reset() {
    count.set(0);
  }

  return {
    count,
    doubled,
    increment,
    reset,
  };
});
```

Stores should preserve:

- direct TypeScript inference;
- explicit actions;
- no reducer requirement;
- no action type strings;
- no mandatory global registry;
- no mandatory immutability library;
- no middleware framework in the basic API.

A Store may be local, feature-scoped, request-scoped, or application-scoped.

## Actions

An action is a named state transition boundary.

```ts
const addItem = action('cart.addItem', (item: Item) => {
  items.update(current => [...current, item]);
});
```

Actions may improve diagnostics, batching, devtools, and policy enforcement. Plain functions remain valid where a named action adds no value.

The system must not require Redux-style dispatch for every state update.

## Batch

```ts
batch(() => {
  firstName.set('Ada');
  lastName.set('Lovelace');
});
```

A batch groups writes into one propagation boundary.

Required behavior:

- nested batches;
- deterministic commit order;
- no lost updates;
- structured failure diagnostics;
- adapter scheduling must not change State semantics.

## Effects

Effects connect reactive values to external systems.

```ts
effect(() => {
  document.title = title();
});
```

Effects are not the recommended way to calculate application state.

The ecosystem should warn when an effect only writes another State value and a computed value would be clearer.

## Scope and ownership

Every effect, subscription, resource, and store instance must have visible ownership.

```ts
const feature = scope(() => {
  const count = state(0);
  const stop = effect(() => console.log(count()));

  return { count, stop };
});

feature.dispose();
```

Framework adapters and native components create and dispose scopes according to their lifecycle.

## Resource

A Resource represents owned asynchronous work rather than cached server state by itself.

```ts
const user = resource({
  source: userId,
  load: async ({ value, signal }) => {
    return api.getUser(value, { signal });
  },
});
```

A Resource may expose:

```text
value
status
error
refresh
cancel
```

Required properties:

- cancellation through `AbortSignal`;
- latest-result protection;
- scope disposal;
- explicit loading and error states;
- diagnostics correlation;
- SSR-compatible serialization rules where enabled.

## Query

`@vii/query` is responsible for remote server state concerns:

- caching;
- deduplication;
- freshness;
- retention;
- invalidation;
- mutations;
- optimistic updates;
- retries;
- hydration;
- garbage collection.

Query should be implemented on top of shared foundations, not embedded into every State value.

## Streams

A Stream represents zero or more events over time.

Streams are appropriate for:

- WebSocket messages;
- input debounce pipelines;
- retries and time windows;
- drag and pointer sequences;
- cancellation races;
- merging multiple event sources;
- complex event processing.

Ordinary component values should not require a stream abstraction.

## RxJS position

RxJS remains valuable for advanced streams and existing Angular ecosystems. It is not required for basic Vii State.

Recommended package boundaries:

```text
@vii/state       current values and dependency graph
@vii/query       remote cached state
@vii/stream      optional event-stream primitives, later
@vii/rxjs        optional RxJS interop
```

Candidate interop:

```ts
const stateValue = toState(observable, {
  initial: [],
});

const observable = toObservable(stateValue);
```

Interop must preserve cancellation, errors, scope ownership, and scheduler semantics.

Vii should not attempt to recreate the complete RxJS operator ecosystem during early phases.

## Proxy objects

Deep proxy reactivity is not part of State Alpha.

A later Store convenience may support property-level tracking for structured state, but it must remain:

- optional;
- explainable;
- measurable;
- serializable according to explicit rules;
- compatible with diagnostics;
- free from surprising behavior across object boundaries.

The canonical primitives should remain valid without proxies.

## Fine-grained UI integration

Native Vii rendering should connect exact reactive consumers:

```text
state
  -> computed
  -> text node, attribute, property, or child boundary
```

React, Angular, Vue, and other adapters map the same State contract into their native scheduling and subscription mechanisms without reimplementing State.

## SSR

Mutable State must be created per request or within an explicitly isolated scope.

Rules:

- no process-wide mutable application State by default;
- no sharing request scopes;
- serialization uses an approved format;
- only declared hydration values cross the server-client boundary;
- secrets and server capabilities are never serialized;
- disposal occurs after request completion.

## Diagnostics

Reactive diagnostics should answer:

- which node changed;
- what action or external cause initiated the change;
- which computed values invalidated;
- which computations reran or skipped;
- which consumers updated;
- which Scope owns each node;
- which resources were created, cancelled, or disposed.

Raw values are excluded by default.

## Performance principles

- synchronous propagation by default;
- `Object.is` equality by default;
- lazy computed evaluation;
- no deep equality by default;
- no retained unowned graph nodes;
- bounded diagnostics;
- updates proportional to affected consumers where practical;
- benchmarks include execution, allocations, memory retention, and type-check cost.

## Security principles

- reactive values remain data, never executable code;
- diagnostics redact values by default;
- serialized State is schema-validated;
- untrusted payloads do not acquire SafeHtml, SafeUrl, or capability types;
- effects cannot bypass browser or server security policies.

## Initial implementation boundary

State Alpha should focus on:

```text
state or store primitive
computed/select
subscribe
batch
scope
dispose
diagnostics
```

Resources, Query, Streams, proxy stores, and native UI bindings graduate only through separate milestones and evidence.
