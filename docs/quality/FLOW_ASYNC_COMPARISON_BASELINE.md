# Vii Flow Deterministic Temporal and Async Comparison Baseline

Status: Research evidence, bounded fixture only

## Scope

This record measures one deterministic rapid-query fixture through four research runners:

- direct callbacks with `Promise` plus `AbortController`;
- RxJS `7.8.2` with an explicit AbortController bridge;
- the functional throwaway Flow prototype;
- the fluent throwaway Flow prototype.

The fixture uses an explicit debounce boundary followed by async switch-latest behavior. Each
runner receives 32 rapid query changes, resolves only through a controlled Promise fixture, then
runs a fresh pending branch that is disposed before completion. The report contains structural
counts only. Query names and emitted result bodies are test-only values and are not printed in the
JSON evidence.

The prototype remains under `research/flow/`; this is not a package, public API, or Core change.

## Reproduction

Commands run on 2026-08-21:

```text
pnpm exec vitest run research/flow/flow-async-comparison.test.ts --reporter=verbose --silent=false
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
pnpm exec prettier --check research/flow/flow-async-comparison.test.ts
git diff --check
```

The comparison test passed: one file and three tests passed. The same run printed the JSON report
used below. Environment: Node `v22.17.0`, pnpm `10.12.4`, RxJS `7.8.2`, Vitest `4.1.10`.

## Correctness result

All runners passed the preflight with one latest result, zero stale deliveries, and no delivery
after the fresh disposal branch was cut off. Each runner started 33 controlled async branches.
Direct and RxJS recorded 33 AbortSignal abort initiations; both prototype forms recorded 32 because
the completed latest inner branch is released before the later fresh disposal branch. This is an
observable lifecycle difference in the throwaway prototype, not a normalized performance result.

The separate Scope fixture also passed: synchronous `Scope.dispose()` cut off the owned branch,
initiated one abort, and the late controlled completion produced no downstream result.

Timer observation was `pendingTimerPeak=1` for direct and both prototype forms. The RxJS virtual
scheduler's internal timer queue is not a public comparable count and is recorded as unavailable;
the existing 1,000-event timer-storm robustness fixture remains the timer-boundary correctness
check.

## Raw orchestration samples

Elapsed milliseconds, in sample order. Each runner used three warmups and eight measured samples.
The clock covered deterministic orchestration and explicit microtask flushing; no real timer,
network, browser, or platform I/O was measured.

| Runner               | Samples                                                                            |      Min |       P50 |       Max |      Mean |
| -------------------- | ---------------------------------------------------------------------------------- | -------: | --------: | --------: | --------: |
| direct               | 2.757209, 18.182750, 18.541125, 7.178834, 9.121417, 13.386333, 12.925500, 2.694791 | 2.694791 | 12.925500 | 18.541125 | 10.598495 |
| RxJS                 | 2.969000, 8.752459, 6.802125, 6.691333, 13.527292, 9.196917, 7.470166, 2.269500    | 2.269500 |  7.470166 | 13.527292 |  7.209849 |
| prototype-functional | 14.811792, 14.787583, 3.215667, 3.236750, 13.837958, 11.047708, 5.769292, 1.658625 | 1.658625 | 11.047708 | 14.811792 |  8.545672 |
| prototype-fluent     | 16.916750, 17.256917, 5.480833, 6.219917, 14.911750, 12.497292, 2.080667, 3.928375 | 2.080667 | 12.497292 | 17.256917 |  9.911563 |

These values are process- and fixture-sensitive orchestration observations. They are not a global
ranking, throughput claim, latency budget, or evidence that one implementation is universally
faster.

## Lifecycle samples

Each lifecycle sample measures 1,000 create/dispose cycles with no emitted values.

| Runner               | Samples                                                                         |      Min |      P50 |       Max |     Mean |
| -------------------- | ------------------------------------------------------------------------------- | -------: | -------: | --------: | -------: |
| direct               | 0.098375, 0.152708, 0.057708, 0.044000, 4.705750, 0.044459, 0.019875, 0.016792  | 0.016792 | 0.057708 |  4.705750 | 0.642458 |
| RxJS                 | 11.079500, 9.989958, 0.529292, 0.403791, 4.310333, 5.292500, 0.381042, 0.385250 | 0.381042 | 4.310333 | 11.079500 | 4.046458 |
| prototype-functional | 2.330292, 3.617167, 3.878250, 4.403542, 3.131125, 1.976333, 0.738250, 3.139417  | 0.738250 | 3.139417 |  4.403542 | 2.901797 |
| prototype-fluent     | 1.219083, 1.564041, 1.772833, 2.288125, 3.500792, 0.812459, 0.696667, 0.821125  | 0.696667 | 1.564041 |  3.500792 | 1.584391 |

These are single-run local lifecycle observations, not allocation counts, retained-memory budgets,
or leak proofs. Repeated process-isolated runs and explicit reference accounting remain necessary.

## Interpretation and deferred work

The fixture demonstrates that all four forms can preserve latest-result correctness, suppress stale
completion, initiate cancellation, and cut off a fresh owned branch on disposal. It also exposes a
prototype lifecycle distinction around completed inner ownership. That distinction needs an explicit
design decision before any public API or adapter is considered.

This slice does not measure bundle/tree-shaking, allocation, retained memory, real-clock throughput,
browser/platform integration, AsyncIterable/ReadableStream runtime throughput, or cancellation
rejection surfacing. It does not create a Flow package, change Core `ViiResource.dispose(): void`,
or make a support claim. Flow remains Research.
