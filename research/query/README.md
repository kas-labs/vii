# Vii Query Research: Prototypes (P5.1, P5.2, P5.3 & P5.4)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating foundational semantics of Phase 5 Server State Coordination:

- **P5.1**: Deterministic QueryKey identity, canonicalization, hash bucket indexing, collision safety, exact & structural family matching.
- **P5.2**: Explicit QueryClient ownership, QueryRecord state separation, in-flight request deduplication, execution generation tracking, and framework-neutral QueryObservers.
- **P5.3**: Native `AbortSignal` fetch cancellation (`abort != error`), superseding request aborts, freshness (`staleTime`), invalidation (`invalidate != remove`), inactive retention & GC (`gcTime`), and Vii Core `Scope` integration.
- **P5.4**: Mutation execution lifecycle (`idle -> pending -> success / error`), optimistic cache transactions, generation-protected rollback, and concurrent mutation race safety.

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

### Mutation Model

Mutations are remote write executions separate from Query cache entries:

- State lifecycle: `idle -> pending -> success / error`.
- Native `AbortSignal` cancellation support.
- Standard lifecycle hooks: `onMutate`, `onSuccess`, `onError`, `onSettled`.

### Optimistic Cache Transactions & Rollback

- `onMutate` applies optimistic changes via `client.setOptimisticData(key, data)` or `client.setQueryData(key, updater)`.
- `client.setOptimisticData` returns an explicit `rollback()` callback.
- **Generation-Protected Concurrency**:
  When Mutation A starts (`gen = 1`), Mutation B starts (`gen = 2`), Mutation B succeeds and writes server data (`gen = 3`), and Mutation A fails late:
  Mutation A's `rollback()` checks its captured generation against the current record generation. Because a newer mutation has been accepted (`gen 3 !== gen 1`), A's rollback is safely skipped, preventing it from clobbering B's accepted update.

---

## 6. Performance Baselines

Measurements collected on Apple Silicon (Node `v22.17.0`, 10,000 iterations, 5 samples):

| Operation                            | Min (ms) | P50 (ms) | Mean (ms) | Throughput (ops/sec) |
| ------------------------------------ | -------- | -------- | --------- | -------------------- |
| `canonicalize-small-key`             | 1.94     | 2.34     | 4.74      | ~2,108,000           |
| `canonicalize-nested-key`            | 4.15     | 4.78     | 4.91      | ~2,036,000           |
| `canonicalize-object-key`            | 6.71     | 7.00     | 7.32      | ~1,365,000           |
| `naive-canonicalize-object`          | 5.44     | 5.55     | 6.44      | ~1,552,000           |
| `exact-cache-lookup`                 | 4.27     | 4.66     | 4.86      | ~2,056,000           |
| `naive-cache-lookup`                 | 2.41     | 2.48     | 3.14      | ~3,179,000           |
| `cache-insert-update`                | 4.65     | 5.22     | 5.41      | ~1,849,000           |
| `family-match-1000-items` (100 runs) | 18.79    | 19.52    | 19.55     | ~5,114               |

---

## 7. Roadmap Next Steps

- **Completed**: P5.1 (QueryKey & Cache), P5.2 (QueryClient, Observers, Deduplication & Generations), P5.3 (Cancellation, Freshness, Invalidation & GC), P5.4 (Mutations & Optimistic Transactions).
- **Next Slice**: **P5.5 — SSR Request Scope and Hydration Prototype** (`dehydrate`, versioned wire envelope, `hydrate`, request-local SSR isolation).
