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
7. **Security & Prototype Pollution Hardening (Structured Issue Paths Are Data)**:
   - **Data vs Sink Principle**: Structured issue paths (`FieldIssue.path`, `ParseIssue.path`, `ValidationIssue.path`) are treated as immutable data. Reserved JavaScript property names (`__proto__`, `constructor`, `prototype`) are not rejected merely because they occur as path segments, allowing schema validators (Zod 4, Valibot, ArkType) and custom rules to report issues on legitimate domain fields with these names.
   - **Sink Enforcement**: Security enforcement occurs at traversal/materialization sinks. Path-based navigation APIs (`parsePath`, `getNode`) interpret strings as navigation instructions and strictly block reserved words. Issue maps, field maps, and values containers use null-prototype objects (`Object.create(null)`), Maps, or `Object.hasOwn` checks to prevent prototype pollution.
   - **Issue Codes**: Issue codes (`FieldIssue.code`, `ParseIssue.code`, `ValidationIssue.code`) reject prototype pollution strings (`__proto__`, `constructor`, `prototype`) defensively.
   - **Diagnostics Privacy**: Diagnostics payloads record structural events (`field.parse.completed`, `field.schema.validation.started`, etc.) without exposing raw input values or sensitive error messages.

---

## 7. F6: Submission Lifecycle, Server Errors & Reset / Reinitialize

### Overview & Architecture
F6 implements the complete submission lifecycle state machine (`idle` -> `validating` -> `submitting` -> `succeeded` / `failed` / `cancelled`), pre-submission parse and validation gates, decoupled application action invocation with `AbortSignal`, configurable duplicate submission handling (`drop`, `reject`, `supersede`), monotonic revision authority for stale-result suppression, server issue taxonomy (`ServerIssue`), structured server issue routing (including array item identity snapshots across in-flight reorders and removals), fine-grained server issue clearing policies, and explicit `reset()` / `reinitialize()` baseline management.

### Key Decisions & Contracts
1. **Submission State Machine**:
   - `idle`: Form is interactive and not currently in a submission pipeline.
   - `validating`: Form is running pre-submission validation (sync and async).
   - `submitting`: Validation passed; application `submitAction` is executing.
   - `succeeded`: Submit action resolved successfully.
   - `failed`: Submit action returned server validation issues (`{ ok: false, issues }`) or threw an unexpected runtime exception.
   - `cancelled`: Submission was aborted via `cancelSubmit()`, `reset()`, `dispose()`, or a superseding submission.
   - **Signal**: `form.submitting` computed is `true` during `"validating"` and `"submitting"`, `false` otherwise.
   - **Terminal Submission Status Semantics (Model A)**: `SubmissionStatus` records the lifecycle/result of the latest submission attempt (`"succeeded"`, `"failed"`, `"cancelled"`). Ordinary form value mutations (`field.setValue`, `field.setRawValue`, `form.setValues`, group mutations, array item mutations, and external state bindings) do NOT reset terminal submission status to `"idle"`. Value freshness/dirtiness is an orthogonal concern independently tracked by `form.dirty` and `field.dirty`. Explicit whole-form lifecycle operations (`form.reset()`, `form.reinitialize()`) reset `submissionStatus` to `"idle"`. The next `form.submit()` invocation transitions `submissionStatus` to `"validating"` and initiates a new submission lifecycle.
2. **Pre-Submit Validation & Parse Gate**:
   - `form.submit(action?)` runs pre-submission validation (`root.validate("submit")`) and checks `root.invalid` and `parseStatus`.
   - If parsing or validation fails, the application action is **strictly bypassed**, `submissionStatus` transitions to `"idle"`, and `form.submit()` returns `{ status: "invalid", issues: form.issues.get() }`.
   - Output transformations execute before validation; throwing transformers transition `submissionStatus` to `"failed"` and reject the submit promise.
   - **Snapshot integrity**: `deepCloneSnapshot` is the boundary that produces the payload handed to the action, so it must not let input shape leak into the clone. It tracks visited objects, which makes cyclic and shared references snapshot correctly instead of overflowing the stack; it copies an own enumerable `__proto__` key with `Object.defineProperty` so the key is preserved as data and the snapshot never inherits attacker-supplied members; and it reproduces `Map`, `Set`, `Date`, and `RegExp` values rather than flattening them into `{}`.
