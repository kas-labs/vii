# Vii Flow Research Fixtures

> Throwaway research only. This directory is not a package, public API, support fixture, or
> production implementation.

These fixtures compare a deterministic UI typeahead and platform-stream lifecycle against:

1. direct `Promise + AbortController` code;
2. the throwaway functional and fluent Flow prototype;
3. RxJS `7.8.2` with an explicit AbortController bridge.

Run the focused correctness suite and type check:

```bash
pnpm exec vitest run research/flow/flow-research.test.ts
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
```

The fixtures intentionally do not use network, browser automation, worker APIs, or a Vii Flow
package. A passing fixture is research evidence only. Bundle, throughput, allocation, and compiler
measurements are deferred until all correctness cases pass.

The prototype preserves explicit source semantics rather than imposing a global hot or cold policy:
factory sources may be cold, while explicit event sources may be hot without replay or retention.
The correctness vocabulary distinguishes `complete`, `error`, `cancel`, and `dispose`. Subscriber
callback failures remain outside the producer/operator error channel and do not cancel Scope
ownership. AsyncIterable and ReadableStream disposal synchronously cuts off downstream delivery and
initiates native cleanup; it does not claim that asynchronous cleanup has completed before disposal
returns.
