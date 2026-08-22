# Vii HTTP Client & Transport Research — H1-H4 Prototype

> **Status**: Active Research Prototype (Throwaway)
> **Current Slice**: H4 (Error Taxonomy + Validation Boundary)
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)
> **Package Authorization**: **None** (Research only, no public package)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Baseline)**, **H2 (Middleware Pipeline)**, **H3 (Cancellation + Timeout + Scope)**, and **H4 (Error Taxonomy + Validation Boundary)**.

The purpose of H4 is to research a structured error taxonomy (`HttpStatusError`, `NetworkError`, `HttpParseError`, `HttpValidationError`, `TimeoutError`, `AbortError`), HTTP status code mapping, typed JSON decoding helpers, and the Standard Schema v1 (`@standard-schema/spec`) response payload validation boundary.

---

## 2. Implemented Capabilities (H1 + H2 + H3 + H4)

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
   - Base `HttpError` class.
   - `HttpStatusError`: Non-2xx response errors with status code, response object, and parsed error body data.
   - `NetworkError`: Transport connection / DNS / offline failures.
   - `HttpParseError`: Response body deserialization failures (e.g. malformed JSON syntax) with raw text preservation.
   - `HttpValidationError`: Thrown on Standard Schema v1 validation failure with detailed `issues` array and decoded `data`.
   - Standard Schema v1 response validation boundary (`validatePayload`) compatible with any Standard Schema v1 provider (Zod 4, Valibot, ArkType, Vii Prototype) with zero core schema dependencies.
   - Error predicates: `isHttpStatusError`, `isNetworkError`, `isHttpParseError`, `isHttpValidationError`, `isHttpError`.

---

## 3. Explicit Non-Goals for H4

The following capabilities are deliberately excluded from H4 and assigned to future research slices:

- **Retry & Idempotency Engine**: Deferred to **H5** (Disabled by default).
- **Web Streams & SSE Abstractions**: Deferred to **H6**.
- **SSR Security & SSRF Defenses**: Deferred to **H7**.

---

## 4. Verification

Run the focused test suite:

```bash
pnpm exec vitest run research/http/*.test.ts
```
