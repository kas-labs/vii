# Vii Task and Async

Status: Research direction

## Purpose

Vii Task is a candidate small async lifecycle primitive for work that can be started, observed, cancelled, superseded, retried by explicit policy, and disposed with a Scope.

The goal is not to replace Promise, AbortController, Query, RxJS, or workflow engines. The goal is to define the minimum reusable async semantics that otherwise risk being reimplemented independently by HTTP, Form async validation, Router loaders, Storage, workers, server functions, and AI integrations.

## Research scope

- explicit task states such as idle, pending, success, error, and cancelled;
- AbortSignal-compatible cancellation;
- Scope ownership and disposal;
- latest-wins / supersede semantics where explicitly selected;
- race and parallel composition only if real consumers require it;
- timeout as an explicit policy rather than hidden global behavior;
- retries disabled by default and opt-in when safe;
- typed input/output/error surfaces;
- deterministic cleanup;
- diagnostics for lifecycle events without capturing input/output values by default;
- framework-neutral behavior.

## Candidate shape

The API is not accepted. Research may evaluate a shape similar to:

```ts
const search = task(async (query, context) => {
  return api.search(query, { signal: context.signal });
});
```

A task may expose observable status/result metadata, but it must not force applications to use Vii State for all async values.

## Relationship to Query

```text
Task  = one async execution lifecycle
Query = cached server-state lifecycle
```

Query may use Task-like semantics internally or integrate with them later, but Task must not become a second cache.

## Relationship to HTTP and Router

HTTP requests and route loaders naturally need cancellation, but HTTP and Router must remain independently understandable. A Task abstraction is useful only if it reduces duplicated lifecycle logic without hiding side effects.

## Security and reliability requirements

Research must cover:

- cancellation correctness;
- retries on non-idempotent operations;
- timeout/resource leaks;
- unhandled rejection behavior;
- stale result races;
- disposal during completion callbacks;
- listener/resource retention;
- denial-of-service through unbounded concurrency;
- diagnostics redaction.

## Anti-goals

Vii Task should not:

- become a general reactive stream library;
- replace Query caching;
- implement a distributed job queue;
- create hidden retries;
- swallow exceptions silently;
- make all Promises Vii-specific;
- require HTTP, Query, Router, Form, Storage, or a UI framework.

## Evidence required before graduation

- at least two real consumers from different capability areas;
- cancellation and disposal stress tests;
- race/supersede correctness tests;
- memory-retention checks;
- comparison with direct Promise + AbortController implementation;
- bundle/runtime/type-check measurements;
- proof that the abstraction removes repeated logic instead of merely renaming Promise state.
