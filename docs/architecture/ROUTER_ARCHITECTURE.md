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
- navigation cancellation through AbortSignal-compatible boundaries;
- redirects and not-found behavior;
- route-level Scope ownership and cleanup;
- history adapters for browsers and test/memory environments;
- SSR/SSG/hydration compatibility research only after the native rendering layer requires it;
- framework adapters without duplicating router semantics;
- diagnostics for navigation lifecycle without collecting URLs or sensitive values by default.

## Candidate principles

1. URL input is untrusted input.
2. Type inference must not pretend runtime validation occurred.
3. Search params are application state with serialization boundaries, not arbitrary string bags.
4. Navigation must remain cancellable and observable.
5. Router must not own server-state caching; that belongs to Query.
6. Router loaders may use HTTP/Query/Task but those dependencies must remain explicit.
7. A large route tree must not create unacceptable TypeScript compiler cost.

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
 |-- Query: server-state loading/cache
 |-- Scope: route ownership/cleanup
 |-- Diagnostics: navigation events
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
- accidental sensitive URL diagnostics;
- SSR request isolation when supported.

## Anti-goals

Vii Router should not:

- require Vii Schema;
- become a network cache;
- hide HTTP requests behind navigation magic;
- make SSR mandatory;
- require file-based routing;
- own browser history implementation beyond adapters;
- copy another router API solely for familiarity.

## Evidence required before graduation

- real multi-route consumer with params, search, nested routes, and cancellation;
- comparison with mature routers such as TanStack Router, React Router, Angular Router, and Vue Router for relevant semantics;
- route-tree TypeScript compiler benchmarks;
- bundle and navigation runtime measurements;
- browser history and memory-router fixtures;
- security fixtures for malformed URLs and redirects;
- clear framework-adapter contract.
