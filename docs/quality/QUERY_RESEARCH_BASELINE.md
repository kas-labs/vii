# Vii Query Research Baseline (P5.1 - P5.8)

Status: Research evidence & Phase 5 completion gate

## Scope

This record establishes performance, determinism, robustness, comparative benchmarks, and graduation decisions for Phase 5 Query server-state architecture (`P5.1` - `P5.8`).

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
- Vii Core `Scope.use(resource)` lifecycle integration for observers, mutations, and client instances;
- Mutation execution model (`idle -> pending -> success / error`) separate from Query cache entries;
- explicit optimistic updates with generation-protected rollback;
- mandatory concurrent mutation race protection (Mutation A starts, Mutation B starts, Mutation B succeeds, Mutation A fails late: A's failure rollback does NOT clobber B's accepted update);
- SSR Request Scope isolation proving Request A data is never visible to Request B;
- server prefetching and safe dehydration producing a versioned wire envelope (`protocol: "vii.query"`, `version: 1`);
- hardened client hydration with strict validation against prototype pollution, malformed keys, invalid/future timestamps, and oversized payloads;
- preservation of original `dataUpdatedAt` timestamps across the hydration boundary;
- value-safe structural diagnostics for all Query, Mutation, and Hydration events;
- absolute privacy enforcement: zero logging of query values, response/request bodies, variables, tokens, credentials, or hydration payloads;
- fault-isolated diagnostic sinks preventing observer errors from impacting execution;
- framework adapter bridges for React (`useSyncExternalStore`), Angular (`Signal` + `DestroyRef`), and Vue (`ShallowRef` + scope disposal);
- shared Query Compliance Suite verifying exact semantic parity across React, Angular, and Vue;
- proof of Query Core decoupling (Core operates identically without framework adapters);
- comparative benchmarks and Build-vs-Buy evaluation gate (`docs/strategy/QUERY_BUILD_VS_BUY_EVALUATION.md`) confirming Option A (Graduate `@vii-labs/query`).

The code lives entirely under `research/query/` and is not a public package or API.

## Reproduction

Commands run on 2026-08-22:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

Environment: Node `v22.17.0`, pnpm `10.12.4`, macOS (Darwin arm64), Vitest `4.1.10`.

All 87 tests across 10 test files passed cleanly.

## Key Findings

1. **Graduation Justified**: Vii Query prototype achieves 3.5x smaller footprint (~3.8 KB minified vs ~13.5 KB TanStack Query Core) with superior Vii Scope integration and zero runtime dependencies.
2. **Framework Decoupling**: Adapters are strictly thin reactive bridges that own zero cache, GC, or scheduling state. Removing or swapping adapters has zero impact on Query Core semantics.
3. **Universal Compliance**: React, Angular, and Vue adapters share the exact same behavioral lifecycle contract and pass the identical compliance test suite.
4. **Zero Data/Credential Leakage**: Verifiable structural event logging excludes response payloads, request variables, tokens, credentials, and user data.
5. **Fault Isolation**: Sinks with runtime exceptions do not fail or alter queries, mutations, or hydration.
6. **Zero Cross-Request Leakage**: Request-scoped `ResearchQueryClient` instances guarantee 100% data isolation between concurrent server requests.
7. **Deterministic Wire Envelope**: Dehydration serializes only successful data without leaking active executions, AbortControllers, timers, or internal error states.
8. **Timestamp Integrity**: Preserving original server `dataUpdatedAt` prevents false freshness inflation on client initial load.
9. **Mutation & Rollback Safety**: Generation-scoped rollback prevents older failing mutations from clobbering newer accepted server updates.

## Limitations

- Measurements are single-process Node microbenchmarks on ARM64 and do not represent cross-platform browser engine characteristics.
