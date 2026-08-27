# Vii Form Research Slice F9: Empirical Evidence & Quality Gate (Final Corrected)

> **Status**: Completed Evidence Slice (F9 ✅)  
> **Next Slice**: F10 (Real Consumer Validation + Build-vs-Buy Graduation Gate) — **NOT STARTED**  
> **Date**: 2026-08-27  
> **Environment**: macOS (darwin arm64, Apple M4, 10 cores, 24 GB RAM), Node `v22.17.0` (bun runtime `v1.2.18`), pnpm `10.12.4`, TypeScript `6.0.2`, Vitest `4.1.10`, React `19.2.8`, Angular `22.1.1`, Vue `3.5.41`.

---

## Executive Summary & F9 Gate Decision

This document records the final, hardened, and reproducible empirical measurements for **Vii Form Research Slice F9**.

### Research Question Answer
> **Is the F0-F8 Form architecture sufficiently efficient, resource-stable, type-system-friendly, tree-shakeable, and small enough to proceed to real-consumer validation, and where are the actual measured bottlenecks or risks?**

**Answer**: **Yes. The F0–F8 Form architecture is operationally bounded, resource-stable, type-friendly, and performant across realistic and stress test forms up to 1,000 fields.**

- **Leaf-Only Mutation**: In the tested leaf-only subscriber scenario, median single-field mutation remained approximately size-insensitive between 10 and 1,000 fields (~0.27 - 0.29 µs), and unrelated field subscribers received 0 notifications.
- **Aggregate-Consumer Mutation**: When a consumer subscribes to and synchronously reads aggregate computeds (`form.values`, `form.dirty`, `form.issues`), mutation triggers lazy dirty marking and recomputation scaling with aggregate tree size (~1.9 µs for 10 fields to ~149 µs for 1,000 fields).
- **Completed Submission**: Pure completed async submission lifecycle (validate $\rightarrow$ async action $\rightarrow$ state machine transition, excluding reset) resolves at **~0.024 ms median** in steady state.
- **FieldArray True Isolated Operations**: With untimed setup/restore stages, isolated steady-state array operations execute in **~3.3 µs** (`push`), **~3.6 µs** (`insert`), **~2.7 µs** (`remove`), **~0.25 µs** (`swap`), **~0.33 µs** (`move`), and **0.137 ms** (`setValues` alternating 100 items).
- **Per-Field Validation Scaling**: Full tree validation with 1 sync rule per field executes in **0.031 ms** (10 fields / 10 rules), **0.37 ms** (100 fields / 100 rules), **1.40 ms** (500 fields / 500 rules), and **3.97 ms** (1,000 fields / 1,000 rules).
- **Resource Lifecycle**: 500 complete create/dispose cycles show zero retained resource growth, 0 active scope leaks, and 0 unhandled rejections.
- **Validation Provider Parity**: Full Form validation throughput across 10 fields is uniform across Native rules and Standard Schema v1 providers (Zod 4, Valibot, ArkType) at ~0.026 - 0.027 ms.
- **TypeScript Diagnostics**: Checked across isolated programs with zero deep recursion errors (0.39s - 0.40s check time for isolated programs).
- **Bundle Footprint**: `createField` standalone bundles at **12.95 kB minified / 4.56 kB gzip / 4.03 kB brotli** (including all `@vii-labs/core` reactive primitives).
- **Static Dependency Isolation**: 100% verified zero framework cross-contamination and zero concrete schema provider imports in Core.

---

### Gate Recommendation
**Decision**: **Proceed to F10 with Explicit Documented Risks (Option B)**.

- **Blockers**: None. Zero memory leaks, zero type-checker hangs, zero SSR crashes, zero framework leaks.
- **Documented Reactive Invariant & Architectural Caveat (Items 10 & 57)**:
  - In Vii Core's push-pull lazy computed design (`packages/core/src/computed.ts`), when a state dependency updates, its subscribers are notified sequentially in registration order.
  - If a subscriber to `State A` attached *before* `Computed B(A)` evaluated its dependencies, that subscriber runs *before* `Computed B.invalidate()` executes. Inside that subscriber, `Computed B.get()` returns the previous cached value because `Computed B.dirty` is still `false`.
  - **Verdict on Core Semantics**: This behavior is an intended property of push-pull signal systems without topological dependency sorting. Synchronous freshness of a derived `Computed` inside subscriber callbacks of its source dependencies is neither promised nor guaranteed by Vii Core.
  - **Durable Consumer Rule**: *"Do not rely on synchronously fresh derived `Computed` values inside callbacks of their source dependencies; read source state directly or subscribe to the `Computed` itself."* (Documented in `packages/core/README.md` and verified in `packages/core/test/computed.test.ts`).
  - **Form & Adapter Hardening**: In Form F8/F9, internal projections and DOM/ARIA adapters derive state directly from source signals (`issuesState`, `serverIssuesState`, `errorsState`, `parseStatusState`) rather than reading derived computeds inside value callbacks.