3. **Application Submit Action Contract**:
   - `SubmitAction<TOutput, TResult> = (output: TOutput, context: { signal: AbortSignal }) => Promise<SubmitActionResult<TResult>> | SubmitActionResult<TResult>`.
   - Action result formats supported:
     - Direct value (e.g. `TResult`).
     - Structured success: `{ ok: true, result: TResult }`.
     - Structured failure: `{ ok: false, issues: readonly (ServerIssueInput | string)[] }`.
   - If no action is passed to `form.submit()`, the form uses `config.submitAction` (if configured).
4. **Duplicate Submission Policy**:
   - Configurable via `config.duplicatePolicy` or per-call `options.duplicatePolicy`:
     - `"drop"` (default): Subsequent submit calls while in-flight immediately return `{ status: "cancelled" }` without calling the action again.
     - `"reject"`: Subsequent calls synchronously throw `Error("Submission is already in progress")`.
     - `"supersede"`: Aborts the active in-flight `AbortController` and starts a fresh submission cycle under a new revision.
5. **Cancellation Semantics**:
   - Explicit `form.cancelSubmit()` aborts the active `AbortController`, increments the submission revision, and transitions status to `"cancelled"`.
   - `form.reset()` and `form.dispose()` abort active submissions.
   - **Invariant**: Cancellation is NOT validation failure. `form.valid` remains `true` upon cancellation if fields are valid.
6. **Monotonic Revision Authority & Stale-Result Suppression**:
   - Each submission increments `currentSubmissionRevision`.
   - When an async submit action resolves or rejects late (e.g. after superseding or cancellation), the result is **strictly suppressed** if `revision !== currentSubmissionRevision` or `signal.aborted`.
   - Stale late successes, rejections, or server issue attachments cannot mutate form state or status.
7. **Server Issue Taxonomy & Prototype Pollution Defense**:
   - `ServerIssue` has `source: "server"`, structured `code: string`, optional `message?: string`, and structured `path?: readonly (string | number)[]`.
   - Prototype pollution defense: `sanitizeServerIssue` strictly rejects `__proto__`, `constructor`, and `prototype` in `code`.
   - Structured paths are treated as immutable data: reserved property names occurring as path segments (e.g. `path: ["constructor"]`) are safely routed without polluting prototypes.
8. **Server Issue Routing Across the Tree**:
   - **Leaf & Group Routing**: Server issues with matching paths are routed directly to target `FieldState` or `FieldGroup` nodes, localizing the issue and updating the node's `serverIssues` and `valid` computed states.
   - **Array Snapshot Routing (The Identity Contract Across In-Flight Reorders)**:
     - At submission start, form captures an immutable snapshot mapping array index positions to item unique IDs (`Map<string, readonly (string | number)[]>`).
     - When server issues arrive referencing submitted indices (e.g. `["contacts", 0, "email"]`), the form resolves index `0` to its original item ID, locates that item's current position in the live array (e.g. index `1` if reordered), and attaches the error to that specific item.
     - Sibling items that moved to index `0` stay clean without receiving the error.
   - **Deleted Items & Unknown Paths**:
     - If the target array item was deleted while submission was pending, or if the server returned an unknown path, the issue is preserved at `form.serverIssues` with its original structured path intact.
