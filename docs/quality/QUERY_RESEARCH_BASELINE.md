# Vii Query Research Baseline (P5.1, P5.2, P5.3 & P5.4)

Status: Research evidence, bounded prototype only

## Scope

This record establishes performance, determinism, and robustness baselines for Phase 5 QueryKey canonicalization, hash indexing, QueryClient ownership, deduplication, cancellation, freshness, GC, and mutation prototypes (`P5.1`, `P5.2`, `P5.3` & `P5.4`).

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
- Vii Core `Scope.use(resource)` lifecycle integration for observers and mutations;
- Mutation execution model (`idle -> pending -> success / error`) separate from Query cache entries;
- explicit optimistic updates with generation-protected rollback;
- mandatory concurrent mutation race protection (Mutation A starts, Mutation B starts, Mutation B succeeds, Mutation A fails late: A's failure rollback does NOT clobber B's accepted update).

The code lives entirely under `research/query/` and is not a public package or API.

## Reproduction

Commands run on 2026-08-22:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

Environment: Node `v22.17.0`, pnpm `10.12.4`, macOS (Darwin arm64), Vitest `4.1.10`.

All 51 tests across 6 test files passed cleanly.

## Key Findings

1. **Mutation Isolation**: Mutations are pure write executions and do not create artificial cache records or pollute query stores.
2. **Concurrent Race Protection**: Generation-scoped rollback ensures that when multiple optimistic mutations overlap, a failing older mutation cannot blindly overwrite newer accepted server data.
3. **Cancellation Distinction (`abort != error`)**: Cancelling an in-flight mutation or fetch resets status to `idle` without marking a permanent error.
4. **Non-Destructive Invalidation**: `invalidateQueries()` marks data stale without deleting cache entries, enabling optimistic and instant UI rendering while refetches coordinate.
5. **Active GC Protection**: Queries with active observers are never evicted by GC regardless of elapsed time.
6. **Scope Integration**: Registering observers and mutations with `scope.use(resource)` ensures clean teardown on Scope disposal.

## Limitations

- Measurements are single-process Node microbenchmarks on ARM64 and do not represent cross-platform browser engine characteristics.
- Prototypes do not yet include SSR hydration envelope serialization or framework adapters (deferred to P5.5+).