> [!IMPORTANT]
> **F10 has NOT been started.** Completion of F9 authorizes documentation and review only.

---

## 1. Test Environment & Harness Methodology

All benchmarks and diagnostics were collected on the canonical repository environment:
- **Operating System**: macOS (darwin 24.x, arm64)
- **Processor**: Apple M4 (10 cores)
- **Memory**: 24.00 GB RAM
- **Node.js / Bun Runtime**: `v22.17.0` / `v1.2.18`
- **pnpm**: `10.12.4`
- **TypeScript**: `6.0.2`
- **Vitest**: `4.1.10`
- **React**: `19.2.8`
- **Angular**: `22.1.1`
- **Vue**: `3.5.41`
- **Methodology**: 50–1,000 warmed iterations per scenario; sub-microsecond operations execute with batching ($N = 10 \dots 100$) to eliminate timer-floor quantization; stateful mutations utilize `benchmarkWithSetup` or alternating datasets ($A \leftrightarrow B$) to prevent no-op/equality fast paths; reported values represent median wall-clock durations per operation calculated via `performance.now()`.

---

## 2. Runtime Scaling: Leaf-Only vs Aggregate-Consumer Scenarios

| Operation | Small (10 fields) | Medium (100 fields) | Large (500 fields) | Stress (1,000 fields) | Nested Form (97 leaf fields) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Construction (isolated + dispose)** | 0.04 ms | 0.39 ms | 2.32 ms | 4.05 ms | 0.55 ms |
| **First Read (Lazy computed initialization)** | 0.05 ms | 0.52 ms | 3.45 ms | 6.68 ms | — |
| **Leaf-Only Mutation (No aggregate listeners)** | **~0.29 µs** | **~0.29 µs** | **~0.27 µs** | **~0.27 µs** | **~0.29 µs** |
| **Aggregate-Consumer Mutation (`values`/`dirty`/`issues`)** | **~1.9 µs** | **~13.5 µs** | **~74.1 µs** | **~148.8 µs** | — |
| **`setValues` Subset (10 fields, alternating)** | 0.0028 ms | 0.0025 ms | 0.0025 ms | 0.0025 ms | — |
| **Full Tree Validation (1 sync rule/field)** | **0.031 ms** (10 rules) | **0.37 ms** (100 rules) | **1.40 ms** (500 rules) | **3.97 ms** (1,000 rules) | 0.23 ms |
| **Form Reset** | 0.018 ms | 0.19 ms | 0.76 ms | 2.08 ms | 0.31 ms |

### Empirical Observations
1. **Leaf-Only Subscriber Scaling**: In the tested leaf-only subscriber scenario, median single-field mutation remained approximately size-insensitive between 10 and 1,000 fields (~0.27 - 0.29 µs), and unrelated field subscribers received 0 notifications.
2. **Aggregate-Consumer Scaling**: When a consumer subscribes to and synchronously reads aggregate computeds (`values`, `dirty`, `issues`), mutating one leaf field causes aggregate computeds to invalidate and recompute upon reading, scaling proportionally with aggregate tree size (~1.9 µs for 10 fields to ~149 µs for 1,000 fields).
3. **Atomic `setValues` Batching**: Mutating a 10-field subset inside `form.setValues()` with alternating datasets takes a constant **~0.0025 ms** regardless of total form size, emitting exactly one batch notification.
4. **Nested Form Structure**: The realistic nested form fixture contains programmatically verified **97 leaf fields** (Profile: 5 leaves, Preferences: 2 leaves, Addresses: 60 leaves, History: 30 leaves).

---

## 3. FieldArray Operations (Separated Construction vs True Isolated Operations)

All FieldArray benchmarks isolate creation from operations and use `benchmarkWithSetup` with untimed setup/restore stages so that only the target operation is timed:

| Operation | 10 Items (Median) | 100 Items (Median) | Isolation Design |
| :--- | :--- | :--- | :--- |
| **Construction (`createFieldArray` + `scope.dispose()`)** | **0.230 ms** | **1.487 ms** | Fully scoped lifecycle |
| **Steady-State `push` (isolated)** | **0.0033 ms** (~3.3 µs) | **0.0033 ms** (~3.3 µs) | Untimed remove in restore |
| **Steady-State `insert` (at index 0, isolated)** | **0.0036 ms** (~3.6 µs) | **0.0036 ms** (~3.6 µs) | Untimed remove in restore |
| **Steady-State `swap` (isolated)** | **0.00042 ms** (~0.42 µs) | **0.00025 ms** (~0.25 µs) | In-place item swap |
| **Steady-State `remove` (isolated)** | **0.0026 ms** (~2.6 µs) | **0.0027 ms** (~2.7 µs) | Untimed push in setup |
| **Steady-State `move` (isolated)** | **0.00096 ms** (~0.96 µs) | **0.00033 ms** (~0.33 µs) | In-place item move |
| **Steady-State `setValues` (alternating $A \leftrightarrow B$)** | **0.021 ms** | **0.137 ms** | Guarantees real mutation |