9. **Server Issue Clearing Policies**:
   - **Field Edits**: User editing a field (`setValue` / `setRawValue`) clears only that field's owned server issues. Sibling and other field server issues are preserved.
   - **Client Validation Coexistence**: Re-running client validation updates client validation issues without wiping server issues.
   - **Form Reset / Next Submit**: Calling `form.reset()` or starting a new `form.submit()` clears prior server issues.
   - **Successful Submit**: Clears prior server issues and transitions status to `"succeeded"`.
   - **Dirty Invariant**: Successful submission does NOT implicitly reset dirty baseline state. `form.dirty` remains `true` until caller explicitly invokes `form.reinitialize(newBaseline)` or `form.reset()`.
10. **Reset vs Reinitialize Baseline Semantics**:
    - `form.reset()`: Restores initial baseline values, resets dirty/touched states to pristine, clears server issues, and cancels active submissions.
    - `form.reset(newBaseline)` / `form.reinitialize(newBaseline)`: Adopts new baseline values and resets dirty/touched states to pristine.
    - Parser-backed fields require both domain value and raw value on rebasing (`reset(nextInitial, nextInitialRaw)`).
11. **Resource & Diagnostics Privacy**:
    - 100 repeated submit cycles prove zero controller or Scope leak.
    - Form submission diagnostics record structural lifecycle events (`form.submission.started`, `form.submission.submitting`, `form.submission.succeeded`, `form.submission.failed`, `form.submission.cancelled`) without leaking form values, output payloads, credentials, or sensitive error messages.

---

## 8. F7: Framework Adapter Compliance (Vanilla, React, Angular, Vue)

### Overview & Architecture
F7 investigated whether one unified, framework-neutral Form semantic model (developed through F0–F6) can be consumed idiomatically and efficiently by four disparate UI paradigms:
1. **Vanilla DOM**: Imperative element binding, event delegation, standard input/select/checkbox synchronization, safe `textContent` issue rendering, and explicit disposal.
   - Projects `aria-invalid` onto the bound control and appends the issue element's id to `aria-describedby`, preserving tokens that were already there and removing only what it added on dispose. Both are opt-out (`ariaInvalid`, `ariaDescribedBy`). The DOM adapter is the only layer that owns element attributes; the React, Angular and Vue adapters expose `invalid` and `issues`, and the template writes the attribute.
   - The projected state is derived from `issues`, `serverIssues`, `errors` and `parseStatus` directly rather than from the `invalid` computed, because a notification callback can run before a downstream computed has recomputed and would leave the attribute one edit behind. `pending` is deliberately excluded: an in-flight async validation never marks a control invalid.
   - Exactly one commit event is bound per control: `"change"` for checkbox, radio, select, and file inputs, `"input"` for everything else. Binding both ran the pipeline twice per edit, since a browser fires `"input"` while typing and `"change"` again on blur. A repeated raw value is additionally ignored, so a re-dispatched event cannot re-fire an async validator.
   - `bindForm` takes an `onSubmitException` callback. A DOM submit listener has no caller to return a rejection to, so a throwing submit action is reported through that callback and otherwise contained; rethrowing it produced an unhandled rejection that terminates the process under Node's default policy.
2. **React**: Declarative component hooks (`useField`, `useForm`, `useFieldArray`) backed by `useSyncExternalStore`, referentially stable snapshot memoization, zero whole-form re-renders on keystroke, and SSR safety.
   - `getSnapshot` reads the store live on every call and returns the previous object only when every field is `Object.is`-equal. Serving a snapshot that only the subscription callback refreshed dropped any change that landed before the subscription was established - a parent effect seeding values, or a sibling field's cross-field rule - and the component stayed stale until an unrelated notification arrived.
3. **Angular**: Signal-first handles (`createAngularField`, `createAngularForm`, `createAngularFieldArray`, `toAngularField`) backed by `@angular/core` `signal.asReadonly()`, `computed()`, and automatic cleanup via `DestroyRef.onDestroy`.
4. **Vue**: Reactivity handles (`createVueField`, `createVueForm`, `createVueFieldArray`, `useViiField`, `useViiForm`) backed by `shallowRef` wrapped in `shallowReadonly`, `effectScope`, and `onScopeDispose`.

