# Vii HTTP Client & Transport Research — H1-H8 Prototype

> **Status**: Completed Research Track (Verdict: `Wrap + Reduce`)
> **Final Slice**: H9 (Graduation Gate + Build-vs-Buy Decision)
> **Graduation ADR**: [`docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`](../../docs/architecture/ADR_HTTP_GRADUATION_DECISION.md)
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)
> **Package Authorization**: None (Future package placement managed via ADR)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Baseline)**, **H2 (Middleware Pipeline)**, **H3 (Cancellation + Timeout + Scope)**, **H4 (Error Taxonomy + Validation Boundary)**, **H5 (Retry + Idempotency Engine)**, **H6 (Streaming + SSE + Web Streams)**, **H7 (SSR Security + Private Network Defenses)**, and **H8 (Observability + Tracing + Metrics)**.

The purpose of H8 is to research request/response lifecycle hooks (`onRequest`, `onResponse`, `onError`), OpenTelemetry / W3C Trace Context propagation (`traceparent`), structured request timing (`durationMs`), and sensitive query/header parameter redaction in structured logs.

---

## 2. Implemented Capabilities (H1 + H2 + H3 + H4 + H5 + H6 + H7 + H8)

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
   - Base `HttpError` class with `HttpStatusError`, `NetworkError`, `HttpParseError`, `HttpValidationError`, and `HttpSecurityError`.
   - Standard Schema v1 response validation boundary (`validatePayload`) compatible with any Standard Schema v1 provider (Zod 4, Valibot, ArkType, Vii Prototype) with zero core schema dependencies.
   - Error predicates: `isHttpStatusError`, `isNetworkError`, `isHttpParseError`, `isHttpValidationError`, `isHttpSecurityError`, `isHttpError`.
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
10. **SSR Security & SSRF Defenses (H7)**:
    - **Private IP / SSRF Filtering**: Accurate detection and restriction of RFC 1918, RFC 3927 (Link-Local / AWS & GCP metadata `169.254.169.254`), Loopback (`127.0.0.0/8`, `::1`, `localhost`), IPv6 Unique-Local (`fc00::/7`), Link-Local (`fe80::/10`), Multicast (`ff00::/8`, `224.0.0.0/4`), Reserved (`240.0.0.0/4`, `255.255.255.255`), NAT64 (`64:ff9b::/96`), IPv4-mapped (`::ffff:0:0/96`), and IPv4-compatible (`::/96`) ranges.
    - **Fail-Closed Default**: Supplying any `SecurityPolicy` object defaults `allowPrivateNetworks` to `false` (fail-closed SSRF protection) unless explicitly set to `true`. If no security policy object is configured, no security checks run.
    - **Protocol Allowlist**: Enforces `allowedProtocols` (defaulting to `["http:", "https:"]`). Disallowed schemes (e.g. `file:`, `data:`, `gopher:`, `ws:`) are rejected pre-flight with `HttpSecurityError`.
    - **Client-Side Redirect Security**: When a `security` policy is configured, the client takes over redirect traversal (`redirect: "manual"`), validating `validateUrlSecurity` on every hop, capping redirect hops (default 20, policy-configurable via `maxRedirects`), and enforcing WHATWG method/body transitions.
    - **Cross-Origin Sensitive Header Sanitization**: `stripSensitiveHeaders` automatically removes `Authorization`, `Cookie`, `Proxy-Authorization`, `X-Api-Key`, `X-Auth-Token`, etc. when traversing cross-origin redirect hops.
    - **DNS Limitation Notice**: URL security checks are performed on the URL string/hostname before transport socket resolution. They do not perform DNS lookups or prevent DNS rebinding attacks at the transport/socket level.
    - **Pre-flight Enforcement**: Disallowed requests fail immediately with `HttpSecurityError` prior to socket or network initialization.
11. **Observability, Tracing & Metrics (H8)**:
    - **W3C Trace Context / OpenTelemetry**: Auto-generation and propagation of `traceparent` (`00-${traceId}-${spanId}-${flags}`).
    - **Lifecycle Telemetry Hooks**: Non-blocking `onRequest`, `onResponse`, and `onError` lifecycle events.
    - **Structured Timing**: Accurate execution duration metrics (`durationMs`).
    - **Sensitive Data Redaction**: Utilities `redactUrl` and `redactHeaders` preventing credential leakage in structured log output.

---

## 3. Explicit Non-Goals for H8

The following capabilities are deliberately excluded from H8 and assigned to the final graduation slice:

- **Graduation & Build-vs-Buy**: Deferred to **H9**.

---

## 4. Verification

Run the focused test suite:

```bash
pnpm exec vitest run research/http/*.test.ts
```
