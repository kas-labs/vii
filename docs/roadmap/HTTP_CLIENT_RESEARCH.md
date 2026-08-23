# Vii HTTP Client & Transport Research Roadmap

> **Status**: Completed Research Track (Verdict: `Wrap + Reduce`)
> **Final Slice**: H9 (Graduation Gate + Build-vs-Buy Decision)
> **Graduation ADR**: [`docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`](../architecture/ADR_HTTP_GRADUATION_DECISION.md)
> **Governing Strategy**: Evidence-driven Build-vs-Buy  
> **Prerequisites**: Phase 1 (Core State), Phase 2 (Adapters/CLI), Phase 5 (Query), Schema Research (`Wrap + Reduce`)

---

## 1. Research Thesis & Operating Policy

Vii HTTP is a research track investigating whether a small, typed, Fetch-first transport module should exist in the Vii ecosystem, or whether direct native `fetch()`, small composable utility functions, or an existing mature Fetch client (e.g. `ky`, `ofetch`) fully satisfy Vii application requirements.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Vii Application / UI                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
┌──────────────────────────┐       ┌──────────────────────────┐
│        Vii Query         │       │    Direct Operations     │
│ Server State & Lifecycle │       │  (Mutations, RPC, Auth)  │
│ (Cache, Dedupe, GC, SSR) │       │                          │
└────────────┬─────────────┘       └─────────────┬────────────┘
             │                                   │
             └─────────────────┬─────────────────┘
                               │ (calls transport)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Vii HTTP (Transport Layer)                  │
