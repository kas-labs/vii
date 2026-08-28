# Vii Form Research Roadmap

> **Status**: Research Concluded & Accepted (F0-F10 Completed via PR #166)
> **Current Phase**: Production Form Phase 1 (P1b Completed, P1c Next)
> **Governing Strategy**: Evidence-driven Build-vs-Buy (Option A: Graduate to Build)
> **Prerequisites**: Phase 1 (Core State), Phase 2 (Adapters/CLI), Scope/Lifecycle Foundations, Schema Research (`Wrap + Reduce`)

---

## 1. Research Thesis & Operating Policy

Vii Form is a research track investigating whether a small, typed, framework-agnostic headless Form module should exist in the Vii ecosystem, or whether direct application-level composition of Vii State + Scope or an existing mature form library (e.g. TanStack Form, React Hook Form, Angular Signal Forms, VeeValidate) fully satisfies Vii application requirements.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Vii Application / UI                     │
│         (React / Angular / Vue / Vanilla / Vii Native)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (bindings / adapters)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Vii Form (Interaction Layer)                │
│  (Signal-first field tree, Granular reactivity, Dirty/Touch, │
│   Sync/Async validation scheduling, Cancellation, Parse/     │
│   Transform pipeline, Structured issue taxonomy, Submission) │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
       (reads/writes)            (validates via Standard Schema)
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Vii State & Scope       │ │   Standard Schema Provider │
│ (Reactive signals, Computed, │ │  (Zod 4, Valibot, ArkType, │
│  Batch, Disposal, Ownership) │ │   or Native Vii Rule Fn)   │
└──────────────────────────────┘ └────────────────────────────┘
               │                              │
               │ (triggers submission action) │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│             Application Mutation / Action Target            │
│         (Vii Query Mutation / Vii HTTP / Fetch API)         │
└─────────────────────────────────────────────────────────────┘
```

### Core Architectural Invariants

1. **Strict Ownership Boundaries**:
   - **State**: application / local retained reactive state (`state()`, `computed()`, `batch()`).
   - **Computed**: derived read-only current state.
   - **Scope**: lifecycle, ownership hierarchy, and disposal (`createScope()`, `scope.dispose()`).
   - **Form**: field/form interaction semantics, input/output pipelines, validation scheduling, issue lifecycle, submission state machine.
   - **Query**: retained remote/server state, server cache, deduplication, background revalidation, cache invalidation.
   - **HTTP**: request/response transport, URL/header composition, middleware, timeouts.
   - **Schema**: optional runtime validation provider via Standard Schema v1 or native rule contracts.
   - **Diagnostics**: value-free structural observation only.
   - **UI**: framework rendering, DOM elements, and accessibility presentation.

   **Hard Rule**: Form must **never** become a general state management system, a Query cache, an HTTP client, a schema engine monolith, an authorization layer, a router, a UI component library, or a server framework.

2. **Core Decoupling**:
   - `@vii-labs/core` remains zero-dependency and knows nothing about Form.
   - Form sits above Core and consumes State, Computed, Batch, and Scope.

3. **Provider-Neutral Validation Boundary**:
   - Vii Form does **not** depend on a Vii-owned schema monolith.
   - Validation accepts any **Standard Schema v1** (`@standard-schema/spec`) compliant validator (e.g. Zod 4, Valibot, ArkType) or lightweight native rule functions `({ value }) => Issue | null`. (Runtime provider compatibility is evaluated on an evidence basis per slice; type shapes alone do not imply verified support).

4. **Transport and Remote State Independence**:
   - `form.submit()` does **not** require Vii HTTP or Vii Query. It delegates submission to an application-provided async action `({ value, signal }) => Promise<void>`.

5. **Build-vs-Buy Primacy**:
   - Valid whole-track research outcomes remain: **`Own`**, **`Reuse`**, **`Wrap`**, **`Reduce`**, or **`Stop`**.
   - Wrapping an existing headless library (e.g. TanStack Form) or recommending direct State/Scope usage is an entirely acceptable conclusion if empirical evidence shows a dedicated package does not justify its maintenance, type complexity, and bundle overhead.

6. **Research Gating**:
   - Completion of F0 establishes semantic boundaries, domain model, and research questions only.
   - **F0 completion does NOT authorize F1 or any production implementation.**
   - No public `@vii-labs/form` package, public exports, or release changes are authorized prior to the final F10 evaluation gate.

---

## 2. Research Slices Sequence (F0 – F10)

| Slice | Title | Scope & Objectives |
| --- | --- | --- |
| **F0** | **Architecture + Domain Model + Build-vs-Buy Questions** | Define semantic boundaries, candidate domain model, value pipeline, validation/cancellation invariants, accessibility/security contracts, build-vs-buy criteria, and F0–F10 research roadmap. *(Completed)* |
| **F1** | **Minimal Field/Form State Prototype** | Prototype minimal signal-first Field and Form core with granular subscriptions, `value`, `initialValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, and disposal. Measure notification fan-out. Compare Form-owned vs external State binding vs controlled hybrid projection. *(Completed Prototype in `research/form/`)* |
| **F2** | **Nested Objects + Arrays + Identity** | Research object field nodes and array field nodes (`FieldArray`). Compare hierarchical tree vs flat path registry vs hybrid lookup vs lazy field nodes. Research stable item identity vs index identity across insert, remove, swap, move, and reorder. *(Completed Prototype in `research/form/`)* |
| **F3** | **Validation Scheduling + Structured Issues** | Prototype synchronous validation engine, trigger modes (`change`, `blur`, `submit`), rule precedence, group validation, and structured issue taxonomy (`FieldIssue`, `FormIssue`). *(Completed Prototype in `research/form/`)* |
| **F4** | **Async Validation + Cancellation + Revisions** | Research asynchronous validation, debounce scheduling (evidence-backed defaults), `AbortSignal` propagation, generation/revision protection to eliminate stale race conditions, and Scope lifecycle integration. *(Completed Prototype in `research/form/`)* |
| **F5** | **Parsing / Input-Output Types / Standard Schema Boundary** | Prototype raw input $\rightarrow$ parse $\rightarrow$ field value $\rightarrow$ validate $\rightarrow$ transform $\rightarrow$ output pipeline. Integrate Standard Schema v1 provider boundary and test against verified providers (Zod 4, Valibot, ArkType). *(Completed Prototype in `research/form/`)* |
| **F6** | **Submission Lifecycle + Server Errors + Reset/Reinitialize** | Prototype submission state machine (`idle`, `validating`, `submitting`, `succeeded`, `failed`, `cancelled`), duplicate prevention (drop vs reject policy), server error attachment/clearing strategies, reset to initial vs new baseline, and external model reinitialization. *(Completed Prototype in `research/form/`)* |
| **F7** | **Framework Adapter Compliance (Vanilla, React, Angular, Vue)** | Prototype thin adapters for Vanilla DOM, React (`useForm` / `useField` / `useFieldArray`), Angular (`createAngularForm` / `createAngularField`), and Vue (`createVueForm` / `createVueField`). Verify zero whole-form rerenders, exact cross-framework semantic equivalence, and framework-native ergonomics. *(Completed Prototype in `research/form/adapters/`)* |
| **F8** | **Accessibility + Security + Privacy Hardening** | Prototype accessible HTML helpers (`aria-invalid`, `aria-describedby`, error focus identification at adapter edge), prototype-pollution defense in field paths, empirical depth/width bounds, and value-free diagnostics redaction. *(Completed Prototype in `research/form/`)* |
| **F9** | **Runtime / Memory / TypeScript / Bundle Evidence** | Measure bundle footprint (minified, gzip, brotli), field update latency, memory retention across 100/500 cycles (zero retained resources; empirical heap budget), and TypeScript compilation wall time. *(Completed Prototype & Evidence in `research/form/F9_EVIDENCE.md`)* |
| **F10** | **Real Consumer Validation + Build-vs-Buy Graduation Gate** | Validate Form prototype on expanded multi-step Vanilla onboarding fixture and React task board. Execute formal Build-vs-Buy comparative benchmarks against TanStack Form, React Hook Form, and Angular Signal Forms. Render graduation decision. *(Not Started)* |

---

## 3. Core Architecture & Semantic Boundaries

### 3.1 Real Consumer Evidence & Baseline Friction

Inspection of the real Phase 4 consumer (`vii-reference-vanilla-onboarding`) reveals how forms are currently constructed with pure Vii State and Scope:

1. **State Boilerplate**:
   - Explicit `formData = state(...)`, `touched = state(...)`, `currentStep = state(...)`, `submitted = state(...)`.
   - Repetitive updater functions (`setName`, `setEmail`, `setNotification`, `blur`) doing manual object spreading (`formData.update(curr => ({ ...curr, [field]: value }))`).
2. **Whole-Form Validation Recalculation**:
   - Validation is implemented as a single top-level `computed(() => validateForm(formData.get()))`. Any keystroke in `name` recalculates validation for `email` and `notifications`.
3. **Manual Error Filtering & Derived State**:
   - `visibleErrors`, `profileValid`, `isValid` require manual `computed()` derivations combining `errors.get()`, `touched.get()`, and `submitted.get()`.
4. **Nested State Rigidity**:
   - Nested objects (`notifications: { email: boolean, product: boolean }`) require manual deep spreading and custom setter functions.
5. **Missing Primitives**:
   - No built-in async validation cancellation; no standard parsing/transformation pipeline; no structured server error binding; no array item identity management.

**Research Takeaway**: A dedicated Form layer has legitimate ergonomics and performance opportunities in Vii, but only if it solves granular field evaluation and async cancellation without ballooning runtime size or replicating full UI frameworks.

---

### 3.2 Candidate Domain Model & Classification

The candidate domain model classifies every form concept into one of five categories:
- **Required Semantic Primitive**: Core state node owned by Form.
- **Derived State**: Computed dynamically from primitives via Vii `computed()`.
- **Adapter Concern**: Rendered or handled at framework/DOM edges.
- **Application Concern**: Business logic outside Form Core.
- **Deferred**: Post-MVP / Phase 2+ research.

| Concept | Classification | Definition & Semantic Invariant |
| --- | --- | --- |
| **Form** | Required Primitive | Root controller owning field registry, submission state machine, Scope, and form-level diagnostics. |
| **Field** | Required Primitive | Leaf state node representing an individual input value and its metadata. |
| **FieldGroup** | Required Primitive | Branch node representing a nested object structure (`user.address`). |
| **FieldArray** | Required Primitive | Branch node representing an ordered collection of repeatable items with stable identities. |
| **Field Path** | Required Primitive | Canonical dot/array path representation (`user.addresses[0].street`) with prototype-safe traversal. |
| **Initial Value** | Required Primitive | The baseline value at initialization or last committed reset. |
| **Current Value** | Required Primitive | The current typed domain value held in the field's reactive State. |
| **Raw Input Value** | Adapter Concern | Unparsed DOM/UI input value (e.g. `string` from `<input type="number">`). |
| **Parsed Value** | Required Primitive | The result of parsing raw input into the domain type before validation. |
| **Validated Value** | Derived State | The verified domain value conforming to schema/rule constraints. |
| **Submission Output** | Derived State | Transformed payload ready for network/action dispatch. |
| **Dirty** | Derived State | Hypothesis: comparison between current and initial values. (Evaluation of reference vs configurable comparator vs structured value strategy deferred to F1/F6). |
| **Touched** | Required Primitive | `true` once the field has lost focus (`blur`). Form touched = any child touched. |
| **Visited** | Deferred | Focused at least once. (Deferred to avoid redundant metadata states unless consumer proves necessity). |
| **Pending** | Derived State | `true` while any synchronous or asynchronous validation is in-flight. (Relationship to validity axis to be validated in F3/F4). |
| **Valid / Invalid** | Derived State | Candidate hypothesis: `valid = errors.length === 0 && !pending`; `invalid = !valid`. (Decoupling of validation status vs execution status evaluated in F3). |
| **Disabled** | Required Primitive | Field ignored during validation and excluded from submission output (matches HTML standard). |
| **Readonly** | Required Primitive | Field locked from user edit, but validated and included in submission output. |
| **Hidden** | Adapter / UI Concern | Visual presentation state. If present in model, validated and submitted unless conditionally unregistered. |
| **Errors / Issues** | Required Primitive | Collection of structured issues (`code`, `message`, `path`, `source: 'client' | 'server'`). |
| **Validation Revision** | Required Primitive | Monotonic integer sequence guarding against stale async validation completion. |
| **Submission Lifecycle** | Required Primitive | State machine: `idle` $\rightarrow$ `validating` $\rightarrow$ `submitting` $\rightarrow$ `succeeded` / `failed` / `cancelled`. |
| **Server Error** | Required Primitive | External issues injected into fields/form post-submission. (Clearing/staleness lifecycle evaluated in F6). |
| **Form-Level Error** | Required Primitive | Issues not bound to a specific field path (e.g. general network error, multi-field cross-validation). |

---

### 3.3 Model Ownership: Form-Owned vs. External State Binding

**Core Invariant**: There must be **one unambiguous source of form truth**.

| Model Architecture | Mechanics | Advantages | Disadvantages | Research Status |
| --- | --- | --- | --- | --- |
| **Option A: Form-Owned Model** | Form creates and encapsulates its own Vii `state()` nodes internally. | - Encapsulation of interaction metadata.<br>- Clean reset/dirty tracking.<br>- Zero external synchronization bugs. | - Cannot directly share raw state with external stores without syncing. | **F1 Baseline Hypothesis** (to compare in F1). |
| **Option B: External State Binding** | Form acts as a lens over an external Vii `state<T>()` object. | - Direct two-way binding to domain stores. | - Risk of circular update loops.<br>- Ambiguity on initial value vs current external mutations.<br>- Competing sources of truth. | Candidate to test in F1. |
| **Option C: Hybrid (Form-Owned with Controlled Projection)** | Form owns internal field state; provides explicit synchronization hooks. | - Uncompromised internal lifecycle + clean external interoperability. | - Requires explicit sync boundaries. | Candidate to test in F1. (No specific API selected yet). |

---

### 3.4 Field Tree Structure: Candidate Architectures

F2 will evaluate candidate field tree topologies targeting **constant-time lookup where justified** while maintaining hierarchical aggregation:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Candidate Form Root                      │
│  ├── indexedRegistry: Map<FieldPath, FieldNode>             │
│  └── treeRoot: FieldGroupNode { children: { ... } }         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│    FieldGroupNode     │             │    FieldArrayNode     │
│ (aggregates children) │             │ (manages collection)  │
└───────────┬───────────┘             └───────────┬───────────┘
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│       FieldNode       │             │    ArrayItemNode      │
│ (leaf state / signals)│             │ (identity + child grp)│
└───────────────────────┘             └───────────────────────┘
```

- **F2 Trade-Off Comparison**:
  1. Pure hierarchical tree (clean nesting, $O(d)$ path lookup).
  2. Flat path registry (simple lookups, manual ancestor derivation).
  3. Hybrid tree + index (fast direct lookup + structured ancestor aggregation).
  4. Lazy field nodes (instantiate nodes only when accessed or bound).
- **Path Stability**: Paths represent canonical immutable arrays `['user', 'addresses', 0, 'street']` and normalized string representations.
- **Granular Updates**: Mutating a leaf `FieldNode` should notify only direct subscribers to that field's state, while ancestor nodes derive aggregate `dirty`/`valid` lazily.

---

### 3.5 Nested Objects & Repeatable Arrays (The Identity Contract)

#### Nested Objects
- Parent `dirty`, `touched`, `pending`, and `valid` are **derived lazily** using Vii `computed()`.
- Group-level validation rules can validate the aggregate slice without coupling leaf field subscribers.
- Mutating a child field does **not** trigger notifications for sibling fields.

#### Repeatable Arrays (`FieldArray`)
- **Stable Item Identity**: Preserving UI state, focus, touched, dirty, and client errors across reordering (`swap`, `move`, `insert`, `remove`) requires stable identity semantics rather than index-only tracking.
- **F2 Comparison of Identity Strategies**:
  1. Internal generated unique symbol/ID.
  2. Application-provided key extractor `(item) => key`.
  3. Hybrid identity (application key with fallback to generated token).
  4. Explicit index-only mode for fixed-position collections.
- *(Note: No specific internal field name or symbol is finalized in F0)*.
- **Server Error Mapping**: Server errors arriving with index paths (e.g. `items[2].price`) will be mapped to the item reference active at the response revision.

---

### 3.6 Value Pipeline & Typing

Vii Form explicitly separates the data pipeline into five distinct stages:

```text
Raw Input (UI) ──> [ Parse ] ──> Field Value ──> [ Validate ] ──> Validated Value ──> [ Transform ] ──> Submission Output
   (string)          (parser)       (domain T)       (schema/rules)       (valid T)          (transformer)         (payload Out)
```

1. **Parse Stage**: Converts string/DOM input to domain type (e.g. `"42"` $\rightarrow$ `42`, `""` $\rightarrow$ `undefined`). Parse failure produces a `ParseIssue` and halts further pipeline progression.
2. **Field Value Stage**: The live in-memory value of the field.
3. **Validate Stage**: Executes synchronous and asynchronous rules against the field value. Validation failure produces `ValidationIssue` entries.
4. **Transform Stage**: Optional post-validation domain transformation (e.g. trimming strings, computing hashes).
5. **Submission Output**: The final immutable output object produced upon successful validation.

**TypeScript Type Invariants (Candidate Signature)**:
```ts
export interface FieldDefinition<TRaw = string, TValue = unknown, TOutput = TValue> {
  parse?: (raw: TRaw) => TValue | Promise<TValue>;
  rules?: Array<ValidationRule<TValue>>;
  transform?: (value: TValue) => TOutput;
}
```

---

### 3.7 Validation Engine, Triggers & Cancellation

#### Provider Neutrality & Standard Schema Boundary
- Form Core provides a minimal native rule interface:
  ```ts
  export type ValidationRule<T> = (context: {
    value: T;
    path: FieldPath;
    signal: AbortSignal;
  }) => ValidationIssue | null | Promise<ValidationIssue | null>;
  ```
- Form supports any **Standard Schema v1** schema (Zod 4, Valibot, ArkType) via a zero-cost adapter that delegates parsing and issue mapping.

#### Validation Triggers
1. **`change`**: Runs synchronous rules on state update. Async rules may be debounced.
2. **`blur`**: Runs sync and async rules when the field loses focus (`touched = true`).
3. **`submit`**: Forces all fields (touched and untouched) to validate immediately.
4. **`manual`**: Explicit programmatic invocation `form.validate()`.

*(Debounce scheduling policy, configurable delay, and zero-accidental-network defaults will be evaluated with empirical evidence in F4)*.

#### Async Validation & Stale Race Cancellation
- Each field maintains a monotonic `validationRevision: number`.
- When a field value changes while async validation is in flight:
  1. The existing `AbortController` for that field's active validation is aborted (`signal.abort()`).
  2. `validationRevision` is incremented.
  3. Stale async completion callbacks check `if (responseRevision !== currentRevision) return;` and discard results.
  4. Only the latest validation revision has commit authority.
- **Invariant**: `cancellation !== validation failure`.

---

### 3.8 Structured Issue Taxonomy & Precedence

```text
┌─────────────────────────────────────────────────────────────┐
│                       FormIssueBase                         │
│  - path: string[] | string                                  │
│  - message: string                                          │
│  - code: string (machine-readable)                          │
│  - severity: 'error' | 'warning' | 'info'                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
       ┌───────┴───────┐              ┌───────┴───────┐
       ▼               ▼              ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│  ParseIssue  ││ValidationIss.││ ServerIssue  ││  FormIssue   │
│(syntax/conv.)││(rules/schema)││(API response)││(cross-field) │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

- **Precedence**: Parse issues block validation rules. Synchronous validation issues block async validation network calls.
- **Server Error Lifecycle (F6 Investigation)**:
  - F6 will compare clearing on edit vs marking stale vs preserving until next validation attempt.

---

### 3.9 Submission State Machine

```text
       ┌──────────┐
       │   idle   │ ◄────────────────────────┐
       └────┬─────┘                          │
            │ submit()                       │
            ▼                                │
  ┌──────────────────┐                       │
  │    validating    │ ──── (invalid) ───────┤
  └─────────┬────────┘                       │
            │ (valid)                        │
            ▼                                │
  ┌──────────────────┐                       │
  │    submitting    │ ──── (abort/cancel) ──┤
  └────┬────────┬────┘                       │
       │        │                            │
(success)     (error / server issues)        │
       │        │                            │
       ▼        ▼                            │
┌──────────┐  ┌──────────┐                   │
│succeeded │  │  failed  │ ──────────────────┘
└──────────┘  └──────────┘
```

- **Duplicate Prevention Policy**: Re-entrant submissions while `submitting` is active must be deterministically handled (drop vs reject error to be evaluated in F6).
- **Transport Decoupling**: Form passes `{ value: TOutput, signal: AbortSignal }` to the user's async handler.

---

### 3.10 Scope Ownership & Resource Lifecycle

**Architectural Invariant**: Deterministic disposal of all subscriptions, State nodes, and active `AbortController` tasks upon form disposal.

- **Candidate Scope Topologies (F1/F2/F4 Investigation)**:
  1. Root-only Scope with lightweight resource registration.
  2. Per-field Scope hierarchy.
  3. Lazy Scope allocated only for fields owning async validation/cancellation resources.
  4. Array-item child Scopes for collection lifecycle cleanup.
- When `form.dispose()` is called, all associated resources, listeners, and async controllers are cleanly disposed/aborted.

---

### 3.11 Security, Privacy & Accessibility Baseline

#### Security Baseline
1. **Prototype Pollution Protection**: Path resolution utilities must strictly forbid `__proto__`, `prototype`, and `constructor` properties.
2. **Depth & Width Bounds**: Nesting depth and array mutation limits will be empirically baselined and defended in F8.
3. **No Unsafe Code Evaluation**: Zero `eval()` or dynamic `Function()` usage (CSP Strict compliance).
4. **Client Validation is UX Only**: Client validation is never treated as an authorization boundary.

#### Privacy & Diagnostics Baseline
- Form diagnostics emit structural events: `field:changed`, `validation:started`, `validation:superseded`, `issue:added`, `submit:started`.
- **Strict Privacy Rule**: Diagnostics events must **never** record raw form values, passwords, secret tokens, or full server error payloads.

#### Accessibility Baseline (Adapter / UI Boundary)
- Headless Form Core exposes structural state (validity, errors, touched) to enable accessible UI construction.
- Framework adapters / DOM helpers provide:
  - `aria-invalid="true"` when errors are present and field is touched.
  - `aria-describedby="[fieldId]-error [fieldId]-desc"`.
  - `aria-required="true"` if field has a required rule.
  - Identification and focus management for the first invalid field on failed submission attempt.

---

## 4. Build-vs-Buy Comparative Evaluation Framework

To prevent NIH (Not-Invented-Here) bias, Vii Form will be evaluated at Slice F10 against mature alternatives using a strict multi-dimensional scorecard:

### Comparison Matrix Dimensions

| Evaluation Dimension | Metric & Methodology | Target Benchmark Candidates |
| --- | --- | --- |
| **Bundle Impact** | Raw, minified, gzip, and brotli bytes of core and framework adapters. | TanStack Form, React Hook Form, Angular Signal Forms, VeeValidate, Handwritten Vii State helper. |
| **Field Update Latency** | Time to update single field and propagate notifications in a 100-field form. | Vii State signal fan-out vs TanStack Form store vs RHF ref-update. |
| **Rerender / Notification Count** | Number of components/subscribers notified on single keystroke. | 1 subscriber target (field only); 0 whole-form rerenders. |
| **Memory & Teardown** | Heap retention and listener count after 1,000 mount/dispose cycles. | Zero retained disposed resources; empirical heap budget TBD in F9. |
| **Type-Check Latency** | `tsc --noEmit` wall time on deeply nested/dynamic forms. | Measure compiler cost of deep path inference. |
| **Framework Portability** | Same core contract used across Vanilla, React, Angular, Vue. | TanStack Form (multi-adapter) vs Vii Form vs framework-native solutions. |
| **Async Cancellation** | Deterministic cancellation of stale network validation requests. | Verify AbortSignal and revision protection under rapid typing. |

---

## 5. Slice F7: Framework Adapter Compliance (Vanilla, React, Angular, Vue)

Slice F7 proved that a single framework-neutral Vii Form semantic model (from F0-F6) can be consumed idiomatically and cleanly across four distinct framework ecosystems without state mirrors, state duplication, or semantic forks:

1. **Vanilla DOM Adapter (`research/form/adapters/vanilla.ts`)**:
   - Implements `bindField(field, element, options)` and `bindForm(form, element, options)`.
   - Bidirectional DOM binding without infinite loops (state $\rightarrow$ DOM and DOM `input`/`change`/`blur` $\rightarrow$ Form).
   - Preserves parser-backed raw intermediate strings (e.g. `"-"`, `"05"`, `""`) in the input element during parse errors while domain state remains pristine.
   - Prototyped safe issue rendering using `textContent` for XSS defense.
   - Clean disposal via explicit `disposer.dispose()` detaching DOM event listeners and unsubscribing from store nodes.

2. **React Adapter (`research/form/adapters/react.ts`)**:
   - Implements `useField(field)`, `useForm(form)`, and `useFieldArray(arrayNode)`.
   - Backed by React 19's `useSyncExternalStore` with snapshot memoization to ensure referential stability and prevent infinite render loops.
   - Granular reactivity: field edits re-render only the subscribed field component (zero whole-form re-renders).
   - Full SSR safety via synchronous `getServerSnapshot` reading without browser globals.
   - Zero retained subscriptions under React StrictMode mount/unmount lifecycles.

3. **Angular Adapter (`research/form/adapters/angular.ts`)**:
   - Implements `createAngularField(field)`, `createAngularForm(form)`, and `createAngularFieldArray(arrayNode)`.
   - Exposes read-only Angular Signals (`signal.asReadonly()`) for all Form state and computed nodes.
   - Full compatibility with Angular `computed()` and template signals.
   - Automatic subscription teardown bound to `DestroyRef.onDestroy` when available via `toAngularField(field)`.

4. **Vue Adapter (`research/form/adapters/vue.ts`)**:
   - Implements `createVueField(field)`, `createVueForm(form)`, `createVueFieldArray(arrayNode)`, `useViiField`, and `useViiForm`.
   - Exposes `shallowRef` wrapped in `shallowReadonly` for zero-overhead Vue reactivity.
   - Automatic subscription teardown bound to Vue's `effectScope` and `onScopeDispose`.

5. **Cross-Framework Semantic Compliance**:
   - Verified through `research/form/form-f7-compliance.test.ts` running a normalized multi-step scenario across Vanilla DOM, React, Angular, and Vue.
   - Proved identical state transitions across all 4 environments:
     - Raw vs parsed value preservation.
     - Model A terminal submission status: `submissionStatus === "succeeded"` is preserved when fields are edited after submission while `dirty` becomes `true`.
     - Touched on blur transitions.
     - Server issue attachment and localized clearing on field edits.
     - Reset restoring pristine state and `submissionStatus === "idle"`.
     - Array stable key identity preserved across item reordering.

---

## 6. Slice F8: Accessibility + Security + Privacy Hardening

Slice F8 evaluated and hardened the framework-neutral core and adapter boundaries with executable evidence:

1. **Accessibility Responsibility Split & WCAG 2.2 AA Evidence**:
   - **Form Core**: Exposes semantic state (`dirty`, `touched`, `pending`, `valid`, `invalid`, `validationStatus`, `parseStatus`), structured issues, issue ordering determinism, and submission status machine. Issues are plain text/data (zero HTML/ARIA in Core).
   - **Framework Adapters**: Project accessibility attributes (`aria-invalid="true"` when invalid; `pending` does NOT imply invalid), support `aria-describedby` linkage to issue elements, render issues via safe `textContent` sinks, and preserve native submit events with `preventDefault()`.
   - **Application / UI**: Owns label text, visual styling, exact error placement, live regions (`role="alert"`, `aria-live="polite"`), and focus management UX (focusing the first invalid field).
   - Verified across Vanilla DOM, React, Angular, and Vue in `research/form/form-f8-accessibility.test.ts`.

2. **Security Hardening & Hostile Input Defenses**:
   - **DOM XSS**: Untrusted validation, parse, and server messages containing `<script>`, `<img>`, `<svg>`, and `<iframe>` vectors rendered safely through `textContent` in Vanilla and framework interpolation in React, Angular, and Vue.
   - **Prototype Pollution**: `__proto__`, `constructor`, `prototype` blocked in issue codes and safely handled as immutable data segments in structured paths without polluting `Object.prototype`.
   - **Provider Fail-Closed**: Malformed parser outputs (null, missing boolean `ok`) and malformed Standard Schema results (non-array issues, throwing schemas) fail closed with structured `TypeError`.
   - **Submission Snapshots**: `deepCloneSnapshot` safely handles hostile getters, traps in hostile Proxies, cyclic references, shared object references, `Map`, `Set`, `Date`, and `RegExp`.
   - **Detached Async Safety**: Process-level unhandled rejection tracking verified zero unhandled rejections across detached validations, debounce timers, framework effects, and DOM submit bindings.
   - Verified in `research/form/form-f8-security.test.ts`.

3. **Privacy Invariants & Diagnostics Telemetry**:
   - **Diagnostics Invariant**: Diagnostics telemetry records only value-free structural events (`revision`, `issueCount`, `status`, `reason: Error.name`). Raw field values, parsed values, output payloads, server response bodies, validation messages, and secrets NEVER enter diagnostics.
   - **Sentinel Testing**: Sensitive sentinel strings (`SECRET_PASSWORD_DO_NOT_LOG_12345`, `AUTH_TOKEN_SECRET_987654321`, `4111_2222_3333_4444_SECRET_CARD`) verified absent from all emitted diagnostic events and serialized traces.
   - **Exception Privacy**: Detached exception handlers record only safe classifications (`reason: "Error"` or `reason: "TypeError"`) without message strings.
   - Verified in `research/form/form-f8-privacy.test.ts`.

## 7. Slice F9: Runtime, Memory, TypeScript, and Bundle Evidence

Slice F9 executed the comprehensive empirical evidence suite documented in `research/form/F9_EVIDENCE.md`:

1. **Runtime Scaling (Leaf-Only vs Aggregate-Consumer Scenarios)**:
   - In the tested leaf-only subscriber scenario, median single-field mutation remained approximately size-insensitive between 10 and 1,000 fields (~0.27 - 0.29 µs), and unrelated field subscribers received 0 notifications.
   - In the aggregate-consumer scenario, mutating a single field causes aggregate computeds (`values`, `dirty`, `issues`) to invalidate and recompute upon reading, scaling proportionally with aggregate tree size (~1.9 µs on 10 fields to ~149 µs on 1,000 fields).
   - Linear tree construction (~4.0 - 4.7 µs per field) and atomic `form.setValues` subset batching (~0.0025 ms for 10 fields).
   - Realistic nested form fixture programmatically verified at 97 leaf fields.

2. **FieldArray Lifecycle & True Isolated Operations**:
   - FieldArray construction (0.23 ms for 10 items; 1.49 ms for 100 items) is isolated from steady-state operations.
   - True isolated steady-state operations (with untimed setup/restore stages) execute in **~3.3 µs** (`push`), **~3.6 µs** (`insert`), **~2.7 µs** (`remove`), **~0.25 µs** (`swap`), **~0.33 µs** (`move`), and **0.137 ms** (`setValues` alternating 100 items).
   - 500 create/dispose cycles completed with zero retained scope leaks, zero dangling listeners, and zero unhandled rejections.

3. **Validation & Async Submission Lifecycle**:
   - Standard Schema adapter microbenchmarks on valid string input: Native rule (~0.0025 µs), Valibot (~0.030 µs), ArkType (~0.038 µs), Zod 4 (~0.049 µs).
   - Full Form validation throughput (10 fields) is uniform across providers (~0.026 - 0.027 ms).
   - Full tree validation (1 sync rule per field) scales predictably: 0.031 ms (10 fields / 10 rules), 0.37 ms (100 fields / 100 rules), 1.40 ms (500 fields / 500 rules), 3.97 ms (1,000 fields / 1,000 rules).
   - Completed async submission in steady state (timed strictly `await form.submit()`) executes at **~0.024 ms median**.
   - Server issue routing scales linearly (0.19 ms for 100 issues; 8.91 ms for 1,000 issues).

4. **TypeScript Diagnostics & Bundle Footprint**:
   - Compiler check time scales sub-linearly across isolated programs (0.39s for small, 0.40s for medium, 0.40s for large) with zero deep recursion errors.
   - `createField` standalone bundle: **12.98 kB min / 4.57 kB gzip / 4.05 kB brotli** (includes `@vii-labs/core` runtime), shedding ~28 kB minified code compared to full Form Core.
   - Static dependency isolation verified: 0 framework cross-contamination, 0 concrete schema dependencies in Core.
   - Full SSR and Node import safety verified.

5. **Reactive Propagation Invariant & Core Semantics (Items 10 & 57)**:
   - In Vii Core's push-pull lazy computed design, reading a derived `Computed` inside a synchronous `State` subscriber callback observes the previous cached value if the `Computed`'s invalidation listener was registered after the subscriber. This is an intended property of push-pull signal systems without topological sorting. Documented in `packages/core/README.md` and verified in `packages/core/test/computed.test.ts`. Form adapters and internal projections derive status directly from source signals.

---

## 8. Slice F10: Real Consumer Validation + Build-vs-Buy Graduation Gate

Slice F10 executed the definitive real consumer and competitor validation suite documented in `research/form/F10_CONSUMER_VALIDATION.md`:

1. **Realistic Consumer Applications**:
   - **Consumer A (Vanilla Multi-Step Onboarding)**: 5-step wizard with step validity computeds, parser presentation retention, dynamic address `FieldArray`, conditional tax ID rules, and automatic ARIA attribute projection verified in `research/form/f10/tests/consumer-a.test.ts`.
   - **Consumer B (React 19 Task Board)**: Collaborative card editor with controlled parser inputs, async title uniqueness check with `AbortSignal` cancellation, 10 verified React historical regression scenarios (StrictMode, unmount abort, etc.), and leaf-level render isolation (1 render on leaf edit, 0 sibling re-renders) verified in `research/form/f10/tests/consumer-b.test.tsx`.
   - **Angular Signal Forms (Angular 22.1.4)**: Real Signal Forms implementation using official `@angular/forms/signals` APIs (`form`, `schema`, `required`, `minLength`, `min`) with application-owned submission glue verified in `research/form/f10/tests/competitors.test.tsx`.

2. **Direct Competitor Comparisons**:
   - Evaluated against TanStack Form v1.33.5, React Hook Form 7.86.0, real Angular 22 Signal Forms, and TanStack Form v2.0.0-alpha.2 (documentation-only).
   - Vii Form demonstrated sub-microsecond leaf keystroke mutations (~0.71 µs at 100 fields vs TanStack 3.34 µs) and sub-microsecond FieldArray swap operations (0.22 µs vs TanStack 35.02 µs) in batched isolated timing harnesses.

3. **Security & Privacy Defense**:
   - Safe structured model data handling for `__proto__`, `constructor`, `prototype` on null-prototype objects, sink protection against hostile XSS vectors, and zero sentinel string emission to diagnostics telemetry confirmed in `research/form/f10/tests/security-privacy.test.ts`.

4. **32-Dimension Build-vs-Buy Decision Matrix**:
   - Comprehensive multi-axis evaluation scored Vii Form at **143 / 160** vs TanStack Form at **120 / 160**, React Hook Form at **97 / 160**, and Angular Signal Forms at **114 / 160**.

5. **Formal Graduation Gate Verdict**:
   - **GRADUATE TO BUILD (RECOMMEND PRODUCTION PHASE 1)**.
   - All 397 Form research tests pass across 23 test suites.

---

## 9. Operating Status & Absolute Stop Conditions

- **Current Status**: **F0 through F10 are COMPLETE. The Form research track is concluded.**
- **Graduation Decision**: **GRADUATE TO BUILD (RECOMMEND PRODUCTION PHASE 1)**.
- **Operating Constraint**: Under repository governance, **NO PUBLIC `@vii-labs/form` PACKAGE IS CREATED OR PUBLISHED.** No production implementation phase is initiated in this slice. All findings and code artifacts are preserved under `research/form/` for architectural review and future scheduling.

