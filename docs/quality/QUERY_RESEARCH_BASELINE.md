# Vii Query Key & Cache Research Baseline (P5.1)

Status: Research evidence, bounded prototype only

## Scope

This record establishes the initial performance, determinism, and robustness baselines for the Phase 5 QueryKey canonicalization, hash indexing, and research cache prototype (`P5.1`).

The research covers:

- deterministic QueryKey identity across object key ordering and array element boundaries;
- deterministic rejection of ambiguous or unsafe types (`undefined`, `NaN`, `Infinity`, functions, symbols, `BigInt`, non-plain classes, cyclic structures);
- security against prototype-pollution attacks (`__proto__`, `constructor`, `prototype`);
- 32-bit FNV-1a hash bucket indexing with full canonical fallback for 100% collision scenarios;
- structural family / prefix matching for invalidation families;
- complexity and pathological input bounds (nesting depth, node count, string length).

The code lives entirely under `research/query/` and is not a public package or API.

## Reproduction

Commands run on 2026-08-22:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

Environment: Node `v22.17.0`, pnpm `10.12.4`, macOS (Darwin arm64), Vitest `4.1.10`.

All 28 tests across 3 test files passed cleanly.

## Runtime Measurements

Method: 10,000 iterations per sample (100 iterations for 1,000-item family match), 3 warmup iterations, 5 measured samples, `performance.now()`.

| Operation                   | Iterations | Min (ms) | P50 (ms) | Max (ms) | Mean (ms) | Throughput (ops/sec) |
| --------------------------- | ---------: | -------: | -------: | -------: | --------: | -------------------: |
| `canonicalize-small-key`    |     10,000 |     1.67 |     3.61 |    10.96 |      4.57 |           ~2,180,000 |
| `canonicalize-nested-key`   |     10,000 |     4.36 |     5.81 |     6.71 |      5.78 |           ~1,730,000 |
| `canonicalize-object-key`   |     10,000 |     9.25 |    11.27 |    14.07 |     11.31 |             ~884,000 |
| `naive-canonicalize-object` |     10,000 |     7.37 |     9.34 |    14.03 |      9.59 |           ~1,042,000 |
| `exact-cache-lookup`        |     10,000 |     8.30 |    10.84 |    12.47 |     10.20 |             ~980,000 |
| `naive-cache-lookup`        |     10,000 |     3.50 |     5.74 |    11.37 |      7.52 |           ~1,329,000 |
| `cache-insert-update`       |     10,000 |     8.75 |    12.94 |    40.62 |     18.21 |             ~549,000 |
| `family-match-1000-items`   |        100 |    38.17 |    42.09 |    60.69 |     46.11 |               ~2,170 |

## Key Findings

1. **Security & Validation Overhead**: Bounded validation with cycle detection, prototype checks, and node/depth limits introduces minimal overhead (~15-18%) compared to naive `JSON.stringify` while preventing infinite loops, prototype pollution, and silent alias bugs.
2. **Hash Collision Resilience**: Synthetic tests forcing a 100% collision rate across all entries demonstrated zero data leakage or overwriting; all records remained accessible and isolated via full canonical string comparison within hash buckets.
3. **Array Prefix Distinction**: Structural matching successfully prevents string-prefix false positives (`['todos', 'all']` does not match `['todos-all']`).

## Limitations

- Measurements are single-process Node microbenchmarks on ARM64 and do not represent cross-platform browser engine characteristics.
- QueryCache prototype does not yet include observer lifecycles, GC, deduplication, or concurrency protection. Those belong to P5.2.
