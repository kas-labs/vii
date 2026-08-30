# @vii-labs/form

Experimental reactive headless form state and validation engine for the Vii ecosystem.

## Status

Internal development / experimental candidate (Phase 1 Baseline).

- **Current Implementation (P1h — React Adapter):**
  - **React 18/19 Adapter (`@vii-labs/form/react`):**
    - `useField(field)`: fine-grained leaf field binding exposing live observable snapshot (`value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `parseStatus`, `parseIssue`, `validationStatus`, `issues`, `serverIssues`) and stable action references (`setValue`, `setRawValue`, `setTouched`, `blur`, `validate`, `reset`).
    - `useForm(form)`: root form aggregate binding exposing live snapshot (`value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`, `submissionStatus`, `submitting`), child `fields`, and stable actions (`validate`, `submit`, `cancelSubmit`, `reset`, `reinitialize`).
    - `useFieldArray(array)`: repeatable collection binding exposing live snapshot (`items`, `value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`, `length`) and stable structural actions (`append`, `prepend`, `insert`, `remove`, `move`, `swap`, `clear`, `validate`, `reset`).
    - `useSyncExternalStore` primitive: tear-free React concurrent rendering with live store evaluation and pre-subscription freshness.
    - Snapshot referential memoization: live store reads return stable object references when observable values are unchanged (`Object.is` per key), eliminating infinite loops and redundant re-renders.
    - Fine-grained render isolation: mutating a leaf field triggers re-rendering only in that field's subscribed component (0 sibling re-renders).
    - Stable item identity: preserves `FieldArrayItem.id` across moves and swaps for canonical React list keys (`key={item.id}`).
    - StrictMode safety & lifecycle isolation: double-mount/unmount cycles cleanly subscribe and teardown; unmounting a React component unregisters adapter subscriptions only and never disposes the canonical Form node.
    - SSR safe: `getServerSnapshot` evaluates synchronous in-memory state without browser globals.
    - Import isolation: root `@vii-labs/form` remains framework-neutral and requires no React installation; `@vii-labs/form/react` declares React as an optional peer dependency.
  - **Model A Submission Lifecycle (`form.submit`):**
    - State machine: `idle` -> `validating` -> `submitting` -> `succeeded` | `failed` | `cancelled`.
    - Model A terminal state invariant: `submissionStatus` represents the outcome of the latest submission attempt. User edits after `succeeded` or `failed` update `dirty: true` but do NOT reset `submissionStatus` to `idle`.
    - Validation gate: runs recursive tree validation with `trigger: "submit"`, awaits async rules, and blocks submission if invalid or if any field has parse errors (`parseStatus === "invalid"`).
    - Immutable snapshotting: captures deep-cloned immutable domain output snapshot (`deepCloneSnapshot`) and `FieldArray` identity snapshots after the validation gate successfully passes, ensuring the submitted payload strictly matches the validated submission generation.
    - Error ownership & structural cancellation: unexpected errors in user submit action rethrow to caller while setting `submissionStatus: "failed"`; cancellation is classified authoritatively via `signal.aborted` or canonical `AbortError` (never arbitrary message-text heuristics).
    - Fail-closed result discrimination: submit action payloads declaring `ok === false` require an `issues` array where all issues sanitize atomically; malformed failure payloads throw `TypeError` and fail closed, never succeeding.
    - In-flight cancellation: `form.cancelSubmit()`, duplicate submit policies (`supersede`, `drop`, `reject`), and automatic abort on `form.reset()`, `form.reinitialize()`, or `form.dispose()`.
  - **Structured Server Issue Taxonomy & Routing:**
    - `ServerIssue` structure: `{ code, message, path?, source: "server" }`.
    - Routing to leaf fields, groups, arrays, and fallback to root `form.serverIssues` for unresolvable/root paths.
    - Localized clearing on edit: editing a leaf field clears only that field's server issues; siblings and root issues remain intact.
    - Coexistence with client validation: running client validators does not wipe active server issues.
    - `FieldArray` in-flight mutation resilience: submission-time identity snapshots map array paths to stable item IDs, ensuring server responses route to the correct item at its live position even if items are reordered mid-flight; deleted items fall back safely to `form.serverIssues`.
  - **Dynamic Repeatable Collections (`createFieldArray`):**
    - Stable logical item identity (`FieldArrayItem<TNode>` with stable `id` and `node`) independent of array positional indices; reordering (`move`, `swap`), insertion, and removal preserve item identity, child Scope, focus state, and client issues.
    - Opaque internal ID generation (`vii_item_${counter}`) or custom `keyExtractor` (requiring a non-empty string) without ID collisions; IDs never leak into domain `value` or presentation `rawValue`.
    - Batch-safe array mutations: `append`, `prepend`, `insert`, `remove` (returns `void`), `move`, `swap`, `clear`.
    - Reactive collection aggregation: `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues`, and `serverIssues` (with dynamically updated numeric index prefix paths `[i, ...]`).
    - Identity-strict dirty tracking: an array is pristine (`dirty === false`) if and only if its length matches baseline, its exact key identity sequence matches baseline, and all child nodes are pristine.
    - Deterministic child Scope lifecycle and transactional adoption: removed baseline items are retained privately for `reset()` restoration; non-baseline items are cleanly disposed; parent disposal cascades to all child items; direct disposal of adopted items is rejected.
    - Cancellation & race safety: removing an item while async validation is in flight immediately aborts its controller; moving an item dynamically updates its issue prefix upon resolution.
    - Array baseline reset (`reset()`): restores canonical baseline items in baseline order, discards non-baseline items, and resets remaining baseline items to baseline values.
    - Whole-form reinitialization (`form.reinitialize`) integration: recursive two-phase prevalidation across nested array collections with zero partial mutation on failure, replacing canonical baselines and disposing obsolete retained baseline items.
  - **Leaf Field Primitive (`createField`):**
    - Raw vs Value separation: supports synchronous parsers (`FieldParser<TRaw, TValue>`) where raw presentation input (`"05"`) is preserved in `rawValue` without mutating domain `value` (e.g. `5`), and parse failures retain raw presentation input while preserving the last good domain value. `setRawValue` commits all observable field states atomically in a single batch.
    - Synchronous validation rules (`SyncValidationRule<TValue>`) and asynchronous validation rules (`AsyncValidationRule<TValue>`). Automatic validation (on change, blur, debounce) contains unexpected synchronous exceptions and asynchronous rejections into structured execution issues (`validation.execution_error`) with `validationStatus: "invalid"`, while manual `validate()` propagates errors directly to the caller.
    - Standard Schema v1 validation bridge (`standardSchema`) providing provider-neutral support for any `@standard-schema/spec` schema (e.g., Zod 4, Valibot, ArkType) with fail-closed boundary enforcement and zero vendor runtime dependencies.
    - Validation execution controls: trigger modes (`change`, `blur`, `submit`, `manual`), debounce duration (`debounceMs`), monotonic validation revision counters, AbortSignal cancellation, and stale-result protection.
    - Reactive state signals: `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`, `parseIssue`, `parseStatus`, `validationStatus`. Issue state mutation remains strictly internal (no public `setIssues`).
    - Trusted baseline contract: explicit `initialValue` + `initialRawValue` at creation and `{ value, rawValue }` in `form.reinitialize` establish the canonical domain + presentation pair as a trusted baseline without running the parser; parsers are used for subsequent raw input mutations.
    - `field.reset()` restores the current canonical baseline only; baseline replacement belongs to `form.reinitialize`.
    - Domain dirty semantics: `dirty` compares parsed domain `value` to baseline domain value (presentation-only raw edits with equivalent value stay pristine).
  - **Built-in Parsers (public):**
    - `createNumberParser`: strict decimal grammar parser with options for empty handling, whitespace trimming, and raw input preservation.
    - `createStringParser`: optional whitespace trimming without silent data loss by default.
  - **Nested Groups (`createFieldGroup`) & Root Forms (`createForm`):**
    - Hierarchical aggregation of `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues`, and `serverIssues` (with recursive path prefixing).
    - Granular reactivity: field mutation in one branch does not notify un-mutated branches.
    - Whole-form baseline reinitialization (`form.reinitialize`) using explicit separate `value` and `rawValue` trees (`FormReinitializeInput`); recursive two-phase prevalidation with zero mutation on malformed input; successful commit is batched for observer atomicity.
- **Subpaths (`/react`, `/vanilla`, `/angular`, `/vue`):**
  - `/react`: Implemented production React 18/19 adapter (`useField`, `useForm`, `useFieldArray`).
  - `/vanilla`, `/angular`, `/vue`: Skeleton infrastructure entrypoints (adapters deferred to P1i–P1j).
- **Deferred / Non-Goals for P1h:** Framework adapter implementations for Vanilla, Angular, and Vue (deferred to P1i–P1j).

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md` for architecture and roadmap details.