│  (Configured client, Request composition, URL/Headers,      │
│   Functional middleware, Timeout, AbortSignal composition,  │
│   Normalized errors, Standard Schema decoding boundary)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Standard Fetch Platform Primitive              │
│       (Browser Fetch, Node 18+ undici/Fetch, Workers)       │
└─────────────────────────────────────────────────────────────┘
```

### Core Architectural Invariants

1. **Query Owns Remote-State Coordination; HTTP Owns Transport**:
   - Query owns cache storage, cache keys, freshness (`staleTime`), garbage collection (`gcTime`), background revalidation, query deduplication, optimistic mutation rollbacks, and server state synchronization.
   - HTTP owns request composition, base URL resolution, query parameter encoding, header merging, functional middleware pipelines, timeout enforcement, `AbortSignal` composition, transport error normalization, and response body decoding.
   - **Hard Rule**: HTTP must **never** implement an internal response cache, store server state, manage form submission state, or act as an offline background synchronization engine.

2. **Core Decoupling**:
   - `@vii-labs/core` remains zero-dependency and knows nothing about HTTP or Fetch.
   - HTTP may optionally integrate with Vii Scope (`Scope.use()`) for automated resource disposal and request cancellation, but Core does not import HTTP.

3. **Fetch-First Platform Alignment**:
   - Web Platform standards (`Request`, `Response`, `Headers`, `URL`, `FormData`, `URLSearchParams`, `Blob`, `ReadableStream`, `AbortSignal`, `AbortController`) are the foundational primitives.
   - Vii will **not** reinvent parallel request/response data structures or legacy Node `http`/`https` stream adapters without verifiable evidence of platform necessity.

4. **Schema / Standard Schema Decoupling**:
   - Per the Schema research outcome (`Wrap + Reduce`), HTTP is runtime schema-provider agnostic.
   - HTTP response validation accepts any **Standard Schema v1** (`@standard-schema/spec`) compatible validator (Zod 4, Valibot, ArkType, TypeBox, etc.) at the untrusted network boundary without depending on a dedicated Vii Schema package.

5. **Build-vs-Buy Primacy**:
   - Valid whole-track research outcomes remain: **`Own`**, **`Reuse`**, **`Wrap`**, **`Reduce`**, or **`Stop`**.
   - Direct native `fetch()` with zero wrapper is an entirely acceptable and valid conclusion if empirical evidence shows a dedicated package does not justify its maintenance and bundle overhead.

6. **Research Gating**:
   - Completion of H0 establishes semantic boundaries and architecture only.
   - **H0 completion does NOT authorize H1 or any production implementation.**
   - No public `@vii-labs/http` package, public exports, or release changes are authorized prior to the final H9 evaluation gate.

---

## 2. Research Slices Sequence (H0 – H9)

| Slice | Title | Scope & Objectives |
| --- | --- | --- |
| **H0** | **Architecture + Semantic Boundaries** | Establish transport contracts, Fetch-first baseline, client ownership, error taxonomy, cancellation/timeout ownership, middleware model, Query/Schema boundaries, SSR isolation, security baseline, and build-vs-buy criteria. *(This slice)* |
| **H1** | **Fetch-first Client Baseline** | Prototype the smallest explicit client (`createHttpClient`), injected Fetch capability, deterministic URL/header composition, request/response lifecycle, and raw `Response` access. |
| **H2** | **Middleware / Request Pipeline** | Research functional middleware (`(request, next) => Promise<Response>`), deterministic onion-style execution order, short-circuiting, context propagation, and failure isolation. |
| **H3** | **Cancellation + Timeout + Scope** | Research unified cancellation via native `AbortSignal`, signal composition (`AbortSignal.any`), `AbortSignal.timeout`, Vii `Scope` lifecycle binding, and resource cleanup. |
| **H4** | **Errors + Body Decode + Standard Schema Boundary** | Prototype normalized error classification (`HttpError`, `NetworkError`, `TimeoutError`, `AbortError`, `DecodeError`), explicit body decoders (JSON, text, blob, buffer, stream), Standard Schema v1 validation, and privacy-safe diagnostics. |
| **H5** | **Retry + Idempotency Research** | Research retry-safety contracts (disabled by default), HTTP method idempotency, `Retry-After` headers, exponential backoff with jitter, non-replayable body constraints, and Query ownership separation. |
| **H6** | **Streaming / Upload / Backpressure** | Research native Web Streams (`ReadableStream`, `WritableStream`), SSE (Server-Sent Events) and NDJSON progressive decoding, upload streaming, backpressure preservation, and cancellation cleanup. |
| **H7** | **SSR Isolation + Security Hardening** | Research request-scoped client factories in SSR runtimes, SSRF mitigations (scheme allowlists, private IP filtering), cross-origin credential/cookie stripping on redirects, and sensitive header redaction. |
| **H8** | **Runtime Compatibility Matrix** | Validate transport execution across modern browsers (Chromium, Firefox, WebKit), Node 18+, Bun, Deno, and Edge/Worker runtimes using identical test contracts. |
| **H9** | **Performance + Build-vs-Buy Gate** | Execute comprehensive benchmark matrix (throughput, allocation, bundle footprint, cold start) comparing Native Fetch, handwritten helpers, Vii prototype, `ky`, `ofetch`, and `axios`; render formal graduation verdict (`Own`, `Reuse`, `Wrap`, `Reduce`, `Stop`). |

---

## 3. Core Architecture & Semantic Boundaries

### 3.1 Fetch-First Baseline vs. Vii Value Proposition

Direct native `fetch()` is modern, widely supported, and built into all target runtimes. However, naked `fetch()` has known ergonomic and operational friction points in real applications:

1. **No Client Configuration / Defaults**: Every `fetch()` call must manually prepend base URLs, set default headers (e.g. `Accept: application/json`), and configure common options.
2. **Boilerplate Error Handling**: Native `fetch()` does not reject on HTTP 4xx or 5xx status codes; callers must remember to check `response.ok` manually on every call.
3. **Double-Step JSON Consumption**: Callers must `await fetch(...)` and then `await response.json()`, with boilerplate `try/catch` for JSON parse syntax errors.
4. **Unnormalized Errors**: Network drops, DNS failures, aborts, and timeouts surface as generic or engine-specific `TypeError` / `DOMException` instances.
5. **Awkward Timeout Semantics**: Prior to widespread `AbortSignal.timeout()`, timeouts required manual `setTimeout` and `AbortController` boilerplate.
6. **No Composable Pipeline**: Adding cross-cutting auth refresh, tracing headers, or logging requires ad-hoc wrapper functions.

#### The Vii Transport Boundary
Vii HTTP evaluates a minimal, typed wrapper that solves these friction points **without** introducing a heavy runtime. Vii candidate value is strictly bounded to:
- Immutable client instances with deterministic per-request overrides.
- Explicit functional middleware.
- Composed `AbortSignal` cancellation and timeout handling.
- Deterministic error taxonomy where `cancellation != failure`.
- Optional, pluggable Standard Schema v1 response decoding.
- Observational, privacy-safe diagnostics.
- Complete SSR request isolation.

---

### 3.2 Client Ownership & Lifecycle Model

```text
┌─────────────────────────────────────────────────────────────┐
│              createHttpClient(clientConfig)                 │
│  - baseURL: string | URL                                    │
│  - headers: HeadersInit                                     │
│  - timeout: number                                          │
│  - fetch: typeof globalThis.fetch (injected)                │
│  - middleware: readonly HttpMiddleware[]                    │
│  - diagnostics?: DiagnosticsCollector                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (returns immutable instance)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     HttpClient Instance                     │
│  - get(url, options)                                        │
│  - post(url, options)                                       │
│  - put(url, options)                                        │
│  - patch(url, options)                                      │
│  - delete(url, options)                                     │
│  - request(descriptor)                                      │
│  - extend(childConfig) -> new HttpClient                    │
└─────────────────────────────────────────────────────────────┘
```

#### Ownership Rules
- **No Global Mutable Singleton**: Vii HTTP never exposes or mutates a shared global client instance.
- **Immutable Configuration**: `createHttpClient(config)` produces an immutable client instance. Modifying options is achieved via `.extend(childConfig)` which returns a new client inheriting parent defaults.
- **Request-Level Precedence**: Per-request options strictly override client defaults:
  $$\text{effectiveHeaders} = \text{merge}(\text{clientDefaults.headers}, \text{requestOptions.headers})$$
  $$\text{effectiveTimeout} = \text{requestOptions.timeout} \;\text{??}\; \text{clientDefaults.timeout}$$
- **SSR Request Isolation**: In server-side rendering (SSR), each incoming server request creates or receives its own request-scoped `HttpClient` instance. Request headers (e.g. auth tokens, cookies, trace IDs) are bound to the request scope and cannot leak across concurrent server requests.

---

### 3.3 Transport Contract & Adapter Boundary

The transport interface is kept as small as possible:

```ts
export type HttpTransport = (
  request: Request,
  context?: HttpRequestContext,
) => Promise<Response>;
```

#### Transport Design Principles
- **Direct Fetch Compatibility**: The default transport is `(req) => (config.fetch ?? globalThis.fetch)(req)`.
- **Injected Fetch**: Custom Fetch implementations (e.g. testing mocks, Cloudflare Workers service bindings, undici instances) are injected via `fetch` in client configuration.
- **No Platform-Specific Adapters**: Because Node 18+, Bun, Deno, and modern browsers all support standard `fetch`, Vii does **not** maintain separate Node `http`/`https` or XMLHttpRequest adapters.

---

### 3.4 Request & Response Model

Vii operates primarily on standard Web Platform primitives:

```text
Request Descriptor (URL + options) 
        ↓
