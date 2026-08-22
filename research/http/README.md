# Vii HTTP Client & Transport Research — H1 Prototype

> **Status**: Active Research Prototype (Throwaway)  
> **Current Slice**: H1 (Fetch-first Client Baseline)  
> **Governing Roadmap**: [`docs/roadmap/HTTP_CLIENT_RESEARCH.md`](../../docs/roadmap/HTTP_CLIENT_RESEARCH.md)  
> **Package Authorization**: **None** (Research only, no public package)

---

## 1. Overview

This directory contains the throwaway research prototype for **H1 (Fetch-first Client Baseline)**.

The purpose of H1 is to investigate the minimal ergonomics and operational overhead of an explicit, immutable Fetch-based HTTP client without introducing any heavy runtime abstractions, middleware, or streaming layers.

---

## 2. Implemented Capabilities (H1)

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
5. **Injected Fetch Capability**:
   - Direct injection of `fetch` implementation at client creation or per-request override.
   - Enables frictionless unit testing with mocks and serverless runtime service bindings without global pollution.
6. **Immutable Client Inheritance (`extend`)**:
   - `.extend(childConfig)` returns a new client inheriting parent `baseURL` and default `headers` without mutating the parent instance.

---

## 3. Explicit Non-Goals for H1

The following capabilities are deliberately excluded from H1 and assigned to future research slices:

- **Middleware / Interceptors**: Deferred to **H2**.
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
