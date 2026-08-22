# Vii Schema & Codec Research Roadmap

> **Status**: Active Research Roadmap  
> **Initial Slice**: S0 (Architecture + Semantic Boundaries)  
> **Governing Strategy**: Evidence-driven Build-vs-Buy  
> **Prerequisites**: Phase 1 (Core State), Phase 2 (Adapters/CLI), Phase 5 (Query), Phase 6 (UI)

---

## 1. Research Thesis & Operating Policy

Vii Schema is a research track investigating whether a small, TypeScript-first data contract layer can provide meaningful value across application boundaries (Form, HTTP, Query, Server, AI) compared to importing an existing validator.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Untrusted Input                       │
│  (HTTP response, Form inputs, URL search params, AI output) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Schema / Codec (Boundary)                   │
│   (Type inference, non-throwing check(), fail-closed CSP)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
  ┌──────────────────┐┌──────────────────┐┌──────────────────┐
  │ Vii Form         ││ Vii Query        ││ Server / Storage │
  │ Field Validation ││ Cache & Hydrate  ││ Safe Persistence │
  └──────────────────┘└──────────────────┘└──────────────────┘
```

### Core Invariants
1. **Core Decoupling**: Vii Core *never* depends on Schema.
2. **Build-vs-Buy Priority**: Research starts with a comparative evaluation (**Handwritten Baseline vs Zod 4 vs Valibot vs ArkType vs TypeBox vs Vii Prototype**). Valid outcomes include `Own`, `Reuse`, `Wrap`, `Reduce`, and `Stop`.
3. **Provider Neutrality**: Downstream modules (Form, HTTP) operate via generic schema adapters and do not mandate a first-party Vii Schema package.
4. **Research Gating**: No public `@vii-labs/schema` package or stable API commitment is authorized prior to passing the final S7 evaluation gate.

---

## 2. Research Slices Sequence (S0 – S7)

| Slice | Title | Scope & Objectives |
| --- | --- | --- |
| **S0** | **Architecture + Semantic Boundaries** | Establish semantic taxonomy (Validation vs Coercion vs Transformation), `check()`/`parse()` contracts, input/output types, privacy/error invariants, and build-vs-buy matrix. |
| **S1** | **Runtime Validation Baseline** | Build a minimal research prototype for core primitives (`string`, `number`, `boolean`, `literal`, `null`, `undefined`, `unknown`, `object`, `array`, `union`) with non-throwing `check()` and zero-copy experiments. Hostile fixtures active on day one. |
| **S2** | **Structured Issues + Privacy** | Research path-aware, deterministic issue reporting (`path: readonly (string \| number)[]`, error codes) with absolute value privacy (no raw secrets in errors/logs) and externalized localization. |
| **S3** | **Codec / Serialization Semantics** | Research asymmetric vs symmetric encoding/decoding (`encode`, `decode`), URL search params, JSON, Date/BigInt/Map handling, and secure SSR hydration boundaries. |
| **S4** | **Security + CSP + Complexity Consolidation** | Consolidate and expand defense fixtures: Prototype Pollution (`__proto__`, `constructor`, `prototype`), getter/proxy traps, RegExp DoS, deep/wide object limits, union explosion, and strict CSP (zero dynamic eval). |
| **S5** | **Type Inference + TS Compiler Cost** | Measure TypeScript compiler impact (`InferInput<T>`, `InferOutput<T>`), `tsc --noEmit` wall time, declaration emission, and recursion depth limits. |
| **S6** | **Integration Contract Fixtures** | Prototype isolated integration boundaries for Vii Form field validation, Vii HTTP response decoding, and Vii Query hydration without circular dependencies. |
| **S7** | **Performance + Build-vs-Buy Gate** | Execute comprehensive benchmark matrix (valid/invalid throughput, allocations, bundle footprint, TS cost, security, maintenance) and render formal graduation verdict (`Own`, `Reuse`, `Wrap`, `Reduce`, `Stop`). |

---

## 3. Semantic Taxonomy & Boundary Rules

### Validation
- Verifies that an input already satisfies a contract.
- Research target: Zero-copy success path (`result.value === input`) for validation-only schemas without transformations.

### Coercion
- Explicit, opt-in representation alteration (e.g. `"42"` -> `42`, `"true"` -> `true`).
- **Rule**: Never implicit. Coercion must be visually distinct and testable.

### Transformation
- Maps a valid parsed value to another domain representation (e.g. `trim()`, `toLowerCase()`, branded types).
- **Rule**: Transforms are not zero-copy by definition since new values are constructed.

### Parsing
- Conceptual umbrella operation or throwing convenience (`parse(input)`).
- **Rule**: Must not blur the distinction between validation and transformation.

### Refinement
- Pure, synchronous predicate validating custom domain constraints without mutating representation.

### Defaulting
- Explicit fallback value injection when input is `undefined`.
- **Rule**: Treated as an explicit transformation/coercion path, not hidden inside zero-copy validation.

---

## 4. Operation Contracts & Type Model

### Operation Contracts
- **Primary Primitive**: Non-throwing `check(input): ValidationResult<InferOutput<T>>`
  ```ts
  type ValidationResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly issues: readonly SchemaIssue[] };
  ```
- **Throwing Convenience**: Optional `parse(input): InferOutput<T>` wrapping `check()` and throwing a structured `SchemaError`.
- **No Proliferation**: Avoid multiple redundant aliases (`safeParse`, `validate`, etc.).

### Inferred Type Model
- `InferInput<T>`: The accepted input type at the untrusted boundary.
- `InferOutput<T>`: The resulting validated, coerced, or transformed type.
- **Rule**: Validation-only schemas have `InferInput<T> === InferOutput<T>`; schemas with coercion or transforms maintain separate input and output types.

---

## 5. Structured Error Model & Absolute Privacy

- **Issue Invariants**: Deterministic, path-aware, code-indexed, and machine-readable.
  ```ts
  interface SchemaIssue {
    readonly code: string;
    readonly path: readonly (string | number)[];
    readonly expected?: string;
    readonly message?: string;
  }
  ```
- **Privacy Boundary**: Default issues and diagnostics **must never contain raw received user values**, credentials, tokens, or sensitive payload content.
- **Localization**: Formatting human-readable strings belongs outside the validation hot path or in specialized presentation adapters.

---

## 6. Security Baseline (Active from Day One)

Security review is integral to every slice and not deferred to S4:

```text
┌─────────────────────────────────────────────────────────────┐
│ Mandatory Threat Vectors                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Prototype Pollution (__proto__, constructor, prototype)  │
│ 2. Getter Side-Effects & Proxy Traps                        │
│ 3. Deep Object Nesting & Stack Exhaustion (depth limits)    │
│ 4. Wide Object Graphs & DoS via Pathological Unions         │
│ 5. Catastrophic Regular Expression Backtracking (ReDoS)     │
│ 6. CSP Violations (zero eval(), zero new Function())        │
│ 7. Value Leakage in Logs, Diagnostics, or Error Objects     │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Build-vs-Buy Evaluation Matrix (S7 Target)