Normalized Web Request (new Request(url, init))
        ↓
Middleware Pipeline
        ↓
Transport Execution (fetch)
        ↓
Native Web Response
        ↓
Response Decoder / Standard Schema Validation (optional)
        ↓
Typed Result / Unwrapped Payload
```

#### Request Input Options
- `url`: string, `URL`, or relative path combined with `baseURL`.
- `method`: HTTP verb (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).
- `headers`: `HeadersInit` (`Headers`, `Record<string, string>`, or `[string, string][]`).
- `query` / `params`: `Record<string, string | number | boolean | readonly (string | number | boolean)[]> | URLSearchParams`.
- `body`: Supported raw bodies (`string`, `Blob`, `ArrayBuffer`, `FormData`, `URLSearchParams`, `ReadableStream`) or `json` helper for JSON serialization.
- `signal`: Native `AbortSignal` for caller cancellation.
- `timeout`: Timeout duration in milliseconds.
- `context`: Local `HttpRequestContext` metadata (trace IDs, internal routing flags) that is **not** transmitted over the wire.

#### Response Handling
- **Raw Response Preservation**: Callers can always access the raw native `Response` (status, headers, statusText) via `http.request()` or specialized return helpers.
- **Status Code Semantics**:
  - By default, HTTP status codes $200 \le \text{status} < 300$ resolve successfully.
  - Non-2xx status codes ($4xx$, $5xx$) reject with a structured `HttpStatusError` containing the status code, status text, and response headers.
  - A request option `throwHttpErrors: false` allows callers to opt into resolving non-2xx responses as normal `Response` objects without throwing.

---

### 3.5 Error Taxonomy

Transport failure modes are cleanly partitioned into distinct, structured error classes:

```text
┌─────────────────────────────────────────────────────────────┐
│                          HttpError                          │
│                      (Base Error Class)                     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     ┌─────────┴─────────┐          ┌─────────┴─────────┐
     ▼                   ▼          ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  HttpStatus  │ │   Network    │ │   Timeout    │ │    Abort     │
