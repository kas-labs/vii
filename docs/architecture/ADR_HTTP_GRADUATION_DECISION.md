# ADR: Vii HTTP Client & Transport Architecture & Graduation Decision

> **Status**: Accepted  
> **Date**: 2026-08-23  
> **Research Track**: Vii HTTP Client & Transport Research (H0–H9)  
> **Verdict**: **`Wrap + Reduce` (Zero-Dependency Micro-Transport Primitive)**  
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../roadmap/HTTP_CLIENT_RESEARCH.md)

---

## 1. Context & Problem Statement

Vii applications require robust HTTP transport for remote data fetching, mutation RPCs, streaming events (SSE / Web Streams), and server-side rendering (SSR).

Prior to this research track, the architectural questions were:
1. Should Vii build a standalone, full-featured HTTP client package?
2. Should Vii mandate naked native `fetch()` without any helper primitives?
3. Should Vii depend on an existing ecosystem client (`ky`, `ofetch`, `axios`)?
4. How should HTTP transport interact with Vii `Scope` lifecycle, Vii Query caching, Standard Schema v1 validation, and SSR security?

To answer these questions empirically, research slices **H0 through H8** were implemented and verified in `research/http/` across 11 test suites (91 unit tests, 100% passing).

---

## 2. Evaluation & Comparative Matrix

| Evaluation Criterion | Naked Native `fetch()` | `axios` (v1.x) | `ky` (v1.x) | `ofetch` (v1.x) | Vii HTTP (`Wrap + Reduce`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bundle Size (min + gzip)** | **0 kB** (built-in) | ~11.5 kB | ~3.8 kB | ~4.2 kB | **~2.2 kB** |
| **Runtime Dependencies** | **0** | 0 | 0 | 0–2 | **0** |
| **Web Standards Foundation** | Yes | No (XHR/Node) | Yes | Yes | **Yes (`Request`/`Response`)** |
| **Vii Scope Lifecycle Binding** | Manual boilerplate | None | None | None | **Native (`options.scope`)** |
| **Standard Schema v1 Decode** | Manual boilerplate | None | None | None | **Native (`options.schema`)** |
| **Retry Invariant Safety** | N/A (No retries) | None | ⚠️ Enabled by default | ⚠️ Enabled by default | **Strictly disabled by default** |
| **Method Idempotency Guard** | N/A | None | Partial | Partial | **Strict (RFC 9110)** |
| **SSRF & Private IP Filter** | None | None | None | None | **Native (`SecurityPolicy`)** |
| **W3C Trace Context Propagation**| None | None | None | None | **Native (`TelemetryConfig`)** |
| **WHATWG SSE Streaming** | Manual boilerplate | Node stream only | Partial | None | **Native (`streamEvents`)** |
| **SSR Request-Scoped Isolation**| Yes | ⚠️ Global defaults | Yes | ⚠️ Global defaults | **Strictly Immutable / Scoped** |

---

## 3. Findings Across Research Slices (H0–H8)

1. **H0 — Architecture & Semantic Boundaries**:
   - Clear separation: Vii Query owns server-state caching, deduplication, and garbage collection; HTTP owns wire transport, serialization, headers, and cancellation.
   - Core state (`@vii-labs/core`) remains 100% zero-dependency and transport-free.

2. **H1 — Fetch-First Client Baseline**:
   - Immutable client instances (`createHttpClient`) with isolated configs prevent cross-request SSR state leakage.
   - Deterministic URL joining and query serialization handle complex query params cleanly.
   - Header merging preserves case-insensitivity and supports explicit header removal.

3. **H2 — Middleware Request Pipeline**:
   - Functional onion middleware (`(request, next, context) => Promise<Response>`) provides powerful extension points with strict single-invocation safety.

4. **H3 — Cancellation + Timeout + Scope**:
   - Unified cancellation via native `AbortSignal` with zero-leak listener cleanup.
   - Invariant: `cancellation != failure`.
   - Automatic request abortion on Vii `Scope` disposal (`options.scope`).

5. **H4 — Error Taxonomy & Standard Schema Boundary**:
   - Normalized error hierarchy: `HttpError`, `HttpStatusError`, `NetworkError`, `HttpParseError`, `HttpValidationError`.
   - Standard Schema v1 (`@standard-schema/spec`) response payload validation boundary with zero core schema dependencies.

6. **H5 — Retry & Idempotency Engine**:
   - Retries strictly disabled by default (`retry: undefined` / 0 retries) to prevent race conditions with Query retry managers.
   - Exponential backoff with AWS-style full jitter and `Retry-After` header parsing.
   - Non-idempotent methods (`POST`, `PATCH`) are protected from automatic retries.
   - `AbortSignal` cancellation immediately interrupts sleep timers.

7. **H6 — Streaming & Server-Sent Events (SSE)**:
   - Native Web Streams (`ReadableStream<Uint8Array>`) async iteration with backpressure and automatic reader cancellation on early loop break.
   - Line framing across chunk boundaries and WHATWG HTML SSE parsing (`streamEvents`, `streamJsonEvents`).

8. **H7 — SSR Security & SSRF Defenses**:
   - Pre-flight validation against RFC 1918 private IPv4, loopback, cloud metadata (`169.254.169.254`, `fd00:ec2::254`), and IPv6 ULA.
   - Configurable host allowlists/blocklists.
   - Sensitive header stripping on cross-origin redirects.

9. **H8 — Observability, Tracing & Metrics**:
   - Auto-injection of W3C `traceparent` headers for distributed tracing.
   - High-resolution timing metrics (`durationMs`).
   - Sensitive query parameter and header redaction in logging utilities.

---

## 4. Architectural Decision & Verdict

### Final Verdict: `Wrap + Reduce`

1. **Do NOT build a heavy HTTP monolith**:
   Vii will not build an all-encompassing client with legacy transport adapters, Node HTTP agent managers, or built-in caching layers.

2. **Do NOT adopt a third-party client as a mandatory dependency**:
   `ky`, `ofetch`, and `axios` either introduce default retry behaviors that conflict with Vii Query, lack native Vii `Scope` cancellation binding, or lack Standard Schema v1 integration.

3. **Adopt a lightweight, zero-dependency micro-transport primitive**:
   The verified H1–H8 prototype in `research/http/` satisfies all Vii transport requirements in ~2.2 kB minified code with 0 dependencies.

4. **Package Placement & Distribution Strategy**:
   - `@vii-labs/core` remains 100% transport-agnostic and zero-dependency.
   - In a future phase, the verified HTTP capabilities will be published either as a dedicated `@vii-labs/http` package or integrated as transport adapters for Vii Query and source distribution templates.

---

## 5. Consequences & Invariants

- **Zero Core Bloat**: Core bundle size and execution are completely unaffected.
- **Strict SSR Safety**: No global mutable state or shared client singletons in SSR runtimes.
- **Ecosystem Interoperability**: Compatible with standard Web Fetch, Node 18+, Bun, Deno, and Cloudflare Workers.
- **Clear Separation of Concerns**: Query owns caching; HTTP owns wire transport.
