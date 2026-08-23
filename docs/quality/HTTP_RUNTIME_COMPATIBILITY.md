# Vii HTTP Client Runtime Compatibility Matrix (H8R)

> **Status**: Verified Evidence  
> **Date**: 2026-08-23  
> **Slice**: H8R (Runtime Compatibility Evidence)  
> **Harness**: `scripts/benchmarks/http-runtime-matrix.mjs` & `research/http/runtime-compatibility.test.ts`  
> **Execution Mode**: Real local runtime automation (Node.js, Bun, Chromium via CDP)

---

## 1. Runtime Compatibility Test Contract

The portable HTTP compatibility contract verifies 11 core transport capabilities without relying on environment-specific globals:

1. **Client factory & immutable extension**: `createHttpClient` and `.extend()` configuration inheritance without mutating parent.
2. **Request / Response & Headers**: Web Standards `Request`, `Response`, and case-insensitive `Headers` merging.
3. **URL & Query Serialization**: Nested, array, and boolean query parameter serialization.
4. **Fetch Transport & JSON Decoding**: Basic fetch invocation, typed response decoding, and 204 No Content handling.
5. **Cancellation & Timeout**: `AbortSignal` composition (`composeSignals`) and `createTimeoutSignal`.
6. **Middleware Pipeline**: Functional onion middleware ordering (`(request, next, context) => Promise<Response>`).
7. **Standard Schema v1 Boundary**: Decoding validation via `@standard-schema/spec` contract.
8. **Web Streams & WHATWG SSE Parser**: `ReadableStream` async iteration and Server-Sent Events framing.
9. **Retry Engine & Exponential Backoff**: Safe retry execution with jitter and method idempotency guards.
10. **SSR Security & SSRF Preflight**: Literal private IP and metadata host restrictions (`validateUrlSecurity`).
11. **W3C Trace Context**: Formatting and parsing of standard W3C `traceparent` headers (`00-${traceId}-${spanId}-${flags}`).

---

## 2. Executed Compatibility Matrix

| Capability | Chromium (Chrome 133 via CDP) | Firefox | WebKit | Node.js (v22.17.0) | Bun (v1.2.18) | Deno | Cloudflare Workers / Edge |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Create client & immutable .extend()** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **Request/Response & Header Merging** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **URL & Query Serialization** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **Fetch Transport & JSON Decode** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **AbortSignal Cancellation & Timeout** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **Onion Middleware Pipeline** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **Standard Schema v1 Boundary** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **Web Streams & WHATWG SSE Parser** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **Retry Engine & Backoff** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **SSRF Preflight Policy** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |
| **W3C Trace Context Propagation** | **PASS** | *Not verified*¹ | *Not verified*² | **PASS** | **PASS** | *Not verified*³ | *Not verified*⁴ |

---

## 3. Explicit Downgrades & Environmental Blockers

To uphold honest evidence governance, targets that could not be directly automated in the current environment are explicitly marked as **Not verified** rather than assumed to pass:

1. **Firefox (¹)**: Host environment lacks an installed Firefox binary or automated gecko driver.
2. **WebKit (²)**: Host environment lacks a configured headless WebKit / Playwright runner.
3. **Deno (³)**: Host environment lacks the Deno CLI executable.
4. **Cloudflare Workers / Edge (⁴)**: No local Miniflare or workerd test harness is configured in this repository.

---

## 4. Reproducibility

Run the matrix evaluation script:

```bash
node scripts/benchmarks/http-runtime-matrix.mjs
```
