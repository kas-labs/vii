# Vii HTTP Client & Transport Research — H1-H6 Prototype

> **Status**: Active Research Prototype (Throwaway)
> **Current Slice**: H6 (Streaming + SSE + Web Streams)
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)
> **Package Authorization**: **None** (Research only, no public package)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Baseline)**, **H2 (Middleware Pipeline)**, **H3 (Cancellation + Timeout + Scope)**, **H4 (Error Taxonomy + Validation Boundary)**, **H5 (Retry + Idempotency Engine)**, and **H6 (Streaming + SSE + Web Streams)**.

The purpose of H6 is to research native Web Streams (`ReadableStream`), async iteration (`for await (const chunk of response.stream())`), Server-Sent Events (SSE) line/event framing parser, backpressure, reader cancellation on early loop exit, and typed JSON event streams.

---

## 2. Implemented Capabilities (H1 + H2 + H3 + H4 + H5 + H6)

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
9. **Streaming & Server-Sent Events (SSE) Engine (H6)**:
   - `iterateStream`: Async iteration over raw `Uint8Array` stream chunks with backpressure and automatic reader cancellation on early break.
   - `iterateLines`: Chunk-boundary line parsing for newline (`\n`) and CRLF (`\r\n`) formatted streams.
   - `parseEventStream`: WHATWG Server-Sent Events (SSE) framing parser supporting custom `event`, `id`, `retry`, multiline `data`, and comment line filtering.
   - `parseJsonEventStream`: Typed JSON event deserialization with `HttpParseError` on invalid payloads.
   - Client helpers: `client.stream()`, `client.streamLines()`, `client.streamEvents()`, `client.streamJsonEvents()`.

---

## 3. Explicit Non-Goals for H6

The following capabilities are deliberately excluded from H6 and assigned to future research slices:

- **SSR Security & SSRF Defenses**: Deferred to **H7**.
- **Observability & Diagnostics**: Deferred to **H8**.
- **Graduation & Build-vs-Buy**: Deferred to **H9**.

---

## 4. Verification

Run the focused test suite:

```bash
pnpm exec vitest run research/http/*.test.ts
```
