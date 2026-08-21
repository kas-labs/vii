# Vii Flow Primary-Source Revalidation

Status: Research evidence, revalidated 2026-08-21

## Purpose

Revalidate the platform and RxJS semantics that constrain the next Flow comparison slice. This
record freezes neither a public API nor a benchmark result. It records source-owned behavior and the
methodology needed to keep direct primitives, RxJS, and the throwaway prototype semantically fair.

## Version boundary

- Repository comparison dependency: RxJS `7.8.2`, exact root dev-only pin verified with
  `pnpm list rxjs --depth=0`.
- Local validation environment at this slice: Node `v22.17.0`, pnpm `10.12.4`.
- WHATWG Streams and DOM references are living standards; the cited pages report their current
  update state. Any future benchmark record must capture the retrieval date and environment again.
- ECMAScript iterator behavior is taken from the current TC39 specification page; the fixture must
  continue to test observable behavior rather than rely on a library-specific implementation detail.

## Revalidated source semantics

### RxJS

The official Observable guide describes each subscription to a plain Observable as an independent
execution, while `unsubscribe()` cancels that execution and runs its teardown. RxJS also explicitly
states that unsubscription does not call the observer's `complete` callback; completion is a normal
producer terminal signal. This maps to the comparison vocabulary as separate `complete` and `cancel`/
`dispose` outcomes.

The official Subject guide describes a Subject as a multicast event source, while plain Observables
are unicast. Subject subscriptions register observers; no implicit replay is introduced by Subject
itself. Replay and retained-current-value behavior belong to separate Subject variants and must not
be smuggled into a baseline comparison.

The RxJS baseline therefore has two explicit fixture classes:

1. plain factory Observable for per-subscription execution;
2. Subject for explicit hot multi-subscriber delivery.

They must not be collapsed into one global hot/cold claim.

### AbortController

The DOM Standard defines `AbortController.abort(reason)` as signaling the associated `AbortSignal`
and storing an abort reason. That signal event is a cancellation boundary; it does not assert that a
separate asynchronous operation or platform resource has finished cleaning up. The prototype and
direct baseline must therefore record abort initiation separately from promise settlement.

### AsyncIterator

The ECMAScript specification defines the optional async iterator `return()` method as notifying the
iterator that the caller does not intend to request more values. `AsyncIteratorClose` invokes the
iterator's `return()` when closing an iterator and preserves rejection/error semantics of the close
operation. The Flow adapter may initiate `return()` during synchronous semantic disposal, but the
current Core disposal contract cannot await its completion. Rejection surfacing remains an explicit
research boundary and must not be converted into a producer error or a fake completion event.

### WHATWG ReadableStream

The Streams Standard defines reader `cancel()` as a promise-returning cancellation operation that
delegates to stream cancellation while the reader is active. Stream cancellation communicates that
the consumer has lost interest, discards queued chunks, closes the stream, and executes the underlying
source cancellation mechanism. Native queuing and backpressure remain platform semantics; Flow must
not add a second demand model or report cancellation completion synchronously.

## Comparison consequences

| Concern               | Direct platform                     | RxJS adapter                          | Throwaway prototype                      |
| --------------------- | ----------------------------------- | ------------------------------------- | ---------------------------------------- |
| Factory execution     | function invocation per consumer    | plain Observable subscription         | source factory subscription              |
| Explicit event source | listener/source-owned registry      | Subject                               | manual source                            |
| Normal terminal       | application-defined completion      | `complete` notification               | `complete` notification                  |
| Cancellation          | AbortSignal/teardown                | `unsubscribe` teardown                | subscription disposal                    |
| Async cleanup         | promise/native settlement           | adapter teardown promise boundary     | initiation only; no awaited Core dispose |
| Backpressure          | native AsyncIterable/ReadableStream | adapter must preserve native boundary | adapter exposes native boundary          |
| Diagnostics           | caller-defined                      | adapter-defined                       | structural and value-safe only           |

The same fixture must compare equivalent semantics, not merely similarly named APIs. In particular,
the hot Subject case is not a substitute for a plain Observable case, and `unsubscribe()` is not
counted as `complete`.

## Measurement protocol after correctness

Only after the existing deterministic, real-clock, lifecycle, error, and platform correctness suites
pass may the comparison measure:

- setup and disposal latency for one and many subscriptions;
- synchronous emission throughput and allocation on equal pipelines;
- async switch/cancellation initiation and stale-completion suppression;
- retained references after repeated disposal, using an explicitly recorded GC-capable environment;
- bundle output and TypeScript check cost for named fixture groups.

Each result must record the exact fixture, semantic mapping, Node/pnpm/RxJS versions, warmup, sample
count, timer mode, GC availability, raw output, and limitations. A benchmark must fail or be excluded
when correctness assertions fail. No result may become a global claim about Flow, RxJS, memory, or
platform performance.

## Sources

- [RxJS Observable guide](https://rxjs.dev/guide/observable)
- [RxJS Subject guide](https://rxjs.dev/guide/subject)
- [RxJS Observable API](https://rxjs.dev/api/index/class/Observable)
- [RxJS Subject API](https://rxjs.dev/api/index/class/Subject)
- [DOM Standard: AbortController](https://dom.spec.whatwg.org/#interface-abortcontroller)
- [ECMAScript specification: AsyncIteratorClose](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-asynciteratorclose)
- [ECMAScript specification: Async Iterator Interface](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-async-iterator-interface)
- [WHATWG Streams Standard: reader cancellation](https://streams.spec.whatwg.org/#rs-generic-reader-cancel)
- [WHATWG Streams Standard: ReadableStreamDefaultReader](https://streams.spec.whatwg.org/#rs-default-reader)

This note is evidence for research planning only. It does not create a Flow package, public API,
browser/network/worker support tier, or compatibility promise.