### Key Architectural Invariants & Findings

1. **Zero Framework-Specific State Forks in Form Core**:
   - Form Core (`research/form/form-core.ts`) remains 100% agnostic to DOM and UI frameworks.
   - Core exposes only Vii State, Computed, and Scope primitives.
   - Adapters act as thin bridges (under 250 lines per adapter) converting framework events to Form Core mutations and subscribing to Form Core state nodes.

2. **No Secondary State Mirrors**:
   - None of the adapters create independent reactive state stores.
   - All reactive primitives (`signal`, `shallowRef`, `useSyncExternalStore` snapshots) are projections derived directly from Core signals.

3. **Parser-Backed Raw Input Synchronization**:
   - When a field has a parser (e.g. `createNumberParser()`), intermediate raw keystrokes (such as `"-"`, `"05"`, `""`) are preserved in the DOM/React/Angular/Vue input control without snapping back or losing user keystrokes.
   - During parse failures, domain `value` remains pristine, `parseStatus` transitions to `"invalid"`, and downstream validation rules are bypassed.
   - **Display ownership rule**: on a parsed field the control shows `rawValue`, never `String(value)`. The domain value is only written back to the control when `parseStatus` is `"unparsed"`, which after F5 identifies a field with no parser. Writing the domain value on a successful parse snapped `"05"` back to `"5"` mid-keystroke and raced the `rawValue` subscriber for which write landed last. As documented in F5, a programmatic `setValue` on a parsed field therefore leaves the control showing the previous raw text: raw presentation belongs to the adapter layer.

4. **Terminal Submission Status Consistency (Model A)**:
   - Preserved across all adapters: after `form.submit()` succeeds (`submissionStatus === "succeeded"`), user edits to form fields mark `dirty === true` while `submissionStatus` remains `"succeeded"`.
   - Adapters do not reset submission status on field inputs.

5. **Disposal & Lifecycle Invariants**:
   - Every adapter provides deterministic cleanup:
     - Vanilla: `disposer.dispose()` detaches DOM listeners and store subscriptions.
     - React: `useSyncExternalStore` cleanup unsubscribes on unmount (verified under React StrictMode double-mount).
     - Angular: `DestroyRef.onDestroy` cleans subscriptions when injection context is destroyed.
     - Vue: `onScopeDispose` cleans subscriptions when `effectScope` stops.
   - Verified 100 mount/dispose cycles across all adapters with zero retained listeners.

6. **Cross-Framework Equivalence**:
   - `research/form/form-f7-compliance.test.ts` executes a normalized multi-step lifecycle across Vanilla DOM, React, Angular, and Vue, proving identical semantic behavior, issue attachment, server error clearing, and reset states.

---

## 9. F8: Accessibility + Security + Privacy Hardening

### Overview & Objectives
Slice F8 established and proved the smallest necessary accessibility, security, and privacy contracts for Vii Form so that F0–F7 semantics can safely graduate without Form turning into a bloated UI component library, an HTML sanitizer, or a telemetry system.

### 1. Accessibility Responsibility Split

