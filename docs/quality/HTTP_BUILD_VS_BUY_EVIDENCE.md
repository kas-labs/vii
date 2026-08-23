# Vii HTTP Client Build-vs-Buy Comparative Evidence (H9R)

> **Status**: Verified Evidence  
> **Date**: 2026-08-23  
> **Slice**: H9R (Reproducible Build-vs-Buy Evidence)  
> **Harness**: `scripts/benchmarks/http-build-vs-buy.mjs`  
> **Environment**: macOS Darwin 25.5.0 (Apple M4), Node.js v22.17.0, Bun v1.2.18

---

## 1. Pinned Competitor Versions

All comparative evaluations utilize exact pinned dependency versions:

- **Native Fetch Baseline**: Built-in Web Standards `globalThis.fetch` (Node.js v22.17.0)
- **Handwritten Minimal Helper**: Local `createMinimalFetchClient` baseline (~35 lines of standard code)
- **Vii HTTP Research Prototype**: `research/http/` H1–H8 complete implementation
- **`ky`**: `1.7.5`
- **`ofetch`**: `1.4.1`
- **`axios`**: `1.18.0`

---

## 2. Bundle Size Measurements (Browser Target, Production Minification)

Measured via `bun build --minify --target=browser` with exact compression via `node:zlib`:

| Candidate | Raw Input Code | Minified ESM | Gzip (Level 9) | Brotli |
| :--- | :--- | :--- | :--- | :--- |
| **Native Fetch Baseline** | 0 B | **0 B** | **0 B** | **0 B** |
| **Handwritten Helper Baseline** | 761 B | **423 B** | **297 B** | **247 B** |
| **Vii HTTP Prototype (Full Suite)** | 107 B (re-export) | **15,208 B** (~15.2 kB) | **5,113 B** (~5.1 kB) | **4,539 B** (~4.5 kB) |
| **`ky@1.7.5`** | 152 B | **9,501 B** (~9.5 kB) | **3,643 B** (~3.6 kB) | **3,198 B** (~3.2 kB) |
| **`ofetch@1.4.1`** | 180 B | **10,175 B** (~10.2 kB) | **4,007 B** (~4.0 kB) | **3,630 B** (~3.6 kB) |
| **`axios@1.18.0`** | 170 B | **46,444 B** (~46.4 kB) | **18,120 B** (~18.1 kB) | **16,170 B** (~16.2 kB) |

> **Bundle Size Analysis**:
> The full Vii HTTP research prototype contains the complete feature surface across H1–H8 (WHATWG SSE event parser, line chunker, W3C traceparent generator/parser, URL query serializer, exponential backoff with full jitter, preflight SSRF IP parser, onion middleware runner, and structured error hierarchy). It weighs **5.1 kB gzip** (or ~2.2 kB if importing only the core client without streaming/observability).

---

## 3. Runtime Microbenchmarks (10,000 Iterations, Local Deterministic Transport)

### Scenario A: Client Creation Overhead (Instantiating configured client)

| Candidate | Min (ms) | Median (ms) | P95 (ms) | Mean (ms) | Max (ms) | Throughput (ops/sec) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Handwritten Helper** | 0.0000 | 0.0002 | 0.0005 | 0.0005 | 0.4744 | **2,044,229** |
| **`ofetch@1.4.1`** | 0.0000 | 0.0002 | 0.0005 | 0.0003 | 0.5135 | **3,458,399** |
| **Vii HTTP Prototype** | 0.0002 | 0.0012 | 0.0030 | 0.0021 | 1.0241 | **468,473** |
| **`ky@1.7.5`** | 0.0007 | 0.0015 | 0.0075 | 0.0046 | 2.9281 | **219,607** |
| **`axios@1.18.0`** | 0.0075 | 0.0093 | 0.0370 | 0.0184 | 3.2535 | **54,220** |

### Scenario B: Request Dispatch + JSON Decoding Overhead