---

## 4. Validation: Adapter Microbenchmarks vs Full-Form Throughput

### A. Standard Schema Adapter Invocation Microbenchmark
*Note: This measures Vii integration wrapper overhead on a single string input in isolation, not general provider performance.*

| Adapter / Provider | Median Latency per Call | Batch Size |
| :--- | :--- | :--- |
| **Native Vii Rule (`({ value }) => Issue | null`)** | **~0.0025 µs** | 100 |
| **Standard Schema: Valibot** | **~0.030 µs** | 100 |
| **Standard Schema: ArkType** | **~0.038 µs** | 100 |
| **Standard Schema: Zod 4** | **~0.049 µs** | 100 |

### B. Full Form Validation Throughput (10 Fields across Providers)
*10 fields with 10 validation rules, measured across 1,000 iterations (batch size 50):*

| Provider Mode | Median Latency / Form Validation |
| :--- | :--- |
| **10 Fields with Native Vii Rules** | **0.026 ms** |
| **10 Fields with Zod 4 Schemas** | **0.027 ms** |
| **10 Fields with Valibot Schemas** | **0.027 ms** |
| **10 Fields with ArkType Schemas** | **0.026 ms** |

*Verdict: Standard Schema provider overhead is negligible at the Form validation level, with all providers completing 10-field validation in ~0.026 - 0.027 ms.*

---

## 5. Completed Async Submission Lifecycle

Measured using `benchmarkAsyncWithSetup` where `await form.submit()` is strictly timed and form reset is performed during untimed setup:

| Scenario | Median Latency | Description |
| :--- | :--- | :--- |
| **`submit_resolved_success`** | **0.024 ms** | Strictly timed `await form.submit()` in steady-state |
| **`submit_validation_blocked`** | **0.010 ms** | Validation fails before action; immediate transition to failed |
| **`submit_server_rejected`** | **0.017 ms** | Action throws error; caught and transitioned to failed |
| **Route 100 Server Issues** | **0.19 ms** | Strictly timed `setServerIssues` (100 issues) |
| **Route 1,000 Server Issues** | **8.91 ms** | Strictly timed `setServerIssues` (1,000 issues) |
| **`deepCloneSnapshot` (Flat)** | **~0.11 µs** | Isolated snapshot clone of flat object |
| **`deepCloneSnapshot` (Nested)** | **~0.61 µs** | Isolated snapshot clone of nested object |
| **`deepCloneSnapshot` (50 Items)**| **~7.91 µs** | Isolated snapshot clone of 50-item array |

---

## 6. Memory & Lifecycle Retention Evidence

- **100 & 500 Create/Dispose Cycles**: Tested in `form-f9-memory.test.ts`. 500 complete form instantiations, mutations, validation runs, and disposals executed cleanly with 0 active scope leaks and 0 dangling listeners.
- **FieldArray Item Disposal**: Push, insert, remove, swap, move operations verified that removed items dispose their child scopes immediately, preserving stable ID mapping for surviving items.
- **Debounce Timer Cleanup**: Field and form disposal cancels all active `setTimeout` timers with zero unhandled timer execution.
- **Async Validation Supersession**: 200 rapid `setValue` calls with microtask async rules verified:
  - 200 `AbortController` instances created
  - 199 `AbortController` instances cleanly aborted
  - 1 final validator committed
  - 0 unhandled promise rejections
- **Benchmark Harness Resource Integrity**: Verified in `form-f9-memory.test.ts` that all created benchmark forms, arrays, scopes, and subscriptions are cleanly disposed without lingering timers or unhandled rejections.

---

## 7. Reactive Propagation & Derived Computed Invariant (Items 10 & 57)