│    Error     │ │    Error     │ │    Error     │ │    Error     │
│  (4xx, 5xx)  │ │ (DNS, Conn)  │ │ (Deadline)   │ │ (User/Scope) │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
               │                              │
     ┌─────────┴─────────┐          ┌─────────┴─────────┐
     ▼                   ▼          ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ DecodeError  │ │ SchemaError  │ │ Middleware   │ │ Configuration│
│ (Malformed   │ │ (Standard    │ │    Error     │ │    Error     │
│    Body)     │ │   Schema)    │ │ (Exception)  │ │ (Invalid URL)│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### Error Invariants
1. **Cancellation is NOT an Operational Failure**: `AbortError` represents intentional termination (user navigation, scope disposal, superseded query). It must be cleanly distinguishable from network faults so UI layers do not show error toasts for cancelled operations.
2. **Safe Error Metadata**: Errors include HTTP status, method, and sanitized URL (origin + pathname). Error messages **never** include sensitive authorization headers, cookies, or raw secret query parameters.
3. **Cause Preservation**: Where available, the underlying runtime exception (e.g. native `TypeError: fetch failed`) is preserved in `error.cause`.

---

### 3.6 Cancellation & Scope Lifecycle Semantics

Cancellation uses standard `AbortSignal` exclusively.

```text
┌─────────────────────────────────────────────────────────────┐
│                      Cancellation Sources                   │
│                                                             │
│  1. Caller Signal (e.g. React hook unmount signal)          │
│  2. Vii Scope Signal (e.g. Scope.dispose() triggers signal) │
│  3. Timeout Signal (AbortSignal.timeout(ms))                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│       Composed Internal Signal (AbortSignal.any([...]))     │
└──────────────────────────────┬──────────────────────────────┘
                               │ (passed to fetch & middleware)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Network Dispatch & Stream Read              │
└─────────────────────────────────────────────────────────────┘
```

#### Cancellation Rules
- **No Custom Cancellation Token**: `AbortSignal` is the only cancellation primitive.
- **Signal Composition**: Multiple signals (caller `signal`, scope lifecycle `signal`, `timeout`) are merged using `AbortSignal.any()` (or a lightweight polyfill for older environments).
- **Stream Cleanup**: Aborting a request immediately cancels the active `ReadableStream` reader and aborts the underlying socket connection without leaking memory or connections.
- **Query Deduplication Safety**: When Vii Query shares/deduplicates a single inflight HTTP request across multiple observers, Query manages the shared `AbortController`. The disposal of one observer detaches that observer but does **not** abort the shared HTTP request if other active observers still await the result.

---

### 3.7 Timeout Semantics

- **Explicit Timeout**: Timeout is configured via `timeout` (in milliseconds) at client or request level.
- **Boundaries of Timeout**:
  - The timeout timer starts immediately upon dispatch into the transport pipeline.
  - Timeout covers the entire request-response header lifecycle.
  - When automatic body decoding (e.g. JSON decode) is configured, the timeout encompasses the body read stream.
- **Timeout Error vs. Cancellation**:
  - When a timeout fires, it aborts the internal controller with a `TimeoutError` reason.
  - The resulting rejection is classified specifically as `TimeoutError`, distinguishing it from user-initiated `AbortError`.

---

### 3.8 Functional Middleware Pipeline

Vii HTTP adopts a functional onion middleware model (inspired by Koa / Angular interceptors / modern Fetch pipelines):

