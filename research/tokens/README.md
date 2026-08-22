# Vii Design Tokens Research: Prototype (P6.1)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating the foundational semantics of Phase 6 Design Tokens (P6.1):

- **Targeted Standard**: Design Tokens Community Group (DTCG) published specification **2025.10** (October 28, 2025).
- **Standards Status**: W3C Community Group Report (not a W3C Recommendation / Standards Track specification).
- **Token Layers**: 3-layer conceptual hierarchy (Primitive -> Semantic -> Limited Component).
- **Validation Engine**: Prototype pollution prevention (`__proto__`, `constructor`, `prototype`), depth & node limits, type consistency across aliases, cyclic dependency detection with exact cycle paths, and collision-safe CSS variable generation.
- **Contrast & Accessibility**: Mathematical WCAG 2.1 / 2.2 relative luminance and contrast ratio engine distinguishing explicit criteria (`WCAG 1.4.3 AA Normal/Large`, `WCAG 1.4.6 AAA Normal/Large`, `WCAG 1.4.11 Non-text`, and Focus Indicators) across Light, Dark, and High-Contrast themes.
- **Deterministic Generation**: Byte-stable CSS Custom Properties (`:root` / `[data-theme="dark"]`), TypeScript typed dictionary/constants, and machine-readable JSON tooling manifests.
- **Build-vs-Buy Evaluation**: Documented in `docs/strategy/DESIGN_TOKENS_BUILD_VS_BUY_EVALUATION.md`.

---

## Verification Commands

Run the focused test suite, benchmarks, and type check:

```bash
pnpm exec vitest run research/tokens/*.test.ts
pnpm exec tsc --noEmit -p research/tokens/tsconfig.json
```

---

## 1. DTCG 2025.10 Specification Alignment

The prototype adopts the typed structured format defined by the DTCG 2025.10 report:

### Supported Token Types (`$type`)

- **`color`**: Typed structured object `{ colorSpace: "srgb" | "display-p3" | ..., components: [r, g, b], alpha?: number }` rather than arbitrary CSS strings.
- **`dimension`**: Structured object `{ value: number, unit: "px" | "rem" | "em" | "%" | "vw" | "vh" | "pt" }`.
- **`duration`**: Structured object `{ value: number, unit: "ms" | "s" }`.
- **`cubicBezier`**: 4-number array `[P1x, P1y, P2x, P2y]` with x coordinates bounded to `[0, 1]`.
- **`number`**: Unitless finite number.
- **`fontFamily`**, **`fontWeight`**, **`shadow`**, **`border`**, **`typography`**.

### Alias Syntax

Aliases strictly follow the standard DTCG syntax: `"{path.to.token}"` (e.g. `"{color.violet.600}"`).

---

## 2. Token Graph Resolution & Validation

The prototype pipeline ensures:

1. **Non-Mutation**: Input AST / token JSON documents are never mutated in-place.
2. **Topological Resolution**: Deep and multi-hop aliases resolve to terminal concrete values.
3. **Type Consistency**: Cross-type alias references (e.g. dimension token referencing color token) fail deterministically with `TokenValidationError`.
4. **Cycle Safety**: Depth-first graph traversal detects reference cycles (e.g., `A -> B -> C -> A`) and outputs the complete cycle trace.
5. **Collision Detection**: Output CSS variable names (e.g., `--vii-color-primary`) are verified for collisions across casing and delimiter styles.

---

## 3. WCAG 2.1 / 2.2 Contrast & Accessibility Verification

Rather than using an ambiguous boolean pass flag, the contrast engine evaluates color pairs against specific WCAG criteria:

- **WCAG 1.4.3 Contrast (Minimum) - Normal Text**: $\ge 4.5:1$ (Level AA)
- **WCAG 1.4.3 Contrast (Minimum) - Large Text**: $\ge 3.0:1$ (Level AA)
- **WCAG 1.4.6 Contrast (Enhanced) - Normal Text**: $\ge 7.0:1$ (Level AAA)
- **WCAG 1.4.6 Contrast (Enhanced) - Large Text**: $\ge 4.5:1$ (Level AAA)
- **WCAG 1.4.11 Non-text Contrast**: $\ge 3.0:1$ (Level AA UI components, active state borders)
- **Focus Indicator Adjacent Contrast**: $\ge 3.0:1$ (Level AA focus rings)

### Benchmark & Validation Results

- Light theme body text (`color.foreground` on `color.background`): **19.5:1** (Passes WCAG AAA Normal $\ge 7.0:1$).
- Light theme muted text (`color.mutedForeground` on `color.background`): **7.8:1** (Passes WCAG AA Normal $\ge 4.5:1$).
- Dark theme body text (`color.foreground` on `color.background`): **18.7:1** (Passes WCAG AAA Normal $\ge 7.0:1$).
- Light theme focus ring (`focus.ring` against canvas): **4.6:1** (Passes Focus Adjacent $\ge 3.0:1$).
