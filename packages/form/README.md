# @vii-labs/form

Experimental reactive headless form state and validation engine for the Vii ecosystem.

## Status

Internal development / experimental candidate (Phase 1 Baseline).

- **Current Implementation (P1j — Angular & Vue Adapters):**
  - **Angular 17+ Adapter (`@vii-labs/form/angular`):**
    - `createAngularField(field, options?)`: projects a canonical leaf `FieldState` into 12 readonly Angular Signals (`value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `parseStatus`, `parseIssue`, `validationStatus`, `issues`, `serverIssues`) and stable action delegates (`setValue`, `setRawValue`, `setTouched`, `blur`, `validate`, `reset`, `dispose`). Accepts optional `{ destroyRef?: DestroyRef }` to automate subscription teardown on component destruction; works anywhere outside injection contexts with manual `.dispose()`.
    - `createAngularForm(form, options?)`: projects a root `FormInstance` into aggregate readonly Signals (`value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`, `submissionStatus`, `submitting`) and stable actions (`validate`, `submit`, `cancelSubmit`, `reset`, `reinitialize`, `dispose`). Promoted to public API for adapter symmetry and idiomatic root form state consumption.
    - `createAngularFieldArray(array, options?)`: projects a `FieldArray` into collection-level Signals (`items`, `value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`, `length`) and structural actions (`append`, `prepend`, `insert`, `remove`, `move`, `swap`, `clear`, `validate`, `reset`, `dispose`). Promoted to public API for adapter symmetry and repeatable collection consumption, preserving exact `FieldArrayItem.id` identities across mutations.
    - Native Signals primitive: uses `@angular/core` `signal().asReadonly()`; zero RxJS bridge, zero Zone hacks, zero manual change detection. Compatible with Angular 17+ through Angular 22+.
    - No duplicate domain-state ownership & canonical node survival: framework lifecycle teardown unregisters adapter subscriptions only; canonical Vii Form nodes remain alive and functional.
    - Idempotent manual disposal: handles provide `.dispose()` for manual cleanup, safe before or after `DestroyRef` teardown.
  - **Vue 3.3+ Adapter (`@vii-labs/form/vue`):**
    - `createVueField(field, options?)`: projects a canonical leaf `FieldState` into 12 readonly shallow refs (`shallowReadonly(shallowRef(...))` for `value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `parseStatus`, `parseIssue`, `validationStatus`, `issues`, `serverIssues`) and stable action delegates (`setValue`, `setRawValue`, `setTouched`, `blur`, `validate`, `reset`, `dispose`). Auto-detects `getCurrentScope()` to register `onScopeDispose` when executed in an active effect scope, while remaining operable outside scopes with manual `.dispose()`. Accepts optional `{ onDispose? }` callback hook.
    - `createVueForm(form, options?)`: projects a root `FormInstance` into aggregate readonly shallow refs and stable submission actions. Promoted to public API for adapter symmetry and idiomatic form lifecycle management in Vue applications.
    - `createVueFieldArray(array, options?)`: projects a `FieldArray` into collection shallow refs and structural actions, preserving `FieldArrayItem.id` stable identities. Promoted to public API for adapter symmetry and repeatable collections.
    - Shallow ref reactivity: uses Vue `shallowRef` and `shallowReadonly` avoiding deep `reactive()` wrapping or proxying; Vii Form retains authoritative state mutation and reference identity. Compatible with Vue 3.3+ through Vue 3.5+.
    - No duplicate domain-state ownership & canonical node survival: scope disposal or `.dispose()` unwinds adapter subscriptions only; canonical Vii Form nodes remain alive.
  - **Vanilla DOM Adapter (`@vii-labs/form/vanilla`):**
    - `bindField(field, element, options?)`: binds supported native form controls (input, textarea, select-one) to a canonical `FieldState`. Fails closed with `TypeError` on unsupported elements before any listener registration, subscription, or DOM mutation.
    - `bindForm(form, formElement, options?)`: binds native `<form>` submit events to canonical `form.submit()`.
    - Supported control categories: HTMLInputElement-compatible (text-like types, checkbox, radio, file), HTMLTextAreaElement-compatible, and HTMLSelectElement-compatible (single-select only).
    - Single commit event contract: strictly binds `"input"` for text-like controls and `"change"` for checkbox, radio, select-one, and file controls; zero duplicate `input` + `change` registration per edit.
    - Bidirectional projection without feedback loops: DOM edits commit to canonical fields (`setRawValue` / `setValue`), and programmatic field updates project back to the DOM without synthetic event dispatches.
    - Raw vs Value preservation: parser-backed fields display `rawValue` in the DOM (e.g. `"-"` or `"05"`), preventing presentation snap-back bugs during typing.
    - Non-destructive ARIA invalid ownership: projects `aria-invalid="true"` strictly when the field is invalid; captures pre-binding attribute state and restores the original application value whenever the field is valid and upon disposal.
    - Additive `aria-describedby` management: safely appends `issueElement.id` to `aria-describedby` while preserving pre-existing application tokens, and restores original tokens on disposal.
    - Safe textContent sink: prevents HTML interpretation at the issue-message sink by writing through `issueElement.textContent = ...`.
    - Submit error ownership & exception containment: native DOM submit listeners route unexpected action rejections through `onSubmitException`.
    - Deterministic lifecycle cleanup: returns `{ dispose(): void }` which cleanly removes DOM event listeners and signal subscriptions without disposing the canonical Form node.
  - **React 18/19 Adapter (`@vii-labs/form/react`):**
    - `useField(field)`: fine-grained leaf field binding exposing live observable snapshot and stable action references.
    - `useForm(form)`: root form aggregate binding exposing live snapshot, child `fields`, and stable actions.
    - `useFieldArray(array)`: repeatable collection binding exposing live snapshot and stable structural actions.
    - `useSyncExternalStore` primitive: tear-free React concurrent rendering with live store evaluation and pre-subscription freshness.
    - Snapshot referential memoization: live store reads return stable object references when observable values are unchanged (`Object.is` per key).
    - Fine-grained render isolation: mutating a leaf field triggers re-rendering only in that field's subscribed component (0 sibling re-renders).
    - StrictMode safety & lifecycle isolation: double-mount/unmount cycles cleanly subscribe and teardown without disposing the canonical Form node.
  - **Model A Submission Lifecycle (`form.submit`):**
    - State machine: `idle` -> `validating` -> `submitting` -> `succeeded` | `failed` | `cancelled`.
    - Model A terminal state invariant: user edits after `succeeded` or `failed` update `dirty: true` but do NOT reset `submissionStatus` to `idle`.
    - Validation gate: runs recursive tree validation with `trigger: "submit"`, awaits async rules, and blocks submission if invalid or if any field has parse errors.
    - Immutable snapshotting: captures deep-cloned immutable domain output snapshot and `FieldArray` identity snapshots after validation gate passes.
    - Error ownership & structural cancellation: unexpected errors in submit action rethrow to caller while setting `submissionStatus: "failed"`; cancellation is classified authoritatively via `signal.aborted` or canonical `AbortError`.
    - Fail-closed result discrimination: submit action payloads declaring `ok === false` require an `issues` array where all issues sanitize atomically.
    - In-flight cancellation: `form.cancelSubmit()`, duplicate submit policies (`supersede`, `drop`, `reject`), and automatic abort on `reset()`, `reinitialize()`, or `dispose()`.
  - **Structured Server Issue Taxonomy & Routing:**
    - `ServerIssue` structure: `{ code, message, path?, source: "server" }`.
    - Routing to leaf fields, groups, arrays, and fallback to root `form.serverIssues` for unresolvable/root paths.
    - Localized clearing on edit: editing a leaf field clears only that field's server issues.
    - Coexistence with client validation: running client validators does not wipe active server issues.
    - `FieldArray` in-flight mutation resilience: submission-time identity snapshots map array paths to stable item IDs even if items are reordered mid-flight.
  - **Dynamic Repeatable Collections (`createFieldArray`):**
    - Stable logical item identity (`FieldArrayItem<TNode>` with stable `id` and `node`) independent of array positional indices; reordering (`move`, `swap`), insertion, and removal preserve item identity and child states.
    - Opaque internal ID generation or custom `keyExtractor` without ID collisions.
    - Batch-safe array mutations: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `clear`.
    - Reactive collection aggregation: `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues`, and `serverIssues`.
    - Identity-strict dirty tracking: pristine if and only if length, key sequence, and all child nodes are pristine.
    - Deterministic child Scope lifecycle and transactional adoption: removed baseline items are retained privately for `reset()` restoration; non-baseline items are cleanly disposed.
  - **Leaf Field Primitive (`createField`):**
    - Raw vs Value separation: synchronous parsers (`FieldParser<TRaw, TValue>`) where raw presentation input is preserved in `rawValue` without mutating domain `value`.
    - Synchronous validation rules (`SyncValidationRule<TValue>`) and asynchronous validation rules (`AsyncValidationRule<TValue>`).
    - Standard Schema v1 validation bridge (`standardSchema`) providing provider-neutral support for any `@standard-schema/spec` schema.
    - Reactive state signals: `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`, `parseIssue`, `parseStatus`, `validationStatus`.
    - Trusted baseline contract: explicit `initialValue` + `initialRawValue` at creation and `{ value, rawValue }` in `form.reinitialize`.
  - **Built-in Parsers (public):**
    - `createNumberParser`: strict decimal grammar parser.
    - `createStringParser`: optional whitespace trimming.
  - **Nested Groups (`createFieldGroup`) & Root Forms (`createForm`):**
    - Hierarchical aggregation of state dimensions.
    - Whole-form baseline reinitialization (`form.reinitialize`) using separate `value` and `rawValue` trees (`FormReinitializeInput`).
- **Subpaths (`/react`, `/vanilla`, `/angular`, `/vue`):**
  - `/react`: Production React 18/19 adapter (`useField`, `useForm`, `useFieldArray`).
  - `/vanilla`: Production Vanilla DOM adapter (`bindField`, `bindForm`).
  - `/angular`: Production Angular 17+ adapter (`createAngularField`, `toAngularField`, `createAngularForm`, `createAngularFieldArray`).
  - `/vue`: Production Vue 3.3+ adapter (`createVueField`, `useViiField`, `createVueForm`, `createVueFieldArray`).
- **Deferred / Non-Goals for P1j:**
  - Angular directives / forms integration (ControlValueAccessor, NgControl, ReactiveFormsModule, template-driven forms).
  - Vue components / custom directives (v-model directive integration, Pinia, VueUse).
  - DOM behavior in Angular/Vue adapters (reactive state bridges only; DOM management belongs to Vanilla adapter or UI component bindings).
  - Real-browser automated testing (Playwright Chromium, Korean/Japanese/Chinese IME composition, focus-first-invalid navigation, WCAG 2.2 AA audit deferred to P1k).
  - Performance and memory release budgets (deferred to P1l).

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md` for architecture and roadmap details.
