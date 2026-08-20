# Vii Flow Architecture

Status: Research

Vii Flow is a candidate small reactive orchestration layer for values and events over time. It is not a replacement for State, Computed, Task, Query, AsyncIterable, Web Streams, or RxJS.

## Semantic boundary

```text
State     = current value
Computed  = derived current value
Task      = one async execution lifecycle
Flow      = zero or more values/events over time
```

Flow must not become a second State graph and does not imply a current value, replay, caching, persistence, deduplication, or server-state freshness.

## Candidate package

If research graduates, the likely package is `@vii-labs/flow`.

## Research goals

- combine signal-like simplicity with stream/operator composability;
- keep a small tree-shakable operator surface;
- synchronous propagation by default for synchronous sources;
- Scope-aware deterministic disposal;
- AbortSignal-native async cancellation;
- explicit State and Task bridges;
- AsyncIterable and WHATWG ReadableStream interoperability;
- no hidden scheduler, microtask, retry, replay, cache, or current-value semantics;
- value-safe Diagnostics;
- investigate low-allocation execution and safe operator fusion.

## Candidate API

Research should compare fluent and functional composition before syntax is frozen.

```ts
const results = flow(searchText)
  .debounce(250)
  .distinct()
  .switchLatest((query, { signal }) => search(query, signal))
  .toState([]);
```

Candidate prototype operators are `map`, `filter`, `tap`, `distinct`, `debounce`, `throttle`, `take`, `merge`, `combineLatest`, `switchLatest`, sequential flattening, `scan`, `catch`, and `timeout`. Retry belongs only if Task/HTTP cannot solve the demonstrated need. Do not reproduce the full RxJS catalog.

## State and events

State remains the retained-current-value primitive, so Vii should not add a BehaviorSubject equivalent merely for familiarity. A hot event/channel source may be researched for UI events, workers, sockets, and integration boundaries, but it must not retain or replay values implicitly.

## Task integration

```text
Task: start -------- result/error/cancel
Flow: value -- value -- value -- value -->
```

A Flow flattening operator may start Tasks or Promise/AbortSignal operations. `switchLatest` may cancel stale owned work. Flow must not duplicate Task pending/result/error state.

## Cancellation and Scope

Use AbortSignal for async operations, disposal for subscriptions, and Scope ownership for Vii lifecycle integration.

```text
Scope.dispose()
  -> Flow subscription disposal
  -> active owned operation cancellation
  -> AbortSignal abort where supported
```

Cancellation is not failure.

## Scheduling

The baseline is synchronous for synchronous sources. Explicit microtask or animation-frame scheduling may be researched only after a real consumer requires it. Operators must not silently move execution to another queue.

## AsyncIterable and Web Streams

Prefer platform interoperability over proprietary stream islands. AsyncIterable is the primary candidate bridge for pull-aware async iteration. WHATWG ReadableStream is the primary bridge for HTTP bodies and other platform streaming, including AI token streams.

Flow must not claim universal backpressure. When demand control matters, native AsyncIterable/ReadableStream semantics stay visible.

## Operator fusion research

Adjacent stateless synchronous operators may be representable as a compact internal execution plan rather than one full intermediate subscription object per step. For example, `map(a) -> map(b) -> filter(c)` may be fused only when timing, cancellation, errors, Diagnostics, and debugging semantics remain unchanged.

Fusion is an implementation experiment, not a public promise.

## Diagnostics

Optional Diagnostics may report subscription lifecycle, pipeline structure, async branch cancellation/completion, debounce/throttle counts, and failure categories. Raw event values, bodies, credentials, tokens, and user content must not be captured by default.

## Performance research

Measure setup/disposal, throughput, latency, allocations per emission, retained memory, chain depth, State bridge overhead, cancellation, AsyncIterable/ReadableStream adapters, bundle/tree shaking, and TypeScript compiler cost.

Compare semantically fair cases with RxJS, direct callbacks/EventTarget, native platform streams, and handwritten pipelines. Signal libraries are compared only for overlapping current-value/reactive-graph scenarios.

## TC39 Signals

Track the TC39 Signals proposal and preserve an interoperability path where practical without depending on an unstable proposal or claiming future compatibility prematurely. Flow remains a higher-level temporal abstraction even if State later gains a standards-compatible signal adapter.

## Security and robustness

Research must cover unbounded rates/buffers, subscriber exceptions, cancellation races, recursive/reentrant emission, malicious iterables/streams, resource retention, timer storms, and Diagnostics leakage.

## Anti-goals

Vii Flow is not a complete RxJS clone, second State/Computed graph, Query cache, Task/Promise replacement, universal scheduler, hidden retry engine, Web/Node Streams replacement, CRDT layer, or implicit global event bus.

## Graduation gates

Flow advances only when at least two real consumers demonstrate repeated temporal orchestration; State + Promise + AbortController is insufficient; build-vs-RxJS analysis shows Vii-specific value; the API remains small; cancellation/reentrancy/disposal/memory tests pass; performance/type evidence is reproducible; platform-stream interoperability is proven; Diagnostics remain value-safe; and maintenance cost is justified.

An RxJS adapter or direct platform integration is an acceptable final research outcome.