| Layer | Responsibilities | Anti-Patterns (Forbidden) |
| --- | --- | --- |
| **Form Core** | • Pure semantic state (`dirty`, `touched`, `pending`, `valid`, `invalid`, `validationStatus`, `parseStatus`)<br>• Structured issue taxonomy (`FieldIssue`, `ParseIssue`, `ServerIssue`)<br>• Plain text issue messages & deterministic issue ordering<br>• Submission state machine & cancellation | 🚫 Emitting HTML markup or ARIA attributes<br>🚫 Injecting DOM event handlers or focus traps<br>🚫 Hardcoding screen-reader announcement copy |
| **Framework Adapters** | • Projecting `aria-invalid` reflecting actual invalid state<br>• Supporting `aria-describedby` linkage to issue element IDs<br>• Safe DOM writes via `textContent` (NO innerHTML sinks)<br>• Preserving native HTML `<form>` submit events with `preventDefault()` | 🚫 Creating custom wrapper DOM elements that disconnect `<label for>`<br>🚫 Overriding keyboard navigation or trapping focus<br>🚫 Exposing `dangerouslySetInnerHTML` or `v-html` sinks |
| **Application / UI Components** | • Accessible names & programmatic `<label for>` / `<label htmlFor>`<br>• Live region announcements (`role="alert"`, `aria-live="polite"`)<br>• Error summary rendering and focus management UX (focusing the first invalid field)<br>• Visual styling and layout composition | 🚫 Trusting raw HTML in user-facing issue messages<br>🚫 Silently suppressing unhandled submit rejections |
| **Diagnostics** | • Value-free structural lifecycle observation (`revision`, `issueCount`, `status`, `reason: Error.name`) | 🚫 Logging raw field values, parsed values, output payloads, or user messages |

### 2. Accessibility Invariants & Evidence
- **`aria-invalid` Semantics**:
  - `invalid === false` on unvalidated, pristine, or valid fields.
  - `invalid === true` on validation errors, parse failures, or server issues.
  - **Pending Invariant**: Async validation in flight (`pending === true`) does **NOT** mark a field as `aria-invalid="true"`.
- **`aria-describedby` Association**:
  - Vanilla DOM adapter binds `options.issueElement` via `textContent` safely linked to `<input aria-describedby="email-error">`.
  - React/Angular/Vue project signals/refs that drive native HTML attributes without layout restrictions.
- **Deterministic First-Invalid Field Focus**:
  - `form.issues.get()` preserves deterministic issue ordering across synchronous, asynchronous, and server issues.
  - UI focus managers can cleanly inspect the first issue path (e.g. `form.issues.get()[0]?.path`) and focus the matching control without Form Core owning DOM focus.
- **Native Keyboard & Form Submission**:
  - Vanilla `bindForm` listens to the native HTML `"submit"` event and invokes `event.preventDefault()`, preserving standard Enter-key submission without custom keyboard hijacking.

### 3. Security Threat Model & Hardening

| Threat | Source / Sink | Defense / Invariant | Verified Fixture | Residual Risk |
| --- | --- | --- | --- | --- |
| **DOM XSS** | Hostile messages in validation, parse, or server issues | Vanilla writes only to `textContent`. Framework adapters rely on escaped template interpolation. No `innerHTML` sinks. | `form-f8-security.test.ts` (`<script>`, `<img>`, `<svg>`, `<iframe>`) | None in core/adapters. App developers bypassing escaping via raw HTML own that risk. |
| **Prototype Pollution** | `__proto__`, `constructor`, `prototype` in issue codes | Blocked with security errors in `sanitizeIssue`, `sanitizeParseIssue`, and `sanitizeServerIssue`. | `form-f8-security.test.ts` (code pollution blocked, `Object.prototype` clean) | None. |
| **Path Traversal / Object Injection** | `__proto__` in structured issue paths | Structured paths remain immutable data arrays. Routing uses `hasOwnProperty` and safe container lookups without object mutation. | `form-f8-security.test.ts` (path containing `__proto__`) | None. |
| **Malformed Parsers** | Custom parsers returning `null`, non-objects, or non-boolean `ok` | Fails closed with structured `TypeError` and safe error classification in diagnostics. | `form-f8-security.test.ts` | None. |
| **Malformed Standard Schema** | Providers returning non-array `issues`, throwing, or rejecting | Standard Schema adapter validates result shape and fails closed on invalid provider output. | `form-f8-security.test.ts` | None. |
| **Hostile Getters / Proxies** | Output payloads with throwing getters or proxy traps | `deepCloneSnapshot` safely triggers getters, traverses trap-traps, and isolates snapshot data. | `form-f8-security.test.ts` | None. |
| **Cyclic Output Data** | Output transforms producing self-referential or cyclic objects | `deepCloneSnapshot` tracks visited objects via `Map` and clones cycles without stack overflow. | `form-f8-security.test.ts` | None. |
| **Detached Async Rejections** | Detached validation, debounce timers, or DOM submit actions | `settleDetachedValidation` catches rejections and records safe diagnostics; `bindForm` routes submit exceptions to `onSubmitException`. Zero unhandled rejections at process level. | `form-f8-security.test.ts` (Unhandled rejection tracker) | None. |
| **Stale Async Results** | Rapid typing racing slow async validation / schemas | Generation/revision counters discard stale async results before they can mutate newer state. | `form-f8-security.test.ts` | None. |
| **Resource Abuse** | Rapid edits, deep path nesting, or large issue arrays | Verified resilient under 500 rapid changes, 50-level deep paths, and 1,000-issue arrays without runaway listeners. | `form-f8-security.test.ts` | Benchmark latency deferred to F9. |

