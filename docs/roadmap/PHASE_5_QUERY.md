# Phase 5: Vii Query Research and Delivery Plan

Status: Research / Planned

Primary architecture: `docs/architecture/QUERY_ARCHITECTURE.md`

Governance proposal: `rfcs/0024-query-architecture.md`

Cross-framework input: `docs/architecture/CROSS_FRAMEWORK_DEEP_RESEARCH.md`

## Goal

Design and validate a small framework-neutral server-state layer before committing to a supported Query package.

Query must remain separate from State, Flow, Router, and HTTP while reusing Vii lifecycle and Diagnostics principles where evidence supports it.

## P5.0 — Research brief and architecture RFC

Deliverables:

- Query semantic boundary;
- explicit QueryClient ownership;
- QueryKey canonicalization rules;
- cache state model;
- freshness and retention semantics;
- request deduplication and race protection;
- AbortSignal cancellation;
- invalidation;
- mutation and optimistic transaction semantics;
- SSR Request Scope isolation;
- hydration/dehydration contract;
- hydration conflict-resolution policy for existing client data;
- duplicate-fetch prevention after successful hydration;
- optional data reconciliation / structural-sharing research boundary;
- Router/Query ownership boundary for loaders and preloads;
- Diagnostics privacy boundary;
- anti-goals, stop rules, and graduation gates.

No public Query package implementation.

Exit criteria:

- State / Flow / Query / HTTP / Router boundaries are explicit;
- request ownership is explicit;
- cancellation is distinct from failure;
- key identity rules are deterministic enough to prototype;
- mutation concurrency risks are documented;
- SSR request isolation is a hard architecture requirement;
- hydration cannot overwrite newer accepted client data with older transferred data;
- Router cannot become a second shared remote-state cache;
- unresolved questions are visible rather than hidden in API syntax.

## P5.1 — QueryKey and QueryCache prototype

Research:

- strict representation-safe QueryKey subset;
- deterministic canonicalization;
- stable cache indexing;
- hash collision fallback;
- exact-key matching;
- key-family/prefix matching;
- malicious and pathological key handling.

Mandatory fixtures:

- same plain-object properties in different order;
- different array order;
- nested arrays and objects;
- unsupported values;
- cyclic structures;
- oversized keys;
- hash collision case;
- prototype-pollution inputs.

Exit criteria:

- semantically equal keys resolve to the same identity;
- distinct keys cannot silently alias;
- unsupported values fail deterministically;
- canonicalization cost is measured.

## P5.2 — QueryClient, observer, and deduplication prototype

Prototype privately:

- QueryClient;
- QueryCache;
- QueryRecord;
- framework-neutral observer/snapshot seam;
- one compatible in-flight execution per key within one QueryClient;
- execution generations;
- stale completion rejection.

Mandatory fixtures:

- one observer / one request;
- ten observers / one request;
- observer joining an active request;
- one observer disposing while others remain;
- late old request resolving after a newer request;
- separate QueryClients never deduplicating with each other;
- compatible route preload followed by accepted navigation does not duplicate Query execution;
- route disposal does not remove Query data still owned by a longer-lived QueryClient.

Exit criteria:

- no hidden global cache;
- deterministic request deduplication;
- late executions cannot overwrite current data;
- observer lifecycle does not leak;
- Router coordination does not create a parallel remote-state cache.

## P5.3 — Cancellation, freshness, and GC

Research and prototype:

- AbortSignal-native fetch cancellation;
- superseding requests;
- explicit cancellation;
- Scope disposal;
- fresh/stale calculation;
- invalidation;
- inactive retention;
- GC scheduling/cancellation.

Mandatory evidence:

- cancellation is not failure;
- background cancellation preserves valid data;
- invalidation does not delete data;
- active Queries are not garbage collected;
- inactive Queries can be collected;
- Scope disposal releases owned observers/resources;
- rapid key switching cannot admit stale completions;
- abandoned speculative preload ownership cannot keep Query observers or timers alive indefinitely.

Measure timer count, retained memory, post-GC behavior, repeated subscribe/unsubscribe cost, and speculative preload churn.

## P5.4 — Mutations and optimistic transactions

Prototype:

- mutation execution lifecycle;
- explicit cache writes;
- invalidation/reconciliation;
- optimistic update;
- rollback;
- concurrent optimistic ownership.

Mandatory race fixtures:

```text
A optimistic -> success
A optimistic -> failure -> rollback

A starts
B starts
B succeeds
A fails
```

The final case must not erase B's accepted update.

Exit criteria:

- rollback semantics are deterministic;
- concurrent mutation behavior is documented and tested;
- cancellation remains distinct from failure;
- no normalized entity database is introduced without separate evidence.

## P5.5 — SSR Request Scope and hydration

Prototype:

- one QueryClient per Request Scope;
- prefetch;
- dehydration;
- versioned hydration envelope;
- client hydration;
- deterministic merge with pre-existing client cache;
- request teardown.

Mandatory security and correctness fixtures:

- Request A data is never visible to Request B;
- malformed hydration;
- prototype-pollution input;
- oversized payload;
- invalid timestamp;
- invalid QueryKey;
- unsupported hydration version;
- older hydrated data cannot overwrite newer accepted client data;
- equal-timestamp conflict behavior is deterministic;
- original `dataUpdatedAt` survives hydration;
- successfully hydrated fresh data does not trigger an unnecessary duplicate initial client request.

Exit criteria:

- zero cross-request cache sharing;
- original `dataUpdatedAt` survives hydration;
- Request Scope disposal releases resources;
- invalid hydration fails deterministically;
- arbitrary JavaScript values are not silently serialized;
- hydration merge behavior is monotonic with respect to accepted freshness timestamps.

## P5.6 — Diagnostics and privacy

Research value-safe structural events for:

- cache hit/miss;
- fetch lifecycle;
- deduplication;
- cancellation;
- invalidation;
- observer lifecycle;
- GC;
- hydration/dehydration and hydration merge decisions;
- mutation lifecycle;
- optimistic rollback;
- optional reconciliation/structural-sharing decisions using bounded metadata only.

Default Diagnostics must exclude Query values, response/request bodies, mutation variables, credentials, cookies, Authorization headers, raw user content, hydration payloads, and raw Router URLs/search values.

Exit criteria:

- production-safe traces remain value-free;
- bounded diagnostics behavior is tested;
- diagnostics cannot alter Query semantics.

## P5.7 — Framework integration fixtures

Only after Query Core semantics are stable enough to compare adapters.

Research React, Angular, and Vue lifecycle integrations against one shared Query compliance suite.

Adapters must not implement their own cache, freshness rules, GC, deduplication, mutation engine, hydration merge policy, or structural-sharing semantics.

Exit criteria:

- one semantic contract is reused across researched adapters;
- request/server snapshots remain isolated where applicable;
- removing an adapter does not affect Query Core behavior.

## P5.8 — Performance and build-vs-buy gate

Compare semantically equivalent scenarios across:

1. direct Promise + Map + AbortController;
2. Vii Query prototype;
3. TanStack Query or another mature Query implementation where semantics overlap.

Measure:

- raw/gzip size;
- QueryKey canonicalization;
- cache operations;
- observer lifecycle;
- deduplication;
- invalidation;
- cancellation;
- GC and retained memory;
- hydration/dehydration, merge, and payload size;
- duplicate-fetch behavior after hydration;
- replace-all data acceptance versus structural sharing versus application-provided reconciliation;
- allocations and downstream notifications for mostly unchanged large payloads;
- TypeScript compiler/inference cost.

The benchmark must allow the conclusion that structural sharing is not worthwhile for some payload classes. Vii must not make deep reconciliation mandatory merely because another library does it by default.

Decision outcomes:

```text
A. graduate @vii-labs/query
B. continue research
C. reduce Vii-owned scope
D. ship a thin mature-library adapter
E. stop Vii Query implementation
```

No public package should be committed before this gate unless an explicit accepted decision supersedes it.

## Phase completion criteria

Phase 5 is complete only when:

- Query architecture is accepted or explicitly superseded;
- QueryKey semantics are deterministic;
- deduplication and stale-result races are proven;
- cancellation is AbortSignal-native;
- freshness and GC remain separate;
- optimistic mutation races are proven;
- SSR request isolation is proven;
- hydration security fixtures pass;
- older transferred cache state cannot overwrite newer accepted client state;
- fresh hydrated data avoids unnecessary duplicate initial work;
- optional reconciliation/structural sharing has measured CPU, allocation, memory, and notification evidence;
- Router/Query ownership is proven without duplicate shared cache semantics;
- Diagnostics remain value-safe;
- clean consumer validation passes if a package exists;
- build-vs-buy evidence justifies the final ownership decision.

## Dependency impact

A validated Query boundary unlocks clearer follow-up work for:

- HTTP transport research;
- Router loader and speculative-preload integration;
- SSR data hydration;
- native Vii application data loading;
- Query Devtools inspection.

HTTP must remain transport. Router must remain navigation and loader coordination. Flow must remain temporal orchestration. State Core must remain independent of Query.
