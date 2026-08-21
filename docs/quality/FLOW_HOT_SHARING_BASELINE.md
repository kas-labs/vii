# Vii Flow Hot Sharing and Late-Subscriber Baseline

Status: Research evidence, bounded correctness fixture only

## Scope

This slice compares explicit ref-counted hot sharing over one controlled AsyncIterable fixture in
three forms: direct platform code, raw RxJS `share()`, and a local throwaway Flow helper. It tests
concurrent subscribers, late subscription, disposal ownership, upstream restart, and replay
behavior. The helper is test-local; it is not a Flow operator, package, or public API.

The fixture uses structural lifecycle assertions plus test-local value assertions. Diagnostics and
durable evidence contain no emitted values, bodies, credentials, tokens, or user content.

## First-party comparison boundary

RxJS documents `share()` as a multicasting/ref-counting operator and exposes reset behavior through
`resetOnRefCountZero`; its default behavior can disconnect and reset when the subscriber count
reaches zero ([share](https://rxjs.dev/api/operators/share),
[ShareConfig](https://rxjs.dev/api/operators/ShareConfig)). A plain `Subject` is an explicit
multicast source without replay, while `ReplaySubject` is the explicit retention/replay boundary
([Subject](https://rxjs.dev/api/index/class/Subject),
[ReplaySubject](https://rxjs.dev/api/index/class/ReplaySubject)).

The RxJS 7.8.2 `from(asyncIterable)` implementation consumes the iterable with an async `for await`
loop and stops when its subscriber is closed; it does not add an observable teardown that calls the
iterator's `return()` ([RxJS source](https://github.com/ReactiveX/rxjs/blob/7.8.2/packages/rxjs/src/internal/observable/innerFrom.ts)).
That is a native-adapter friction point, not a selected Vii semantic.

## Reproduction

Commands run on 2026-08-21:

```text
pnpm exec vitest run research/flow/flow-hot-sharing-boundaries.test.ts --reporter=verbose --silent=false
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
```

Environment: Node `v22.17.0`, pnpm `10.12.4`, Vitest `4.1.10`, RxJS `7.8.2`.

The focused file passed: one file and two tests passed. The strict Flow research TypeScript check
passed.

## Evidence

| Boundary                                                         | Direct   | RxJS `share()`                                    | Throwaway Flow |
| ---------------------------------------------------------------- | -------- | ------------------------------------------------- | -------------- |
| One active upstream for concurrent subscribers                   | observed | observed                                          | observed       |
| First disposal leaves second subscriber active                   | observed | observed                                          | observed       |
| Last disposal disconnects the shared branch                      | observed | observed                                          | observed       |
| Late subscriber receives no prior emission                       | observed | observed                                          | observed       |
| New subscriber after zero ref-count gets fresh upstream identity | observed | observed                                          | observed       |
| AsyncIterable `return()` initiated on last disposal              | observed | not observed in raw `from(asyncIterable)` fixture | observed       |

The direct and prototype forms agree on native cleanup and ownership. RxJS agrees on sharing,
late-subscriber, no-replay, and reset-on-zero behavior, but its raw AsyncIterable adapter does not
provide the `return()` initiation required by this fixture. A thin explicit RxJS adapter would need
to own that cancellation bridge if this boundary were selected for a real consumer.

## Decision boundary

This evidence does not select a Vii sharing operator, replay policy, multicast API, or retained
upstream policy. Explicit hot sources remain source-owned and do not replay by default. Any future
sharing adapter must make upstream ownership, last-subscriber disposal, late-subscriber behavior,
reset-on-zero, native cancellation initiation, completion, error, and cancellation observable in
its contract. Flow remains Research-only until a real consumer demonstrates Vii-specific value.

## Limits

No browser, network, worker, socket, backpressure, throughput, bundle, allocation, or retained-memory
claim is made. The fixture does not choose between reset-on-zero and sticky upstream retention for
future explicit multicast adapters; sticky retention would require an explicit lifecycle owner and
would conflict with the default no-replay/no-retention boundary unless separately justified.