| Competitor | Architecture | Primary Strengths | Trade-Offs / Risks |
| --- | --- | --- | --- |
| **Handwritten Baseline** | Direct conditional code | 0 bundle overhead, fastest execution | High maintenance, no declarative composition |
| **Zod 4** | Class/Prototype method chaining | Industry standard, rich ecosystem | Bundle footprint, deep generic compiler cost |
| **Zod Mini** | Tree-shakable functional sub-entry | Lower bundle size | Partial feature subset |
| **Valibot** | Modular pipeline functions | Exceptional tree-shaking, small bundle | Syntax verbosity with nested pipelines |
| **ArkType** | Type-definition string parser | Highly expressive syntax | Runtime parsing overhead, regex JIT considerations |
| **TypeBox** | JSON-Schema first types | Fast schema compilation, standard JSON Schema | Heavy coupling to JSON Schema representation |
| **Ajv** | Pre-compiled JSON Schema engine | High throughput for JSON Schema | Requires code generation / CSP non-compliant modes for max speed |
| **Vii Prototype** | Direct zero-copy IR / pure functions | Tight Vii Form/HTTP fit, zero allocations | Maintenance cost of custom validator |

### Evaluation Dimensions
1. **Runtime Performance**: Valid vs invalid throughput, schema creation overhead, heap allocations.
2. **Bundle Footprint**: Minified and gzipped impact on browser bundles.
3. **TypeScript Compiler Cost**: `tsc --noEmit` duration, declaration generation, instantiation depth.
4. **Correctness & DX**: Error localization, ergonomics, clean inference.
5. **Security & CSP**: No dynamic evaluation, fail-closed handling of hostile input.
6. **Ecosystem & Integration**: Fit for Form, HTTP, Query, Server, and AI tools.
7. **Long-Term Maintenance**: Cost vs differentiated value.