| Candidate | Min (ms) | Median (ms) | P95 (ms) | Mean (ms) | Max (ms) | Throughput (ops/sec) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Native Fetch Baseline** | 0.0030 | 0.0046 | 0.0280 | 0.0124 | 2.3746 | **80,939** |
| **Handwritten Helper** | 0.0030 | 0.0035 | 0.0124 | 0.0054 | 0.3939 | **184,063** |
| **`ofetch@1.4.1`** | 0.0040 | 0.0046 | 0.0186 | 0.0086 | 1.3283 | **116,328** |
| **Vii HTTP Prototype** | 0.0050 | 0.0058 | 0.0257 | 0.0108 | 1.2636 | **92,289** |
| **`axios@1.18.0`** | 0.0080 | 0.0122 | 0.0740 | 0.0271 | 3.1114 | **36,965** |
| **`ky@1.7.5`** | 0.0138 | 0.0184 | 0.0942 | 0.0400 | 9.3170 | **24,982** |

### Scenario C: Error Handling & Wrapping Overhead (5,000 Iterations)

| Candidate | Min (ms) | Median (ms) | P95 (ms) | Mean (ms) | Max (ms) | Throughput (ops/sec) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`ofetch@1.4.1`** | 0.0143 | 0.0228 | 0.0952 | 0.0419 | 3.2550 | **23,863** |
| **`ky@1.7.5`** | 0.0129 | 0.0175 | 0.1640 | 0.0567 | 11.7915 | **17,636** |
| **Vii HTTP Prototype** | 0.0179 | 0.0371 | 0.1995 | 0.0899 | 36.7231 | **11,120** |

---

## 4. Verification of Competitor Retry Defaults & Method Idempotency

Empirical execution confirms the following exact default behaviors:

| Client | Default Retries (Empirical) | Official Stated Default | Method Idempotency Guard | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`ky@1.7.5`** | **2 retries** | 2 retries | `GET`, `PUT`, `HEAD`, `DELETE`, `OPTIONS`, `TRACE` | Automatically retries network errors & 408/413/429/500/502/503/504 |
| **`ofetch@1.4.1`** | **1 retry** | 1 retry | Retries 408, 409, 425, 429, 500, 502, 503, 504 | Enabled by default unless `retry: 0` |
| **`axios@1.18.0`** | **0 retries** | 0 retries | None | No built-in retry engine |
| **Vii HTTP Prototype** | **0 retries** | 0 retries | Strict RFC 9110 (`POST`/`PATCH` guarded) | Strictly opt-in (`retry: undefined`) to prevent race with Vii Query |

---

## 5. Security & Semantic Boundary Scoping

1. **SSRF Preflight Policy Scope**:
   - The H7 prototype provides preflight literal IP and hostname rule enforcement (`validateUrlSecurity`).
   - It blocks literal RFC 1918 IPv4, RFC 3927 cloud metadata (`169.254.169.254`), loopback (`127.0.0.1`, `::1`, `localhost`), and IPv6 ULA (`fc00::/7`).
   - *Limitation*: Because standard JavaScript runtimes do not expose socket-level DNS resolution hooks during `fetch()`, this mechanism cannot defend against DNS rebinding or domain names resolving to private IPs without a custom network proxy. It is classified as an application-level URL policy, not a full network firewall.

2. **Redirect Credential Handling**:
   - In engine-level `fetch(..., { redirect: "follow" })`, redirect hops are processed internally by the browser/runtime.
   - `stripSensitiveHeaders` operates at the preflight and manual redirect boundary (`redirect: "manual"`). Universal transparent multi-hop redirect stripping is not guaranteed under native engine redirects.

3. **W3C Trace Context Conformance**:
   - The H8 implementation emits standard W3C `traceparent` headers (`00-${traceId}-${spanId}-${flags}`).
   - Rejects all-zero trace IDs, all-zero span IDs, and non-hex inputs according to W3C Trace Context Level 1.
   - Termed accurately as **W3C Trace Context propagation compatible with OpenTelemetry**, rather than a full OpenTelemetry SDK.

---

## 6. Reproducibility Command

Run the build-vs-buy harness:

```bash
node scripts/benchmarks/http-build-vs-buy.mjs
```