### 4. Privacy Invariants & Diagnostics Telemetry
- **Telemetry Redaction Guarantee**:
  - Diagnostics collector records structural event types (`field.validation.started`, `field.parse.failed`, `form.submission.started`, `form.submission.failed`) and numeric counts (`revision`, `issueCount`).
  - Raw field values, parsed values, output payloads, server response bodies, validation messages, and secrets **NEVER** enter diagnostics.
- **Sentinel Privacy Tests**:
  - Verified with sentinel strings (`SECRET_PASSWORD_DO_NOT_LOG_12345`, `AUTH_TOKEN_SECRET_987654321`, `4111_2222_3333_4444_SECRET_CARD`) passed through inputs, rules, parse failures, server issues, and exceptions.
  - Zero occurrences found in serialized diagnostic traces.
- **Exception Privacy**:
  - Detached exception handlers record only `reason: Error.name` (e.g. `"TypeError"`, `"Error"`), avoiding leakage of dynamic exception messages that might embed sensitive values.
- **Application State vs Diagnostics**:
  - Local component state (React hooks, Angular signals, Vue refs) legitimately holds field values for UI display.
  - Telemetry and diagnostics remain strictly value-free.

### 5. Known Environment Limitations & Residual Risks
- **Test Environment**: Headless Node/Vitest environment verifies DOM properties, attributes, and events; it cannot verify visual focus ring contrast or actual screen reader speech synthesis engines.
- **Residual Risks Deferred to F9 / F10**:
  - F9 owns quantitative bundle footprint (minified, gzip, brotli), field update latency under heavy load, and 1,000-cycle heap benchmarks.
  - F10 owns multi-step consumer dogfooding and final build-vs-buy graduation.

---

## 10. F9: Runtime, Memory, TypeScript, and Bundle Evidence

### Overview & Objectives
Slice F9 executed the empirical evidence harness to evaluate runtime scaling, memory lifecycle, TypeScript compiler overhead, and production-style bundle footprints across realistic and stress test forms up to 1,000 fields. Detailed findings are in [`research/form/F9_EVIDENCE.md`](./F9_EVIDENCE.md).

