# Vii Query Research: QueryKey & QueryCache Prototype (P5.1)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This prototype validates deterministic QueryKey identity, canonicalization, hash-indexed cache indexing, exact matching, structural family/prefix matching, and pathological input robustness prior to broader QueryClient lifecycle design in Phase 5.

## Verification Commands

Run the focused test suite, benchmarks, and type check:

```bash
pnpm exec vitest run research/query/*.test.ts
pnpm exec tsc --noEmit -p research/query/tsconfig.json
```

---

## 1. QueryKey Representation & Identity Rules

Query identity is governed by deterministic value structure rather than function or reference identity:

### Accepted Strict Value Subset

- `null`
- `boolean` (`true`, `false`)
- Finite `number` (`-0` canonicalizes to `"0"`; `NaN`, `+Infinity`, `-Infinity` are rejected)
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

## 2. Canonical Representation vs. Hash Indexing

```text
QueryKey  ->  Canonical String  ->  32-bit FNV-1a Hash  ->  Cache Bucket Index
             (Semantic Identity)   (Index Optimization)     (Collision Fallback)
```

- **Semantic Truth**: Canonical string serialization is the sole source of semantic equality.
- **Index Optimization**: 32-bit FNV-1a hash maps keys to cache bucket entries.
- **Collision Safety**: When multiple distinct keys produce the same hash bucket (verified with synthetic 100% collision fixtures), records are stored within the bucket and disambiguated using full canonical string equality. Unrelated keys never alias or overwrite data.

---

## 3. Exact and Structural Family Matching

- **Exact Matching**: Two keys match if their canonical strings are identical.
- **Family / Prefix Matching**:
  - For array query keys, candidate matches if it starts with all prefix elements in order:
    - `['todos']` matches `['todos']`, `['todos', 1]`, `['todos', { status: 'done' }]`
    - `['todos', { status: 'done' }]` matches `['todos', { status: 'done' }, 'details']`
  - Array boundaries are unambiguous: `['todos', 'all']` does not match `['todos-all']`.
  - Object nodes participate by full canonical equality at their specific position.

---

## 4. Complexity Bounds & Pathological Input Protection

To prevent resource exhaustion from hostile or unbounded inputs, the canonicalizer enforces configurable limits:

- Maximum nesting depth: `64`
- Maximum node count: `10,000`
- Maximum string length: `1,048,576` characters (1 MB)

Exceeding these limits throws `QueryKeyValidationError` with error code `ERR_QUERY_KEY_LIMIT_EXCEEDED`.

---

## 5. Performance Baselines

Measurements collected on Apple Silicon (Node `v22.17.0`, 10,000 iterations, 5 samples):

| Operation                            | Min (ms) | P50 (ms) | Mean (ms) | Throughput (ops/sec) |
| ------------------------------------ | -------- | -------- | --------- | -------------------- |
| `canonicalize-small-key`             | 1.67     | 3.61     | 4.57      | ~2,180,000           |
| `canonicalize-nested-key`            | 4.36     | 5.81     | 5.78      | ~1,730,000           |
| `canonicalize-object-key`            | 9.25     | 11.27    | 11.31     | ~884,000             |
| `naive-canonicalize-object`          | 7.37     | 9.34     | 9.59      | ~1,042,000           |
| `exact-cache-lookup`                 | 8.30     | 10.84    | 10.20     | ~980,000             |
| `naive-cache-lookup`                 | 3.50     | 5.74     | 7.52      | ~1,329,000           |
| `cache-insert-update`                | 8.75     | 12.94    | 18.21     | ~549,000             |
| `family-match-1000-items` (100 runs) | 38.17    | 42.09    | 46.11     | ~2,170               |

_Observations_: Full validation with cycle detection, prototype protection, and limits adds a minor ~15% overhead over naive `JSON.stringify` while guaranteeing total determinism and security against hostile or invalid inputs.

---

## 6. Phase 5 Roadmap Boundary

This slice completes **P5.1**. The next approved slice is **P5.2** (QueryClient, QueryRecord, observer registry, deduplication, execution generation). No public API, mutations, observers, or framework adapters exist in this slice.
