# State Alpha Execution Guide

Status: Committed implementation guidance

## Objective

Implement the smallest deterministic, framework-neutral State runtime that can be used in Vanilla TypeScript and later exposed through thin framework adapters.

State Alpha is not a full application framework and is not a replacement for Query, RxJS, forms, or a router.

## Recommended implementation order

### 1. Writable value

Start with:

```ts
const count = state(0);

count.get();
count.set(1);
count.update(value => value + 1);
```

Required behavior:

- initial value is readable;
- `set` replaces the value;
- `update` receives the current value;
- equality uses `Object.is` by default;
- equal values do not notify;
- no framework or host runtime dependency.

### 2. Subscription

Illustrative usage:

```ts
const unsubscribe = count.subscribe(value => {
  console.log(value);
});

unsubscribe();
```

Define and test:

- listener order;
- duplicate listeners;
- unsubscribe idempotency;
- unsubscribe during notification;
- subscribe during notification;
- listener errors;
- writes performed inside listeners.

These semantics must be intentional, not accidental consequences of an array loop.

### 3. Re-entrant updates

Create explicit tests for:

```ts
count.subscribe(value => {
  if (value < 3) {
    count.set(value + 1);
  }
});
```

Decide whether nested updates are processed immediately, queued, or rejected in specific situations.

The decision must preserve determinism and avoid corrupted notification state.

### 4. Computed values

After basic updates are stable:

```ts
const count = state(1);
const doubled = computed(() => count.get() * 2);
```

Computed requirements:

- tracks dependencies;
- caches a valid result;
- invalidates when dependencies change;
- avoids duplicate recomputation in one batch;
- detects circular dependencies;
- supports disposal;
- does not retain unused dependency graphs forever.

### 5. Batch

Illustrative API:

```ts
batch(() => {
  first.set(1);
  second.set(2);
});
```

Required tests:

- one final notification boundary;
- nested batches;
- computed invalidation;
- error behavior;
- updates to the same State more than once;
- deterministic commit order.

### 6. Scope and ownership

A Scope owns subscriptions, computed nodes, effects, and resources created within it.

Conceptual usage:

```ts
const scope = createScope();

scope.run(() => {
  count.subscribe(logCount);
});

scope.dispose();
```

Required behavior:

- disposal is idempotent;
- owned subscriptions are removed;
- owned computed values release dependencies;
- child scopes are disposed;
- errors during cleanup are reported predictably;
- disposed nodes reject or ignore invalid operations according to documented rules.

### 7. Store composition

A Store should compose State primitives, not create a second state engine.

Example direction:

```ts
export const counterStore = store('counter', () => {
  const count = state(0);
  const doubled = computed(() => count.get() * 2);

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

Do not require reducers, dispatch strings, action type constants, or middleware for basic usage.

### 8. Diagnostics

Add minimal events after runtime behavior is tested.

Initial event direction:

```text
state.created
state.updated
subscription.added
subscription.removed
computed.invalidated
computed.evaluated
batch.started
batch.committed
scope.created
scope.disposed
```

Diagnostics must:

- use stable event types;
- include causal identifiers where available;
- avoid raw State values by default;
- use bounded buffers;
- be removable or minimal when disabled;
- never change State behavior.

## Suggested internal modules

```text
packages/core/src/
├── state/
│   ├── state.ts
│   ├── subscription.ts
│   ├── equality.ts
│   └── types.ts
├── graph/
│   ├── node.ts
│   ├── tracking.ts
│   └── computed.ts
├── batch/
│   └── batch.ts
├── scope/
│   ├── scope.ts
│   └── disposal.ts
├── diagnostics/
│   ├── events.ts
│   └── sink.ts
└── index.ts
```

This is a suggested direction, not a requirement to create every file before it is needed.

## Test groups

### Runtime behavior

- reads and writes;
- equality;
- subscriptions;
- re-entrancy;
- batching;
- computed dependency graphs;
- cycle detection.

### Lifecycle

- unsubscribe;
- Scope disposal;
- child Scope disposal;
- computed cleanup;
- no retained listeners after disposal.

### Types

- generic inference;
- readonly and writable distinctions;
- computed output inference;
- Store return shape;
- no accidental `any`.

### Packaging

- ESM import;
- declarations;
- explicit exports;
- packed Vanilla fixture;
- tree-shaking inspection.

### Performance baselines

Measure, but do not yet publish unsupported marketing claims:

- State creation;
- update throughput;
- subscriber fan-out;
- computed chains;
- batch fan-out;
- post-disposal memory state;
- diagnostics enabled versus disabled.

## State Alpha non-goals

Do not add:

- server cache or Query behavior;
- RxJS dependency;
- deep Proxy reactivity;
- persistence;
- undo and redo;
- distributed state;
- React hooks inside Core;
- Angular Signals inside Core;
- compiler-only State semantics;
- AI behavior.

## Alpha completion criteria

State Alpha is ready for adapter work when:

- notification semantics are documented and tested;
- Computed and Batch are deterministic;
- Scope disposal is proven;
- diagnostics explain basic causes;
- the packed package works in Vanilla;
- types compile in supported TypeScript versions;
- bundle and memory baselines exist;
- the mental model can be explained on one page.
