# Vii HTTP Client & Transport Research — H1-H5 Prototype

> **Status**: Active Research Prototype (Throwaway)
> **Current Slice**: H5 (Retry + Idempotency Engine)
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)
> **Package Authorization**: **None** (Research only, no public package)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Baseline)**, **H2 (Middleware Pipeline)**, **H3 (Cancellation + Timeout + Scope)**, **H4 (Error Taxonomy + Validation Boundary)**, and **H5 (Retry + Idempotency Engine)**.

The purpose of H5 is to research explicit opt-in retry policies (strictly disabled by default), exponential backoff with full jitter, standard `Retry-After` header parsing (both delta-seconds and HTTP-date), HTTP method idempotency enforcement (`GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`), and immediate abort interruption during backoff delays.

---

## 2. Implemented Capabilities (H1 + H2 + H3 + H4 + H5)

1. **`createHttpClient(config)`**: Factory for creating immutable, isolated HTTP client instances.
2. **Deterministic URL Resolution**:
   - Clean base URL joining (`baseURL` + relative paths).
   - Absolute URL bypass.
   - Comprehensive query parameter serialization (`Record`, `URLSearchParams`, multi-value arrays).
3. **Deterministic Header Merging**:
   - Case-insensitive key management via Web Standard `Headers`.
   - Explicit header deletion when overridden with `undefined` or `null`.
4. **Method Helpers & Typed JSON Decoding**:
   - Standard HTTP verb helpers: `get()`, `post()`, `put()`, `patch()`, `delete()`, `head()`, `options()`.
   - Typed JSON decoding helpers: `requestJson<T>()`, `getJson<T>()`, `postJson<T>()`, `putJson<T>()`, `patchJson<T>()`, `deleteJson<T>()`.
   - Automatic `204 No Content` handling returning `undefined`.
5. **Functional Onion Middleware Pipeline (H2)**:
   - `composeMiddleware(transport, middleware, context)` provides Koa/Angular-style onion execution.
   - Supports request & response transformations, short-circuiting, and non-wire `HttpRequestContext` propagation.
   - Guard against multiple `next()` invocations.
6. **Cancellation, Timeout & Scope Lifecycle (H3)**:
   - Unified cancellation via native `AbortSignal` and zero-leak signal composition (`composeSignals`).
   - Explicit `timeout` with structured `TimeoutError`.
   - Vii `Scope` lifecycle binding with automatic inflight request abortion upon scope disposal.
   - Invariant: `cancellation != failure`.
7. **Structured Error Taxonomy & Standard Schema Validation (H4)**:
   - Base `HttpError` class with `HttpStatusError`, `NetworkError`, `HttpParseError`, and `HttpValidationError`.
   - Standard Schema v1 response validation boundary (`validatePayload`) compatible with any Standard Schema v1 provider (Zod 4, Valibot, ArkType, Vii Prototype) with zero core schema dependencies.
   - Error predicates: `isHttpStatusError`, `isNetworkError`, `isHttpParseError`, `isHttpValidationError`, `isHttpError`.
8. **Retry & Idempotency Engine (H5)**:
   - **Disabled by default**: Retries are strictly opt-in via `config.retry` or `options.retry`.
   - **Exponential Backoff with Full Jitter**: `Math.random() * Math.min(backoffMaxMs, backoffBaseMs * 2^(attempt - 1))`.
   - **`Retry-After` Header Parsing**: Parses both delta-seconds (`Retry-After: 120`) and HTTP-date (`Retry-After: Wed, 21 Oct 2026 07:28:00 GMT`).
   - **Method Idempotency Guard**: Non-idempotent methods (`POST`, `PATCH`) are protected from automatic retry unless explicitly configured.
   - **Abort-Aware Backoff**: AbortSignal triggers immediately terminate retry sleep delays without waiting for timer expiration.

---

## 3. Explicit Non-Goals for H5

The following capabilities are deliberately excluded from H5 and assigned to future research slices:

- **Web Streams & SSE Abstractions**: Deferred to **H6**.
- **SSR Security & SSRF Defenses**: Deferred to **H7**.

---

## 4. Verification

Run the focused test suite:

```bash
pnpm exec vitest run research/http/*.test.ts
```
