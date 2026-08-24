# @vii-labs/core

Experimental runtime-neutral State, Scope, and bounded diagnostics primitives for TypeScript.

## Experimental release status

`@vii-labs/core` is not published to npm yet. The first planned public candidate is
`0.1.0-experimental.2` on the `next` tag; it will not be a `latest` release or a production-support
promise. Until that separately approved publication happens, use the repository workspace or a packed
tarball:

```bash
pnpm --filter @vii-labs/core pack --pack-destination ./artifacts
pnpm add ./artifacts/vii-labs-core-0.1.0-experimental.2.tgz
```

The public API and the `vii.trace` diagnostics protocol remain experimental and may change under
repository governance. This package has no hidden network, telemetry, or automatic-install behavior.

## Known limitations and support

This is a pre-alpha package for evaluation, not a production support commitment. In particular:

- State, Computed, Batch, Scope, and Diagnostics are the only public Core primitives; adapters and
  CLI packages are private and are not part of this release candidate;
- the `vii.trace` `0.1` protocol and `recordSecurity()` are experimental and may change or be removed
  under the RFC process;
- Scope disposal is synchronous; async disposal, resource transfer, and async context propagation are
  not implemented;
- Core supplies no persistence, transport, Devtools, browser inspector, OpenTelemetry bridge, or
  telemetry service.

Report ordinary package issues at the repository issue tracker. Report potential vulnerabilities
privately according to the repository's [security policy](../../SECURITY.md).

The package currently exposes experimental State, Computed, Batch, Scope, and Diagnostics primitives:

```ts
import { batch, computed, createDiagnostics, createScope, state } from "@vii-labs/core";

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

Subscriptions and Computed values created during `scope.run` are owned by that Scope. `scope.run`
is strictly synchronous; callbacks returning a thenable or Promise are rejected with a `TypeError`
because ambient context cannot be preserved across `await`. Resources can also be attached
explicitly with `scope.use(resource)`; unsubscribe functions are accepted as resources. Child scopes
are created with `scope.createChild()` and are disposed by their parent. Disposal is synchronous,
idempotent, and deterministic: resources are cleaned up in reverse registration order. A disposed
Scope rejects `run`, `use`, and `createChild`. If multiple cleanups fail, `ScopeDisposalError`
reports all errors after every cleanup has been attempted.

Async disposal, resource transfer, and asynchronous context propagation remain later work. Query,
UI, adapters, and CLI work also belong to later implementation tasks.

Diagnostics are opt-in, structured, bounded, and value-free by default:

```ts
const diagnostics = createDiagnostics({ maxEvents: 100, traceId: "checkout" });

diagnostics.run(() => {
  const count = state(0);
  count.set(1);
});

diagnostics.getEvents();
diagnostics.exportTrace();
```

`diagnostics.run` is also strictly synchronous and rejects asynchronous callbacks returning thenables.
The collector uses a bounded ring buffer and reports dropped event counts. `off`, `development`,
and `production-safe` modes are supported; diagnostics sinks are observers and cannot break runtime
updates. `exportTrace()` returns the current bounded snapshot in the versioned `vii.trace` `0.1`
envelope with its dropped-event count. Core events contain identifiers, versions, counts, and
lifecycle metadata, not State values. An explicit `traceId` option is copied to events and exports
for correlation in development mode; it is omitted in `production-safe` mode and no trace context
is inferred or propagated automatically. Production-safe `scope.created` events also omit
caller-provided scope names. The diagnostics protocol is experimental and does not add network,
telemetry, or Devtools dependencies.

Security producers can record bounded, value-free events through the experimental
`diagnostics.recordSecurity({ code, surface, reason, field?, route?, causeId? })` method. Core
accepts only finite codes, surfaces, and reasons; development metadata is stripped of line breaks and
capped at 128 characters, while `production-safe` omits `field`, `route`, and caller-provided trace
correlation. The method uses the existing bounded buffer and sink, and does not enforce policies or
send diagnostics anywhere.
