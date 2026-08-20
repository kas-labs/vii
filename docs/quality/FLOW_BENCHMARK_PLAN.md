# Vii Flow Benchmark Plan

Status: Research

## Purpose

This plan prevents performance language around Vii Flow from becoming marketing before evidence exists. Benchmarks must compare equivalent semantics and publish environment, versions, fixtures, warmup, sample count, and raw results.

## Baselines

Use current representative versions of:

- RxJS;
- direct callbacks and EventTarget where applicable;
- handwritten synchronous pipelines;
- native AsyncIterable;
- WHATWG ReadableStream;
- Vii State/Computed only for genuinely overlapping scenarios.

Do not force a library into a benchmark that it does not semantically solve.

## Benchmark groups

### Subscription lifecycle

Measure creation and disposal for one subscriber, many subscribers, deep pipelines, repeated mount/dispose cycles, and Scope-owned subscriptions.

### Synchronous pipelines

Fixtures include map, filter, map+filter, multiple adjacent stateless operators, distinct, scan, merge, and combine-latest scenarios. Record throughput, latency distribution, allocations, and retained memory.

### Temporal operators

Measure debounce, throttle, timeout, take/cancel, and timer cleanup. Verify correctness under fake and real clocks separately.

### Async switching and cancellation

Measure switch-latest style workloads with Promise + AbortSignal, stale completion races, rapid source changes, cancellation propagation, and Scope disposal.

### Interoperability

Measure State-to-Flow and Flow-to-State bridges, AsyncIterable conversion, ReadableStream conversion, DOM/EventTarget adapters, and worker/socket adapters when they exist.

### Operator fusion

Compare fused and unfused internal execution only when semantics are identical. Measure setup, emission throughput, allocation, debugging/Diagnostics overhead, and code size. Fusion must never be enabled solely to win a synthetic benchmark.

### Memory and robustness

Stress repeated subscribe/dispose cycles, long-running sources, high event rates, reentrant emissions, failing subscribers, cancellation races, and abandoned consumers. Confirm resources return near baseline after disposal.

### Bundle and tree shaking

Measure minimal source+map/filter consumer, temporal consumer, async-switch consumer, State bridge, and full prototype. Report raw, minified, gzip, and brotli sizes with the exact bundler configuration.

### TypeScript compiler cost

Measure small pipelines, long chains, generic transforms, union payloads, State bridges, and nested async flattening. Record cold and incremental type-check time plus memory where practical.

## Correctness before speed

Every benchmark fixture must have semantic assertions. Incorrect cancellation, dropped errors, changed ordering, altered reentrancy, hidden scheduling, or missing cleanup invalidates the performance result.

## Diagnostics overhead

Run representative fixtures with Diagnostics disabled and enabled. Production-safe Diagnostics must not require retaining raw emitted values.

## Claims policy

Do not claim `faster than RxJS`, `zero allocation`, `smallest`, or similar global statements. Claims must name the exact fixture, environment, versions, semantics, and measured dimension.

## Graduation evidence

Before Flow can move from Research, publish reproducible results for lifecycle, synchronous pipelines, async cancellation, memory retention, bundle/tree shaking, TypeScript cost, and at least one real application trace. Negative results are valid evidence and may justify an RxJS adapter instead of a first-party Flow runtime.