---

## 8. Research Slices Execution & Results (S0 – S7)

All planned research slices have been completed and verified under `research/schema/`:

- **S0 — Architecture + Semantic Boundaries**: Formalized zero-copy validation taxonomy, clean core decoupling, non-throwing `check()`, and Build-vs-Buy evaluation framework.
- **S1 — Runtime Validation Baseline**: Implemented primitives (`string`, `number`, `boolean`, `literal`, `null`, `undefined`, `unknown`) and structures (`object`, `array`, `union`) with zero-copy identity preservation (`research/schema/zero-copy.test.ts`) and prototype pollution security (`research/schema/hostile-security.test.ts`).
- **S2 — Structured Issues & Privacy**: Implemented path formatting (`formatPath`), Form error maps (`createFormErrors`), localization dictionaries (`createLocalizer`), and absolute value isolation (`research/schema/issues-privacy.test.ts`).
- **S3 — Codec / Serialization Semantics**: Implemented bidirectional transformation codecs (`dateFromISOString`, `bigIntFromString`, `jsonCodec`, `urlSearchParamsCodec`, `mapFromEntries`, `setFromArray`) with fail-closed deserialization trust boundaries (`research/schema/codec.test.ts`).
- **S4 — Security, CSP & Complexity Limits**: Integrated nesting depth limits (`DEFAULT_MAX_DEPTH = 32`), cyclic reference detection (`isObjectCycleDetected`), property count bounds (`DEFAULT_MAX_PROPERTIES = 1000`), ReDoS length bounds, and automated static CSP compliance auditing (`research/schema/security-consolidation.test.ts`).
- **S5 — Type Inference & TS Compiler Cost**: Verified `InferInput<T>` and `InferOutput<T>` precision, deep 10-level generic inference, wide 25-field object stress, and sub-second `tsc --noEmit` duration (`research/schema/type-inference.test.ts`).
- **S6 — Integration Contract Fixtures**: Proved clean integration with Vii Form, Vii HTTP Client, Vii Query Cache Hydration, and Standard Schema v1 specification interoperability (`research/schema/integration-fixtures.test.ts`).
- **S7 — Performance & Build-vs-Buy Gate**: Executed reproducible performance benchmarks (`research/schema/schema-benchmarks.test.ts`) and synthesized final architecture verdict.

---

## 9. Empirical Comparative Benchmark Summary

### Pinned Competitors & Environment
- **Node.js**: `v22.17.0` | **V8**: `12.4` | **Architecture**: `darwin-arm64` (Apple Silicon)
- **Handwritten Baseline**: Plain conditional JavaScript validator (`check()`)
- **Zod 4**: `zod@4.4.3` (Pinned)
- **Valibot**: `valibot@1.4.2` (Pinned)
- **ArkType**: `arktype@2.2.3` (Pinned)
- **TypeBox**: `@sinclair/typebox@0.34.52` (`TypeCompiler.Compile` JIT)
- **Vii Research Prototype**: Zero-copy prototype (`research/schema/`)

### Measured Empirical Throughput & Latency (50,000 runs)

