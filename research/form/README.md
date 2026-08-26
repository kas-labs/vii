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
8. **Consequence of Null-Prototype `values` (from Item 4's Prototype Pollution Hardening)**:
    - `fields`, the `form.values.get()` result, and the `errors` record are all allocated with
      `Object.create(null)` (see Item 4). This is a deliberate consequence of that hardening, not an
      incidental detail, and it is visible to every consumer of `form.values`:
      - `values.hasOwnProperty(key)` **throws** (`Object.prototype.hasOwnProperty` does not exist on a
        null-prototype object). Use `Object.hasOwn(values, key)` instead.
      - `values.constructor` is `undefined`.
      - `expect(values).toStrictEqual({ foo: "bar" })` in a consumer's test will **not** match, because
        `toStrictEqual` also compares prototypes and a plain object literal has `Object.prototype`. Spread
        into a plain object first: `expect({ ...values }).toStrictEqual({ foo: "bar" })`.
    - Unaffected: `JSON.stringify(values)` and object spread (`{ ...values }`) both work exactly as they
      would on a normal object, since neither depends on the prototype chain.

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
- **Batch 6 Cycle Protection & Scope-Graph Fidelity Coverage (4 tests)**:
  - Finding 18: Reference-based echo suppression in `bindFormToExternalState` (`lastPushedOutward`, `lastAppliedInward`).
  - Finding 18: Consecutive chained sync counter (`consecutiveSyncCount <= MAX_EXTERNAL_SYNC_DEPTH`) catching deferred ping-pong loops across the scheduler queue.
  - Finding 18: Spy-verified single outward write per form edit with zero echo re-entry into `form.setValues`.
  - Finding 18: Re-application of identical object reference after superseding update to ensure updates are not dropped.
  - Scope-Graph Fidelity: Verification that child item scopes created via `createChild` maintain `parentScopeId` linkage in `scope.created` events and auto-detach in O(1) time upon child disposal.

---

## 3. External State Binding Cycle Protection & Scope-Graph Fidelity

1. **Root Cause of Deferred Cycle Flaw (Finding 18)**:
   - Core notifications are deferred: `notifier.notify` queues jobs onto `pendingJobs` in `scheduler.ts`, running each notification in sequence.
   - When the form pushed values outward to an external store, `externalState.set` scheduled the external subscriber to run in a subsequent job *after* the `finally` block had already cleared `isSyncingToExternal` and reset `syncDepth` to 0.
   - The echo arriving at `externalState.subscribe` therefore ran unguarded without direction flags or depth awareness.
2. **Multi-Layered Cycle Protection Design**:
   - **Layer 1: Directional Reference Markers (`lastPushedOutward`, `lastAppliedInward`)**:
     - When `form.values.subscribe` pushes `nextValues` outward, it sets `lastPushedOutward = nextValues`.
     - When `externalState.subscribe` runs, it compares `nextExternal === lastPushedOutward`. If identical by reference, the echo is absorbed, `lastPushedOutward` is cleared, and `form.setValues` is skipped entirely.
     - Symmetrically, when `externalState.subscribe` applies `nextExternal` inward, it sets `lastAppliedInward = nextExternal`. When `form.values.subscribe` runs, if `nextValues === lastAppliedInward`, the echo is absorbed and outward push is skipped.
     - Each marker is cleared once its echo has been absorbed or superseded by a new user-initiated update, ensuring genuine subsequent updates with identical references are never dropped.
   - **Layer 2: Chained Consecutive Sync Counter (`consecutiveSyncCount`)**:
     - If a binding is deliberately non-convergent (e.g. an external store that mutates or normalizes the object on every write to create a new object reference), reference equality will not match.
     - `consecutiveSyncCount` increments on each chained ping-pong step across deferred scheduler jobs. If `consecutiveSyncCount > MAX_EXTERNAL_SYNC_DEPTH` (50), `enterSyncDepth` throws `new Error("Cyclic synchronisation detected in bindFormToExternalState")`, halting the infinite loop.
   - **Layer 3: Synchronous Stack Depth Backstop (`syncDepth`)**:
     - Protects against direct synchronous re-entrancy within the same call stack.
   - **Layer 4: Structural Array Reconciliation No-op Guard**:
     - `FieldArray.setValues` skips `itemsState.set` when reconciled items are structurally unchanged.
3. **Core Scope Graph Fidelity & Automatic Child Detachment**:
   - `packages/core/src/scope.ts`'s `createChild` captures the detach handle returned by `use(child)` and registers `child.use(() => { detach(); })`.
   - When a child scope is disposed (e.g. an array item removed or replaced), it automatically detaches itself from its parent's retained resources in O(1) time without leaking memory.
   - Because child scopes are instantiated via `parent.createChild(...)`, they properly record `parentScopeId` in `scope.created` diagnostic events and inherit the parent's diagnostics runtime across all creation contexts.
4. **Audited Seam Combinations (All Verified)**:
   - External binding + unkeyed array (equal length, grow, shrink to empty `[]`).
   - External binding + keyed array with `keyExtractor` reordering.
   - External binding + arrays nested in field groups.
   - Form-side array mutations (`push`) propagating exactly once to external store.
   - 200 sequential updates on scalar and alternating array forms.
   - `form.dispose()` during external binding halting bidirectional propagation.

---

## 4. F3: Synchronous Validation Scheduling & Structured Issues

### Overview & Architecture
F3 introduces synchronous validation scheduling and machine-readable structured issues to Vii Form without expanding into a schema engine or async validation pipeline (which belongs to F4).

### Key Decisions & Contracts
1. **Deterministic Synchronous Rule Contract**:
   - `SyncValidationRule<T, Ctx> = (value: T, context: Ctx) => FieldIssue | readonly FieldIssue[] | null | undefined`.
   - Rules are strictly synchronous. If a rule returns a Promise or thenable, it is fast-rejected with an explicit `TypeError` stating that async validation is not supported in F3.
   - Rules are pure functions with respect to Form state and must not mutate internal signals during evaluation.
2. **Structured Issue Taxonomy (`FieldIssue`)**:
   - `code`: required machine-readable string identifier (e.g. `"required"`, `"min_length"`).
   - `message`: optional human-readable message.
   - `path`: structured array of path segments (`readonly (string | number)[]`), not concatenated dot strings.
   - `source`: `"validation"`.
   - `ruleId`: optional identifier.
   - **Privacy / Value-Safety**: Raw field values and validator object references are never captured in `FieldIssue` or diagnostic payloads.
3. **Validation Trigger Semantics (`ValidationTriggerMode`)**:
   - `"change"`: runs on leaf `setValue` or group `setValues` mutations. Both leaf and group nodes honor their own `validateOn` set here: a node configured `validateOn: "submit"` is not evaluated by a mutation.
   - `"blur"`: runs on `setTouched(true)`.
   - `"submit"`: runs form-wide validation across all nodes in the tree without altering touched/dirty.
   - `"manual"`: explicitly invokes `node.validate()` on demand.
4. **Validation Status Taxonomy (`ValidationStatus`)**:
   - Form and field nodes distinguish `"unvalidated"`, `"valid"`, and `"invalid"`.
   - Pristine nodes start as `"unvalidated"`. `valid` computed evaluates `errors.length === 0 && issues.length === 0` (backward-compatible with F1/F2).
5. **Array Item Issue Ownership vs Positional Paths**:
   - When dynamic array items are swapped, moved, or reordered, internal issues remain bound to the conceptual item node.
   - The parent array's computed issues dynamically map the issue's presentation path to its current position (`[index, ...childPath]`).
6. **Prototype Pollution Defense**:
   - Rule-produced issue codes and path segments reject `__proto__`, `constructor`, `prototype`.
   - Issue records and maps use `Object.create(null)` dictionaries.
   - The legacy `setErrors(string[])` surface is exempt: those strings are opaque human messages, never used as keys, so they are wrapped as `{ code: "legacy.error", message }` and keep the F1/F2 contract for `""` and reserved-word text.
7. **Derived Issue Views Are Scope-Owned**:
   - `FieldArray.issues` and `FieldArray.validationStatus` are single computeds created once per array and registered with the owning scope, so repeated reads neither allocate nor retain dependency subscriptions.
8. **Throwing Validator Behavior**:
   - Uncaught exceptions inside validation rules propagate as runtime errors without leaking field values in diagnostics.

---

## 5. F4: Asynchronous Validation, Cancellation & Revision Management

### Overview & Architecture
F4 extends Vii Form validation with asynchronous rules, cancellation semantics via explicit `AbortSignal`, generation/revision tracking to suppress stale race conditions, opt-in debounce scheduling, and clean lifecycle integration with Vii Scopes.

### Key Decisions & Contracts
1. **Async Rule Contract**:
   - `AsyncValidationRule<T, Ctx> = (value: T, context: Ctx & { readonly signal: AbortSignal }) => Promise<FieldIssue | readonly FieldIssue[] | null | undefined>`.
   - `ValidationRule<T, Ctx> = SyncValidationRule<T, Ctx> | AsyncValidationRule<T, Ctx>`.
2. **Synchronous Precedence & Segregation**:
   - Synchronous rules execute first. If any synchronous rule produces an issue, the field/group transitions to `"invalid"` immediately, and asynchronous validation calls are cancelled/skipped.
   - If synchronous rules pass and async rules exist, the field transitions to `pending: true` while async rules execute in parallel with a shared `AbortSignal`.
3. **Monotonic Revision Authority & Stale-Result Suppression**:
   - Each field and group maintains a monotonic `currentRevision` counter.
   - On every mutation or explicit re-validation, any in-flight `AbortController` is aborted, active debounce timers are cancelled, and `currentRevision` is incremented.
   - When an async validator resolves, it commits state *only* if `revision === currentRevision`, `!signal.aborted`, and `!isDisposed`. Late resolutions from superseded validations are strictly suppressed.
4. **Cancellation vs Validation Failure**:
   - Cancellation is NOT validation failure. When a validator aborts (or rejects with `AbortError`), no validation issue is produced, and validation status is not marked invalid.
   - **Rejection ownership**: a validation started by a trigger (`setValue`, `setTouched`, `setValues`, or a debounce timer) is fire-and-forget, so nothing holds its promise. A non-abort rejection on that path is recorded as `field.validation.async.failed` / `group.validation.async.failed` (rule error *name* only, never the message, which can embed field values) and then swallowed, because letting it escape would surface as an unhandled rejection and, under Node's default policy, terminate the process. `pending` is still cleared, so the node never strands. A rejection from an explicit `validate()` call is delivered to the caller unchanged. Surfacing rule failures as user-visible issues is deliberately out of scope for F4.
5. **Scope Lifecycle Integration**:
   - Disposing a field, resetting a form, or removing an array item aborts active async validations immediately.
   - Disposed nodes reject subsequent `validate()` invocations with a clean `Error("Form node is disposed")`.
6. **Debounce Scheduling**:
   - `debounceMs` is opt-in (default `0`). When configured, rapid `"change"` triggers debounce execution while cancelling prior timers.
   - Explicit triggers (`"manual"`, `"submit"`, `"blur"`) bypass debounce and validate immediately.
7. **Array & Cross-Field Group Validation**:
   - Dynamic array item validations preserve conceptual item node identity across array mutations (`swap`, `move`, `remove`).
   - Group rules receive aggregate child values and aggregate child + group `pending` states.

---

## 6. F5: Parsing, Input-Output Types & Standard Schema Boundary

### Overview & Architecture
F5 introduces explicit value stages (`RawInput` -> `ParsedValue` -> `ValidatedValue` -> `OutputValue`), parser contracts with structured `ParseIssue` taxonomy, dirty semantics based on domain values, output transformations on fields, groups, and arrays, and provider-neutral Standard Schema v1 validation (verified with Zod 4, Valibot, and ArkType).

### Key Decisions & Contracts
1. **Value Pipeline Stages**:
   - `RawInput` ($\text{TRaw}$): Raw input from user interface/DOM elements (e.g. `string` for text/numeric inputs, `boolean | string` for checkboxes).
   - `ParsedValue` ($\text{TValue}$): Typed domain model representation (e.g. `number`, `Date`, `string`).
   - `ValidatedValue` ($\text{TValue}$): Domain value certified by synchronous and asynchronous validation rules.
   - `OutputValue` ($\text{TOutput}$): Immutable transformed submission payload produced via `OutputTransform<TValue, TOutput>`.
2. **Parser Contract & Parse Failure Semantics**:
   - `FieldParser<Raw, Value> = (raw: Raw) => ParseResult<Value>`.
   - `ParseResult<Value> = { ok: true; value: Value } | { ok: false; issue: ParseIssue | { code: string; message?: string } }`.
   - `ParseIssue` has `source: "parse"` and structured `code`, `message`, `path`.
   - **Invariant**: When raw input fails parsing, the field transitions to `parseStatus: "invalid"` and `validationStatus: "invalid"`, the structured `ParseIssue` is recorded in `field.issues` and `field.parseIssue`, and **validation rules are strictly bypassed** (preventing rules from receiving invalid or unparsed types).
3. **Dirty Semantics & Raw Ownership**:
   - UI/adapter layers own raw presentation text for invalid inputs.
   - Core retains `rawValue` and `parseIssue` so raw user keystrokes are not lost.
   - `dirty` state evaluates whether domain `value` differs from `initialValue` (e.g. typing `"05"` when initial is `5` parses to `5` and remains `dirty === false`).
   - **Rebasing a parsed field**: a parser has no inverse, so a new domain baseline cannot be cast back into a raw one. `reset(nextInitial, nextInitialRaw)` takes both stages; `reset(nextInitial)` on a field configured with a parser throws rather than silently storing a domain value in the `Raw` slot. `reset()` with no argument restores both recorded baselines, and on a parser-less field (`Raw = Value`) the single-argument form stays valid.
   - `parseStatus` stays `"unparsed"` for the whole life of a field with no parser: there is no parse stage to report on.
4. **Output Transformations**:
   - `OutputTransform<Value, Output> = (value: Value) => Output`.
   - Field exposes `output` computed and `getOutput()`.
   - `FieldGroup` and `FieldArray` aggregate child `getOutput()` values into structured output trees.
5. **Standard Schema v1 Provider Neutrality**:
   - Provider-neutral adapter: `standardSchema(schema)` bridges any Standard Schema v1 (`~standard`) object into a Vii `ValidationRule`.
   - Standard Schema v1 implementations validated:
     - **Zod 4** (`zod`)
     - **Valibot** (`valibot`)
     - **ArkType** (`arktype`)
   - **TypeBox Status**: TypeBox does not natively implement the `~standard` v1 interface without external wrapper, and is confirmed non-native.
   - **Fail-closed on malformed payloads**: a result carrying an `issues` property that is not an array is a provider contract violation, not a success. The adapter throws instead of falling through to `"valid"`, so an unreadable failure payload can never certify a value.
6. **Async Standard Schema & Cancellation Limitations**:
   - Standard Schema specification does not accept `AbortSignal` in `validate()`.
   - Cancellation is handled via **stale-result suppression**: when a superseding mutation arrives, Form increments its monotonic revision and aborts internal controllers, strictly suppressing late async schema results from committing.
7. **Security & Prototype Pollution Hardening**:
   - Prototype pollution attempts (`__proto__`, `constructor`, `prototype`) in parse issue codes, schema vendor issue codes, or issue paths are defensively blocked with security errors.
   - Known trade-off: issue paths are only ever spread into other arrays, never used to index an object, so this guard is fail-closed rather than protective. A schema validating a domain object with a key literally named `constructor` aborts the whole validation instead of reporting the issue. Revisiting it means changing the F3 contract and is deliberately left out of F5.
   - Diagnostics payloads record structural events (`field.parse.completed`, `field.schema.validation.started`, etc.) without exposing raw input values or sensitive error messages.
