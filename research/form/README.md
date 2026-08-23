## 1. Overview & Documented Dirty / Identity Semantics

This directory contains the throwaway research prototypes for **F1 (Minimal Field and Form State Prototype)** and **F2 (Nested Objects + Arrays + Identity)**.

### Documented Array Dirty Semantics & Reset Baseline

1. **Definition of Baseline**:
   - The initial baseline for an array consists of its initial list length, its initial item values, and its initial key sequence (`initialKeysState`).
   - For **keyed arrays** (`keyExtractor` present), the key sequence is derived via `keyExtractor(itemValue)`.
   - For **unkeyed arrays**, the key sequence is the generated internal IDs assigned at initial creation.
2. **Order Participation in Dirty State**:
   - Order participates directly in dirty state.
   - If array items are reordered (via `swap` or `move`), the current item key sequence differs from the baseline key sequence, marking `dirty = true`.
   - If items are swapped/moved back to their original baseline order and no child values have changed, the key sequence matches `initialKeysState`, returning `dirty = false`.
3. **Re-establishing Baseline on `reset()`**:
   - Calling `reset()` (with or without arguments) disposes existing item scopes and recreates items.
   - For **unkeyed arrays**, fresh internal IDs are generated and `initialKeysState` is **immediately re-established** to match the fresh IDs. Thus, after `reset()`, `dirty === false`, `touched === false`, and `values` deep-equal the initial baseline.
   - For **keyed arrays**, keys are preserved, child signals are reset to pristine, and `dirty === false`.
4. **Reconciliation in `setValues()`**:
   - **Keyed arrays**: `setValues(next)` re-derives keys from incoming data. Items whose keys exist in the current array are reused (preserving child Scope, touched, and error states), new keys create fresh items, and removed keys have their scopes disposed. `validateUniqueKeys` runs on the re-derived keys to prevent duplicate keys.
   - **Unkeyed arrays**: Positional reuse is performed. When values are shrunk and later regrown back to initial values, the baseline key sequence is restored, returning `dirty = false`.
5. **Path Grammar Hardening**:
   - Paths must strictly separate property and bracket groups. Bracket groups must be followed by `.`, `[`, or end-of-string. A `.` must never be immediately followed by `[`. Malformed paths throw deterministic syntax errors.

---

## 2. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers **40 total assertions**:

- **F1 Baseline & Regression Coverage (17 tests)**:
  - Pristine signals, custom equality comparators, independent touched/error signals, same-value and explicit `undefined` resets.
  - Granular subscription isolation (Field A mutation produces 0 notifications on Field B).
  - Batching multi-field `setValues` into a single aggregate change.
  - Model ownership comparison fixtures (`bindFormToExternalState` bidirectional sync, post-disposal disconnection, feedback loop prevention, idempotent disposal).
- **F2 Nested, Array, Identity & Security Coverage (23 tests)**:
  - Hierarchical Scope teardown proving child computed notifications halt after `form.dispose()`.
  - Strict path syntax parsing (rejecting empty paths, leading/trailing/repeated dots, unclosed brackets, negative indices, non-integer indices, leading-zero indices, missing separators like `tasks[0]b`, and dot-before-bracket like `a.[0]`).
  - Prototype pollution blocking (`__proto__`, `prototype`, `constructor`).
  - Plain record classification vs non-plain object leaf preservation (Date/Map/Set).
  - Deterministic cycle detection.
  - Nested group aggregation and dot-path error collection.
  - Array operations (`push`, `insert`, `remove`, `swap`, `move`) supporting explicit `undefined`.
  - Scoped `keyExtractor` without recursive child pollution.
  - Duplicate key rejection upon initialization and dynamic `setValues`.
  - Reorder dirty semantics (pristine swap marks dirty; restore order marks pristine).
  - Positional path vs stable identity differentiation across reorders.
  - Reset with no args on unkeyed and keyed arrays returning `dirty === false` and `touched === false`.
  - Form root `form.reset()` resetting nested array and returning `form.dirty === false`.
  - `setValues` shrink-then-regrow returning `dirty === false`.
  - Keyed `setValues` reordering matching `keyExtractor` and preserving child Scope / signal state.
  - Deep branch subscription isolation.
