# Cross-Framework Deep Research

Status: Research input

## Purpose

This document records architecture lessons from modern UI, routing, data, and application frameworks that may improve Vii without changing its current runtime model, dependency direction, or roadmap commitments.

The goal is not feature parity. The goal is to identify ideas that can make Vii smaller, faster, more memory-efficient, more predictable, and easier to explain while preserving explicit boundaries.

The governing rule is:

> Adopt invariants and evidence, not framework magic.

No item in this document creates a package, public API, implementation commitment, or compatibility promise.

## Evaluation criteria

Every external idea is evaluated against the same Vii constraints:

1. Does it reduce runtime work, allocation, retained memory, bundle size, or TypeScript compiler cost?
2. Does it make lifecycle, ownership, cancellation, or execution more explicit?
3. Can it remain framework-neutral and optional?
4. Can it reuse Vii Scope, Diagnostics, Schema, Query, Codec, Task, Router, or Component IR boundaries instead of creating a parallel semantic model?
5. Does it preserve browser/server/test/runtime portability?
6. Can its benefit be measured with reproducible fixtures?
7. Does it introduce hidden cache, server, serialization, routing, or rendering behavior?
8. Is the maintenance cost proportionate to validated value?

Decision labels used below:

- **Adopt**: the invariant is compatible with current Vii architecture and should become part of research requirements.
- **Adapt**: the idea is useful but needs a Vii-specific form and evidence.
- **Defer**: keep as a future research option without changing current sequencing.
- **Reject**: conflicts with Vii principles or creates unjustified complexity.

## Existing Vii baseline

The current architecture already establishes several important boundaries:

```text
State     = application-owned current value and dependency graph
Scope     = ownership and lifetime
Task      = one async execution lifecycle
Flow      = temporal values/events
Query     = retained remote state with freshness semantics
HTTP      = transport
Router    = navigation and route state
Schema    = runtime trust-boundary validation
Codec     = external representation
Diagnostics = causal observation without semantic authority
```

The future Application Framework coordinates these capabilities. It does not redefine them.

Rendering remains progressive and opt-in:

```text
CSR
  -> prerender / SSG
  -> SSR + hydration
  -> streaming / hybrid
  -> partial hydration / islands research
  -> resumability research only if evidence justifies it
```

## TanStack Query

### Useful lessons

TanStack Query validates several choices already present in Vii Query research:

- explicit QueryClient ownership;
- stale/fresh state independent from inactive retention and garbage collection;
- successful data may remain visible while background work runs;
- deterministic query identity;
- cancellation through AbortSignal-compatible fetch functions;
- hydration/dehydration as a separate transfer boundary;
- observer-driven cache lifecycle;
- build-vs-buy remains a valid outcome.

### Structural sharing

TanStack Query preserves unchanged references inside JSON-compatible result trees. This can reduce downstream rendering and derived-state work when a new response is mostly equal to the previous response.

Vii should research this as an optional reconciliation strategy, not a mandatory deep comparison.

Candidate invariant:

> Accepting new Query data may preserve references to semantically unchanged subtrees when the cost of reconciliation is lower than the propagation work it avoids.

Research must compare:

```text
replace-all data
vs
structural sharing
vs
application-provided reconciliation
```

Measure:

- CPU cost;
- allocations;
- retained memory;
- downstream notifications;
- large payload behavior;
- deeply nested payload behavior;
- non-JSON-compatible data behavior.

Decision: **Adapt**.

### Hydration conflict resolution

When a hydration payload targets a Query that already exists on the client, older transferred data must not overwrite newer accepted client data.

Candidate invariant:

```text
existing.dataUpdatedAt > hydrated.dataUpdatedAt
=> preserve existing accepted data
```

Equal-timestamp conflict behavior must be deterministic and documented.

Decision: **Adopt**.

### Duplicate-fetch prevention after hydration

A successfully transferred Query should not issue an unnecessary initial client request while it remains fresh according to its original server timestamp and client policy.

This must remain distinct from hiding background revalidation. The decision to revalidate still follows explicit freshness policy.

Decision: **Adopt** as a fixture.

### Defaults are not semantics

TanStack Query defaults such as staleTime, gcTime, retry behavior, and structural sharing are useful comparison points but should not be copied without Vii-specific evidence.

In particular, Vii's initial research baseline keeps automatic retries disabled until idempotency and ownership semantics are justified.

Decision: **Reject blind default copying**.

## TanStack Router

TanStack Router is a strong reference for treating routing as typed application state rather than only URL-to-component matching.

### URL input as typed external state

Path params and search params originate outside the trusted TypeScript graph.