```ts
export type HttpHandler = (request: Request) => Promise<Response>;

export type HttpMiddleware = (
  request: Request,
  next: HttpHandler,
  context: HttpRequestContext,
) => Promise<Response>;
```

```text
Incoming Request
      │
      ▼
┌─────────────┐
│ Middleware1 │ ──(pre-dispatch: e.g. add Auth header)──┐
└─────────────┘                                         │
      │                                                 │
      ▼                                                 │
┌─────────────┐                                         │
│ Middleware2 │ ──(pre-dispatch: e.g. start timer)──┐   │
└─────────────┘                                     │   │
      │                                             │   │
      ▼                                             │   │
┌─────────────┐                                     │   │
│  Transport  │ (native fetch dispatch)             │   │
└─────────────┘                                     │   │
      │                                             │   │
      ▼                                             │   │
┌─────────────┐                                     │   │
│ Middleware2 │ ──(post-dispatch: record duration)──┘   │
└─────────────┘                                         │
      │                                                 │
      ▼                                                 │
┌─────────────┐                                         │
│ Middleware1 │ ──(post-dispatch: handle 401 refresh)───┘
└─────────────┘
      │
      ▼
Final Response
```

#### Middleware Invariants
1. **Deterministic Order**: Middleware executes strictly in the array order registered during client creation.
2. **Short-Circuiting**: Middleware may return a `Response` directly without calling `next()` (e.g. returning cached fixtures during testing).
3. **Immutability of Shared Configuration**: Middleware cannot mutate client defaults. Any modifications produce a new `Request` instance for downstream handlers.
4. **Context Propagation**: `HttpRequestContext` is passed along the chain to carry non-wire metadata (e.g. tracing IDs, retry counts, timing markers).
5. **No Secret Leaks**: Middleware that injects authorization tokens must ensure tokens are not appended to URLs or exposed to untrusted third-party hosts on redirects.

---

### 3.9 Retry & Idempotency Boundary (Retries OFF by Default)

**Rule: Retries are strictly DISABLED by default in Vii HTTP.**

#### Why Retries are Disabled by Default:
1. **Non-Idempotent Operations**: `POST` and `PATCH` requests may mutate server state; blind retries on network drop can cause duplicate charges, double orders, or corrupted data.
2. **One-Shot Stream Bodies**: Streaming request bodies (`ReadableStream`) cannot be replayed without buffering the entire stream in memory, violating zero-buffering stream design.
3. **Query Ownership**: In application architectures, Vii Query owns query retry policies. Having automatic retries in both HTTP and Query results in exponential retry amplification ($N \times M$ requests).
4. **Rate Limiting (HTTP 429)**: Retries must respect `Retry-After` headers and apply randomized exponential backoff (jitter) rather than aggressive immediate re-dispatch.

#### Idempotency Classification
When optional retry middleware is explicitly configured by the application, it must respect:
- **Safe Methods**: `GET`, `HEAD`, `OPTIONS` are idempotent and safe to retry on network disconnect before response headers arrive.
- **Idempotent Write Methods**: `PUT`, `DELETE` are semantically idempotent, but should only be retried if configured.
- **Unsafe Methods**: `POST`, `PATCH` are never retried unless an explicit `Idempotency-Key` header is present and the application explicitly authorizes retry.
- **Response Phase**: If response headers have been partially received, the request has reached the server and cannot be assumed safe to retry without application domain knowledge.

---

### 3.10 Vii Query vs. Vii HTTP Boundary

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                                Vii Query                                 │
│  - Cache key indexing (FNV-1a 32-bit hash bucket)                        │
│  - In-memory response cache & freshness evaluation (staleTime)           │
│  - Inactive cache garbage collection (gcTime)                            │
│  - Concurrent request deduplication across multiple UI observers         │
│  - Server-side prefetching & versioned SSR dehydration (vii.query v1)    │
│  - Safe client hydration & prototype pollution defense                   │
│  - Optimistic mutation transactions & race-safe generation rollback      │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ (calls fetch function)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                 Vii HTTP                                 │
│  - Base URL resolution & URL query parameter encoding                    │
│  - Header defaults & per-request header merge                            │
│  - Request body serialization (JSON, FormData, URLSearchParams)          │
│  - Functional middleware pipeline (auth, tracing)                        │
│  - Timeout & AbortSignal composition                                     │
│  - Transport error normalization (HttpStatusError, NetworkError, etc.)   │
│  - Response decoding & Standard Schema v1 validation                     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ (calls standard fetch)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Native Fetch (Web API)                           │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Query is Transport-Agnostic**: Vii Query accepts any async fetcher function `({ signal }) => Promise<T>`. It does not require Vii HTTP.
- **Zero Cache Duplication**: Vii HTTP provides transport services only; it never caches response payloads.

