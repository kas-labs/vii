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
- Cold subscription is the default. Hot/event sources require an explicit adapter and do not replay
  or retain values by default.
- Synchronous sources propagate synchronously. Re-entrant emission is serialized FIFO within one
  subscription without a microtask hop.
- A subscription is one composite resource. Disposal is ordered as: mark inactive, abort owned async
  work, clear timers, then unsubscribe upstream.
- Cancellation is not failure. A source error terminates its branch; `catch` is the explicit recovery
  path and does not dispose the containing Scope.
- `AsyncIterable.return()` and `ReadableStreamDefaultReader.cancel()` remain visible native
  cancellation boundaries. Flow does not claim universal backpressure or hide native demand.
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

## Comparison matrix

| Dimension | Direct platform | RxJS adapter | Throwaway prototype |
| --- | --- | --- | --- |
| Composition | callbacks and native promises | RxJS operators | functional and fluent operators |
| Cancellation | explicit AbortController | teardown-to-AbortController bridge | composite subscription resource |
| Ordering | fixture-defined direct behavior | scheduler/operator behavior | synchronous FIFO re-entrancy |
| Disposal | application-owned cleanup | subscription teardown | Scope-compatible disposable |
| Errors | promise rejection and explicit handling | error channel and operators | error channel plus explicit `catch` |
| Native streams | direct platform calls | adapter under test | `return()` / `cancel()` bridges |
| Diagnostics | application-defined | adapter-defined | structural-only fixture events |
| Complexity | baseline | dependency and operator model | prototype surface and TypeScript shape |

## Correctness gate

The research slice is not eligible for bundle, throughput, allocation, retained-memory, or
TypeScript-cost measurements until these pass:

- stale typeahead completion is suppressed after switch/cancellation;
- `Scope.dispose()` blocks late emissions and calls owned cleanup;
- re-entrant source events preserve synchronous FIFO order;
- source errors terminate only their branch and explicit `catch` is the recovery path;
- AsyncIterable disposal calls `return()`;
- ReadableStream disposal calls native `cancel()`;
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
- real-clock timer validation after deterministic correctness;
- RxJS/direct/prototype bundle, throughput, allocation, retained-memory, and TypeScript benchmarks;
- malicious iterable/stream, timer-storm, unbounded-rate, subscriber-exception, and cancellation-race
  robustness fixtures;
- current primary-source/version revalidation before freezing any RFC or benchmark baseline.