Vii should preserve the existing rule:

> Type inference does not prove runtime validity.

The preferred model is:

```text
URL
 -> parse / decode
 -> optional Schema validation
 -> typed route state
 -> loader dependencies
 -> navigation / UI
```

Search state should be explicit, serializable, and independently selectable. It must not silently expand arbitrary objects from untrusted URL input.

Decision: **Adopt**.

### Explicit loader dependencies

TanStack Router's `loaderDeps` model demonstrates a valuable invariant: data-loading dependencies should be visible to the router before execution rather than discovered through arbitrary reads during the loader.

Vii should research an equivalent semantic concept without copying syntax.

Conceptual model:

```text
validated params/search/context
        |
        v
explicit loader dependency projection
        |
        v
loader execution identity
```

Benefits to validate:

- fewer accidental reloads;
- correct preloading identity;
- deterministic diagnostics;
- smaller cache-key material where route-local loader reuse exists;
- improved explanation of why a loader reran.

Decision: **Adopt concept, defer API**.

### Router cache versus Query cache

TanStack Router includes route-loader freshness and cache semantics. Vii should not duplicate this as a second general-purpose remote-state cache.

Vii boundary:

```text
Router owns
  route matching
  navigation lifecycle
  loader scheduling
  preloading intent
  route-local transient ownership

Query owns
  shared remote-state identity
  freshness
  invalidation
  request deduplication
  retained cache
  mutations
  garbage collection
```

A router loader may return route-local data directly or coordinate Query prefetch/ensure operations, but Router must not silently create a second Query subsystem.

Decision: **Adopt as architecture invariant**.

### Preloading as speculative work

TanStack Router supports preload flows distinct from accepted navigation. Vii should research speculative preloading as owned work with explicit cause and cancellation.

Candidate causes:

```text
intent
viewport
render
programmatic
```

A speculative execution should be reusable by a subsequent compatible navigation when safe, but abandoned speculation must be cancellable and collectible.

Required evidence:

- hover/preload followed by navigation joins compatible work;
- preload for route A does not leak into route B;
- stale speculative completion cannot overwrite accepted navigation state;
- abandoned preloads release Scope resources;
- speculative work has independent budgets and does not create unbounded memory retention.

Decision: **Adapt**.

### TypeScript route-tree cost

A router can become expensive at compile time even when its runtime is small. Vii Router research must therefore measure route-tree type instantiation, incremental type-check cost, editor responsiveness proxies where reproducible, and generated type size.

Decision: **Adopt as evidence requirement**.

## TanStack Start

TanStack Start provides a useful layering lesson: the router remains the application contract while server/render/build capabilities are layered around it.

This supports Vii's current dependency direction:

```text
Core / shared foundations
        |
modules: Query / Router / Schema / Task / Codec
        |
Application Framework
        |
server / rendering / build adapters
```

Decision: **Adopt as supporting reference**.

### Typed request context

Request-scoped context can carry authenticated principal information, locale, trace/correlation metadata, platform capabilities, and other per-request services.

Vii should research a typed request-context seam owned by Request Scope rather than a process-global bag.

Conceptual model:

```text
Request Scope
  |- QueryClient
  |- Request Context
  |    |- principal/capabilities
  |    |- locale
  |    |- trace identity
  |    `- request-local services
  |- loaders
  |- server functions
  `- Diagnostics correlation
```

Rules:

- no hidden process-global request state;
- context values have request lifetime unless explicitly transferred;
- secrets never cross hydration automatically;
- context should be capability-oriented rather than an unbounded `Record<string, unknown>`;
- diagnostics expose structure and identifiers, not sensitive values by default.

Decision: **Adapt**.

### Server-function security independence

A route guard or `beforeLoad`-style check is a navigation UX boundary, not sufficient authorization for a remotely callable server function.

Candidate invariant:

> Protect the data at the remote boundary that serves or mutates it.

Every server function that accesses private data requires independent authentication/authorization policy or an equivalent trusted middleware contract.

Decision: **Adopt**.

### Middleware layering

Request middleware and server-function middleware may have different responsibilities and authority. Vii should keep middleware categories typed and scoped rather than exposing one unstructured global chain.

Decision: **Adapt**.

## Nuxt 4

Nuxt remains a useful application-framework and rendering reference, not a runtime dependency.

### SSR data transfer without duplicate initial work

Nuxt's async-data model transfers resolved server data into a client payload so the same initial request need not repeat during hydration.

Vii Query should validate equivalent behavior through its explicit hydration envelope and preserved timestamps.

Decision: **Adopt as Query fixture**.

### Abortable async data and explicit dedupe policy

