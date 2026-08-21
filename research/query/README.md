# Vii Query Research: Prototypes (P5.1, P5.2 & P5.3)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating the foundational semantics of Phase 5 Server State Coordination:

- **P5.1**: Deterministic QueryKey identity, canonicalization, hash bucket indexing, collision safety, exact & structural family matching.
- **P5.2**: Explicit QueryClient ownership, QueryRecord state separation, in-flight request deduplication, execution generation tracking, and framework-neutral QueryObservers.
- **P5.3**: Native `AbortSignal` fetch cancellation (`abort != error`), superseding request aborts, freshness (`staleTime`), invalidation (`invalidate != remove`), inactive retention & GC (`gcTime`), and Vii Core `Scope` integration.

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

### Structural Immutability

The validator and canonicalizer never mutate input arrays or objects.

---

## 2. Canonical Representation vs. Hash Indexing (P5.1)

```text
QueryKey  ->  Canonical String  ->  32-bit FNV-1a Hash  ->  Cache Bucket Index
             (Semantic Identity)   (Index Optimization)     (Collision Fallback)
```

- **Semantic Truth**: Canonical string serialization is the sole source of semantic equality.
- **Index Optimization**: 32-bit FNV-1a hash maps keys to cache bucket entries.
- **Collision Safety**: When multiple distinct keys produce the same hash bucket (verified with synthetic 100% collision fixtures), records are stored within the bucket and disambiguated using full canonical string equality. Unrelated keys never alias or overwrite data.

---

## 3. QueryRecord State Separation & Deduplication (P5.2)

### State Separation

Data state and fetch execution state remain strictly independent:

```ts
interface QuerySnapshot<T> {
  readonly data: T | undefined;
  readonly error: unknown | undefined;
  readonly status: "empty" | "success" | "error";
  readonly fetchStatus: "idle" | "fetching";
  readonly dataUpdatedAt: number;
  readonly errorUpdatedAt: number;
  readonly observerCount: number;
  readonly generation: number;
  readonly isInvalidated: boolean;
}
```

This permits a cached successful Query to remain usable and valid while a background refetch is in-flight (`status = success`, `fetchStatus = fetching`).

### Concurrent Request Deduplication

Within a single `ResearchQueryClient`, equivalent concurrent calls to `fetchQuery()` for the same canonical key share a single in-flight `Promise<T>`.

### Execution Generations & Stale Completion Rejection

Every fetch execution receives an incremented generation ID. If a newer execution supersedes an older in-flight request, late completion from the older request is discarded deterministically and cannot overwrite fresh cache data.

---

## 4. Cancellation, Freshness & Inactive GC (P5.3)

### AbortSignal-Native Cancellation (`abort != error`)

Every `queryFn` receives `{ signal: AbortSignal }`. When an in-flight background refetch is aborted or superseded:

- Existing valid data is preserved (`status = 'success'`, `data = cachedData`).
- `fetchStatus` resets to `'idle'`.
- Abort is not recorded as a query failure error (`error = undefined`).

### Freshness & Invalidation (`invalidate != remove`, `stale != missing`)

- `staleTime` determines when data becomes stale (defaults to `0`).
- `invalidateQueries()` marks matching records invalidated / stale immediately.
- Invalidation never deletes cached data; it remains available for instant UI rendering while background refetches coordinate.
- Supports exact key, structural family prefix matching (`['todos']` matches `['todos', 1]`), and custom predicates.

### Inactive Retention & GC (`gcTime`)

- **Active Protection**: Active queries (with >= 1 observer) are never garbage collected regardless of elapsed time.
- **Inactive Countdown**: When observer count drops to 0, an inactive GC timer is scheduled (default 5 minutes).
- **GC Cancellation**: If a new observer attaches before the GC timer fires, the timer is cancelled immediately.
- **Eviction**: On GC timer expiry, the inactive query record is removed from the cache.

### Vii Core Scope Integration

`QueryObserver` implements `ViiResource` (`{ dispose(): void }`), allowing direct integration with Vii Core `Scope.use(observer)`. Disposing the scope synchronously cleans up observers and initiates the GC countdown.

---

## 5. Performance Baselines

Measurements collected on Apple Silicon (Node `v22.17.0`, 10,000 iterations, 5 samples):

| Operation                            | Min (ms) | P50 (ms) | Mean (ms) | Throughput (ops/sec) |
| ------------------------------------ | -------- | -------- | --------- | -------------------- |
| `canonicalize-small-key`             | 5.28     | 7.30     | 8.64      | ~1,157,000           |
| `canonicalize-nested-key`            | 4.48     | 7.66     | 7.40      | ~1,351,000           |
| `canonicalize-object-key`            | 9.09     | 12.32    | 12.98     | ~770,000             |
| `naive-canonicalize-object`          | 9.27     | 11.79    | 14.00     | ~714,000             |
| `exact-cache-lookup`                 | 6.61     | 9.40     | 11.73     | ~852,000             |
| `naive-cache-lookup`                 | 2.94     | 4.98     | 5.68      | ~1,761,000           |
| `cache-insert-update`                | 6.33     | 7.01     | 9.67      | ~1,034,000           |
| `family-match-1000-items` (100 runs) | 34.60    | 42.33    | 43.03     | ~2,324               |

---

## 6. Roadmap Next Steps

- **Completed**: P5.1 (QueryKey & Cache), P5.2 (QueryClient, Observers, Deduplication & Generations), P5.3 (Cancellation, Freshness, Invalidation & GC).
- **Next Slice**: **P5.4 — Mutations and Optimistic Transactions Prototype** (mutation lifecycle, optimistic cache transactions, rollback, reconciliation).
