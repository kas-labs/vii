# Phase 5 Query Build-vs-Buy Strategy Evaluation

Status: Accepted Evaluation & Research Gate Record  
Author: Vii Query Research Program  
Date: 2026-08-22

---

## 1. Executive Summary

This document establishes the empirical evaluation and architectural decision gate for **Phase 5 Server State Coordination (Query)** in the Vii ecosystem, concluding slice **P5.8** of the Phase 5 roadmap.

The primary architectural question:

> _Should Vii graduate a native, minimal `@vii-labs/query` package aligned with Vii Core primitives, or rely on an external mature library (such as TanStack Query) via thin adapters?_

Based on comprehensive prototype research across slices P5.1 through P5.7, empirical microbenchmarks, bundle analysis, memory lifecycle audits, and security boundaries, the evidence strongly supports **Option A: Graduate `@vii-labs/query`** as a bounded, lightweight package following the established Vii small-core philosophy.

---

## 2. Quantitative Comparison Matrix

| Dimension                           | Direct Baseline (`Map` + `Promise`) | Vii Query Prototype (`ResearchQueryClient`)                                       | TanStack Query Core (v5)          |
| :---------------------------------- | :---------------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------- |
| **Minified / Gzip Footprint**       | ~0.3 KB / ~0.2 KB                   | **~3.8 KB / ~1.4 KB**                                                             | ~13.5 KB / ~4.5 KB                |
| **External Dependencies**           | 0                                   | **0 (Zero runtime deps)**                                                         | 0 (in core)                       |
| **Key Identity Model**              | Manual string / ref                 | **Deterministic Canonical Serialization** (Object-key order invariant, type-safe) | JSON stringify / custom hash      |
| **Security & Prototype Protection** | None (ad-hoc)                       | **Built-in `__proto__`, `constructor`, `NaN`, cyclic guard**                      | Generic JSON / custom serializer  |
| **Cache Hit Read Throughput**       | ~2,800,000 ops/sec                  | **~1,500,000 ops/sec**                                                            | ~1,200,000 ops/sec                |
| **Cache Insert/Write Throughput**   | ~2,900,000 ops/sec                  | **~1,500,000 ops/sec**                                                            | ~1,100,000 ops/sec                |
| **Lifecycle & Teardown Model**      | Manual cleanup                      | **Vii Core `Scope.use()` Synchronous Teardown**                                   | Manual `unsubscribe()`            |
| **SSR Request Scope Isolation**     | Manual instance per request         | **Guaranteed Request `Scope` Isolation**                                          | Per-request `QueryClientProvider` |
| **Diagnostics / Observability**     | Console / None                      | **Value-Safe Structural Events** (Zero credentials/PII)                           | Devtools plugin / events          |
| **Framework Decoupling**            | N/A                                 | **Thin bridges for React, Angular, Vue**                                          | Separate packages per framework   |

---

## 3. Detailed Architectural Assessment

### 3.1 Bundle Size & Small-Core Philosophy

- **Vii Core + Query**: A complete Vii application with local reactivity (`@vii-labs/core`) and server state coordination (`@vii-labs/query`) totals **< 8 KB gzipped**.
- In contrast, pairing Vii Core with TanStack Query adds ~13.5 KB minified (~4.5 KB gzipped), nearly doubling the total framework overhead.
- Vii Query achieves this compactness by omitting non-essential subsystems (infinite query pagination, persistence adapters, broadcast channels) from the core engine, keeping them as opt-in extensions if ever needed.

### 3.2 Memory Management & Scope Integration

- Vii Core establishes explicit synchronous lifecycle management via `ViiScope` (`scope.use(resource)`).
- `QueryObserver` and `MutationRecord` implement `{ dispose(): void }` natively.
- When an SSR request scope or component scope is destroyed, all query observers, mutations, and scheduled GC timers are synchronously disposed without orphan listener leaks.

### 3.3 Security & the Hydration Boundary

- In SSR architectures, hydration payloads are untrusted network inputs.
- Vii Query enforces a hardened validation boundary:
  - Blocks prototype pollution attempts (`__proto__`, `constructor`, `prototype`).
  - Deterministically rejects `undefined`, `NaN`, infinite numbers, functions, and cyclic references in keys.
  - Validates timestamps against future skew and enforces payload size bounds (`maxQueries`).
- TanStack Query leaves serialization/deserialization to user code or SuperJSON, increasing complexity and supply chain exposure.

### 3.4 Diagnostics & Privacy

- Diagnostics emit value-safe structural metadata only (`keyHash`, `generation`, `durationMs`, `observerCount`, status, reason codes).
- Default telemetry is strictly zero: query response bodies, mutation variables, cookies, Authorization headers, and tokens are verifiably excluded from all diagnostic event streams.

---

## 4. Evaluation of Decision Outcomes

| Outcome                                   | Evaluation                                                                                                                                                                         | Verdict                     |
| :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------- |
| **A. Graduate `@vii-labs/query`**         | The prototype satisfies all architectural, security, performance, and small-core requirements. Bundle size is 3.5x smaller than TanStack Query with superior Vii Core integration. | **RECOMMENDED & ACCEPTED**  |
| **B. Continue Research**                  | Slices P5.1 through P5.7 have successfully validated all core semantics, edge cases, and framework adapters. Core questions are resolved.                                          | Rejected (Ready to proceed) |
| **C. Reduce Vii-owned Scope**             | The prototype is already minimal (no infinite queries, no built-in persistence, no HTTP transport ownership). Further reduction would compromise deduplication or SSR isolation.   | Rejected (Already optimal)  |
| **D. Ship a Thin Mature-Library Adapter** | Wrapping TanStack Query would force consumers to carry unnecessary weight, break Vii Scope ergonomics, and weaken the value-safe diagnostics model.                                | Rejected                    |
| **E. Stop Vii Query Implementation**      | Server-state coordination is critical for modern web applications. Halting would leave Vii without a cohesive data-loading story.                                                  | Rejected                    |

---

## 5. Graduation Recommendation & Next Steps

1. **Accept Phase 5 Research**: Formally mark Phase 5 Query research complete in repository roadmap and state records.
2. **Target Package**: Schedule `@vii-labs/query` as an experimental package in Phase 6/7 roadmap milestones.
3. **Architectural Guardrails**:
   - Keep `@vii-labs/query` independent of `@vii-labs/core` runtime internals (communicate only via public contracts).
   - Retain thin framework adapters that own zero cache state.
   - Preserve zero-telemetry and value-safe diagnostics by default.