Nuxt's async-data execution exposes AbortSignal and distinguishes cancellation-oriented versus defer/join behavior for repeated execution.

Vii already separates cancellation from failure and deduplicates compatible same-key work. Research should retain explicit execution-policy semantics rather than deriving them from framework lifecycle magic.

Decision: **Supporting reference**.

### Shallow-by-default data observation

Nuxt's current async-data direction uses shallow observation by default for lower overhead. This is relevant to Vii's goal of avoiding unnecessary deep tracking of server payloads.

Vii should benchmark whether Query data should be treated as an immutable/current snapshot by default with downstream fine-grained derivation opt-in, rather than recursively instrumenting every returned object.

Decision: **Adapt as performance research**.

### Hybrid route rules

Nuxt reinforces Vii's existing explicit rendering policy model where routes may select client, static, server, or other rendering modes independently.

Decision: **Already adopted**.

### Hidden auto-imports

Vii should not adopt implicit import behavior as a runtime or language requirement. Tooling may offer IDE/generator convenience while source dependencies remain inspectable.

Decision: **Reject as semantic dependency**.

## Qwik and Qwik City

Qwik is the most architecturally different reference in this set. Its strongest lessons are useful even if Vii never adopts resumability.

### Resumability

Qwik serializes enough framework/application state and event metadata to continue execution in the browser without replaying the usual hydration bootstrap.

This can reduce startup JavaScript and avoid re-executing component construction, but it imposes deep constraints on compiler output, serializability, closure capture, event dispatch, state representation, chunking, and developer mental model.

Vii must not adopt resumability as a current rendering requirement.

Decision: **Defer**.

Graduation into serious Vii research requires evidence that basic SSR/hydration is already correct and that measured startup gains justify changes to Component IR, serialization, build output, event semantics, and authoring constraints.

### Serializability as an architecture constraint

Qwik demonstrates an important general principle:

> Heap identity is not a portable server-to-client contract.

Anything that crosses server/client continuation boundaries must have an explicit representation.

This reinforces Vii Codec, Query hydration, server-function, and rendering work.

Decision: **Adopt principle**.

### Behavior-level code splitting

Qwik can split code around lazy execution boundaries so an event handler need not require eager download/execution of the full component implementation.

Vii should research whether future Component IR can expose enough execution metadata for build tooling to split by behavior rather than only by source module.

Conceptual IR direction:

```text
Component IR
  |- render dependencies
  |- event behaviors
  |- effects/tasks
  |- async boundaries
  `- environment requirements
         |
         v
execution-aware chunk graph
```

This remains a build/compiler optimization. It must not leak into Core semantics.

Decision: **Adapt later**.

### Loader versus action separation

Qwik City distinguishes route data loading from explicitly invoked side-effecting actions.

Vii should preserve the same semantic separation:

```text
loader = read-oriented navigation data work
action/mutation = explicit side-effecting remote work
```

A loader should be deterministic enough for re-execution and preloading. Mutations must never occur merely because speculative navigation loaded a route.

Decision: **Adopt**.

### Global event delegation

Qwik's small global loader and delegated event model are interesting performance references, but Vii should not select an event architecture before the native renderer and Component IR have measured prototypes.

Decision: **Defer**.

## Cross-framework synthesis

The strongest combined direction is not to merge framework APIs. It is to combine compatible invariants:

```text
Solid / modern fine-grained systems
  -> minimal dependency-driven propagation

Svelte / compiler-oriented systems
  -> compile-time knowledge where it removes runtime work

TanStack Query
  -> explicit remote-state lifecycle and ownership

TanStack Router
  -> typed URL state and explicit loader dependency graph

TanStack Start
  -> router-first application layering and typed request context

Nuxt
  -> explicit hybrid rendering and SSR data-transfer discipline

Qwik
  -> serializability discipline and execution-aware lazy-loading research
