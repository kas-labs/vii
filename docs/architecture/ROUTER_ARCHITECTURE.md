# Vii Router Architecture

Status: Research direction

## Purpose

Vii Router is a candidate framework-neutral navigation and route-state layer for future Vii applications and adapters. The research goal is type-safe and runtime-safe navigation with low bundle and TypeScript compiler cost.

## Research scope

- explicit route definitions and route identity;
- typed path params and search params;
- optional Schema validation for external URL input;
- optional Codec support for URL representations;
- nested routes and layouts without forcing a file-system router;
- loaders and preloading with visible async/network semantics;
- explicit loader dependency projection so data identity is known before execution;
- speculative preload ownership, causes, cancellation, and retention budgets;
- navigation cancellation through AbortSignal-compatible boundaries;
- redirects and not-found behavior;
- route-level Scope ownership and cleanup;
- history adapters for browsers and test/memory environments;
- SSR/SSG/hydration compatibility research only after the native rendering layer requires it;
- framework adapters without duplicating router semantics;
- diagnostics for navigation lifecycle without collecting URLs or sensitive values by default;
- route-tree TypeScript compiler scaling as a first-class performance budget.

## Candidate principles

1. URL input is untrusted input.
2. Type inference must not pretend runtime validation occurred.
3. Search params are application state with serialization boundaries, not arbitrary string bags.
4. Navigation must remain cancellable and observable.
5. Router must not own server-state caching; that belongs to Query.
6. Router loaders may use HTTP/Query/Task but those dependencies must remain explicit.
7. A large route tree must not create unacceptable TypeScript compiler cost.
8. Loader dependencies should be explicit enough that preload and reload identity are deterministic.
9. Speculative preload work must have visible cause, ownership, cancellation, and collection rules.
10. Route-local loader data and shared remote state are different ownership categories.

## URL state pipeline

The preferred research model treats path and search values as external data before they become typed route state:

```text
URL
 |
 v
parse / decode
 |
 v
optional Schema validation
 |
 v
typed route state
 |
 v
loader dependency projection
 |
 v
navigation / loader / UI
```

Runtime validation remains separate from TypeScript inference. Search-param parsing must be bounded against malformed, deeply nested, duplicated, oversized, and prototype-polluting representations.

## Explicit loader dependencies

TanStack Router demonstrates a useful architecture invariant with explicit loader dependencies: a loader should not need arbitrary access to the entire route/search environment in order to determine its data identity.

Vii should research the semantic concept without copying API syntax.

Conceptually:

```text
validated params/search/context
        |
        v
project only loader-relevant dependencies
        |
        v
loader execution identity
        |
        v
loader execution
```

Research should prove that:

- changing an unused search value does not rerun a loader whose declared dependencies exclude it;
- changing a used dependency does rerun the loader;
- preloading and accepted navigation use the same deterministic dependency identity;
- dependency projection is side-effect free and representation safe;
- Diagnostics can explain which dependency category caused a rerun without capturing sensitive values.

The exact public API remains Research.

## Router and Query ownership boundary

Vii Router must not become a second general-purpose remote-state cache.

```text
Router owns
  route matching
  navigation lifecycle
  loader scheduling
  preload intent
  route-local transient ownership

Query owns
  shared remote-state identity
  freshness and invalidation
  request deduplication
  retained cache
  mutations
  garbage collection
```

A loader may return route-local data directly or coordinate Query `prefetch`/`ensure`-like operations if Query graduates. Router must not silently reimplement Query freshness, mutation, or retained-cache semantics.

Route disposal must not remove Query data still owned by a longer-lived QueryClient. Conversely, route-local resources must not remain alive merely because QueryClient exists.

## Speculative preloading

Preloading is speculative work rather than accepted navigation.

Candidate causes to research:

```text
intent
viewport
render
programmatic
```

A compatible accepted navigation may join or reuse an in-flight or completed preload when doing so is semantically safe. Abandoned speculation must remain cancellable and collectible.

Required fixtures:

- intent preload followed by navigation avoids duplicate compatible execution;
- a newer accepted navigation cannot be overwritten by a late speculative result;
- preload for one dependency identity never appears under another;
- abandoned preload releases route Scope resources;
- repeated pointer movement or viewport churn cannot create unbounded work or timers;
- preload freshness/retention policy remains distinct from shared Query freshness when Query is used.

## Candidate diagnostics

Navigation diagnostics should describe structure and causality rather than raw URL values.

Useful event categories may include:

- match started/completed;
- validation accepted/rejected;
- navigation started/superseded/completed/cancelled;
- loader scheduled/started/joined/completed/cancelled;
- preload scheduled/joined/abandoned/collected;
- route Scope created/disposed;
- dependency category changed;
- redirect/not-found classification.

Production-safe diagnostics should prefer route IDs, generated dependency fingerprints, durations, counts, and finite cause categories over raw paths, search strings, loader data, or user content.

## Conceptual example

The syntax is not accepted, but research may evaluate shapes such as:

```ts
const userRoute = route('/users/:id', {
  params: UserParamsSchema,
  search: UserSearchSchema,
});
```

Navigation should preserve inferred types while runtime URL parsing remains separately validated.

## Relationship to other capabilities

```text
URL
 |
Router
 |-- Schema: optional runtime validation
 |-- Codec: URL encode/decode
 |-- Task: loader cancellation/lifecycle
 |-- Query: shared remote-state loading/cache
 |-- Scope: route and speculative-work ownership/cleanup
 |-- Diagnostics: navigation and dependency causality
```

## Security requirements

Research must cover:

- open redirects;
- unsafe URL construction;
- encoded path traversal assumptions;
- malformed and oversized search strings;
- duplicate query keys;
- prototype-polluting object expansion;
- route loader authorization remaining server-side where required;
- route guards not being treated as authorization for remotely callable server functions;
- accidental sensitive URL diagnostics;
- SSR request isolation when supported.

## Performance and TypeScript budgets

Router research must measure both runtime and development-time cost.

At minimum compare representative route trees for:

- parse/match latency;
- navigation allocation;
- preload scheduling overhead;
- retained route resources after disposal;
- raw/gzip package cost;
- TypeScript cold and incremental type-check time;
- route-generated declaration/type size;
- type instantiation depth or other reproducible compiler pressure signals.

A sophisticated route type system is not acceptable if it makes large applications materially slower to type-check or edit without proportionate benefit.

## Anti-goals

Vii Router should not:

- require Vii Schema;
- become a network cache;
- hide HTTP requests behind navigation magic;
- make SSR mandatory;
- require file-based routing;
- own browser history implementation beyond adapters;
- copy another router API solely for familiarity;
- duplicate Query staleTime/gcTime/mutation semantics for shared remote data;
- make speculative preload unbounded or process-global;
- infer security authorization from client/navigation guards.

## Evidence required before graduation

- real multi-route consumer with params, search, nested routes, and cancellation;
- comparison with mature routers such as TanStack Router, React Router, Angular Router, and Vue Router for relevant semantics;
- explicit loader-dependency prototype and correctness fixtures;
- preload/join/cancel/collect fixtures;
- Router/Query ownership fixture proving no duplicate remote-state cache semantics;
- route-tree TypeScript compiler benchmarks;
- bundle and navigation runtime measurements;
- browser history and memory-router fixtures;
- security fixtures for malformed URLs and redirects;
- clear framework-adapter contract.

See `CROSS_FRAMEWORK_DEEP_RESEARCH.md` for the wider reference analysis and adopt/adapt/defer decisions.
