# Vii HTTP Client & Transport Research — H1-H2 Prototype

> **Status**: Active Research Prototype (Throwaway)
> **Current Slice**: H2 (Middleware / Request Pipeline)
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)
> **Package Authorization**: **None** (Research only, no public package)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Client Baseline)** and **H2 (Middleware / Request Pipeline)**.

The purpose of H2 is to research functional onion-style middleware composition (`(request, next, context) => Promise<Response>`), context metadata propagation, request/response transformations, and short-circuiting.

---

## 2. Implemented Capabilities (H1 + H2)

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
   - Supports request & response transformations.
   - Supports short-circuiting (e.g. mock responses / cache) without invoking transport.
   - Non-wire `HttpRequestContext` propagation.
   - Built-in guard against multiple `next()` invocations.
   - Deterministic error propagation and upstream error recovery.
6. **Injected Fetch Capability**:
   - Direct injection of `fetch` implementation at client creation or per-request override.
   - Enables frictionless unit testing with mocks and serverless runtime service bindings without global pollution.
7. **Immutable Client Inheritance (`extend`)**:
   - `.extend(childConfig)` returns a new client inheriting parent `baseURL`, default `headers`, and `middleware` without mutating the parent instance.

---

## 3. Explicit Non-Goals for H2

The following capabilities are deliberately excluded from H2 and assigned to future research slices:

- **Cancellation & Timeout Composition**: Deferred to **H3**.
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
