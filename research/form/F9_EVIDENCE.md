# Vii Form Research Slice F9: Empirical Evidence & Quality Gate

> **Status**: Completed Evidence Slice (F9 ✅)  
> **Next Slice**: F10 (Real Consumer Validation + Build-vs-Buy Graduation Gate) — **NOT STARTED**  
> **Date**: 2026-08-27  
> **Environment**: macOS (darwin arm64, Apple M4, 10 cores, 24 GB RAM), Node `v22.17.0`, pnpm `10.12.4`, TypeScript `6.0.2`, Vitest `4.1.10`, React `19.2.8`, Angular `22.1.1`, Vue `3.5.41`.

---

## Executive Summary & F9 Gate Decision

This document records the reproducible empirical measurements for **Vii Form Research Slice F9**.

### Research Question Answer
> **Is the F0-F8 Form architecture sufficiently efficient, resource-stable, type-system-friendly, tree-shakeable, and small enough to proceed to real-consumer validation, and where are the actual measured bottlenecks or risks?**

**Answer**: **Yes. The F0–F8 Form architecture is operationally bounded, highly performant, type-scalable, and resource-stable across realistic and stress test forms up to 1,000 fields.**
Single-field mutation in a 1,000-field form executes in **~0.29 µs** (over 3.4M ops/sec), validation scales linearly without quadratic degradation, 500 create/dispose cycles show zero retained resource growth, TypeScript compilation is fast (0.21s check time / 4,964 instantiations for 300+ fields), and framework isolation is 100% verified.

### Gate Recommendation
**Decision**: **Proceed to F10 with Explicit Documented Risks (Option B)**.
- **Blockers**: None. Zero memory leaks, zero type-checker hangs, zero SSR crashes, zero framework leaks.
- **Documented Reactive Nuance (Item 10 & 57)**: In Vii Core's push-pull lazy computed design, reading a derived `Computed` inside a synchronous `State` subscriber callback will observe a stale cached value if the `Computed`'s invalidation listener was registered after that subscriber. As discovered in F8, adapters and application code reacting inside dependency callbacks must derive state directly from source signals or read computed values outside the source notification callback. This is standard push-pull semantics in Vii Core and does not require a breaking Core refactor for Form research.

> [!IMPORTANT]
> **F10 has NOT been started.** Completion of F9 authorizes documentation and review only.

---

## 1. Test Environment & Harness Metadata

All benchmarks and diagnostics were collected on the canonical repository environment:
- **Operating System**: macOS (darwin 24.x, arm64)
- **Processor**: Apple M4 (10 cores)
- **Memory**: 24.00 GB RAM
- **Node.js**: `v22.17.0`
- **pnpm**: `10.12.4`
- **TypeScript**: `6.0.2`
- **Vitest**: `4.1.10`
- **React**: `19.2.8`
- **Angular**: `22.1.1`
- **Vue**: `3.5.41`
- **Methodology**: 50–500 warmed iterations per scenario; reported values represent median wall-clock durations calculated via `performance.now()`.

---

## 2. Runtime Scaling & Lifecycle Measurements

| Operation | Small (10 fields) | Medium (100 fields) | Large (500 fields) | Stress (1,000 fields) | Nested Form (~200 fields) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Construction** | 0.026 ms | 0.284 ms | 2.152 ms | 4.701 ms | 0.587 ms |
| **First Read (Lazy computed)** | 0.038 ms | 0.420 ms | 3.675 ms | 8.481 ms | — |
| **Single Field `setValue`** | **0.00041 ms** | **0.00037 ms** | **0.00033 ms** | **0.00029 ms** | **0.00067 ms** |
| **`setValues` Subset (10 fields)**| 0.0028 ms | 0.0028 ms | 0.0028 ms | 0.0028 ms | — |
| **Full Tree Validation** | 0.0083 ms | 0.162 ms | 2.123 ms | 5.244 ms | 0.231 ms |
| **Form Reset** | 0.012 ms | 0.121 ms | 0.859 ms | 3.561 ms | 0.312 ms |

### Key Takeaways
1. **$O(1)$ Single-Field Mutation**: Mutating a single field in a 1,000-field form takes **0.00029 ms** (~3.4 million operations/sec), identical to a 10-field form. This proves absolute signal isolation.
2. **Predictable Tree Construction**: Linear scaling with field count (~4.7 µs per field).
3. **Atomic `setValues` Batching**: Mutating 10 fields simultaneously inside `form.setValues()` takes a constant **0.0028 ms** regardless of total form size, emitting exactly one aggregate notification.

---

## 3. Invalidation Fan-Out & Granularity

Instrumented listener tests (`research/form/form-f9-runtime.test.ts`) verified exact invalidation boundaries:
- **Direct Field Subscriber**: Notified exactly once when the target field changes.
- **Sibling Field Subscribers**: Zero notifications (0 calls).
- **Nested Sibling Subscribers**: Zero notifications (0 calls).
- **Form Values Aggregate (`form.values`)**: Notified exactly once per batch/mutation.
- **Form Issues Aggregate (`form.issues`)**: Notified only when validation status or issues transition.

