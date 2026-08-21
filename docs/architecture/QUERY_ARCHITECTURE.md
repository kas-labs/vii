# Vii Query Architecture

Status: Research

Vii Query is the candidate framework-neutral server-state coordination layer for the Vii ecosystem. It owns remote-data identity, cache lifecycle, freshness, invalidation, request deduplication, mutation coordination, and hydration semantics. It is not an HTTP client, a second State graph, a Flow implementation, a router, persistence layer, or server framework.

## Semantic boundary

```text
State     = application-owned retained current value
Computed  = derived current value
Task      = one asynchronous execution lifecycle
Flow      = zero or more values/events over time
Query     = retained remote/server state with freshness semantics
HTTP      = transport
Scope     = ownership and lifecycle
```

The architectural rule is:

> Query owns remote-state coordination. HTTP owns transport. State owns application state. Flow owns temporal streams. Scope owns lifecycle.

Core must not depend on Query. Flow must not become a Query cache. HTTP must not own caching or server-state freshness.

## Candidate package

If research graduates, the likely package is `@vii-labs/query`.

Package creation is not authorized by this research document. A thin adapter over a mature query library, a reduced Vii-owned surface, or direct platform primitives remain valid research outcomes.

## QueryClient ownership

There is no hidden process-global Query cache. Runtime state belongs to an explicit `QueryClient`.

```text
Application Scope
      |
 QueryClient
      |
 QueryCache
```

A browser application may intentionally create one application-level QueryClient. Server rendering must normally create one request-local QueryClient per Request Scope.

```text
Request A -> Request Scope A -> QueryClient A -> Cache A
Request B -> Request Scope B -> QueryClient B -> Cache B
```

Request-local data must never be silently shared between those clients.

## Query identity

A Query is identified by a deterministic QueryKey, not by function identity.

The first prototype should research a strict representation-safe subset composed of:

- `null`;
- booleans;
- finite numbers;
- strings;
- arrays of supported values;
- plain objects with string keys and supported values.

Object property order must not affect identity. Array position must affect identity.

Candidates to reject or require explicit representation include:

- `undefined`;
- `NaN` and infinities;
- functions and symbols;
- cyclic structures;
- arbitrary class instances;
- DOM objects;
- Map and Set;
- proxy-dependent values;
- Date and BigInt without an explicit representation contract.

Unsupported keys must fail deterministically rather than silently produce ambiguous cache identity.

## Canonicalization and cache indexing

```text
QueryKey
  -> canonical representation
  -> hash/index
  -> QueryRecord
```

The canonical representation remains the semantic equality source. Hashing is an indexing optimization, not public identity. Hash collisions must not allow unrelated keys to alias.

The prototype may reuse Vii deterministic-serialization ideas, but basic Query must not depend on an unfinished Codec package.

## Query record state

Data state and fetch-execution state remain separate.

```ts
interface QueryRecord<T> {
  data: T | undefined;
  error: unknown | undefined;
  status: 'empty' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching';
  dataUpdatedAt: number;
  observers: number;
}
```

This allows a successful cached Query to remain usable while a background refresh is running:

```text
status = success
fetchStatus = fetching
```

That is different from an initial load with no data.

## Freshness

Freshness describes whether cached remote data should be considered current enough without a refresh.

A successful Query records `dataUpdatedAt`. `staleTime` determines when it becomes stale. Manual invalidation immediately marks matching data stale without removing it.

```text
invalidate != remove
stale != missing
stale != error
```

A conservative research baseline of `staleTime = 0` is acceptable. Numeric defaults remain provisional until consumer and memory evidence exists.

## Retention and garbage collection

Freshness and retention are independent dimensions.

```text
freshness = should this data be refreshed?
retention = should this inactive cache entry remain in memory?
```

A Query becomes inactive when no observer or explicit owner requires it. GC may then be scheduled. A new observer cancels pending GC. Active Queries are not garbage collected.