### 1. Empirical Highlights
- **Leaf-Only Mutation Scaling**: In the tested leaf-only subscriber scenario, median single-field mutation remained approximately size-insensitive between 10 and 1,000 fields (~0.27 - 0.29 µs), and unrelated field subscribers received 0 notifications.
- **Aggregate-Consumer Scaling**: In the aggregate-consumer scenario, mutating a single field causes aggregate computeds (`values`, `dirty`, `issues`) to invalidate and recompute upon reading, scaling proportionally with aggregate tree size (~1.9 µs for 10 fields to ~149 µs for 1,000 fields).
- **Linear Construction**: Full form construction scales linearly (~4.0 - 4.7 µs per field).
- **Atomic `setValues` Batching**: Mutating a 10-field subset inside `form.setValues` executes in a constant **~0.0025 ms** regardless of total form size with alternating updates.
- **True Isolated FieldArray Operations**: With untimed setup/restore, pure steady-state array operations execute in **~3.3 µs** (`push`), **~3.6 µs** (`insert`), **~2.7 µs** (`remove`), **~0.25 µs** (`swap`), **~0.33 µs** (`move`), and **0.137 ms** (`setValues` alternating 100 items).
- **Zero Memory Leaks**: 500 complete form create/dispose cycles show 0 active scope leaks, 0 dangling listeners, and 0 unhandled promise rejections.
- **Completed Async Submission**: Steady-state submission (timed strictly `await form.submit()`) completes in **~0.024 ms median**.
- **Uniform Form Validation**: 10-field validation throughput is uniform across Native rules and Standard Schema v1 providers (Zod 4, Valibot, ArkType) at ~0.026 - 0.027 ms.
- **Full Tree Per-Field Validation**: Scales from 0.031 ms (10 fields / 10 rules) to 3.97 ms (1,000 fields / 1,000 rules).
- **Fast TypeScript Diagnostics**: Compiler check time scales sub-linearly across isolated programs (0.39s for small, 0.40s for medium, 0.40s for large) with zero deep recursion errors.
- **Compact Bundle Footprint**: `createField` standalone bundles at **12.95 kB minified / 4.56 kB gzip / 4.03 kB brotli** (including all `@vii-labs/core` reactive primitives), shedding ~21.1 kB minified code compared to full Form Core.
- **100% Framework & Provider Isolation**: Verified zero framework cross-contamination and zero concrete schema provider imports in Core.

### 2. Documented Reactive Invariant & Core Semantics (Items 10 & 57)
In Vii Core's push-pull lazy computed design, reading a derived `Computed` inside a synchronous `State` subscriber callback will observe the previous cached value if the `Computed` was evaluated after the subscriber registered. This is an intended property of push-pull signal systems without topological sorting. Documented in `packages/core/README.md` and verified in `packages/core/test/computed.test.ts`. Form adapters and internal projections derive dynamic status directly from source signals. External consumer reads outside the notification cycle always observe fresh values once the scheduler flushes.

### 3. F10: Real Consumer Validation & Build-vs-Buy Graduation Gate
- **Status**: **COMPLETE**. Full validation report in [`research/form/F10_CONSUMER_VALIDATION.md`](./F10_CONSUMER_VALIDATION.md).
- **Consumer A**: 5-step Vanilla multi-step onboarding wizard with step validity computeds, parser raw preservation, dynamic address FieldArray, and conditional tax ID rules (`research/form/f10/consumers/consumer-a-vanilla.ts`).
- **Consumer B**: React 19 Task Board collaborative card editor with controlled parsers, async title uniqueness check, and leaf-level render isolation (`research/form/f10/consumers/consumer-b-react.tsx`).
- **Competitors**: Benchmarked against `@tanstack/react-form@1.33.5`, `react-hook-form@7.86.0`, `@angular/forms@22.1.4`, and `@tanstack/react-form@2.0.0-alpha.2`.
- **Benchmark Highlights**: 0.46 µs leaf mutation on 1,000 fields (1.83M ops/s), 0.29 µs FieldArray swap, 1 render per leaf edit in React with 0 whole-form re-renders, 14.2 kB cold / +4.9 kB incremental gzip bundle.
- **Graduation Gate Verdict**: **GRADUATE TO BUILD (RECOMMEND PRODUCTION PHASE 1)**.
- **Operating Constraint**: Absolute stop condition enforced — no public package published, no production implementation initiated in research phase. All 384 tests pass across 23 test suites.

