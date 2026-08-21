# RFC 0024: Vii Query Architecture

Status: Proposed

## Summary

Define the research architecture for a framework-neutral Vii Query layer that coordinates retained remote/server state without turning HTTP, State, Flow, or framework adapters into competing cache implementations.

This RFC proposes semantics and research gates only. It does not create `@vii-labs/query`, stabilize a public API, or authorize implementation beyond separately approved Phase 5 research slices.

The detailed research architecture is `docs/architecture/QUERY_ARCHITECTURE.md`. The execution sequence is `docs/roadmap/PHASE_5_QUERY.md`.

## Motivation

Vii already separates application-owned State, Scope lifetime, Diagnostics, framework adapters, and Flow research. Flow explicitly does not own caching, request deduplication, or server-state freshness. HTTP research is intentionally blocked from absorbing those concerns until Query's transport boundary is understood.

Phase 5 therefore needs a durable architecture before implementation so Vii does not accidentally create:

- a second State graph;
- a Fetch wrapper that also owns cache semantics;
- framework-specific Query engines;
- a process-global SSR cache;
- optimistic mutation behavior that is unsafe under concurrency;
- a proprietary cancellation or hydration island.

## Goals

- explicit QueryClient ownership with no hidden global cache;
- deterministic QueryKey identity and canonicalization;
- per-Query cache state with separate data and fetch state;
- freshness distinct from inactive retention and garbage collection;
- same-key request deduplication within one QueryClient;
- execution-generation protection against stale late completions;
- AbortSignal-native cancellation, with cancellation distinct from failure;
- deterministic invalidation;
- framework-neutral observer semantics;
- mutations and explicit optimistic cache transactions;
- request-local SSR QueryClients and Request Scope teardown;
- versioned hydration/dehydration boundaries;
- value-safe Diagnostics;
- transport independence;
- an explicit build-vs-buy decision before public package graduation.

## Non-goals

This proposal does not authorize or require:

- a public Query package;
- a stable Query API;
- persistent cache;
- offline mutation queues;
- service-worker synchronization;
- WebSocket cache synchronization;
- normalized entity storage;
- GraphQL-specific caching;
- CRDTs or distributed cache;
- an InfiniteQuery subsystem;
- router integration;
- server actions/functions;
- automatic retries;
- framework Suspense as a Core requirement;
- a global QueryClient singleton.

## Proposed design

### Semantic boundary

```text
State     = application-owned retained current value
Computed  = derived current value
Task      = one async execution lifecycle
Flow      = zero or more values/events over time
Query     = retained remote/server state with freshness semantics
HTTP      = transport
Scope     = ownership and lifecycle
```

Query owns remote-state coordination. HTTP owns transport. State owns application state. Flow owns temporal streams. Scope owns lifetime.

Core must not depend on Query.

### Explicit ownership

A QueryClient owns its Query cache, in-flight executions, observer registry, invalidation state, retention/GC bookkeeping, mutation coordination, and optional Query diagnostics.

A browser application may intentionally own an application-level QueryClient. SSR uses a request-local QueryClient:

```text
Request A -> Request Scope A -> QueryClient A -> Cache A
Request B -> Request Scope B -> QueryClient B -> Cache B
```

Cross-request deduplication and cache sharing are prohibited by this ownership model unless a future separately governed server cache deliberately introduces a different trust boundary.

### Query identity

The first research prototype uses deterministic QueryKeys. The preferred baseline is a strict representation-safe subset of null, boolean, finite number, string, arrays, and plain string-keyed objects composed from those values.

Object property order does not affect identity. Array position does.

Unsupported or ambiguous structures fail deterministically rather than being coerced silently.

Canonical representation is the equality source. A hash may index records but cannot define semantic equality alone; collision handling must compare canonical identity.

### Query state

Query data state and active fetch state remain independent. A Query can retain successful data while a background refresh is running. Stale is not missing, invalidated is not removed, and cancellation is not error.

### Freshness and retention

`dataUpdatedAt` and `staleTime` model freshness. Invalidation marks matching data stale without deleting it.

Inactive retention and garbage collection use a separate policy such as `gcTime`. Active Queries cannot be garbage collected solely because freshness expires.

Exact defaults remain provisional until research evidence exists.

### Deduplication and race protection

Equivalent concurrent fetches for one QueryKey inside one QueryClient normally share one active execution.

Each execution receives an internal generation/ID. A superseded execution that resolves late cannot overwrite a newer accepted result, even when transport ignores AbortSignal.

### Cancellation and Scope

Query functions receive AbortSignal. Cancellation is distinct from failure.

Scope disposal removes owned observers, but one observer disappearing cannot cancel shared work still needed by other observers. QueryClient disposal and Request Scope disposal may cancel owned execution.

### Mutations

Mutation execution remains separate from Query records. Optimistic cache writes are explicit transactions with rollback/reconciliation semantics.

Research cannot claim safe optimistic concurrency until it passes the mandatory race:

```text
Mutation A starts
Mutation B starts
Mutation B succeeds
Mutation A fails
```

A rollback for A must not erase B's accepted result.

### Hydration

Server/client cache transfer uses a versioned external envelope rather than internal QueryRecord serialization. The research direction is equivalent to:

```ts
{
  protocol: 'vii.query',
  version: 1,
  queries: [...]
}
```

Successful safe Query data is the preferred initial dehydration subset. `dataUpdatedAt` is preserved from the server so hydration does not make old data appear fresh.

Hydration input is untrusted structured data and must be validated against malformed keys, prototype pollution, oversized/deep structures, unsupported versions, invalid timestamps, injection boundaries, and cross-request leakage.

### Transport boundary

