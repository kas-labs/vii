# Vii Query Research Baseline (P5.1, P5.2 & P5.3)

Status: Research evidence, bounded prototype only

## Scope

This record establishes performance, determinism, and robustness baselines for Phase 5 QueryKey canonicalization, hash indexing, QueryClient ownership, deduplication, cancellation, freshness, and GC prototypes (`P5.1`, `P5.2` & `P5.3`).

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
- framework-neutral QueryObserver lifecycle and leak-free disposal;
- native `AbortSignal` fetch cancellation preserving valid cached data (`abort != error`);
- cooperative cancellation on superseding requests and rapid key switching;
- freshness calculation via `staleTime` and manual `invalidateQueries()` (`invalidate != remove`, `stale != missing`);
- inactive retention and garbage collection (`gcTime`) protecting active queries while scheduling GC on unobserved records;
- Vii Core `Scope.use(observer)` lifecycle integration.

The code lives entirely under `research/query/` and is not a public package or API.

## Reproduction

Commands run on 2026-08-22:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

Environment: Node `v22.17.0`, pnpm `10.12.4`, macOS (Darwin arm64), Vitest `4.1.10`.

All 44 tests across 5 test files passed cleanly.

## Key Findings

1. **Cancellation Distinction (`abort != error`)**: Cancelling an in-flight background refetch resets `fetchStatus` to `idle` while leaving valid cached data intact in `status = 'success'`.
2. **Superseding Aborts**: Rapid key or parameter switches trigger `signal.aborted === true` on older requests and prevent out-of-order race conditions from corrupting cache data.
3. **Non-Destructive Invalidation**: `invalidateQueries()` marks data stale without deleting cache entries, enabling optimistic and instant UI rendering while refetches coordinate.
4. **Active GC Protection**: Queries with active observers are never evicted by GC regardless of elapsed time.
5. **Inactive Eviction & Cancellation**: When observer count reaches 0, a GC timer is armed; attaching a new observer before expiry cancels the timer and preserves cached data.
6. **Scope Integration**: Registering observers with `scope.use(observer)` ensures clean teardown on Scope disposal and initiates retention GC.

## Limitations

- Measurements are single-process Node microbenchmarks on ARM64 and do not represent cross-platform browser engine characteristics.
- Prototypes do not yet include mutation lifecycles, optimistic transactions, or framework adapters (deferred to P5.4+).