```

The Vii-specific opportunity is to connect those lessons through one Scope and Diagnostics model without requiring each subsystem to invent separate ownership, cancellation, and explanation semantics.

## Performance and memory hypotheses

The following hypotheses are worth measuring because they could make Vii materially lighter than feature-rich alternatives:

1. **No deep proxying of Query payloads by default.** Treat accepted remote data as snapshots and observe Query state, not every nested property.
2. **Structural sharing only when profitable.** Avoid mandatory deep reconciliation for very large payloads.
3. **One ownership graph.** Reuse Scope for route, request, query observer, resource, and component lifetimes instead of parallel disposal systems.
4. **One cancellation primitive.** Prefer AbortSignal-compatible propagation across Query, Router loaders, Task, HTTP, and Request Scope.
5. **No duplicate remote-state cache.** Router coordinates data work; Query retains shared remote state.
6. **Speculation is bounded.** Preload work has explicit ownership, freshness, retention, and disposal budgets.
7. **Compiler work must buy runtime savings.** Component/compiler transforms require bundle/runtime evidence, not aesthetic preference.
8. **Tree-shakable capability boundaries.** CSR users must not pay for SSR, server functions, Qwik-style resumability experiments, or framework adapters they do not use.
9. **Small public types.** Advanced type inference must not make type-checking a hidden performance tax.
10. **Diagnostics remain structurally cheap.** Causal explanation must be bounded, value-safe, and removable/minimal in production builds.

## New mandatory research fixtures

### Query

- older hydration cannot overwrite newer client data;
- equal-timestamp hydration conflict is deterministic;
- fresh hydrated data does not trigger a duplicate initial request;
- structural-sharing comparison on small, large, deeply nested, and mostly unchanged payloads;
- replace-all may outperform structural sharing for selected payload classes and must remain available;
- Query payloads are not recursively instrumented unless explicitly requested by another layer.

### Router

- validated search params feed explicit loader dependency projection;
- changing an unused search param does not rerun a loader whose dependencies exclude it;
- changing a used dependency does rerun the loader;
- preload followed by compatible navigation reuses or joins work without duplicate execution;
- abandoned preload is cancelled/collected;
- route disposal does not destroy Query data owned by a longer-lived QueryClient;
- route tree type-check benchmarks scale across representative route counts.

### Application/server

- request context never leaks between concurrent requests;
- route authorization cannot substitute for server-function authorization;
- client modules cannot import server-only request capabilities;
- request-scope disposal releases loaders, Query observers, resources, and diagnostics correlation state;
- server-transferred values require approved serialization contracts.

### Rendering/compiler

- hydration remains the baseline before partial hydration or resumability claims;
- behavior-level splitting is compared against module-level splitting with real bundle and interaction traces;
- lazy execution does not retain closures or state beyond ownership lifetime;
- serialization size and parse cost are included in any resumability comparison;
- no advanced rendering mode ships to CSR-only applications.

## Explicit rejects and deferrals

### Reject unless superseded by accepted evidence

- hidden process-global Query or request state;
- Router becoming a second general-purpose Query cache;
- implicit data fetching triggered by render syntax without visible ownership;
- automatic server-function authorization inferred from route guards;
- hidden auto-imports as a semantic requirement;
- mandatory SSR or server runtime for ordinary Vii applications;
- React Server Components protocol compatibility as a Vii requirement;
- arbitrary JavaScript heap serialization;
- automatic retry as a default mutation behavior;
- copying framework defaults without benchmark evidence.

### Defer

- resumability;
- global delegated event runtime decisions;
- islands/partial hydration beyond basic hydration evidence;
- behavior-level chunking before Component IR exists;
- edge-runtime support before dedicated fixtures;
- sophisticated router-owned SWR caching when Query can own shared remote state.

## Recommended documentation impact

This research should strengthen existing documents rather than create new implementation phases:

- `QUERY_ARCHITECTURE.md`: structural sharing research, hydration conflict resolution, duplicate-fetch prevention, Router/Query ownership fixtures;
- `ROUTER_ARCHITECTURE.md`: explicit loader dependencies, speculative preload lifecycle, type-check budgets, Router/Query cache boundary;
- `APPLICATION_FRAMEWORK.md`: TanStack Router/Start and Qwik lessons, typed Request Context, independent server-function authorization;
- `RENDERING_STRATEGY.md`: partial hydration/islands/resumability sequencing and cost gates;
- `ECOSYSTEM_CAPABILITY_STRATEGY.md`: expanded primary reference set and adopt/adapt/defer/reject methodology;
- Phase 5 and future Router/Application research roadmaps: evidence requirements only, without new public package commitments.

## Research conclusion

The current Vii architecture does not need to be replaced by these external designs.

The strongest improvement path is narrower:

1. keep explicit ownership and framework-neutral boundaries;
2. add typed data-dependency graphs to Router research;
3. make Query hydration merge semantics and optional reconciliation measurable;
4. unify cancellation and lifecycle through Scope + AbortSignal-compatible contracts;
5. keep remote-state caching in one subsystem;
6. treat serialization as a first-class boundary across server/client work;
7. investigate execution-aware compilation only after native Component IR exists;
8. require measurable bundle, runtime, allocation, memory, and TypeScript-cost wins before adopting advanced framework techniques.

This preserves Vii's main advantage: a small observable core whose higher-level capabilities can become sophisticated without making the common case opaque or heavy.
