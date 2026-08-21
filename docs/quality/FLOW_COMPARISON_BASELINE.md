# Vii Flow Synchronous Comparison Baseline

Status: Research evidence, bounded fixture only

## Scope

This record measures one explicit hot synchronous source with the equivalent pipeline
`map → filter → distinct` through three research baselines:

- direct callbacks;
- RxJS `7.8.2` with an explicit `Subject` source;
- the throwaway Flow prototype.

The source is subscription-driven, has no replay, and preserves synchronous FIFO delivery. Each
runner must pass the same correctness preflight before runtime measurements are collected. The
prototype remains under `research/flow/` and is not a package or public API.

## Reproduction

Commands run on 2026-08-21:

```text
pnpm exec vitest run research/flow/flow-comparison.test.ts
NODE_OPTIONS=--expose-gc pnpm exec vitest run research/flow/flow-comparison.test.ts --reporter=verbose --silent=false
```

Both runs passed: one test file and one test. The second command produced the raw JSON report used
below. Environment: Node `v22.17.0`, pnpm `10.12.4`, RxJS `7.8.2`, Vitest `4.1.10`.

Method: 3 warmup samples, 10 measured samples, 100,000 emissions per sample, `performance.now()`;
the optional retention probe performed 1,000 create/dispose cycles per runner after an explicit GC.
Correctness output for the preflight was `[2, 0]`, with structural result `count=2`,
`checksum=2`, and `completed=1`. Runtime reports contain counts and checksums only, not emitted
values or user content.

## Raw runtime samples

Elapsed milliseconds, in sample order from the GC-enabled run:

| Runner    | Samples                                                                                                        |       Min |       P50 |        Max |       Mean |
| --------- | -------------------------------------------------------------------------------------------------------------- | --------: | --------: | ---------: | ---------: |
| direct    | 1.507166, 7.294875, 2.474833, 1.547750, 2.159375, 3.381208, 6.443750, 0.728208, 0.692625, 6.158958             |  0.692625 |  2.474833 |   7.294875 |   3.238875 |
| RxJS      | 24.226125, 11.237667, 7.297916, 8.498458, 12.336584, 7.773584, 7.164416, 11.576000, 13.666583, 7.546542        |  7.164416 | 11.237667 |  24.226125 |  11.132388 |
| prototype | 32.523375, 28.192459, 29.280416, 38.854292, 89.342458, 31.260875, 34.539459, 28.225209, 218.138083, 500.016708 | 28.192459 | 34.539459 | 500.016708 | 103.037333 |

Every measured runner produced the same structural result: `count=50,000`, `checksum=50,000`,
`completed=1`. The single synchronous fixture is not evidence for a global performance ranking.

## Retention probe

The GC-enabled run reported these post-cycle heap deltas:

| Runner    | Cycles | Heap before | Heap after |         Delta |
| --------- | -----: | ----------: | ---------: | ------------: |
| direct    |  1,000 |  11,737,776 | 11,725,688 | -12,088 bytes |
| RxJS      |  1,000 |  11,829,848 | 11,854,592 | +24,744 bytes |
| prototype |  1,000 |  11,928,392 | 11,937,984 |  +9,592 bytes |

These are process-sensitive single-run observations, not retained-memory budgets or leak proofs.
The next memory slice needs repeated runs, explicit reference accounting, and a broader lifecycle
workload before any conclusion is possible.

## Complexity and deferred measurements

This slice does not claim measured TypeScript compiler cost, bundle/tree-shaking cost, allocation
counts, temporal throughput, or async switching performance. The structural complexity comparison
remains the matrix in `FLOW_RESEARCH_BRIEF.md` and `FLOW_PRIMARY_SOURCE_REVALIDATION.md`; a separate
measurement must record exact source scope, type-check command, package surface, and limitations.

The result is therefore a correctness-passing synchronous baseline plus a reproducible measurement
harness, not Flow graduation evidence and not authorization for a Flow package or public API.