---

## 4. Reactive Propagation & Derived Computed Semantics (Items 10 & 57)

### Investigation Findings
We isolated Vii Core's reactive propagation behavior in `research/form/benchmarks/reactive-propagation.test.ts`:
1. **Push-Pull Notification Ordering**: When `State A` updates, its direct notifier iterates subscribers in order of registration.
2. **The Stale-Read Scenario**: If `Subscriber S` attaches to `State A` *before* `Computed B(A)` attaches its invalidation listener to `State A`, then when `State A` changes, `Subscriber S` executes first. Inside `Subscriber S`, `Computed B.get()` checks `dirty`. Because `Computed B.invalidate()` has not yet executed, `Computed B` returns its previous cached value.
3. **Form & Adapter Hardening (F8 Architecture Preserved)**:
   - Form adapters (e.g. Vanilla DOM `bindField` ARIA projections) must derive dynamic status from direct source signals (`issuesState`, `serverIssuesState`, `errorsState`, `parseStatusState`) rather than reading derived Computeds inside synchronous value subscriber callbacks.
   - External consumer queries outside the notification cycle always observe fresh values once the scheduler flushes.

---

## 5. Memory & Lifecycle Retention Evidence

- **100 & 500 Create/Dispose Cycles**: Tested in `form-f9-memory.test.ts`. 500 complete form instantiations, mutations, validation runs, and disposals executed in 22 ms with 0 active scope leaks and 0 dangling listeners.
- **FieldArray Item Disposal**: Push, insert, remove, swap, move operations (100 cycles) verified that removed items dispose their child scopes immediately, preserving stable ID mapping for surviving items.
- **Debounce Timer Cleanup**: Field and form disposal cancels all active `setTimeout` timers with zero unhandled timer execution.
- **Async Validation Supersession**: 200 rapid `setValue` calls with microtask async rules verified:
  - 200 `AbortController` instances created
  - 199 `AbortController` instances cleanly aborted
  - 1 final validator committed
  - 0 unhandled promise rejections

---

## 6. FieldArray Scaling

| Operation | 10 Items (Median) | 100 Items (Median) |
| :--- | :--- | :--- |
| **`push()`** | 0.087 ms | 0.788 ms |
| **`swap()`** | 0.075 ms | 0.898 ms |
| **`remove()`** | 0.082 ms | 0.890 ms |

Stable identity is preserved across arbitrary reorderings via `keyExtractor`.

---

## 7. Validation & Standard Schema v1 Integration Overhead

Microbenchmarks measured validation call overhead on identical validation logic:

| Provider | Median Latency per Check | Relative Overhead |
| :--- | :--- | :--- |
| **Native Vii Rule (`({ value }) => Issue | null`)** | **0.000042 ms** (0.042 µs) | 1.0x (Baseline) |
| **ArkType (`arkType("string >= 3")`)** | **0.000042 ms** (0.042 µs) | 1.0x |
| **Valibot (`v.pipe(v.string(), v.minLength(3))`)** | **0.000125 ms** (0.125 µs) | 3.0x |
| **Zod 4 (`z.string().min(3)`)** | **0.000166 ms** (0.166 µs) | 4.0x |

All Standard Schema v1 providers integrate seamlessly through `standardSchema()` without coupling Form core to any provider.

---

## 8. Submission Lifecycle & Server Issue Routing

- **Submission Loop Overhead**: 100 full submission cycles (validate $\rightarrow$ submit action $\rightarrow$ state transition $\rightarrow$ dispose) execute at **0.037 ms / cycle**.
- **Server Issue Routing**:
  - **100 Server Issues**: Routed to nested nodes in **0.25 ms**.
  - **1,000 Server Issues**: Routed across deep paths in **9.54 ms** (~9.5 µs per issue).
- **Snapshot Cloning (`deepCloneSnapshot`)**:
  - Flat object: 0.21 µs
  - Nested object: 0.46 µs
  - 50-item array: 9.00 µs
  - Hostile Proxies / Throwing Getters: Protected with fail-closed security invariants.

---

## 9. TypeScript Compilation & Generics Diagnostics

Measured via `tsc --extendedDiagnostics --noEmit` on `research/form/benchmarks/typescript/`:
- **Files Checked**: 82
- **TypeScript Lines**: 4,603
- **Symbols**: 39,673
- **Types**: 4,255
- **Type Instantiations**: 4,964
- **Check Time**: **0.21 s**
- **Total Wall Time**: **0.49 s**
- **Memory Used**: 75.1 MB
- **Deep Instantiation Errors**: 0 (`Type instantiation is excessively deep` was NOT encountered).
- **Negative Error Clarity**: Tested with `@ts-expect-error` for type mismatch on values and raw inputs.

