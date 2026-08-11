# @vii/core

This is the first buildable Vii package created by the Phase 0 repository bootstrap.

The package currently exposes experimental State, Computed, Batch, Scope, and Diagnostics primitives:

```ts
import { batch, computed, createDiagnostics, createScope, state } from "@vii/core";

const count = state(0);
count.set(1);
count.update((current) => current + 1);
count.get(); // 2
```

State changes can be observed synchronously with `subscribe`:

```ts
const unsubscribe = count.subscribe((value) => {
  console.log(value);
});

unsubscribe();
```

Subscriptions run in registration order. Duplicate subscriptions are independent, and each returned
unsubscribe function is idempotent. Unsubscribing during notification prevents that subscription from
running later in the same notification; subscriptions created during notification start on the next
change. State commits the new value before notifying listeners. All listeners are attempted even when
one throws; a single listener error is rethrown, while multiple errors are reported as an
`AggregateError`.

Writes made inside a listener are committed immediately but their notifications are queued in FIFO
order. The current notification always completes before the queued notification starts, and the
outermost `set` or `update` drains the complete synchronous queue before returning. Listener errors
are reported after that queue is drained, so a failing listener cannot lose a later queued write.

Computed values are lazy, cache their last result, and track synchronous State or Computed reads:

```ts
const doubled = computed(() => count.get() * 2);
doubled.get(); // 4
```

Computed values invalidate when a dependency changes and notify subscribers only when the computed
result changes. Dependencies that are no longer read are released. Circular reads throw
`Computed cycle detected`, and `dispose()` releases dependencies and makes further use invalid.

Use `batch` to group synchronous writes into one propagation boundary:

```ts
batch(() => {
  count.set(1);
  count.update((current) => current + 1);
});
```

Writes commit immediately, but notifications wait until the outermost batch completes. Nested
batches share that boundary, repeated writes to one State notify only its final value, and Computed
dependencies are recomputed at most once per batch. Errors are reported after committed writes and
the remaining queued notifications have been processed.

Scopes make synchronous resource ownership explicit:

```ts
const scope = createScope({ name: "checkout" });

scope.run(() => {
  count.subscribe((value) => console.log(value));
  computed(() => count.get() * 2);
});

scope.dispose();
```

Subscriptions and Computed values created during `scope.run` are owned by that Scope. Resources can
also be attached explicitly with `scope.use(resource)`; unsubscribe functions are accepted as
resources. Child scopes are created with `scope.createChild()` and are disposed by their parent.
Disposal is synchronous, idempotent, and deterministic: resources are cleaned up in reverse
registration order. A disposed Scope rejects `run`, `use`, and `createChild`. If multiple cleanups
fail, `ScopeDisposalError` reports all errors after every cleanup has been attempted.

Async disposal, resource transfer, and asynchronous context propagation remain later work. Query,
UI, adapters, and CLI work also belong to later implementation tasks.

Diagnostics are opt-in, structured, bounded, and value-free by default:

```ts
const diagnostics = createDiagnostics({ maxEvents: 100 });

diagnostics.run(() => {
  const count = state(0);
  count.set(1);
});

diagnostics.getEvents();
```

The collector uses a bounded ring buffer and reports dropped event counts. `off`, `development`,
and `production-safe` modes are supported; diagnostics sinks are observers and cannot break runtime
updates. Core events contain identifiers, versions, counts, and lifecycle metadata, not State values.
The diagnostics protocol is experimental and does not add network, telemetry, or Devtools
dependencies.
