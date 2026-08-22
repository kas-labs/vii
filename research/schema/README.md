# Schema & Codec Research Track (S0 – S7)

> **Status**: S0–S7 Research Completed  
> **Final Verdict**: **`Wrap` + `Reduce`** (Standard Schema First Boundary & Minimal Codec Utility)  
> **Specification Roadmap**: `docs/roadmap/SCHEMA_RESEARCH.md`

---

## 1. Overview & Architectural Findings

This directory contains the completed research prototypes, security hardness tests, type-level inference assertions, integration contract fixtures, and performance benchmarks for the Vii Schema & Codec research track.

### Key Conclusions & Build-vs-Buy Verdict
1. **No Standalone Validation Monolith (`Anti-Own`)**:
   - Vii will **not** build and maintain a competing standalone runtime validator matching Zod, Valibot, or ArkType.
2. **Universal Standard Schema v1 Boundary (`Wrap`)**:
   - Vii Form, Vii HTTP Client, and Vii Query natively accept any schema library supporting the **Standard Schema v1** specification (`~standard.validate`).
3. **Clean Core Decoupling**:
   - `@vii-labs/core` remains 100% zero-dependency, platform-neutral, and completely decoupled from Schema.
4. **Lightweight Codec Utilities (`Reduce`)**:
   - Bidirectional serialization codecs (`urlSearchParamsCodec`, `jsonCodec`, `dateFromISOString`) remain available as minimal utilities for transport layers.

---

## 2. Research Slices & Implemented Artifacts

| Slice | Title | Key Artifacts | Purpose & Invariants |
| --- | --- | --- | --- |
| **S0** | Architecture + Boundaries | `docs/roadmap/SCHEMA_RESEARCH.md` | Non-throwing `check()`, zero-copy taxonomy, Build-vs-Buy evaluation framework. |
| **S1** | Runtime Validation Baseline | `primitives.ts`, `structures.ts`, `zero-copy.test.ts` | Primitives & structures, `result.value === input` identity preservation. |
| **S2** | Structured Issues & Privacy | `issues.ts`, `issues-privacy.test.ts` | Form error maps (`createFormErrors`), path formatting, zero raw value leaking. |
| **S3** | Codec / Serialization | `codec.ts`, `codec.test.ts` | `Date`, `BigInt`, `JSON`, `URLSearchParams`, and collections round-trip serialization. |
| **S4** | Security, CSP & Complexity | `security.ts`, `security-consolidation.test.ts` | Depth limits (<= 32), cyclic graph detection, ReDoS limits, static CSP compliance audit. |
| **S5** | Type Inference & Compiler | `type-inference.test.ts` | Precise `InferInput` vs `InferOutput`, deep generic inference, 0.78s compile time. |
| **S6** | Integration Contract Fixtures | `standard-schema.ts`, `integration-fixtures.test.ts` | Form, HTTP, Query cache hydration fixtures, and Standard Schema v1 interop. |
| **S7** | Performance Benchmarks | `schema-benchmarks.test.ts` | Reproducible throughput measurements (> 1.2M prim ops/sec, > 350K obj ops/sec). |

---

## 3. Verification

Run the complete schema test and benchmark suite:

```bash
pnpm exec vitest run research/schema/*.test.ts
pnpm exec tsc -p research/schema/tsconfig.json --noEmit
```