A five-minute `gcTime` is a reasonable research fixture, not an accepted default.

## Request deduplication

Within one QueryClient, equivalent concurrent fetches for the same canonical QueryKey should normally share one in-flight execution.

```text
Observer A \
Observer B  -> QueryRecord -> one fetch
Observer C /
```

Deduplication must never cross different QueryClient instances. This property is part of SSR request isolation.

## Execution generations and stale completion

Every fetch execution should receive an internal generation or execution ID.

If a newer execution supersedes an older one, a late result from the older execution must not overwrite accepted newer data, even when the underlying transport ignores cancellation.

```text
fetch #7 starts
fetch #8 supersedes it
fetch #7 resolves late -> ignored
```

AbortSignal alone is therefore not sufficient race protection.

## Cancellation

Every Query fetch function receives an `AbortSignal`.

Cancellation is not failure.

```text
abort != error
```

A cancelled background refetch must not destroy valid cached data. Scope disposal detaches owned observers, but disposing one observer must not abort shared work still required by other observers.

Observer ownership and shared-execution ownership are separate concepts.

Owned work may be aborted when:

- explicitly cancelled;
- superseded;
- its QueryClient is disposed;
- its owning Request Scope is disposed;
- no consumer or prefetch owner still requires it and policy permits cancellation.

Late cancelled or superseded completions are ignored by generation checks.

## Invalidation

Research should support deterministic invalidation by:

- exact key;
- key family or prefix;
- optional predicate.

Invalidation marks matching data stale. Removal is a separate operation.

## Definition versus runtime record

Reusable Query definitions and runtime cache entries remain separate.

A definition may describe key construction, query function, and policy, but it must not secretly own global cached data. The same definition should work with different QueryClients in browser, tests, workers, and SSR requests.

## Query observers

Framework integrations consume one framework-neutral observer/snapshot contract.

A candidate snapshot is:

```ts
interface QuerySnapshot<T> {
  data: T | undefined;
  error: unknown | undefined;
  status: 'empty' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching';
  isFresh: boolean;
  isStale: boolean;
}
```

React, Angular, Vue, and future native Vii adapters must not implement their own cache, deduplication, freshness, GC, or mutation semantics.

## State integration

Query cache is authoritative for its remote-state snapshot. Ordinary Vii State remains application-owned state.

Query results must not be automatically mirrored into ordinary State, because that would create two implicit sources of truth.

Query may reuse stable Core primitives internally when evidence shows that doing so simplifies propagation and ownership, but Core must never import Query.

## Mutations

A Mutation is a remote write execution, not a Query cache entry.

Candidate mutation state:

```text
idle -> pending -> success
               -> error
```

Cancellation, when supported by the transport, remains distinct from failure.

Mutation coordination may update or invalidate Query cache state, but mutation functions and execution state remain separate from Query records.

## Optimistic mutations

Optimistic updates are explicit cache transactions, not hidden automatic behavior.

```text
1. snapshot affected cache state
2. apply optimistic change
3. execute remote mutation
4a. success -> reconcile or invalidate
4b. failure -> rollback owned optimistic change
```

Conflicting refetches may need cancellation or generation protection so an older server response cannot clobber the optimistic transaction.

### Concurrent mutation race

This fixture is mandatory before optimistic concurrency is claimed safe:

```text
Mutation A starts
Mutation B starts
Mutation B succeeds
Mutation A fails
```

A rollback for A must not erase B's accepted state.

Candidate strategies include generation-aware snapshots, inverse patches, narrowly scoped rollback transactions, or application-provided rollback functions. Vii should not build a normalized entity database merely to solve this first research case.

## Retry

Automatic retry should be disabled in the initial Query research baseline.

Retries have domain and idempotency semantics, can alter failure timing, and may overlap future HTTP transport policy. Mutations must never be silently retried.

Retry can be revisited only after a real Query-specific need is demonstrated.

## Hydration and dehydration

