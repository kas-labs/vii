# Vii Query Research Baseline (P5.1 & P5.2)

Status: Research evidence, bounded prototype only

## Scope

This record establishes performance, determinism, and robustness baselines for the Phase 5 QueryKey canonicalization, hash indexing, QueryClient ownership, and request deduplication prototypes (`P5.1` & `P5.2`).

The research covers:

- deterministic QueryKey identity across object key ordering and array element boundaries;
- deterministic rejection of ambiguous or unsafe types (`undefined`, `NaN`, `Infinity`, functions, symbols, `BigInt`, non-plain classes, cyclic structures);
- security against prototype-pollution attacks (`__proto__`, `constructor`, `prototype`);
- 32-bit FNV-1a hash bucket indexing with full canonical fallback for 100% collision scenarios;
- structural family / prefix matching for invalidation families;
- complexity and pathological input bounds (nesting depth, node count, string length);
- QueryRecord state separation (`empty`, `success`, `error` vs `idle`, `fetching`);
- concurrent same-key request deduplication within a QueryClient instance;
- internal execution generations preventing stale late completions from overwriting fresh cache data;
- explicit multi-client isolation (SSR Request Scope proof);
- framework-neutral QueryObserver lifecycle and leak-free disposal.

The code lives entirely under `research/query/` and is not a public package or API.

## Reproduction

Commands run on 2026-08-22:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

Environment: Node `v22.17.0`, pnpm `10.12.4`, macOS (Darwin arm64), Vitest `4.1.10`.

All 35 tests across 4 test files passed cleanly.

## Key Findings

1. **Security & Validation Overhead**: Bounded validation with cycle detection, prototype checks, and node/depth limits introduces minimal overhead (~15-18%) compared to naive `JSON.stringify` while preventing infinite loops, prototype pollution, and silent alias bugs.
2. **Hash Collision Resilience**: Synthetic tests forcing a 100% collision rate across all entries demonstrated zero data leakage or overwriting; all records remained accessible and isolated via full canonical string comparison within hash buckets.
3. **Request Deduplication**: 10 concurrent requests to the same QueryKey execute the underlying fetch function exactly once. Late observers joining mid-flight share the active in-flight execution without re-fetching.
4. **Race Protection via Generations**: When an older slow request resolves after a newer fast request, the older completion is rejected by generation ID comparison, ensuring fresh cache data is never corrupted.
5. **SSR Request Isolation**: Separate `ResearchQueryClient` instances never share cache entries or deduplicate work across boundaries.
6. **Observer Lifecycle**: 500 repeated subscribe/dispose cycles verify synchronous cleanup and zero observer listener retention leaks.

## Limitations

- Measurements are single-process Node microbenchmarks on ARM64 and do not represent cross-platform browser engine characteristics.
- Prototypes do not yet include AbortSignal cancellation, freshness calculations (`staleTime`), inactive GC (`gcTime`), mutations, or framework adapters (P5.3+).