Query functions may use native Fetch, future Vii HTTP, another HTTP client, GraphQL/RPC clients, storage-backed services, or application services.

Query Core does not own base URLs, HTTP headers, cookies, middleware, JSON assumptions, or HTTP status mapping.

## Public API or protocol impact

No public API is accepted by this RFC.

`@vii-labs/query` is a candidate package name only if research graduates. Candidate TypeScript examples in architecture documents are illustrative and may change or be discarded.

A versioned Query hydration protocol is also research-level until a later accepted contract stabilizes its exact schema and compatibility policy.

## Lifecycle and resource ownership

- QueryClient owns Query cache records and shared execution coordination.
- Query observers are owned by explicit consumer lifecycle or Scope.
- Request Scope owns request-local QueryClient teardown for SSR.
- Shared execution ownership is distinct from any single observer.
- GC timers and AbortControllers must not outlive the QueryClient/Request Scope that owns them.
- Scope disposal remains deterministic even when underlying asynchronous cleanup settles later.

## Compatibility

The Query Core direction is framework-neutral and transport-neutral.

React, Angular, Vue, and future Vii-native integrations must adapt one Query semantic contract rather than reimplement caching or freshness.

Core remains independently usable without Query. Flow remains independently usable without Query. HTTP remains usable as transport without requiring Query.

## Diagnostics and privacy

Candidate Query diagnostics are structural and bounded. They may report cache hit/miss, fetch lifecycle, deduplication, invalidation, observer count, GC lifecycle, hydration/dehydration, mutation lifecycle, and rollback outcomes.

By default they must not capture:

- Query data;
- raw QueryKey values;
- response/request bodies;
- mutation variables;
- cookies or credentials;
- Authorization headers or tokens;
- arbitrary user content;
- raw hydration payloads.

Generated identifiers, key hashes, durations, counts, ages, execution generations, and finite failure categories are preferred.

## Security and privacy

Research fixtures must explicitly cover:

- cross-request cache leakage;
- malicious, cyclic, oversized, or ambiguous Query keys;
- canonicalization/hash collisions;
- prototype pollution;
- stale completion after cancellation/supersession;
- timer/resource exhaustion;
- memory retention after Scope/QueryClient disposal;
- malformed/oversized hydration;
- unsupported hydration versions;
- mutation rollback races;
- Diagnostics leakage.

A global request-data cache is not a permitted SSR default.

## Performance implications

A Vii-owned Query implementation adds canonicalization, cache bookkeeping, observers, timers, mutation coordination, and hydration code. Those costs must be measured rather than justified by feature parity.

Research should measure cache operations, key canonicalization, subscriptions, deduplication, invalidation, cancellation, GC, retained memory, request teardown, hydration time/payload size, package size, and TypeScript compiler/inference cost.

Comparisons must use semantically equivalent scenarios against direct `Promise + Map + AbortController` and a mature Query implementation such as TanStack Query where the semantics overlap.

## Alternatives considered

### Direct platform/application primitives

Use Promise, Map, AbortController, ordinary Vii State, and application-owned orchestration. This remains preferred if repeated Query-specific semantics do not justify a package.

### Mature Query library directly

Use TanStack Query or another established implementation. This remains valid when its semantics fit Vii consumers without compromising lifecycle/security requirements.

### Thin Vii adapter

Expose Vii lifecycle/diagnostics integration around a mature library instead of owning a complete Query runtime.

### Reduced Vii Query

Own only a smaller server-state coordination core and leave advanced behavior to applications or adapters.

### Full Vii-owned Query

Graduate `@vii-labs/query` only after the Phase 5 evidence demonstrates enough Vii-specific value to justify maintenance cost.

## Risks

- duplicating mature Query ecosystems without sufficient value;
- expanding Query into HTTP, router, persistence, or server-framework ownership;
- overly permissive QueryKey semantics producing unstable identity;
- hidden timer and retained-memory cost;
- cancellation races and stale completion corruption;
- optimistic rollback corruption under concurrent mutations;
- SSR cross-request leakage;
- hydration serialization becoming an accidental stable internal-object protocol;
- framework adapters drifting into independent Query semantics;
- TypeScript generic complexity exceeding the small-core value proposition.

## Migration and rollback

This RFC is research-only and introduces no runtime migration.

Before a public Query package exists, the architecture can be superseded, reduced, or withdrawn without application migration. Any future public API, package, or hydration compatibility promise requires the normal stability and migration governance.

If build-vs-buy evidence is unfavorable, the intended rollback is to stop the Vii-owned implementation and retain direct primitives or a thin mature-library adapter.

## Validation plan

Phase 5 follows the bounded sequence in `docs/roadmap/PHASE_5_QUERY.md`:

1. P5.0 architecture and RFC;
2. P5.1 QueryKey/QueryCache research;
3. P5.2 QueryClient/observer/deduplication;
4. P5.3 cancellation/freshness/GC;
5. P5.4 mutations/optimistic transactions;
6. P5.5 SSR Request Scope/hydration;
7. P5.6 Diagnostics/privacy;
8. P5.7 framework integration fixtures;
9. P5.8 performance and build-vs-buy gate.

No public package should be committed before the build-vs-buy decision unless an explicit accepted decision supersedes this gate.

## Unresolved questions

- exact QueryKey TypeScript surface and normalization API;
- whether `staleTime = 0` should become the actual default;
- actual GC default and timer implementation;
- whether structural sharing belongs in the minimal runtime;
- exact observer snapshot/convenience boolean surface;
- exact mutation transaction representation;
- hydration schema and compatibility versioning details;
- whether framework Query adapters belong in existing framework packages or separate packages;
- whether Vii-specific evidence supports owning a Query package at all.
