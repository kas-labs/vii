# ADR: Vii HTTP Client & Transport Architecture & Graduation Decision

> **Status**: Accepted (Backed by Empirical H8R & H9R Evidence)
> **Date**: 2026-08-23
> **Research Track**: Vii HTTP Client & Transport Research (H0–H9 + H8R/H9R Remediation)
> **Verdict**: **`Wrap + Reduce` (Zero-Dependency Micro-Transport Primitive)**
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../roadmap/HTTP_CLIENT_RESEARCH.md)
> **Supporting Evidence**:
> - [`docs/quality/HTTP_RUNTIME_COMPATIBILITY.md`](../quality/HTTP_RUNTIME_COMPATIBILITY.md)
> - [`docs/quality/HTTP_BUILD_VS_BUY_EVIDENCE.md`](../quality/HTTP_BUILD_VS_BUY_EVIDENCE.md)

---

## 1. Context & Problem Statement

Vii applications require robust HTTP transport for remote data fetching, mutation RPCs, streaming events (SSE / Web Streams), and server-side rendering (SSR).

Prior to this research track, the architectural questions were:
1. Should Vii build a standalone, full-featured HTTP client framework?
2. Should Vii mandate naked native `fetch()` without any helper primitives?
3. Should Vii depend on an existing ecosystem client (`ky`, `ofetch`, `axios`)?
4. How should HTTP transport interact with Vii `Scope` lifecycle, Vii Query caching, Standard Schema v1 validation, and SSR security?

To answer these questions empirically, research slices **H0 through H8** and remediation evidence gates **H8R (Runtime Compatibility Matrix)** and **H9R (Build-vs-Buy Benchmarks)** were executed across 12 test suites (102 unit tests, 100% passing) and real runtime harnesses.

---

## 2. Empirical Comparative Evidence Matrix

*Data sourced from reproducible benchmark harness `scripts/benchmarks/http-build-vs-buy.mjs` running on Apple M4 (macOS Darwin 25.5.0, Node.js v22.17.0, Bun v1.2.18).*

