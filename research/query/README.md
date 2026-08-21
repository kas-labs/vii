# Vii Query Research: Prototypes (P5.1 - P5.6)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating foundational semantics of Phase 5 Server State Coordination:

- **P5.1**: Deterministic QueryKey identity, canonicalization, hash bucket indexing, collision safety, exact & structural family matching.
- **P5.2**: Explicit QueryClient ownership, QueryRecord state separation, in-flight request deduplication, execution generation tracking, and framework-neutral QueryObservers.
- **P5.3**: Native `AbortSignal` fetch cancellation (`abort != error`), superseding request aborts, freshness (`staleTime`), invalidation (`invalidate != remove`), inactive retention & GC (`gcTime`), and Vii Core `Scope` integration.
- **P5.4**: Mutation execution lifecycle (`idle -> pending -> success / error`), optimistic cache transactions, generation-protected rollback, and concurrent mutation race safety.
- **P5.5**: SSR Request Scope isolation, server prefetching, dehydration, versioned wire envelope (`protocol: "vii.query"`, `version: 1`), hardened client hydration, and timestamp preservation.
- **P5.6**: Value-safe structural diagnostics covering all lifecycles, absolute privacy enforcement (zero data/credential leakage), and fault-isolated diagnostic sinks.

## Verification Commands

Run the focused test suite, benchmarks, and type check:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

---

## 1. QueryKey Representation & Identity (P5.1)

Query identity is governed by deterministic value structure rather than function or reference identity:

### Accepted Strict Value Subset

- `null`
- `boolean` (`true`, `false`)
- Finite `number` (`-0` normalizes to `"0"`; `NaN`, `+Infinity`, `-Infinity` are rejected)
- `string`
- `Array<QueryKey>` (element ordering preserved)
- Plain `Record<string, QueryKey>` (prototype is `Object.prototype` or `null`, string keys sorted lexicographically)

### Deterministically Rejected Values

- `undefined` (fails with `QueryKeyValidationError`)
- `NaN`, `Infinity`, `-Infinity`
- `function`, `symbol`, `bigint`
- Non-plain object instances (`Date`, `RegExp`, `Map`, `Set`, `Error`, custom class instances)
- Cyclic structures in arrays or objects (cycle detection via active traversal set)
- Prototype pollution properties (`__proto__`, `constructor`, `prototype` as own keys)

---

## 2. Canonical Representation vs. Hash Indexing (P5.1)

- **Semantic Truth**: Canonical string serialization is the sole source of semantic equality.
- **Index Optimization**: 32-bit FNV-1a hash maps keys to cache bucket entries.
- **Collision Safety**: Disambiguated using full canonical string equality within buckets (verified with 100% collision test suites).

---

## 3. QueryRecord State Separation & Deduplication (P5.2)

- **Data vs Fetch Status**: Data status (`empty`, `success`, `error`) and fetch status (`idle`, `fetching`) remain strictly independent.
- **Request Deduplication**: Concurrent calls to `fetchQuery()` for the same key share a single in-flight `Promise<T>`.
- **Execution Generations**: Incrementing generation counter rejects stale late completions from superseded requests.

---

## 4. Cancellation, Freshness & Inactive GC (P5.3)

- **`abort != error`**: Background refetch cancellation resets `fetchStatus` to `idle` without destroying valid cached data.
- **`staleTime` & Invalidation**: Invalidation marks data stale without deleting cache entries (`invalidate != remove`, `stale != missing`).
- **Inactive Retention & GC (`gcTime`)**: Active queries are never collected; inactive queries arm a GC eviction timer that is cancelled upon re-subscription.
- **Vii Core Scope Integration**: `QueryObserver` implements `ViiResource` (`{ dispose(): void }`), allowing clean cleanup via `scope.use(observer)`.

---

## 5. Mutations & Optimistic Transactions (P5.4)

- **Mutation Model**: Separate write execution lifecycle (`idle -> pending -> success / error`) with `AbortSignal` support.
- **Generation-Protected Rollback**: When overlapping mutations execute (A starts, B starts, B succeeds, A fails late), A's rollback checks record generations and safely skips blind restoration, preventing corruption of B's accepted server update.

---

## 6. SSR Request Scope & Hydration (P5.5)

- **Request Scope Isolation**: Every SSR request instantiates an isolated `ResearchQueryClient` bound to a Request `Scope`. Request A data is never visible to Request B.
- **Versioned Wire Envelope**: `protocol: "vii.query"`, `version: 1`. Only successful data is dehydrated; executions, timers, observers, errors, and functions are excluded.
- **Hardened Validation Boundary**: Strictly validates external envelopes, blocking prototype pollution, malformed keys, invalid/future timestamps, oversized payloads, and unsupported protocols/versions.
- **Timestamp Preservation**: Original server `dataUpdatedAt` survives hydration to ensure correct client freshness calculations.

---

## 7. Diagnostics & Privacy (P5.6)

- **Structural Event Model**: Emits typed structural events for cache hit/miss, fetch start/deduplication/success/error/cancel, invalidation, observer add/remove, GC schedule/cancel/evict, dehydration/hydration, and mutation lifecycle/rollback.
- **Value-Free Privacy**: Default diagnostics strictly exclude raw query values, response bodies, request payloads, mutation variables, cookies, credentials, tokens, and raw user content.
- **Fault Isolation**: Sinks execute inside safe try/catch wrappers so diagnostic logging errors can never disrupt Query or Mutation execution.

---

## 8. Performance Baselines

Measurements collected on Apple Silicon (Node `v22.17.0`, 10,000 iterations, 5 samples):

| Operation                            | Min (ms) | P50 (ms) | Mean (ms) | Throughput (ops/sec) |
| ------------------------------------ | -------- | -------- | --------- | -------------------- |
| `canonicalize-small-key`             | 3.14     | 4.54     | 4.88      | ~2,051,000           |
| `canonicalize-nested-key`            | 4.09     | 4.90     | 5.50      | ~1,818,000           |
| `canonicalize-object-key`            | 6.56     | 6.60     | 7.34      | ~1,363,000           |
| `naive-canonicalize-object`          | 5.42     | 5.44     | 6.14      | ~1,628,000           |
| `exact-cache-lookup`                 | 4.21     | 4.23     | 4.50      | ~2,221,000           |
| `naive-cache-lookup`                 | 2.39     | 2.39     | 2.86      | ~3,497,000           |
| `cache-insert-update`                | 4.41     | 4.46     | 4.64      | ~2,154,000           |
| `family-match-1000-items` (100 runs) | 18.81    | 18.89    | 19.82     | ~5,046               |

---

## 9. Roadmap Next Steps

- **Completed**: P5.1 (QueryKey & Cache), P5.2 (QueryClient, Observers, Deduplication & Generations), P5.3 (Cancellation, Freshness, Invalidation & GC), P5.4 (Mutations & Optimistic Transactions), P5.5 (SSR Request Scope & Hydration), P5.6 (Diagnostics & Privacy).
- **Next Slice**: **P5.7 — Framework Integration Fixtures Prototype** (React, Angular, and Vue lifecycle integration compliance suite).
