# Vii Form Research — F1 & F2 Prototypes

> **Status**: Completed Slices (F1 & F2 Prototypes & Evidence Corrections)
> **Governing Roadmap**: [`docs/roadmap/FORM_RESEARCH.md`](../../docs/roadmap/FORM_RESEARCH.md)
> **Package Authorization**: None (`@vii-labs/form` is NOT created or published)

---

## 1. Overview

This directory contains the throwaway research prototypes for **F1 (Minimal Field and Form State Prototype)** and **F2 (Nested Objects + Arrays + Identity)**.

The research objectives and verified evidence boundaries are:

1. **Nested Plain Records (`FieldGroup`)**:
   - Recursively expands **only** plain object records (`Object.prototype` or `null` prototype).
   - Non-plain objects (e.g. `Date`, `Map`, `Set`, `RegExp`, class instances) remain scalar leaf `FieldState` nodes.
   - Detects cyclic input graphs and rejects them with a deterministic error.
2. **Dynamic Repeatable Collections (`FieldArray`)**:
   - Supports `push`, `insert`, `remove`, `swap`, and `move` operations.
   - Supports array elements containing explicit `undefined` when type allows without treating it as a missing element.
   - Stable item identity via generated internal IDs or application `keyExtractor`.
   - Rejects duplicate application keys with a deterministic configuration error.
   - Scopes `keyExtractor` strictly to that specific array node (no unchecked recursive inheritance).
3. **Reorder Dirty Semantics**:
   - **Provisional Research Semantic**: order participates in dirty state. Swapping/moving pristine elements marks the array `dirty = true`; returning them to the original order restores `dirty = false`.
4. **Scope Ownership & Deterministic Teardown**:
   - All `FieldArray` item scopes are created as real child scopes or registered disposables of the parent Form/Array Scope.
   - Calling `form.dispose()` synchronously halts all downstream computed updates in retained item nodes.
   - Disposal is strictly idempotent.
5. **Path Resolution Grammar & Security**:
   - Strict syntax parsing: rejects empty paths, leading/trailing/repeated dots, unclosed brackets, negative indices, non-integer indices, and leading-zero indices.
   - Hardened against Prototype Pollution (`__proto__`, `prototype`, `constructor`).
   - Differentiates positional path lookup (`getNode("tasks[0]")`) from persistent item identity (`item.id`).
6. **Reset Semantics**:
   - Resetting an unkeyed array re-generates internal IDs.
   - Resetting a keyed array preserves application keys while resetting child signals (`touched`, `pending`, `errors`, `dirty`).
   - Disposes all replaced child scopes.

---

## 2. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers **33 total assertions**:

- **F1 Baseline & Regression Coverage (17 tests)**:
  - Pristine signals, custom equality comparators, independent touched/error signals, same-value and explicit `undefined` resets.
  - Granular subscription isolation (Field A mutation produces 0 notifications on Field B).
  - Batching multi-field `setValues` into a single aggregate change.
  - Model ownership comparison fixtures (`bindFormToExternalState` bidirectional sync, post-disposal disconnection, feedback loop prevention, idempotent disposal).
- **F2 Nested, Array, Identity & Security Coverage (16 tests)**:
  - Hierarchical Scope teardown proving child computed notifications halt after `form.dispose()`.
  - Strict path syntax parsing and security rejection.
  - Plain record classification vs non-plain object leaf preservation (Date/Map/Set).
  - Deterministic cycle detection.
  - Nested group aggregation and dot-path error collection.
  - Array operations (`push`, `insert`, `remove`, `swap`, `move`) supporting explicit `undefined`.
  - Non-propagating `keyExtractor` and duplicate key rejection.
  - Reorder dirty semantics (pristine swap marks dirty; restore order marks pristine).
  - Positional path vs stable identity differentiation across reorders.
  - Reset identity and scope cleanup semantics.
  - Deep branch subscription isolation.