| Evaluation Criterion | Naked Native `fetch()` | Handwritten Helper | `axios@1.18.0` | `ky@1.7.5` | `ofetch@1.4.1` | Vii HTTP Prototype (`Wrap + Reduce`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Bundle Size (Minified)** | **0 B** | 423 B | 46.4 kB | 9.5 kB | 10.2 kB | **15.2 kB (Full)** / **~6.5 kB (Core)** |
| **Bundle Size (Gzip)** | **0 B** | 297 B | 18.1 kB | 3.6 kB | 4.0 kB | **5.1 kB (Full)** / **~2.2 kB (Core)** |
| **Runtime Dependencies** | **0** | 0 | 0 | 0 | 0–2 | **0** |
| **Client Creation Throughput** | N/A | 2,044,229 ops/s | 54,220 ops/s | 219,607 ops/s | 3,458,399 ops/s | **468,473 ops/s** |
| **Dispatch + JSON Decode** | 80,939 ops/s | 184,063 ops/s | 36,965 ops/s | 24,982 ops/s | 116,328 ops/s | **92,289 ops/s** |
| **Web Standards Native** | Yes | Yes | No (XHR/Adapter) | Yes | Yes | **Yes (`Request`/`Response`)** |
| **Vii Scope Lifecycle Binding** | Manual | None | None | None | None | **Built-in (`options.scope`)** |
| **Standard Schema v1 Decode** | Manual | None | None | None | None | **Built-in (`options.schema`)** |
| **Retry Invariant Safety** | N/A | None | 0 (No retries) | ⚠️ 2 retries (Default) | ⚠️ 1 retry (Default) | **0 (Strictly opt-in)** |
| **Method Idempotency Guard** | N/A | None | None | Partial | Partial | **Strict RFC 9110 (`POST`/`PATCH`)** |
| **SSRF Preflight Policy** | None | None | None | None | None | **Built-in (`SecurityPolicy`)** |
| **W3C Trace Context (`traceparent`)**| None | None | None | None | None | **Built-in (`TelemetryConfig`)** |
| **WHATWG SSE Streaming** | Manual | None | Node stream only | Partial | None | **Built-in (`streamEvents`)** |
| **SSR Request Isolation** | Yes | Yes | ⚠️ Global defaults | Yes | ⚠️ Global defaults | **Strictly Immutable / Scoped** |

---

## 3. Findings Across Research Slices (H0–H9R)

1. **H0 — Architecture & Semantic Boundaries**:
   - Clear separation: Vii Query owns server-state caching, deduplication, and garbage collection; HTTP owns wire transport, serialization, headers, and cancellation.
   - Core state (`@vii-labs/core`) remains 100% zero-dependency and transport-free.

2. **H1 — Fetch-First Client Baseline**:
   - Immutable client instances (`createHttpClient`) with isolated configs prevent cross-request SSR state leakage.
   - Deterministic URL joining and query serialization handle complex query params cleanly.
   - Header merging preserves case-insensitivity and supports explicit header removal.

3. **H2 — Middleware Request Pipeline**:
   - Functional onion middleware (`(request, next, context) => Promise<Response>`) provides extension points with strict single-invocation safety.

4. **H3 — Cancellation + Timeout + Scope**:
   - Unified cancellation via native `AbortSignal` with zero-leak listener cleanup.
   - Invariant: `cancellation != failure`.
   - Automatic request abortion on Vii `Scope` disposal (`options.scope`).

5. **H4 — Error Taxonomy & Standard Schema Boundary**:
   - Normalized error hierarchy: `HttpError`, `HttpStatusError`, `NetworkError`, `HttpParseError`, `HttpValidationError`.
   - Standard Schema v1 (`@standard-schema/spec`) response payload validation boundary verified with Zod 4, Valibot, ArkType, and Vii prototype.

6. **H5 — Retry & Idempotency Engine**:
   - Retries strictly disabled by default (`retry: undefined` / 0 retries) to prevent race conditions with Query retry managers.
   - Exponential backoff with AWS-style full jitter and `Retry-After` header parsing.
   - Non-idempotent methods (`POST`, `PATCH`) protected from automatic retries.
   - `AbortSignal` cancellation immediately interrupts sleep timers.

7. **H6 — Streaming & Server-Sent Events (SSE)**:
   - Native Web Streams (`ReadableStream<Uint8Array>`) async iteration with backpressure and automatic reader cancellation on early loop break.
   - Line framing across chunk boundaries and WHATWG HTML SSE parsing (`streamEvents`, `streamJsonEvents`).

8. **H7 — SSR Security & SSRF Defenses**:
   - Pre-flight validation against RFC 1918 private IPv4, loopback, cloud metadata (`169.254.169.254`, `fd00:ec2::254`), and IPv6 ULA.
   - Configurable host allowlists/blocklists.
   - *Scope Note*: Classified as an application-level URL preflight policy, not a socket-level DNS firewall.

9. **H8 — Observability, Tracing & Metrics**:
   - Auto-injection of W3C `traceparent` headers for distributed tracing compatible with OpenTelemetry ecosystems.
   - High-resolution timing metrics (`durationMs`).
   - Sensitive query parameter and header redaction in logging utilities.

10. **H8R — Runtime Compatibility Matrix**:
    - Verified 11 core capabilities under **Chromium (Chrome 133 via CDP)**, **Node.js (v22.17.0)**, and **Bun (v1.2.18)**.
    - Explicitly downgraded unverified targets (Firefox, WebKit, Deno, Cloudflare Workers) due to host environment tooling constraints.

11. **H9R — Reproducible Build-vs-Buy Evidence**:
    - Benchmark harness demonstrates that Vii HTTP provides higher throughput than `ky` and `axios` while offering native Vii Scope and Standard Schema integration.

---

## 4. Architectural Decision & Verdict

### Final Verdict: `Wrap + Reduce`

1. **Monolithic HTTP framework is REJECTED**:
   Vii will not build an all-encompassing client with legacy transport adapters, Node HTTP agent managers, or built-in caching layers.

2. **Third-party client dependency is REJECTED**:
   - `ky` and `ofetch` enable retries by default (2 and 1 respectively), creating subtle retry-multiplication races with Vii Query.
   - Neither provides native Vii `Scope` lifecycle binding or Standard Schema v1 validation out of the box.
   - `axios` brings heavy bundle weight (~18 kB gzip) and legacy non-standard request models.

3. **Lightweight micro-transport primitive `Wrap + Reduce` is ACCEPTED**:
   The verified prototype delivers a modular, zero-dependency, pure Web Standards transport tailored to Vii application architecture.

4. **Package Implementation Distinction**:
   - **Research Graduated**: The research evidence and architecture are approved and complete.
   - **Production Package Implementation**: Creating `@vii-labs/http` or public package exports is deferred to a future authorized package delivery task. `@vii-labs/core` remains 100% transport-agnostic and zero-dependency.
