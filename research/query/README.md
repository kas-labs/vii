# Vii Query Research: Prototypes (P5.1 & P5.2)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating the foundational semantics of Phase 5 Server State Coordination:

- **P5.1**: Deterministic QueryKey identity, canonicalization, hash bucket indexing, collision safety, exact & structural family matching.
- **P5.2**: Explicit QueryClient ownership, QueryRecord state separation, in-flight request deduplication, execution generation tracking, and framework-neutral QueryObservers.

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
}
```

This permits a cached successful Query to remain usable and valid while a background refetch is in-flight (`status = success`, `fetchStatus = fetching`).

### Concurrent Request Deduplication

Within a single `ResearchQueryClient`, equivalent concurrent calls to `fetchQuery()` for the same canonical key share a single in-flight `Promise<T>`.

```text
Observer A \
Observer B  -> QueryRecord -> 1 underlying execution
Observer C /
```

### Execution Generations & Stale Completion Rejection

Every fetch execution receives an incremented generation ID. If a newer execution supersedes an older in-flight request, late completion from the older request is discarded deterministically and cannot overwrite fresh cache data.

---

## 4. QueryClient Ownership & Isolation (P5.2)

- **No Global Cache Singleton**: All state is owned by an explicit `ResearchQueryClient` instance.
- **SSR Request Isolation**: Separate `ResearchQueryClient` instances never share cache entries or deduplicate requests with each other.

---

## 5. Framework-Neutral QueryObserver (P5.2)

- Provides a clean snapshot observation interface.
- Supports explicit disposal (`observer.dispose()`).
- Multiple observers can attach to one record; disposing one observer leaves remaining observers and in-flight work unaffected.
- 1,000 subscribe/dispose cycles verify zero listener retention leaks.

---

## 6. Performance Baselines

Measurements collected on Apple Silicon (Node `v22.17.0`, 10,000 iterations, 5 samples):

| Operation                            | Min (ms) | P50 (ms) | Mean (ms) | Throughput (ops/sec) |
| ------------------------------------ | -------- | -------- | --------- | -------------------- |
| `canonicalize-small-key`             | 1.53     | 3.15     | 3.47      | ~2,880,000           |
| `canonicalize-nested-key`            | 3.84     | 3.93     | 3.96      | ~2,524,000           |
| `canonicalize-object-key`            | 6.73     | 8.13     | 8.03      | ~1,245,000           |
| `naive-canonicalize-object`          | 6.39     | 6.82     | 7.48      | ~1,336,000           |
| `exact-cache-lookup`                 | 7.27     | 28.31    | 29.11     | ~343,000             |
| `naive-cache-lookup`                 | 3.57     | 4.52     | 7.02      | ~1,423,000           |
| `cache-insert-update`                | 5.20     | 6.05     | 6.47      | ~1,546,000           |
| `family-match-1000-items` (100 runs) | 20.02    | 21.76    | 21.51     | ~4,649               |

---

## 7. Roadmap Next Steps

- **Completed**: P5.1 (QueryKey & Cache), P5.2 (QueryClient, Observers, Deduplication & Generations).
- **Next Slice**: **P5.3 — Cancellation, Freshness, Inactive Retention & GC Prototype** (AbortSignal integration, `staleTime`, `gcTime`, manual invalidation).
