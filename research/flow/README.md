# Vii Flow Research Fixtures

> Throwaway research only. This directory is not a package, public API, support fixture, or
> production implementation.

These fixtures compare a deterministic UI typeahead and platform-stream lifecycle against:

1. direct `Promise + AbortController` code;
2. the throwaway functional and fluent Flow prototype;
3. RxJS `7.8.2` with an explicit AbortController bridge.

Run the focused correctness suite and type check:

```bash
pnpm exec vitest run research/flow/*.test.ts
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

The separate real-clock validation layer covers latest-result delivery and disposal with native
timers. Platform robustness fixtures cover bounded debounce timer state under a 1000-event storm,
AsyncIterable `return()` initiation and rejection isolation, and ReadableStream `cancel()` initiation
and rejection isolation. Ownership fixtures cover per-subscription AsyncIterable identity, composed
source disposal isolation, and Scope-owned hot-source subscriptions. The dedicated robustness-race
fixture also covers producer failures, fast/unbounded AsyncIterable disposal, idempotent `return()`,
and pending ReadableStream cancellation races. These are lifecycle/correctness evidence only, not
throughput or memory claims. The cancellation-rejection fixture compares a structural cleanup
failure observer while keeping `dispose(): void`, the source error channel, and raw error payloads
separate. It is evidence only, not a selected public diagnostics or Flow API.

The hot-sharing boundary fixture compares one explicit ref-counted AsyncIterable branch across
direct code, RxJS `share()`, and a local prototype helper. Concurrent subscribers share one
upstream, late subscribers receive no replay, and a new subscription after zero ref-count gets a
fresh upstream. The raw RxJS AsyncIterable adapter did not initiate `return()` in this fixture,
while direct code and the prototype did. This is adapter-friction evidence only; it does not select
a public sharing API.
