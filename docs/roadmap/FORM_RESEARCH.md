# Vii Form Research Roadmap

> **Status**: Active Research Track (F0 Completed)
> **Current Slice**: F0 (Form Architecture, Domain Model & Build-vs-Buy Questions)
> **Governing Strategy**: Evidence-driven Build-vs-Buy
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
   - Validation accepts any **Standard Schema v1** (`@standard-schema/spec`) compliant validator (Zod 4, Valibot, ArkType, TypeBox, etc.) or lightweight native rule functions `({ value }) => Issue | null`.

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
| **F0** | **Architecture + Domain Model + Build-vs-Buy Questions** | Define semantic boundaries, candidate domain model, value pipeline, validation/cancellation invariants, accessibility/security contracts, build-vs-buy criteria, and F0–F10 research roadmap. *(Current Slice)* |
| **F1** | **Minimal Field/Form State Prototype** | Prototype minimal signal-first Field and Form core with granular subscriptions, `value`, `initialValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, and disposal. Measure notification fan-out. |
| **F2** | **Nested Objects + Arrays + Identity** | Research object field nodes and array field nodes (`FieldArray`). Prototype stable item identity vs index identity across insert, remove, swap, move, and reorder. |
| **F3** | **Validation Scheduling + Structured Issues** | Prototype synchronous validation engine, trigger modes (`change`, `blur`, `submit`), rule precedence, group validation, and structured issue taxonomy (`FieldIssue`, `FormIssue`). |
| **F4** | **Async Validation + Cancellation + Revisions** | Research asynchronous validation, debounce scheduling, `AbortSignal` propagation, generation/revision protection to eliminate stale race conditions, and Scope lifecycle integration. |
| **F5** | **Parsing / Input-Output Types / Standard Schema Boundary** | Prototype raw input $\rightarrow$ parse $\rightarrow$ field value $\rightarrow$ validate $\rightarrow$ transform $\rightarrow$ output pipeline. Integrate Standard Schema v1 provider boundary and test against Zod 4, Valibot, and ArkType. |
| **F6** | **Submission Lifecycle + Server Errors + Reset/Reinitialize** | Prototype submission state machine (`idle`, `validating`, `submitting`, `succeeded`, `failed`, `cancelled`), duplicate prevention, server error attachment/clearing, reset to initial vs new baseline, and external model reinitialization. |
| **F7** | **Framework Adapter Compliance (Vanilla, React, Angular, Vue)** | Prototype thin adapters for Vanilla DOM, React (`useViiForm` / `useViiField`), Angular (`viiFormSignal`), and Vue (`useViiFormRef`). Verify zero whole-form rerenders and framework-native ergonomics. |
| **F8** | **Accessibility + Security + Privacy Hardening** | Prototype accessible HTML helpers (`aria-invalid`, `aria-describedby`, error autofocus), prototype-pollution defense in field paths, depth limits, and value-free diagnostics redaction. |
| **F9** | **Runtime / Memory / TypeScript / Bundle Evidence** | Measure bundle footprint (minified, gzip, brotli), field update latency, memory retention across 1,000 mount/dispose cycles, and TypeScript compilation wall time. |
| **F10** | **Real Consumer Validation + Build-vs-Buy Graduation Gate** | Validate Form prototype on expanded multi-step Vanilla onboarding fixture and React task board. Execute formal Build-vs-Buy comparative benchmarks against TanStack Form, React Hook Form, and Angular Signal Forms. Render graduation decision. |

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
| **Dirty** | Derived State | `currentValue !== initialValue` (strict equality or configurable comparator). Form dirty = any child dirty. |
| **Touched** | Required Primitive | `true` once the field has lost focus (`blur`). Form touched = any child touched. |
| **Visited** | Deferred | Focused at least once. (Deferred to avoid redundant metadata states unless consumer proves necessity). |
| **Pending** | Derived State | `true` while any synchronous or asynchronous validation is in-flight. |
| **Valid / Invalid** | Derived State | `valid = errors.length === 0 && !pending`; `invalid = !valid`. |
| **Disabled** | Required Primitive | Field ignored during validation and excluded from submission output (matches HTML standard). |
| **Readonly** | Required Primitive | Field locked from user edit, but validated and included in submission output. |
| **Hidden** | Adapter / UI Concern | Visual presentation state. If present in model, validated and submitted unless conditionally unregistered. |
| **Errors / Issues** | Required Primitive | Collection of structured issues (`code`, `message`, `path`, `source: 'client' | 'server'`). |
| **Validation Revision** | Required Primitive | Monotonic integer sequence guarding against stale async validation completion. |
| **Submission Lifecycle** | Required Primitive | State machine: `idle` $\rightarrow$ `validating` $\rightarrow$ `submitting` $\rightarrow$ `succeeded` / `failed` / `cancelled`. |
| **Server Error** | Required Primitive | External issues injected into fields/form post-submission; cleared on next field user edit. |
| **Form-Level Error** | Required Primitive | Issues not bound to a specific field path (e.g. general network error, multi-field cross-validation). |

---

### 3.3 Model Ownership: Form-Owned vs. External State Binding

| Model Architecture | Mechanics | Advantages | Disadvantages | Verdict / Direction |
| --- | --- | --- | --- | --- |
| **Option A: Form-Owned Model** | Form creates and encapsulates its own Vii `state()` nodes internally. | - Encapsulation of interaction metadata.<br>- Clean reset/dirty tracking.<br>- Zero external synchronization bugs. | - Cannot directly share raw state with external stores without syncing. | **Primary Baseline** for F1 prototype. |
| **Option B: External State Binding** | Form acts as a lens over an external Vii `state<T>()` object. | - Direct two-way binding to domain stores. | - Risk of circular update loops.<br>- Ambiguity on initial value vs current external mutations.<br>- Competing sources of truth. | Rejected as mandatory Core model. |
| **Option C: Hybrid (Form-Owned with Controlled Projection)** | Form owns internal field state; provides explicit `syncTo(externalState)` or `readFrom(externalState)` hooks. | - Uncompromised internal lifecycle + clean external interoperability. | - Requires explicit sync boundaries. | **Recommended Architecture** for F0/F1. |

---

### 3.4 Field Tree Structure: Hybrid Tree + Indexed Lookup

To achieve $O(1)$ direct field access by string/tuple path while maintaining hierarchical aggregation for nested objects and arrays, Vii Form adopts a **Hybrid Tree + Indexed Lookup** model:

```text
┌─────────────────────────────────────────────────────────────┐
│                         Form Root                           │
│  ├── indexedRegistry: Map<FieldPath, FieldNode>  (O(1) look)│
│  └── treeRoot: FieldGroupNode { children: { ... } }         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│    FieldGroupNode     │             │    FieldArrayNode     │
│ (aggregates children) │             │ (manages key identity)│
└───────────┬───────────┘             └───────────┬───────────┘
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│       FieldNode       │             │    ArrayItemNode      │
│ (leaf state / signals)│             │ (stable ID + child grp│
└───────────────────────┘             └───────────────────────┘
```

- **Path Stability**: Paths are represented internally as canonical immutable arrays `['user', 'addresses', 0, 'street']` and string keys `'user.addresses[0].street'`.
- **Granular Updates**: Mutating a leaf `FieldNode` notifies only direct subscribers to that field's value/errors, while ancestor `FieldGroupNode` instances derive aggregate `dirty`/`valid` lazily via Vii `computed()`.

---

### 3.5 Nested Objects & Repeatable Arrays (The Identity Contract)

#### Nested Objects
- Parent `dirty`, `touched`, `pending`, and `valid` are **derived lazily** using Vii `computed()`.
- Group-level validation rules can validate the aggregate slice without coupling leaf field subscribers.
- Mutating a child field does **not** trigger notifications for sibling fields.

#### Repeatable Arrays (`FieldArray`)
- **Index vs. Stable Identity**: Array items are assigned a unique, immutable internal symbol/ID (e.g. `_vii_id: 'item_c4a1'`) upon insertion.
- **Operations**:
  - `push(value)`: appends item with new stable ID.
  - `remove(index)`: disposes the item's child Scope and removes its field nodes from registry.
  - `swap(indexA, indexB)` / `move(from, to)`: reorders item references **preserving** existing `touched`, `dirty`, and client validation errors.
- **Server Error Mapping**: Server errors arriving with index paths (e.g. `items[2].price`) are mapped to the stable item currently at index 2 at the time of response processing.

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

**TypeScript Type Invariants**:
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
1. **`change`**: Runs synchronous rules on every state update. Async rules are debounced (default: 300ms).
2. **`blur`**: Runs sync and async rules when the field loses focus (`touched = true`).
3. **`submit`**: Forces all fields (touched and untouched) to validate immediately. Bypasses debounces.
4. **`manual`**: Explicit programmatic invocation `form.validate()`.

#### Async Validation & Stale Race Cancellation
- Each field maintains a monotonic `validationRevision: number`.
- When a field value changes while async validation is in flight:
  1. The existing `AbortController` for that field's active validation is aborted (`signal.abort()`).
  2. `validationRevision` is incremented.
  3. Stale async completion callbacks check `if (responseRevision !== currentRevision) return;` and discard results.
  4. Only the latest validation revision has commit authority.

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
- **Server Error Lifecycle**: Setting a field value immediately clears any active `ServerIssue` attached to that field, but retains existing client validation status.

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

- **Duplicate Prevention**: If `submitting` is active, subsequent `submit()` calls are dropped or rejected.
- **Transport Decoupling**: Form passes `{ value: TOutput, signal: AbortSignal }` to the user's async handler.

---

### 3.10 Scope Ownership & Resource Lifecycle

```text
┌─────────────────────────────────────────────────────────────┐
│               Root Form Scope (createScope)                 │
│  - Owns all field State nodes, Computeds, and Subscriptions │
│  - Owns Root AbortController                                │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
       ┌───────┴───────┐              ┌───────┴───────┐
       ▼               ▼              ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ Field Scope  ││ Field Scope  ││ArrayItemScope││ArrayItemScope│
│ (Field 'name')││(Field 'addr')││ (Item #1)    ││ (Item #2)    │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

- When `form.dispose()` is called, the root Scope disposes all child scopes, aborts all in-flight async validators, aborts active submission, and detaches all event listeners.
- Dynamic array items allocate a child Scope; removing an array item immediately disposes its child Scope, preventing memory leaks.

---

### 3.11 Security, Privacy & Accessibility Baseline

#### Security Baseline
1. **Prototype Pollution Protection**: Path resolution utilities must strictly forbid `__proto__`, `prototype`, and `constructor` properties.
2. **Depth & Width Bounds**: Nesting depth is capped at 16 levels; array mutations are capped at 10,000 elements by default.
3. **No Unsafe Code Evaluation**: Zero `eval()` or dynamic `Function()` usage (CSP Strict compliance).
4. **Client Validation is UX Only**: Client validation is never treated as an authorization boundary.

#### Privacy & Diagnostics Baseline
- Form diagnostics emit structural events: `field:changed`, `validation:started`, `validation:superseded`, `issue:added`, `submit:started`.
- **Strict Privacy Rule**: Diagnostics events must **never** record raw form values, passwords, secret tokens, or full server error payloads.

#### Accessibility Baseline
- Adapters must provide standard accessibility attribute generators:
  - `aria-invalid="true"` when errors are present and field is touched.
  - `aria-describedby="[fieldId]-error [fieldId]-desc"`.
  - `aria-required="true"` if field has a required rule.
  - Auto-focus the first invalid field on failed submission attempt.

---

## 4. Build-vs-Buy Comparative Evaluation Framework

To prevent NIH (Not-Invented-Here) bias, Vii Form will be evaluated at Slice F10 against mature alternatives using a strict multi-dimensional scorecard:

### Comparison Matrix Dimensions

| Evaluation Dimension | Metric & Methodology | Target Benchmark Candidates |
| --- | --- | --- |
| **Bundle Impact** | Raw, minified, gzip, and brotli bytes of core and framework adapters. | TanStack Form, React Hook Form, Angular Signal Forms, VeeValidate, Handwritten Vii State helper. |
| **Field Update Latency** | Time to update single field and propagate notifications in a 100-field form. | Vii State signal fan-out vs TanStack Form store vs RHF ref-update. |
| **Rerender / Notification Count** | Number of components/subscribers notified on single keystroke. | 1 subscriber target (field only); 0 whole-form rerenders. |
| **Memory & Teardown** | Heap retention and listener count after 1,000 mount/dispose cycles. | Zero retained DOM nodes; post-GC heap growth $< 100\text{ kB}$. |
| **Type-Check Latency** | `tsc --noEmit` wall time on deeply nested/dynamic forms. | Measure compiler cost of deep path inference. |
| **Framework Portability** | Same core contract used across Vanilla, React, Angular, Vue. | TanStack Form (multi-adapter) vs Vii Form vs framework-native solutions. |
| **Async Cancellation** | Deterministic cancellation of stale network validation requests. | Verify AbortSignal and revision protection under rapid typing. |

---

## 5. Next Steps & Operating Constraints

- **Current Status**: **F0 is complete.**
- **Hard Gate**: **Completion of F0 does NOT authorize F1 or any implementation.**
- **Next Required Action**: Review F0 deliverables, approve roadmap, and await explicit maintainer authorization before opening Slice F1.
