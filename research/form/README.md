## 1. Overview & Documented Dirty / Identity Semantics

This directory contains the throwaway research prototypes for **F1 (Minimal Field and Form State Prototype)** and **F2 (Nested Objects + Arrays + Identity)**.

### Documented Array Dirty Semantics & Reset Baseline

1. **Dirty Semantics Choice: Option (a) Identity-Strict**:
   - **Rule**: An array's dirty state evaluates three conditions:
     1. Length matches initial baseline length.
     2. Every item's `id` sequence matches `initialKeysState` in exact order.
     3. Every child item node is pristine (`!node.dirty`).
   - **Consistency across mutation paths**:
     - `remove(1)` + `push("b")`: values equal initial `["a","b"]`, but pushed item has a newly generated identity -> `dirty === true`.
     - `setValues(["a"])` + `setValues(["a","b"])`: values equal initial `["a","b"]`, but regrown item at index 1 is a new identity -> `dirty === true`.
   - **Rationale & Tradeoff**:
     - _Rationale_: Eliminates fragile heuristics (e.g. synthetic baseline key restoration) that caused collision regressions on unkeyed arrays. Guarantees that any structural manipulation or recreation of an item marks the array dirty until explicit `reset()`.
     - _Tradeoff_: Restoring identical scalar values via structural `push` or `setValues` remains `dirty = true` unless re-established via `reset()`.
2. **Re-establishing Baseline on `reset()`**:
   - Calling `reset()` (with or without arguments) disposes existing item scopes and recreates items.
   - For **unkeyed arrays**, fresh internal IDs are generated and `initialKeysState` is **immediately re-established** to match the fresh IDs. Thus, after `reset()`, `dirty === false`, `touched === false`, and `values` deep-equal the baseline.
   - For **keyed arrays**, keys are preserved, child signals are reset to pristine, and `dirty === false`.
3. **Key Derivation Timing & Reconciliation in `setValues()`**:
   - **`item.id` Timing**: In keyed arrays, `item.id` is derived at item creation and synchronized during `setValues()`. If a caller modifies a child field that contains the key in-place (e.g. `row.fields.id.setValue("newKey")`), `item.id` is _stale-until-next-setValues_. When `setValues()` is invoked, `item.id` is re-stamped to match `keyExtractor(value)` for every item.
   - **Keyed Reconciliation**: `setValues(next)` re-derives keys from incoming data. Items whose keys match existing items are reused (preserving child Scope, touched, and error states), newly introduced keys create fresh items, and disappeared keys have their child scopes synchronously disposed. `validateUniqueKeys` runs on the re-derived keys to prevent duplicate keys.
   - **Unkeyed Reconciliation**: Positional reuse is performed for existing indices (`setValue`/`setValues`), removed trailing items are disposed, and regrown indices create fresh items with fresh unique internal IDs. Never throws duplicate key errors on internal IDs.
4. **Path Grammar Hardening**:
   - Paths must strictly separate property and bracket groups. Bracket groups must be followed by `.`, `[`, or end-of-string (rejecting `tasks[0]b`). A `.` must never be immediately followed by `[` (rejecting `a.[0]`). Malformed paths throw deterministic syntax errors.

---

## 2. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers **45 total assertions**:

- **F1 Baseline & Regression Coverage (17 tests)**:
  - Pristine signals, custom equality comparators, independent touched/error signals, same-value and explicit `undefined` resets.
  - Granular subscription isolation (Field A mutation produces 0 notifications on Field B).
  - Batching multi-field `setValues` into a single aggregate change.
  - Model ownership comparison fixtures (`bindFormToExternalState` bidirectional sync, post-disposal disconnection, feedback loop prevention, idempotent disposal).
- **F2 Nested, Array, Identity & Security Coverage (28 tests)**:
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
  - Unkeyed `remove(0)` followed by equal length `setValues` does not throw and maintains unique IDs.
  - Unkeyed `remove` -> `setValues` -> `reset()` returning `dirty === false`.
  - Exhaustive ID uniqueness across mixed mutation chains.
  - In-place key field edit followed by `setValues` re-stamping `item.id === keyExtractor(value)`.
  - Keyed `setValues` key change disposing old child scope and creating fresh item.
  - Identity-strict dirty consistency between `remove+push` and `setValues shrink+regrow`.
  - Keyed `setValues` reordering matching `keyExtractor` and preserving child Scope / signal state.
  - Deep branch subscription isolation.