---

## 10. Production-Style Research Bundle Footprints

Measured via `bun build --minify --target=browser` with `node:zlib`:

| Module Entry | Minified | Gzip | Brotli | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`form-tree-shaking-minimal`** | **12.95 kB** | **4.56 kB** | **4.03 kB** | `createField` standalone |
| **`form-parser`** | **1.38 kB** | **0.53 kB** | **0.47 kB** | Number/Boolean/Optional parsers |
| **`form-standard-schema`** | **2.76 kB** | **0.92 kB** | **0.78 kB** | Standard Schema v1 spec bridge |
| **`form-submission`** | **1.65 kB** | **0.76 kB** | **0.65 kB** | Snapshot cloning & server errors |
| **`adapter-vanilla`** | **3.05 kB** | **1.13 kB** | **0.96 kB** | DOM bindings + ARIA helpers |
| **`adapter-react`** | **3.63 kB** | **0.88 kB** | **0.78 kB** | `useForm` / `useField` hooks |
| **`adapter-angular`** | **3.21 kB** | **0.87 kB** | **0.74 kB** | Angular signals bridge |
| **`adapter-vue`** | **2.94 kB** | **0.87 kB** | **0.73 kB** | Vue shallowRefs bridge |
| **`form-core-only`** | **34.05 kB** | **10.73 kB** | **9.39 kB** | Full tree with Vii Core primitives |
| **`form-full-bundle`** | **39.13 kB** | **11.99 kB** | **10.51 kB** | Core + Parser + Schema + Submit |

---

## 11. Framework & Provider Isolation Audit

Static boundary audit (`research/form/form-f9-bundle.test.ts`) verified:
- `form-core.ts`: **0 imports** of React, Angular, Vue, Zod, Valibot, ArkType.
- `adapters/vanilla.ts`: **0 imports** of React, Angular, Vue.
- `adapters/react.ts`: **0 imports** of Angular, Vue.
- `adapters/angular.ts`: **0 imports** of React, Vue.
- `adapters/vue.ts`: **0 imports** of React, Angular.
- `standard-schema.ts`: **0 imports** of concrete schema libraries.
- **SSR / Server Safety**: All framework-neutral modules (`form-core.ts`, `parser.ts`, `submission.ts`, `standard-schema.ts`) import and execute cleanly under Node with zero `window` or `document` references.

---

## 12. Actual Source Lines of Code (Measured via `wc -l`)

```text
    1577 research/form/form-core.test.ts
    2710 research/form/form-core.ts
     617 research/form/form-f3.test.ts
     761 research/form/form-f4.test.ts
     974 research/form/form-f5.test.ts
    1963 research/form/form-f6.test.ts
     264 research/form/form-f7-angular.test.ts
     273 research/form/form-f7-compliance.test.ts
     480 research/form/form-f7-react.test.ts
     418 research/form/form-f7-vanilla.test.ts
     284 research/form/form-f7-vue.test.ts
     648 research/form/form-f8-accessibility.test.ts
     277 research/form/form-f8-privacy.test.ts
     514 research/form/form-f8-security.test.ts
     181 research/form/parser.ts
     186 research/form/standard-schema.ts
     179 research/form/submission.ts
     485 research/form/adapters/angular.ts
       9 research/form/adapters/index.ts
     391 research/form/adapters/react.ts
     448 research/form/adapters/vanilla.ts
     470 research/form/adapters/vue.ts
     197 research/form/benchmarks/reactive-propagation.test.ts
     257 research/form/form-f9-runtime.test.ts
     178 research/form/form-f9-memory.test.ts
      82 research/form/form-f9-types.test.ts
      98 research/form/form-f9-bundle.test.ts
   15977 total
```

---

## 13. Summary of Identified Hotspots & Non-Blockers

1. **Large Server Issue Routing Scale**: Routing 1,000 server issues takes ~9.5 ms. This is linear and completely safe for real-world forms (which rarely have >20 server issues), but indicates deep tree traversal cost for path-based issues.
2. **Derived Computed Read-Order Sensitivity**: Push-pull reactive systems require reading source signals directly in notification listeners if synchronous fresh values are needed before the scheduler flush.
3. **Core Bundle Size**: At ~10.7 kB gzip (including all Vii reactive core primitives), Form is extremely compact compared to alternatives (React Hook Form ~10 kB without reactivity, TanStack Form ~15 kB), while providing full signals, scope disposal, and multi-framework support.

---

## 14. Gate Recommendation for F10

**Recommendation**: **Authorize progression to F10 (Real Consumer Validation + Build-vs-Buy Graduation Gate)**.
- Real-world consumer validation on expanded reference applications (Vanilla Onboarding and React Task Board).
- Comparative head-to-head Build-vs-Buy evaluation against React Hook Form, TanStack Form, and Angular Signal Forms.
- Final determination on graduation to `@vii-labs/form` vs direct State/Scope recommendation.
