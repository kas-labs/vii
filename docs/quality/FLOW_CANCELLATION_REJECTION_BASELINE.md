# Vii Flow Cancellation-Rejection Baseline

Status: Research evidence, bounded throwaway fixture only

## Question

How can an AsyncIterable `return()` or ReadableStream `cancel()` rejection remain observable
without changing synchronous `ViiResource.dispose(): void`, converting cancellation into a Flow
source error, or claiming that native cleanup has completed before disposal returns?

## First-party constraints

- ECMAScript `AsyncIteratorClose` calls the iterator's `return()` method, awaits its result, and
  propagates a rejection as the close completion. See the [ECMAScript AsyncIteratorClose
  algorithm](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-asynciteratorclose).
- The ECMAScript Async Iterator interface specifies that `return()` returns a promise for an
  iterator result and notifies the iterator that no more `next()` calls are intended. See the
  [ECMAScript Async Iterator interface](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-async-iterator-interface).
- WHATWG Streams specifies that `ReadableStreamDefaultReader.cancel()` returns a promise that
  fulfills when shutdown succeeds and rejects when the underlying source reports a cancellation
  failure. See the [Streams Standard reader cancellation
  algorithm](https://streams.spec.whatwg.org/#default-reader-cancel) and [stream cancellation
  semantics](https://streams.spec.whatwg.org/#rs-cancel).
- The DOM Standard recommends rejecting unsettled promise-based operations with an
  `AbortSignal`'s abort reason, while APIs that do not return promises may choose not to surface
  that reason. See [DOM Standard: aborting ongoing
  activities](https://dom.spec.whatwg.org/#aborting-ongoing-activities).

These contracts make native cleanup completion asynchronous even when the semantic disposal cutoff
is synchronous. A cleanup rejection is therefore a cancellation-cleanup failure, not a producer or
operator failure and not a subscriber callback failure.

## Fixture boundary

`research/flow/flow-cancellation-rejection.test.ts` uses a local throwaway disposal observer. It is
not a Flow package, public API, Core change, or selected diagnostics protocol. The observer proves
only that a candidate adapter can:

- return `void` from `dispose()`;
- mark the subscription closed and initiate native cleanup before `dispose()` returns;
- attach a rejection handler without sending the rejection to `FlowObserver.error`;
- report only the structural boundary and error category after the native promise settles;
- observe both AsyncIterable `return()` and ReadableStream `cancel()` with the same category;
- remain idempotent and observe synchronous cleanup throws without throwing from `dispose()`.

The fixture deliberately excludes the rejection object, message, values, bodies, credentials,
tokens, and user content from the structural event.

## Candidate handling comparison

| Candidate                      | `dispose(): void`                  | Source error channel | Rejection observability              | Research status                           |
| ------------------------------ | ---------------------------------- | -------------------- | ------------------------------------ | ----------------------------------------- |
| swallow with a handled promise | preserved                          | unchanged            | none                                 | existing isolation baseline               |
| explicit structural observer   | preserved                          | unchanged            | asynchronous category/boundary event | fixture evidence                          |
| separate async cleanup handle  | preserved only as a paired surface | unchanged            | direct promise/result                | requires a separate API/consumer decision |

The fixture supports the second candidate as a viable research boundary. It does not select a
public observer, diagnostics event, promise handle, or error taxonomy. Any such contract requires a
real consumer and a separate API/diagnostics review.

## Reproduction

Commands run on 2026-08-21 with Node `v22.17.0`, pnpm `10.12.4`, and Vitest `4.1.10`:

```text
pnpm exec vitest run research/flow/flow-cancellation-rejection.test.ts --reporter=verbose --silent=false
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
```

The focused fixture passed: one file and three tests. The integrated Flow suite passed: eight files
and thirty-two tests. The strict Flow TypeScript check and repository `pnpm validate` also passed;
the latter included packed consumer and CLI Core clean-consumer validation.

## Limits

This is correctness and lifecycle evidence only. It does not claim browser, network, worker, socket,
backpressure, throughput, memory, bundle, or public Flow support. The public cancellation-rejection
surfacing contract remains deferred.