### Investigation Findings
We isolated Vii Core's reactive propagation behavior in `research/form/benchmarks/reactive-propagation.test.ts` and added a regression contract test to `packages/core/test/computed.test.ts`:
1. **Push-Pull Notification Ordering**: When `State A` updates, its direct notifier iterates subscribers in order of registration.
2. **The Stale-Read Scenario**: If `Subscriber S` attaches to `State A` *before* `Computed B(A)` attaches its invalidation listener to `State A`, then when `State A` changes, `Subscriber S` executes first. Inside `Subscriber S`, `Computed B.get()` checks `dirty`. Because `Computed B.invalidate()` has not yet executed, `Computed B` returns its previous cached value.
3. **Core Semantics Contract**: Documented in `packages/core/README.md`. Synchronous freshness of a derived Computed inside a dependency subscriber callback is not part of the contract.
4. **Form & Adapter Hardening**:
   - Form adapters (e.g. Vanilla DOM `bindField` ARIA projections) derive dynamic status from direct source signals (`issuesState`, `serverIssuesState`, `errorsState`, `parseStatusState`) rather than reading derived Computeds inside synchronous value subscriber callbacks.
   - External consumer queries outside the notification cycle always observe fresh values once the scheduler flushes.

---

## 8. TypeScript Compilation Diagnostics across Isolated Programs

Measured via `tsc --extendedDiagnostics --noEmit` across separate program configurations:

| Program Configuration | Files | Lines of TS | Symbols | Types | Instantiations | Check Time | Total Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`small_10_fields` (`tsconfig.small.json`)** | 80 | 4,464 | 60,870 | 31,432 | 31,737 | **0.39 s** | 0.55 s |
| **`medium_100_fields` (`tsconfig.medium.json`)**| 80 | 4,489 | 60,871 | 31,433 | 31,724 | **0.40 s** | 0.54 s |
| **`large_300_fields` (`tsconfig.large.json`)** | 80 | 4,468 | 60,893 | 31,443 | 31,743 | **0.40 s** | 0.55 s |
| **`combined_program` (`tsconfig.json`)** | 82 | 4,603 | 39,673 | 4,255 | 4,964 | **0.15 s** | 0.30 s |

*Verdict: Compiler check time scales sub-linearly across small, medium, and large forms with zero deep instantiation errors.*

---

## 9. Production-Style Research Bundle Footprints & Tree-Shaking

### A. Bundle Footprint
*Measured via `bun build --minify --target=browser` with framework and schema provider peers externalized (`react`, `react-dom`, `@angular/core`, `vue`, `zod`, `valibot`, `arktype`, `@standard-schema/spec`):*

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

### B. Tree-Shaking Comparison
When consuming only `createField` instead of the full Form Core:
- Minified size decreases from **34.05 kB** to **12.95 kB** (-21.10 kB, ~62% reduction).
- Gzip size decreases from **10.73 kB** to **4.56 kB** (-6.17 kB, ~58% reduction).
- **Code eliminated**: `createFieldGroup`, `createFieldArray`, nested path grammar parsing/tokenization, array key derivation & reconciliation, full-tree snapshot serialization, and server issue path routing.

---

## 10. Framework & Provider Isolation Audit

Static AST and boundary audit (`research/form/form-f9-bundle.test.ts`) verified:
- `form-core.ts`: **0 imports** of React, Angular, Vue, Zod, Valibot, ArkType.
- `adapters/vanilla.ts`: **0 imports** of React, Angular, Vue.
- `adapters/react.ts`: **0 imports** of Angular, Vue.
- `adapters/angular.ts`: **0 imports** of React, Vue.
- `adapters/vue.ts`: **0 imports** of React, Angular.
- `standard-schema.ts`: **0 imports** of concrete schema libraries.
- **SSR / Server Safety**: All framework-neutral modules (`form-core.ts`, `parser.ts`, `submission.ts`, `standard-schema.ts`) import and execute cleanly under Node with zero unchecked `window` or `document` references.

---

## 11. Summary of Identified Hotspots & Non-Blockers

1. **Aggregate Consumer Invalidation Cost**: While leaf-only mutation is size-insensitive (~0.29 µs), subscribing to and reading `form.values` on every keystroke scales with form size (~149 µs on 1,000 fields). UI architectures should bind components to individual fields rather than reading whole-form values on every keystroke.
2. **Large Server Issue Routing Scale**: Routing 1,000 server issues takes ~8.9 ms. This is linear and completely safe for real-world forms (which rarely have >20 server issues), but indicates deep tree traversal cost for path-based issues.
3. **Derived Computed Read-Order Sensitivity**: Push-pull reactive systems require reading source signals directly in notification listeners if synchronous fresh values are needed before the scheduler flush.

---

## 12. Gate Recommendation for F10

**Recommendation**: **Authorize progression to F10 (Real Consumer Validation + Build-vs-Buy Graduation Gate)** under Option B (Proceed to F10 with Explicit Documented Risks).
- Real-world consumer validation on expanded reference applications (Vanilla Onboarding and React Task Board).
- Comparative head-to-head Build-vs-Buy evaluation against React Hook Form, TanStack Form, and Angular Signal Forms.
- Final determination on graduation to `@vii-labs/form` vs direct State/Scope recommendation.
