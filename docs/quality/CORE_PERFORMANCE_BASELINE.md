# Core performance baseline

This document records the first P1.9 measurements for the experimental `@vii/core` runtime. The
numbers are local baselines for detecting changes in the same harness; they are not a promise that
Vii is faster than another runtime or suitable for every workload.

## Methodology

Run the benchmark after building Core:

```bash
pnpm benchmark:core
```

The harness imports `packages/core/dist/index.js`, uses `node:perf_hooks` high-resolution wall-clock
timing, performs two untimed warm-up rounds, and records the median of five timed repetitions. Each
repetition executes 10,000 operations by default. Configuration can be changed with
`Vii_BENCH_ITERATIONS`, `Vii_BENCH_WARMUP_ROUNDS`, `Vii_BENCH_REPETITIONS`, `Vii_BENCH_FANOUT`, and
`Vii_BENCH_CHAIN_DEPTH`.

The suite measures State creation and writes, 100-subscriber fan-out, a ten-node Computed chain,
100-State batch propagation, subscription creation plus disposal, Scope cleanup of a State-derived
Computed and subscription, and write overhead with diagnostics in `off`, `development`, and
`production-safe` modes. Setup is outside the timed region where practical. Cleanup is run after
each case. The raw output is committed at
`benchmarks/results/core-state-baseline.json` and includes the commit, Node version, platform, CPU,
configuration, samples, and measured operations per second.

## Interpretation and limitations

- Results depend on local CPU load, Node/V8 version, thermal state, and operating-system scheduling.
- These are synthetic microbenchmarks of the current public Core API, not application-level traces.
- Operations are intentionally behaviorally specific: for example, `computed-chain` performs a
  write followed by a final read, while `batch-propagation` writes one value to each State inside
  one synchronous batch.
- The diagnostics cases use the bounded 1,000-event buffer, so their result includes ring-buffer
  eviction after the buffer fills.
- No numeric release budget is introduced by this baseline. Future performance changes should use
  the same configuration or record why the comparison is not equivalent.
