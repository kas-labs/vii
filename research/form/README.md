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
    - **Key Extractor Scope**: `keyExtractor` is propagated recursively across all construction paths (nested groups, array items, child arrays). If `keyExtractor(item)` returns `undefined` (e.g. for scalar array items), item creation safely falls back to unique internal IDs (`vii_item_*`).
4. **Path Grammar & Object Security Hardening**:
    - Paths must strictly separate property and bracket groups. Bracket groups must be followed by `.`, `[`, or end-of-string (rejecting `tasks[0]b`). A `.` must never be immediately followed by `[` (rejecting `a.[0]`). Malformed paths throw deterministic syntax errors.
    - `fields`, `valuesComputed`, and `errorsComputed` are created with `Object.create(null)` and own-property checks are enforced at all lookup and iteration points. Own properties named `__proto__`, `constructor`, or `prototype` do not pollute the prototype chain or drop fields.
5. **Atomic Mutations & Input Validation**:
    - `FieldArray.push`, `insert`, `setValues`, and `reset` validate keys and inputs first before mutating state or disposing existing items.
    - Non-array inputs to `FieldArray.setValues`/`reset` and non-object inputs to `FieldGroup.setValues`/`reset` throw explicit `TypeError`s with 0 side effects.
    - `insert(index, value)` enforces strict bounds (`0 <= index <= length`), throwing `RangeError` on invalid indices.
6. **Parent Scope Resource Detach (O(1) Lifetime Management)**:
    - Array item scopes attach to the parent Scope with a detach handle (`scope.use(itemScope)`).
    - Upon item disposal (`remove`, `reset`, `setValues`), the child scope is detached immediately from the parent Scope's resource list in O(1) time, ensuring push/remove cycles never accumulate dead item scopes in long-lived parent scopes.
7. **Post-Dispose Contract**:
    - After `form.dispose()` is called, the `FormInstance` transitions to disposed.
    - Calling `getNode`, `setValues`, or `reset` throws `Error("Form is disposed")`.
    - Reading `form.values.get()` throws `Error("Computed is disposed")`.
    - `dispose()` is idempotent.

---

## 2. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers **65 total assertions**:

- **F1 Baseline & Regression Coverage (28 tests)**:
  - Pristine signals, custom equality comparators, independent touched/error signals, same-value and explicit `undefined` resets.
  - Granular subscription isolation (Field A mutation produces 0 notifications on Field B).
  - Batching multi-field `setValues` into a single aggregate change.
  - Model ownership comparison fixtures:
    - `bindFormToExternalState` bidirectional sync, post-disposal disconnection, feedback loop prevention, idempotent disposal.
    - External binding + unkeyed array: equal length set, growing set, shrinking to `[]`.
    - External binding + keyed array: external reorder with `item.id` matching `keyExtractor`.
    - External binding + nested array inside group.
    - Form-side mutation (`arr.push`) propagating to external store exactly once.
    - 200 sequential external `store.set` updates on scalar bound form.
    - 200 sequential form-side `setValue` updates on scalar bound form.
    - 200 sequential external updates alternating array shapes.
    - Synchronous re-entrancy depth guard throwing deterministic error on cyclic setup and remaining usable for 100 normal syncs afterward.
    - `form.dispose()` during external binding cleanly stopping bidirectional propagation.
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
- **Batch 5 Data Correctness & Lifetime Coverage (9 tests)**:
  - Finding 10: `__proto__`, `constructor`, `prototype` as own keys on null-prototype objects without dropping fields or polluting prototype.
  - Finding 11: `getNode` returning `undefined` for prototype members (`toString`, `valueOf`, `hasOwnProperty`, `constructor`).
  - Finding 12: Rejection of non-array values in `FieldArray.setValues` / `reset` and non-object values in `FieldGroup.setValues` / `reset`.
  - Finding 13: Propagation of `keyExtractor` across nested groups and nested array items.
  - Finding 14: Atomicity of duplicate-key `setValues`, `push`, and `insert` with rollback of newly created scopes and non-mutation of existing nodes.
  - Finding 14: Atomicity of `reset` with a throwing `keyExtractor` leaving array nodes and signals alive.
  - Finding 15: Consistent post-dispose contract throwing `Error("Form is disposed")` on all `FormInstance` methods.
  - Finding 16: Strict index validation in `FieldArray.insert` throwing `RangeError` on invalid indices.
  - Finding 17: Diagnostics-verified parent scope resource count proving 0 accumulation of dead item scopes across push/remove cycles.

---

## 3. F1 + F2 Seam Audit & Re-entrancy Protection

1. **Root Cause of BUG 7 (Blocker Cycle)**:
   - `FieldArray.setValues(next)` was allocating a fresh `const newItems = [...]` and calling `itemsState.set(newItems)` unconditionally on every reconciliation, even when all items were positionally identical and unchanged in length.
   - Because `itemsState` received a new array reference, `valuesComputed` marked itself dirty and evaluated, firing `form.values.subscribe` in `bindFormToExternalState`.
   - This notified `externalState.set`, triggering `externalState.subscribe`, which called `form.setValues` back into `FieldArray.setValues`, creating a synchronous infinite ping-pong loop that never yielded to the event loop.
   - **Fix**: In both keyed and unkeyed branches of `FieldArray.setValues`, `itemsState.set(newItems)` is called strictly when `hasStructuralChange === true` (length change or changed item reference).
2. **Deterministic Re-entrancy Depth Counter (Fix for BUG 8)**:
   - `bindFormToExternalState` implements a true depth counter (`enterSyncDepth` and `exitSyncDepth`).
   - Every entry increments `syncDepth`. On completion of the sync operation, `finally` calls `exitSyncDepth()` (decrementing `syncDepth`).
   - If nested synchronous re-entrancy exceeds `MAX_EXTERNAL_SYNC_DEPTH = 50`, `syncDepth` is reset to 0 and throws `new Error("Cyclic synchronisation detected in bindFormToExternalState")`.
   - Post-throw, `syncDepth` returns to 0 and the bound form remains fully operational for normal synchronisations.
3. **Audited Seam Combinations (All Verified)**:
   - External binding + unkeyed array (equal length, grow, shrink to empty `[]`).
   - External binding + keyed array with `keyExtractor` reordering.
   - External binding + arrays nested in field groups.
   - Form-side array mutations (`push`) propagating exactly once to external store.
   - 200 sequential updates on scalar and alternating array forms.
   - `form.dispose()` during external binding halting bidirectional propagation.