Query may transfer explicitly selected cache state across trusted server/client application boundaries.

```text
Server QueryClient
  -> dehydrate
  -> versioned payload
  -> hydrate
  -> Client QueryClient
```

Hydration is not persistence.

The first baseline should strongly prefer successful Query data only. Do not serialize active executions, AbortControllers, observers, timers, functions, arbitrary errors, diagnostics internals, or mutation functions.

Original `dataUpdatedAt` must be preserved. Client hydration time must not falsely make old server data appear freshly fetched.

## Versioned hydration envelope

Internal QueryRecord objects must not become the public wire representation.

A candidate envelope is:

```ts
interface QueryHydrationEnvelope {
  protocol: 'vii.query';
  version: 1;
  queries: HydratedQuery[];
}
```

The exact schema remains research-level.

## Serialization and Codec boundary

Query cannot assume arbitrary JavaScript values are JSON-safe.

Initial research should allow a safe baseline representation and optional application-provided conversion. Future Vii Codec integration may provide an explicit boundary, but Codec must not be mandatory for basic Query operation.

## SSR Request Scope isolation

Request isolation is a security boundary.

Conceptually:

```ts
handleRequest(request) {
  const scope = createScope();
  const client = createQueryClient({ scope });

  try {
    // prefetch
    // render
    // dehydrate
  } finally {
    scope.dispose();
  }
}
```

A mandatory future fixture proves that Request B cannot observe cached data created for Request A.

## Hydration trust boundary

Hydration payloads are structured external input. Research must cover:

- prototype pollution and unsafe keys;
- malformed Query keys;
- cyclic and oversized data;
- recursive depth;
- invalid timestamps;
- unsupported protocol versions;
- HTML/script injection boundaries;
- cross-request data leakage;
- unsafe custom codecs.

Parsing must fail deterministically and must not expose raw payloads through diagnostics by default.

## Diagnostics

Query should follow the existing Vii value-safe Diagnostics philosophy.

Useful structural events may include:

- cache hit/miss;
- fetch started, deduplicated, succeeded, failed, cancelled;
- invalidation;
- observer add/remove;
- GC schedule/cancel/remove;
- hydration/dehydration;
- mutation start/success/failure/rollback.

Safe metadata candidates include generated Query IDs, key hashes, durations, observer counts, age, fresh/stale state, execution generation, and finite failure categories.

Do not capture raw Query values, response bodies, request bodies, tokens, cookies, authorization headers, user content, mutation variables, or hydration payloads by default.

## Environment triggers

Window focus and network reconnect are environment concerns, not Query Core assumptions.

```text
browser/desktop/mobile environment trigger
  -> optional policy adapter
  -> Query Core
```

This keeps browser, worker, server, desktop, and mobile behavior replaceable and explicit.

## Persistence

Persistent cache is out of scope for the first Query architecture. Do not combine the in-memory cache with localStorage, IndexedDB, filesystem, service-worker queues, or distributed cache semantics.

A future persistence adapter may consume the versioned dehydration/hydration boundary.

## Pagination and infinite queries

Do not begin with a dedicated InfiniteQuery subsystem. Ordinary pagination can initially use ordinary QueryKeys. Cursor/infinite aggregation is a follow-up only when real consumers demonstrate repeated need.

## Suspense

Suspense is a framework-edge concern. Query Core must not require throwing promises. A future React integration may adapt the same Query cache to Suspense without changing Core semantics.

## Transport independence

Query asks an application-provided function for asynchronous data. It does not own HTTP semantics.

A Query function may use native Fetch, future Vii HTTP, Axios, GraphQL, RPC, IndexedDB-backed services, or another application service if it respects the Query contract and AbortSignal where relevant.

Query Core must not own base URLs, HTTP headers, cookies, middleware, JSON assumptions, or HTTP status mapping.

## Security and robustness research

Mandatory fixtures should cover:

- cross-request cache leakage;
- malicious, oversized, cyclic, and pathological Query keys;
- hash collision handling;
- prototype pollution;
- stale promise completion after cancellation;
- older execution overwriting a newer one;
- rapid key switching;
- repeated subscribe/unsubscribe;
- timer and GC exhaustion;
- memory retention after Scope disposal;
- malformed and oversized hydration;
- unsupported hydration versions;
- mutation rollback races;
- Diagnostics leakage.

## Performance research

Measure at least:

- canonical key generation;
- cache lookup, insert, remove, and invalidation;
- prefix/family matching;
- observer subscribe/notify/unsubscribe;
- Scope disposal;
- deduplication and rapid key switching;
- cancellation and stale-result rejection;
- GC and retained memory;
- SSR request teardown;
- hydration/dehydration time and payload size;
- TypeScript inference/compiler cost;
- raw/gzip package size if a package prototype exists.

Compare semantically equivalent cases with direct `Promise + Map + AbortController`, the Vii prototype, and a mature Query solution such as TanStack Query where semantics overlap.

## Candidate API direction

API syntax is intentionally unfrozen. A research shape might look like:

```ts
const client = createQueryClient();

const userQuery = defineQuery({
  key: (id: string) => ['user', id] as const,
  queryFn: ({ signal }, id: string) => usersApi.get(id, { signal }),
  staleTime: 30_000,
});

const observer = client.observe(userQuery, '42');
```

Imperative cache operations may include distinct concepts such as fetch, prefetch, ensure, invalidate, refetch, cancel, remove, getData, and setData. Exact names and overloads are prototype material, not accepted API.

## Package and adapter boundary

```text
@vii-labs/core
  State / Computed / Scope / Diagnostics foundations

@vii-labs/query (candidate only)
  QueryClient / QueryCache / observers / mutations / hydration

@vii-labs/http (future research)
  transport only

framework integrations
  lifecycle and presentation adapters only
```

Whether framework Query integrations belong in existing framework packages or separate packages must be decided from bundle, dependency, and consumer evidence.

## Initial exclusions

Do not implement in the first architecture/prototype slices:

- persistent cache;
- offline mutation queue;
- service-worker synchronization;
- WebSocket cache synchronization;
- normalized entity database;
- GraphQL-specific cache;
- CRDT layer;
- distributed cache;
- infinite-query subsystem;
- router integration;
- server actions/functions;
- implicit retry;
- implicit global QueryClient;
- framework Suspense as a Core requirement;
- streaming Query cache.

## Graduation gates

Query graduates only when:

1. QueryKey canonicalization is deterministic.
2. Hash collisions cannot alias unrelated keys.
3. Same-key requests deduplicate deterministically inside one QueryClient.
4. Late stale executions cannot overwrite newer accepted state.
5. Cancellation is AbortSignal-native and distinct from failure.
6. Scope disposal releases observers and owned resources.
7. Freshness and GC are independently tested.
8. Invalidation semantics are deterministic.
9. Optimistic rollback is safe for simple and concurrent cases.
10. SSR caches are request-isolated.
11. Hydration is versioned and safely validated.
12. Diagnostics remain value-safe by default.
13. Memory after disposal/GC is measured.
14. Any packed package works from a clean consumer.
15. Framework integrations share one Core semantic contract.
16. Query remains transport-independent.
17. Build-vs-buy evidence demonstrates enough Vii-specific value to justify ownership.
18. The public surface remains small enough that Vii is not recreating a mature Query ecosystem without evidence.

## Stop rule

Reduce, defer, or replace Vii Query when:

- direct State + Promise + Map solves validated consumers adequately;
- a thin adapter over an existing mature library preserves important Vii semantics;
- owning Query would duplicate large mature-library surfaces without measurable value;
- hydration or request isolation cannot meet security requirements;
- optimistic concurrency requires disproportionate complexity;
- maintenance cost exceeds demonstrated ecosystem benefit.

A TanStack Query adapter or direct platform integration is an acceptable final research outcome.