---

### 3.11 Schema & Standard Schema Boundary

Following the Schema Research verdict (**`Wrap + Reduce`**), Vii HTTP integrates with external schema libraries via **Standard Schema v1** (`@standard-schema/spec`):

```text
Raw Response Bytes / Stream
            ↓
    Body Decoding (e.g. response.json())
            ↓
      unknown Value
            ↓
┌─────────────────────────────────────────────────────────────┐
│           Standard Schema v1 Validation Boundary            │
│         (Zod 4, Valibot, ArkType, TypeBox, etc.)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
    (validation success)                  (validation failure)
            ▼                                     ▼
  Typed Application Data                     SchemaError
  (InferOutput<Schema>)                (Structured SchemaIssues)
```

#### Schema Invariants
1. **Generic TypeScript is Not Validation**: Calling `http.get<User>('/user')` is a compile-time type assertion; it provides zero runtime security. Documentation must explicitly warn that generic parameters do not validate untrusted network data.
2. **Standard Schema Compatibility**: When a `schema` option is provided, Vii HTTP validates the decoded body using `schema['~standard'].validate(decoded)`.
3. **No Mandatory Schema Dependency**: Vii HTTP does not bundle or depend on any specific schema validator.

---

### 3.12 Body Decoding & Serialization Semantics

#### Explicit Body Decoders
Vii HTTP provides explicit decoding strategies rather than magical content-type guessing:
- `response.json()`: Parses JSON, rejecting with `DecodeError` on malformed syntax.
- `response.text()`: Reads UTF-8 text string.
- `response.arrayBuffer()` / `response.blob()`: Reads binary payloads.
- `response.formData()`: Parses multipart or URL-encoded form data.
- `response.body`: Returns the raw `ReadableStream<Uint8Array>`.

#### Edge Cases
- **HTTP 204 No Content / HTTP 205 Reset Content / HEAD requests**: Body decoding automatically resolves to `undefined` without attempting `JSON.parse("")` (which would throw a SyntaxError).
- **Empty Body with HTTP 200**: When `Content-Length: 0`, JSON decoding returns `null` or `undefined` gracefully rather than throwing.

#### Request Body Serialization
- `json` option: Automatically executes `JSON.stringify(data)`, sets `Content-Type: application/json` (if not already set by caller), and transmits string body.
- Throws `ConfigurationError` on circular references or non-serializable objects.

---

### 3.13 Streaming & Body Cloning Boundaries

- **Zero-Buffering Streams**: When streaming responses (`ReadableStream`), Vii HTTP does not buffer the stream into memory.
- **One-Shot Body Hazard**: A `Request` or `Response` body stream can be read only once (`bodyUsed === true`). Middleware and diagnostics must **never** call `.clone()` or read the body stream unless explicitly authorized by the user, as cloning forces full memory buffering and breaks streaming performance.

---

### 3.14 Observational Diagnostics & Absolute Privacy

HTTP Diagnostics integrates with the Vii Diagnostics Protocol (`vii.trace` v0.1) under strict privacy rules:

```text
┌─────────────────────────────────────────────────────────────┐
│                 Safe Observational Metadata                 │
│                                                             │
│  - Method (GET, POST, etc.)                                 │
│  - Sanitized Origin & Pathname template                     │
│  - Response HTTP Status Code (200, 404, 500)                │
│  - Request Duration (ms)                                    │
│  - Error Category (HttpStatus, Network, Timeout, Abort)     │
│  - Byte Count (Content-Length where available)              │
│  - Request Correlation ID (traceId)                         │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
                 ALLOWED       │       FORBIDDEN BY DEFAULT
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                  Redacted Sensitive Data                    │
│                                                             │
│  - Authorization Header (Bearer tokens, Basic auth)         │
│  - Cookie / Set-Cookie Headers                              │
│  - Custom API Keys (X-API-Key, etc.)                        │
│  - Request Body / Response Body Content                     │
│  - URL Query Parameter Values (may contain tokens/PII)      │
│  - Passwords, Credentials, User Identifiers                 │
└─────────────────────────────────────────────────────────────┘
```

