# Schema & Codec Research: S1 Runtime Validation Baseline

> **Status**: S1 Research Prototype Completed  
> **Target**: Non-throwing runtime validation baseline and zero-copy verification  
> **Prerequisites**: S0 Architecture & Semantic Boundaries (`docs/roadmap/SCHEMA_RESEARCH.md`)

---

## 1. Overview

This directory contains the initial research prototype (**S1**) for Vii Schema. It proves the fundamental non-throwing validation contract (`check()`), throwing convenience (`parse()`), zero-copy success path (`result.value === input`), and day-one hostile security defenses.

---

## 2. Implemented Baseline Scope

### Primitives
- `v.string()`: `.min()`, `.max()`, `.regex()`, `.email()`
- `v.number()`: `.min()`, `.max()`, `.int()`, `.finite()`
- `v.boolean()`
- `v.literal(val)`
- `v.null()`, `v.undefined()`, `v.unknown()`

### Structures
- `v.object({ ... })`: Zero-copy object validation with path tracking and prototype pollution protection.
- `v.array(element)`: Zero-copy array validation with element index path tracking.
- `v.union(...branches)`: Branch-isolated union evaluation.

### Modifiers & Refinements
- `.optional()`: Accepts `undefined` or delegates to inner schema.
- `.nullable()`: Accepts `null` or delegates to inner schema.
- `.refine(predicate, options)`: Pure synchronous custom validation constraint.

---

## 3. Verification & Security Evidence

- **Unit Tests**: `schema-validation.test.ts` (primitives, structures, refinements, `parse()`).
- **Zero-Copy Invariant**: `zero-copy.test.ts` verifies that `result.ok && result.value === input` across objects, nested objects, and arrays.
- **Hostile Inputs**: `hostile-security.test.ts` verifies fail-closed rejection of `__proto__`/`constructor`/`prototype` pollution, getter traps, and proxy exceptions.

```bash
pnpm exec vitest run research/schema/*.test.ts
```
