# Vii Flow Research Brief

Status: Research-only, throwaway prototype slice

## Decision under test

Can a deliberately small temporal/event abstraction complement Vii State, Computed, Scope, and
future Task without becoming a second State graph, an RxJS clone, a hidden scheduler, or a platform
stream replacement?

This brief records a bounded research slice. It does not accept a package, public API, support tier,
performance claim, or implementation commitment.

## Shared understanding

- State is a retained current value; Flow is zero or more values/events over time.
- Flow does not require or import Vii Task. The comparison boundary is direct `Promise` plus
  `AbortController`.
- Composition is subscription-driven while preserving explicit source semantics. Factory sources may
  be cold; State, EventTarget, WebSocket, and explicit event sources may be hot. No source gets
  implicit replay or retention.
- Synchronous sources propagate synchronously. Re-entrant emission is serialized FIFO within one
  subscription without a microtask hop.
- A subscription is one composite resource. Disposal is ordered as: mark inactive, abort owned async
  work, clear timers, then unsubscribe upstream.
- `complete`, `error`, `cancel`, and `dispose` are distinct outcomes. Cancellation is not failure; a
  producer or operator error terminates its branch, `catch` is the explicit recovery path, and neither
  source errors nor recovery disposes the containing Scope.
- Producer/operator failures are separate from downstream subscriber callback failures. Subscriber
  callback failures preserve Vii notification semantics: they do not become Flow source errors or
  cancel the owning Scope, and synchronous fan-out continues to other subscribers.
- Scope disposal is synchronous at the semantic boundary: it marks the subscription inactive and
  initiates owned cancellation before returning, but does not claim that asynchronous platform
  cleanup has completed. Cancellation rejection from `return()` or `cancel()` remains an open
  diagnostics/error-surfacing research question; Core `ViiResource.dispose(): void` is unchanged.
- `AsyncIterable.return()` and `ReadableStreamDefaultReader.cancel()` remain visible native
  cancellation boundaries. Flow does not claim universal backpressure or hide native demand.
- Each subscription has independent identity and ownership. Multi-subscriber fixtures verify that
  disposal of one subscription does not dispose another and that no replay or multicast API is
  implied.
- Diagnostics are structural and value-safe: subscription lifecycle, operator topology,
  cancellation/completion, timer counts, and error categories only. Raw values, bodies, credentials,
  tokens, and user content are excluded by default.

## Fixtures

### UI typeahead

The deterministic fake search fixture exercises debounce, stale-result races, and AbortSignal
cancellation without network access. The same scenario is run through direct platform code, the
functional and fluent prototype forms, and an RxJS pipeline with an explicit AbortController bridge.

Correctness requires exactly the latest result, cancellation of stale work, deterministic ordering,
and no result after disposal.

### Platform stream

The AsyncIterable fixture is primary. The WHATWG ReadableStream fixture checks that disposal calls
the native cancellation method. No browser, network, worker, or socket compatibility claim is made.

### Validation layers

The deterministic layer is the primary correctness gate. A separate real-clock layer checks latest
result delivery and disposal with native timers. Robustness fixtures check bounded debounce timer
state under a 1000-event storm and cancellation rejection isolation for both AsyncIterable and
ReadableStream adapters. These layers do not authorize throughput, retained-memory, browser, network,
worker, or socket claims.

## Comparison matrix

| Dimension      | Direct platform                         | RxJS adapter                       | Throwaway prototype                    |
| -------------- | --------------------------------------- | ---------------------------------- | -------------------------------------- |
| Composition    | callbacks and native promises           | RxJS operators                     | functional and fluent operators        |
| Cancellation   | explicit AbortController                | teardown-to-AbortController bridge | composite subscription resource        |
| Ordering       | fixture-defined direct behavior         | scheduler/operator behavior        | synchronous FIFO re-entrancy           |
| Disposal       | application-owned cleanup               | subscription teardown              | Scope-compatible disposable            |
| Errors         | promise rejection and explicit handling | error channel and operators        | error channel plus explicit `catch`    |
| Native streams | direct platform calls                   | adapter under test                 | `return()` / `cancel()` bridges        |
| Diagnostics    | application-defined                     | adapter-defined                    | structural-only fixture events         |
| Complexity     | baseline                                | dependency and operator model      | prototype surface and TypeScript shape |

## Correctness gate

The research slice is not eligible for bundle, throughput, allocation, retained-memory, or
TypeScript-cost measurements until these pass:

- stale typeahead completion is suppressed after switch/cancellation;
- `Scope.dispose()` blocks late emissions and calls owned cleanup;
- re-entrant source events preserve synchronous FIFO order;
- source errors terminate only their branch and explicit `catch` is the recovery path;
- complete, error, cancellation, and disposal remain distinguishable;
- subscriber callback failures stay outside the Flow error channel and do not cancel Scope ownership;
- explicit hot sources do not replay while factory sources start per subscription;
- AsyncIterable disposal calls `return()`;
- ReadableStream disposal initiates native `cancel()` without claiming async cleanup completion;
- multiple subscribers have independent lifecycle ownership;
- real-clock typeahead and disposal validation passes;
- debounce timer state remains bounded under a deterministic 1000-event storm;
- async cancellation rejection does not become a Flow source error;
- diagnostics fixtures contain no raw emitted payloads;
- functional and fluent forms agree on the same fixtures.

## Research outcome and stop rule

Any evidence-backed result is valid: a small first-party prototype, an RxJS adapter, or direct
platform integration. If the prototype does not show Vii-specific value after correctness and
complexity comparison, Flow remains Research and no `@vii-labs/flow` package or public API is added.

The two target consumer classes are hypotheses, not completed consumer evidence. This slice does not
count the existing Diagnostics timeline or a simple State-plus-Promise example as Flow graduation.

## Deferred work

- real UI consumer and real platform-stream consumer evidence;
- RxJS/direct/prototype bundle, throughput, allocation, retained-memory, and TypeScript benchmarks;
- malicious iterable/stream, unbounded-rate, and cancellation-race robustness fixtures;
- a bounded decision for surfacing asynchronous cancellation rejection without changing synchronous
  Core disposal;
- subscription identity/upstream ownership research before any replay or multicast API;
- repeat primary-source/version capture immediately before freezing any RFC or benchmark baseline.