#### Diagnostic Invariants
1. **Zero Side Effects**: Diagnostics collectors are purely observational. A failure in a diagnostic sink will never disrupt or fail an ongoing HTTP request.
2. **Production-Safe Redaction**: In `production-safe` mode, all URLs are stripped of query parameters, scope names are anonymized, and all headers are excluded by default.

---

### 3.15 SSR Request Isolation & Security Baseline

```text
Incoming Server Request A ────▶ Request Scope A ────▶ HttpClient Instance A (Auth Token A)
Incoming Server Request B ────▶ Request Scope B ────▶ HttpClient Instance B (Auth Token B)

         (Complete isolation: Token A NEVER leaks to Request B)
```

#### Day-One Security Threats & Hardening Requirements

| Threat Category | Attack Vector | Vii HTTP Architectural Defense |
| --- | --- | --- |
| **Cross-Request SSR Leakage** | Shared singleton client retains user credentials across server requests. | Require request-scoped client instances in SSR; client configurations are immutable; no global mutable defaults. |
| **Credential / Header Leakage on Redirect** | Client follows cross-origin redirect and forwards sensitive `Authorization` or `Cookie` headers. | Strip `Authorization`, `Cookie`, `Proxy-Authorization` headers when a redirect crosses origin boundaries. |
| **Server-Side Request Forgery (SSRF)** | Server-side HTTP client fetches user-supplied URL targeting private loopback (`127.0.0.1`, `localhost`) or cloud metadata (`169.254.169.254`). | Document server-side SSRF risks; plan future protocol allowlist (`http:`, `https:` only) and private IP blocking for server-side HTTP graduation. |
| **Unbounded Memory / Decompression Bombs** | Malicious server returns infinite stream or compressed payload causing OOM. | Zero-buffering stream processing; support max response body size limits; cancellation on timeout. |
| **Prototype Pollution via JSON** | Malicious response payload contains `__proto__` or `constructor` keys. | Standard Schema v1 validation boundary sanitizes and validates untrusted objects before application consumption. |
| **Diagnostics / Log Secret Exposure** | Tracing captures Authorization headers or sensitive query params. | Hardened redaction defaults; headers and query parameter values stripped from diagnostic events by default. |

---

## 4. Multi-Dimensional Testing Strategy

Per `docs/governance/FEATURE_ACCEPTANCE_GATE.md`, any future HTTP slice must define and execute tests across all seven quality dimensions:

```text
┌─────────────────────────────────────────────────────────────┐
│                 Vii HTTP Verification Matrix                │
├─────────────────────────────────────────────────────────────┤
│ 1. Functional Correctness                                   │
│    - URL composition, baseURL joining, query serialization  │
│    - Header merging, default headers, per-request overrides │
│    - Method semantics (GET, POST, PUT, PATCH, DELETE, HEAD) │
│    - Body encodings (JSON, text, FormData, Blob, Stream)    │
│    - Status resolution vs HttpStatusError rejection         │
├─────────────────────────────────────────────────────────────┤
│ 2. Failure, Cancellation & Lifecycle                        │
│    - Network disconnection & DNS failure classification     │
│    - Malformed JSON body decode error handling              │
│    - AbortSignal cancellation (user & Scope.dispose())      │
│    - Timeout expiration & TimeoutError classification       │
│    - abort != error invariant verification                  │
├─────────────────────────────────────────────────────────────┤
│ 3. Middleware & Pipeline Integrity                          │
│    - Strict array execution ordering (onion model)          │
│    - Short-circuiting and mock response injection           │
│    - Context propagation without wire leakage               │
│    - Async middleware error propagation                     │
├─────────────────────────────────────────────────────────────┤
│ 4. Security & Privacy Hardening                             │
│    - Sensitive header redaction (Authorization, Cookie)     │
│    - Query parameter redaction in diagnostics & errors      │
│    - Redirect cross-origin credential stripping             │
│    - SSR cross-request client isolation                     │
│    - Hostile JSON / prototype pollution defense             │
├─────────────────────────────────────────────────────────────┤
│ 5. Integration Contracts                                    │
│    - Vii Query fetcher integration & dedupe safety          │
│    - Standard Schema v1 validation (Zod, Valibot, ArkType)  │
│    - Vii Scope resource cleanup integration                 │
├─────────────────────────────────────────────────────────────┤
│ 6. Platform & Runtime Compatibility                         │
│    - Browser (Chromium, Firefox, WebKit)                    │
│    - Node.js 18+ (native Fetch / undici)                    │
│    - Bun & Deno baseline compatibility                      │
├─────────────────────────────────────────────────────────────┤
│ 7. Performance & Resource Efficiency                        │
│    - Zero-copy stream throughput & no unneeded buffering    │
│    - Wrapper latency overhead over native fetch             │
│    - Memory allocations & socket cleanup on cancellation    │
│    - Bundle size (< 2.0 kB minified ESM target)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Build-vs-Buy Evaluation Gate (H9)

The HTTP track concludes with a strict, evidence-driven Build-vs-Buy gate at **H9**.

### Comparison Candidates
1. **Direct Native Fetch**: Zero-dependency baseline using native `globalThis.fetch` and native `AbortSignal`.
2. **Lightweight Utility Functions**: Tiny handwritten helper functions (`fetchJson`, `withTimeout`).
3. **`ky`**: Mature, widely adopted Fetch-based client.
4. **`ofetch`**: Modern Fetch wrapper used in the UnJS / Nuxt ecosystem.
5. **`axios`**: Legacy reference client (for comparison of DX and bundle footprint).
6. **Vii HTTP Research Prototype**: The minimal client developed through H1–H8.

### Formal Evaluation Criteria
- **Bundle Footprint**: Minified and gzip byte impact on application bundles.
- **Runtime Latency**: Nanosecond wrapper overhead on high-throughput request loops.
- **Cancellation & Memory**: Clean socket termination and zero memory retention post-abort.
- **Standard Schema Integration**: Frictionless response validation without vendor lock-in.
- **SSR Isolation**: Safety against cross-request state pollution in server runtimes.
- **Maintenance Burden**: Ongoing cost of owning HTTP transport vs. delegating to platform standards.

### Possible Graduation Verdicts
- **`Own`**: Graduate `@vii-labs/http` as an official Vii package if it provides substantial, measurable Vii-specific value (Scope integration, diagnostics, zero bundle overhead).
- **`Reuse`**: Formally recommend an existing library (e.g. `ky` or `ofetch`) and provide documentation recipes.
- **`Wrap`**: Provide an ultra-thin wrapper/adapter around native Fetch.
- **`Reduce`**: Standardize on direct native `fetch()` + Standard Schema v1 with zero dedicated HTTP package.
- **`Stop`**: Terminate HTTP client development and retain Fetch-first recipes in Query documentation.

---

## 6. H0 Summary & Stop Condition

### H0 Deliverables Completed
- Defined transport semantic boundaries and Fetch-first baseline.
- Established strict architectural separation: **Query owns server state; HTTP owns transport; Schema owns data validation**.
- Defined explicit client ownership model with complete SSR request isolation.
- Formulated structured error taxonomy enforcing `cancellation != failure`.
- Defined functional onion middleware pipeline and context propagation model.
- Established default policy: **retries are OFF by default**.
- Defined Standard Schema v1 response decoding integration without core schema dependencies.
- Established day-one security threats (cross-request SSR leaks, redirect credential stripping, SSRF, header privacy).
- Formalized comprehensive H0–H9 research roadmap and multi-dimensional verification matrix.
- Defined H9 Build-vs-Buy comparative evaluation gate.

### Stop Condition
- **H0 is strictly architecture and research documentation.**
- **No production code, middleware, streaming abstractions, or retry logic has been implemented.**
- **No package manifest or public API has been created.**
- **H1 has NOT been started. Execution stops immediately.**