| Competitor | Valid Path Ops/Sec | Valid Latency | Invalid Path Ops/Sec | Invalid Latency | Factory Ops/Sec | CSP Model |
| --- | --- | --- | --- | --- | --- | --- |
| **Handwritten Baseline** | **36,932,204** | 0.03 µs | **27,981,138** | 0.04 µs | N/A | Strict |
| **ArkType (2.2.3)** | **22,273,362** | 0.04 µs | **137,947** | 7.25 µs | Moderate | JIT / Regex |
| **TypeBox (0.34.52 JIT)**| **12,828,736** | 0.08 µs | **52,826,202** | 0.02 µs | High (Compile) | Requires unsafe-eval |
| **Valibot (1.4.2)** | **3,286,483** | 0.30 µs | **1,877,159** | 0.53 µs | 164,985 | Strict |
| **Zod 4 (4.4.3)** | **3,255,968** | 0.31 µs | **41,425** | 24.14 µs | 8,885 | Strict |
| **Vii Prototype** | **2,225,577** | 0.45 µs | **2,087,879** | 0.48 µs | **3,099,968** | Strict |

### Comparative Multi-Dimensional Evaluation

1. **Runtime Performance**:
   - For simple type checking, compiled JIT engines (`TypeBox`, `ArkType`) and pure handwritten code achieve peak throughput.
   - On error materialization and issue formatting, `Valibot` and `Vii Prototype` maintain consistent sub-microsecond throughput (~1.9M–2.1M ops/sec), whereas `Zod 4` drops to ~41K ops/sec due to heavy `ZodError` instantiation.
2. **Bundle & Tree-Shaking Impact**:
   - `Valibot`: ~0.6–1.2 kB min+gzip for minimal schema usage due to modular function-first architecture.
   - `Zod 4`: ~4–8 kB min+gzip.
   - `ArkType`: ~8–12 kB min+gzip (due to parser/AST engine).
   - `TypeBox`: ~3–5 kB min+gzip.
3. **Security & CSP Compliance**:
   - `TypeBox` achieves peak performance via dynamic code generation (`new Function()`), which is blocked under strict Content Security Policy (`script-src 'self'`).
   - `Valibot`, `Zod 4`, and `Vii Prototype` are 100% strict CSP compliant (zero `eval`, zero `new Function`).
4. **Developer Experience & Standard Schema Interoperability**:
   - `Zod 4`, `Valibot 1.4`, and `ArkType 2.2` all natively implement the official **Standard Schema v1** specification (`~standard.validate`).
   - Proven by real integration test `research/schema/standard-schema-interop.test.ts`: Zod, Valibot, and ArkType schemas validate seamlessly through the generic Vii Standard Schema boundary.

---

## 10. Build-vs-Buy Final Evaluation & Verdict

### Final Recommendation: **`Wrap` + `Reduce` (Standard Schema First & Minimal Codec Utility)**

1. **Do NOT build a standalone `@vii-labs/schema` validation monolith (`Anti-Own`)**:
   - Building and maintaining a full-scale competing validation engine to match Zod / Valibot / ArkType provides low ROI and high ongoing maintenance drag.
2. **Standard Schema v1 Interoperability as the Core Contract (`Wrap`)**:
   - Vii Form, Vii HTTP, and Vii Query will natively accept **any** schema implementing the cross-ecosystem **Standard Schema v1** specification (`~standard.validate`).
   - Users can bring their preferred validation library (`zod`, `valibot`, `arktype`, `typebox`) without lock-in or adapter friction.
3. **Core Decoupling Invariant Preserved**:
   - `@vii-labs/core` remains 100% zero-dependency, platform-neutral, and completely decoupled from Schema.
4. **Minimal First-Party Codec Utilities (`Reduce`)**:
   - Keep bidirectional serialization codecs (`urlSearchParamsCodec`, `jsonCodec`, `dateFromISOString`) as lightweight utility packages or built-ins in the respective consumer packages (Vii HTTP, Vii Form, Vii Query) rather than requiring a heavyweight schema runtime.
   - No `@vii-labs/schema` or `@vii-labs/codec` package is authorized for publication at this time.
