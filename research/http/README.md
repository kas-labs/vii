# Vii HTTP Client & Transport Research — H1-H3 Prototype

> **Status**: Active Research Prototype (Throwaway)
> **Current Slice**: H3 (Cancellation + Timeout + Scope)
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)
> **Package Authorization**: **None** (Research only, no public package)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Client Baseline)**, **H2 (Middleware Pipeline)**, and **H3 (Cancellation + Timeout + Scope)**.

The purpose of H3 is to research unified cancellation via standard `AbortSignal`, signal composition (`composeSignals`), deadline enforcement (`createTimeoutSignal`), Vii `Scope` lifecycle integration, memory leak prevention (automatic listener unregistration), and the core invariant `cancellation != failure`.

---

## 2. Implemented Capabilities (H1 + H2 + H3)

1. **`createHttpClient(config)`**: Factory for creating immutable, isolated HTTP client instances.
2. **Deterministic URL Resolution**:
   - Clean base URL joining (`baseURL` + relative paths).
   - Absolute URL bypass.
   - Comprehensive query parameter serialization (`Record`, `URLSearchParams`, multi-value arrays).
3. **Deterministic Header Merging**:
   - Case-insensitive key management via Web Standard `Headers`.
   - Explicit header deletion when overridden with `undefined` or `null`.
4. **Method Helpers**:
   - Convenience helpers for standard HTTP verbs: `get()`, `post()`, `put()`, `patch()`, `delete()`, `head()`, `options()`.
   - Direct `request()` execution.
5. **Functional Onion Middleware Pipeline (H2)**:
   - `composeMiddleware(transport, middleware, context)` provides Koa/Angular-style onion execution.
   - Supports request & response transformations and short-circuiting.
   - Non-wire `HttpRequestContext` propagation.
   - Single-invocation guard against duplicate `next()` calls.
6. **Cancellation, Timeout & Scope Lifecycle (H3)**:
   - Unified cancellation via native `AbortSignal`.
   - `composeSignals(signals)` merges multiple `AbortSignal` sources with zero memory leaks (automatic listener cleanup on completion).
   - Explicit `timeout` support at client and request level with structured `TimeoutError` reason.
   - Vii `Scope` lifecycle binding: disposing an active `Scope` immediately aborts inflight requests bound to that scope.
   - Error classification predicates: `isTimeoutError(err)` and `isAbortError(err)` cleanly distinguishing cancellation from network failure (`cancellation != failure`).
7. **Injected Fetch Capability & Immutable Inheritance (`extend`)**:
   - Direct injection of `fetch` implementation.
   - `.extend(childConfig)` inherits parent `baseURL`, default `headers`, `timeout`, and `middleware` without mutating parent state.

---

## 3. Explicit Non-Goals for H3

The following capabilities are deliberately excluded from H3 and assigned to future research slices:

- **Error Taxonomy & Standard Schema v1 Response Validation**: Deferred to **H4**.
- **Retry & Idempotency Engine**: Deferred to **H5** (Disabled by default).
- **Web Streams & SSE Abstractions**: Deferred to **H6**.
- **SSR Security & SSRF Defenses**: Deferred to **H7**.

---

## 4. Verification

Run the focused test suite:

```bash
pnpm exec vitest run research/http/*.test.ts
```
