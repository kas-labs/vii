# Vii State Architecture

Status: Draft

## Purpose

Vii State is the first runtime layer of the Vii ecosystem. It provides a small, deterministic, framework-agnostic model for storing values, deriving values, observing changes, and explaining why updates occurred.

Vii State is not a complete application framework. It must work independently in Vanilla TypeScript and connect to React, Angular, Vue, and future environments through thin adapters.

See also:

- `REACTIVITY_AND_STREAMS.md`
- `SCOPE_AND_RESOURCES.md`
- `DIAGNOSTICS_PROTOCOL.md`
- RFC 0018

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
- Fine-grained dependency tracking where evidence supports it
- Progressive disclosure from simple State to advanced resources

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
- A stream operator ecosystem
- Mandatory reducers, dispatch, or action type strings
- Mandatory RxJS
- AI runtime dependencies

## Initial public model

The first API should remain intentionally small.

Conceptual contract:

```ts
interface Readable<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}

interface Writable<T> extends Readable<T> {
  set(value: T): void;
  update(updater: (current: T) => T): void;
}
```

The long-term ergonomic direction may expose function-like reads:

```ts
const count = state(0);
const doubled = computed(() => count() * 2);

count();
count.set(10);
count.update(value => value + 1);
```

State Alpha may prototype both `.get()` and function-like read forms before selecting one canonical public syntax.

## Store composition

A Store is a composition boundary over the same State engine.

```ts
export const counter = store('counter', () => {
  const count = state(0);
  const doubled = computed(() => count() * 2);

  function increment() {
    count.update(value => value + 1);
  }

  return {
    count,
    doubled,
    increment,
  };
});
```

Stores must not require:

- reducers;
- dispatch;
- action type strings;
- a global container;
- deep proxies;
- a mandatory middleware pipeline;
- framework context for basic use.

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
- owning Scope, when applicable;
- diagnostic metadata.

The runtime must not require storing full values inside diagnostics.

## Update flow

A State update follows this conceptual sequence:

1. Read the current value.
2. Produce or receive the next value.
3. Compare values using `Object.is` by default.
4. Skip propagation when the value is equal.
5. Increment the node version.
6. Mark affected computed nodes as dirty.
7. Recompute only observed derived values that require recomputation.
8. Commit the current transaction or batch.
9. Notify subscribers in a defined order.
10. Emit diagnostic events.

The exact notification order and re-entrancy behavior must be defined before Alpha.

## Automatic dependency tracking

A reactive read inside a tracked computation records a dependency.

```text
state
  -> computed
  -> subscriber or exact view binding
```

Tracking is synchronous and deterministic.

Reads occurring after an unrelated timer or `await` are not assumed to belong to the original tracking frame. Asynchronous work uses explicit Resource, Query, or Stream contracts.

## Computed and selectors

Computed values and selectors must:

- support custom equality where justified;
- avoid recomputation when dependencies have not changed;
- be lazy where possible;
- expose explicit lifecycle behavior;
- be disposed when their Scope is disposed;
- report recomputation and skip reasons to diagnostics.

The runtime should not silently retain unobserved derived nodes forever.

Computed values are preferred over effect-driven derived writes.

```ts
const doubled = computed(() => count() * 2);
```

## Actions

Plain functions remain valid state-transition boundaries.

A named `action` helper may later improve diagnostics and batching:

```ts
const increment = action('counter.increment', () => {
  count.update(value => value + 1);
});
```

Named actions must not force every update through a Redux-style dispatcher.

## Batching

Batching groups multiple writes into one propagation boundary.

Requirements:

- nested batches;
- deterministic commit order;
- no lost updates;
- predictable error handling;
- clear diagnostics for batch start, commit, and failure.

The State core remains synchronous by default. Framework adapters may coordinate with framework scheduling, but must not alter core semantics.

## Effects

Effects connect reactive State to external systems.

```ts
effect(() => {
  document.title = title();
});
```

Effects should not be the standard way to compute application values. Lint and compiler guidance should recommend `computed` when an effect only mirrors State into another State node.

## Equality

Default equality:

```ts
Object.is(previous, next)
```

Custom equality may be provided for computed values, selectors, and advanced cases. Deep equality must not be a default behavior.

## Resource, Query, and Stream boundaries

State answers:

> What is the current value?

Other packages answer different questions:

```text
Resource  What asynchronous operation is owned by this Scope?
Query     What remote data is cached, fresh, invalidated, or retained?
Stream    What sequence of events occurs over time?
```

Planned boundaries:

```text
@vii-labs/state
@vii-labs/query
@vii-labs/stream
@vii-labs/rxjs
```

RxJS remains optional interop for complex event streams and Angular ecosystems. It is not required for booleans, counters, selected values, local forms, or ordinary application State.

## Errors

State errors should use structured Vii error codes and include:

- stable code;
- human-readable message;
- recoverability information;
- relevant node or Scope identifier;
- documentation reference where available.

## SSR

State creation must be request-safe.

A mutable application Store must never become a process-wide singleton by default on a server. Request-scoped factories and explicit hydration contracts are required before SSR is considered supported.

Only declared and schema-valid hydration data may cross the server-client boundary. Secrets, capabilities, and opaque safe security types are not serializable State.

## Framework adapters

Adapters translate Vii subscriptions into native framework mechanisms.

- React: external store integration
- Angular: Signals-oriented bridge
- Vue: shallow external state bridge
- Vanilla: direct subscription

Adapters must not implement a second state engine.

A future native Vii renderer may connect State directly to exact template or TSX consumers. That work remains Research and is described in `COMPONENT_MODEL.md`.

## Security

- State values remain data, not executable code.
- Diagnostics exclude raw values by default.
- Serialization is explicit and schema-based.
- Hydration cannot create `SafeHtml`, `SafeUrl`, authorization state, or capability handles.
- Effects cannot bypass browser or server security policy.

## Quality gates for State Alpha

State Alpha is ready only when:

- Vanilla usage works without adapters;
- React, Angular, and Vue pass the same contract suite;
- subscriptions clean up reliably;
- SSR request isolation is demonstrated;
- bundle and memory measurements are reproducible;
- diagnostic causes are visible;
- documentation explains the mental model in one page;
- State, Query, Resource, and Stream boundaries are understandable;
- no Alpha API exists only for hypothetical future use.
