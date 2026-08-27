# Vii Form Production Architecture & Package Contract

> **Status:** Active Production Architecture Contract (Phase 1 Baseline)
> **Package Target:** `@vii-labs/form` (`packages/form/`)
> **Prerequisites:** `@vii-labs/core` (Stable Reactive Primitives), Form Research F0–F10 Acceptance (PR #166, SHA `b908a52c`)
> **Maturity Level:** Experimental / Preview Candidate (under `docs/governance/API_STABILITY.md`)
> **Governing Strategy:** Small-Core Headless Reactive Engine with Clean Framework Projections

---

## 1. Executive Summary & Production Charter

Vii Form is the official reactive, headless form state and validation engine for the Vii ecosystem. Building upon the verified empirical evidence of research slices F0 through F10 (documented in [`research/form/F10_CONSUMER_VALIDATION.md`](../../research/form/F10_CONSUMER_VALIDATION.md) and [`research/form/F9_EVIDENCE.md`](../../research/form/F9_EVIDENCE.md)), Vii Form translates the high-performance push-pull reactivity and deterministic `Scope` lifecycle of `@vii-labs/core` into a typed, fine-grained form tree.

### Core Mission
Provide application developers across Vanilla DOM, React, Angular, Vue, and future native Vii runtimes with a high-throughput, leak-free, accessible, and type-safe form interaction layer that achieves sub-microsecond field updates, native async cancellation, standard schema validation, and robust server issue routing without duplicating state or locking into any single UI framework.

---

## 2. Product Boundary

### 2.1 What Vii Form IS
- **Headless Form State Engine:** A framework-agnostic reactive state manager for fields, nested objects (`FieldGroup`), and dynamic collections (`FieldArray`).
- **First-Class `@vii-labs/core` Consumer:** Directly powered by Vii `State`, `Computed`, `Scope`, `batch`, and `Diagnostics`.
- **Granular Interaction Layer:** Independently tracks `value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `issues`, and submission state.
- **Provider-Neutral Validation Orchestrator:** Natively executes synchronous and asynchronous validation rules, Standard Schema v1 (`@standard-schema/spec`) schemas (e.g. Zod 4, Valibot, ArkType), with monotonic revision protection and `AbortSignal` cancellation.
- **Presentation-Separated Value Pipeline:** Formally segregates user-facing raw presentation strings from parsed domain models.
- **Structured Server Issue Router:** Reliably routes backend errors to fields, groups, and array items across in-flight structural mutations via identity snapshots.
- **Thin Framework Bridge:** Provides idiomatic, zero-state-mirror adapters for React 18/19 (`useSyncExternalStore`), Angular 17+ (Signals & `DestroyRef`), Vue 3 (ShallowRef & `effectScope`), and Vanilla DOM.

### 2.2 What Vii Form IS NOT
- **NOT a UI Component Library:** Vii Form does not provide styled inputs, buttons, dialogs, dropdowns, or layout primitives. (UI presentation is owned by application components or `@vii-labs/ui`).
- **NOT a Schema Definition Engine:** Vii Form does not implement a proprietary schema DSL; it integrates external validators via Standard Schema v1 or native rule functions.
- **NOT an HTTP Client / Network Layer:** Vii Form does not execute network requests, handle cookies, or manage HTTP headers. (Network transport is owned by Vii HTTP, Fetch API, or application services).
- **NOT a Server-State Cache:** Vii Form does not manage server caching, cache invalidation, or background polling. (Server-state caching is owned by Vii Query).
- **NOT a Persistence Layer:** Vii Form does not persist data to `localStorage`, `IndexedDB`, or databases.
- **NOT an Authorization / Security Boundary:** Client validation in Vii Form is strictly a user-experience aid, never an authorization or backend data-integrity gate.

---

## 3. Package Boundary & Distribution Model

### 3.1 Package Identity
- **Name:** `@vii-labs/form`
- **Location:** `packages/form/`
- **License:** Apache-2.0
- **Type:** Pure ESM (`"type": "module"`)
- **Side Effects:** `false` (100% tree-shakable)

### 3.2 Packaging & Subpath Strategy: Single Package with Subpath Exports
Following Vii package conventions and minimizing maintenance overhead while preserving strict tree-shaking and zero framework lock-in, Vii Form distributes its core and framework adapters as subpath exports from one unified package:

```json
{
  "name": "@vii-labs/form",
  "version": "0.1.0-experimental.1",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/adapters/react/index.d.ts",
      "import": "./dist/adapters/react/index.js"
    },
    "./vanilla": {
      "types": "./dist/adapters/vanilla/index.d.ts",
      "import": "./dist/adapters/vanilla/index.js"
    },
    "./angular": {
      "types": "./dist/adapters/angular/index.d.ts",
      "import": "./dist/adapters/angular/index.js"
    },
    "./vue": {
      "types": "./dist/adapters/vue/index.d.ts",
      "import": "./dist/adapters/vue/index.js"
    }
  }
}
```

### 3.3 Dependency & Peer Dependency Governance
1. **Zero Runtime Dependencies in Core:** `@vii-labs/form` depends strictly on `@vii-labs/core` (via workspace/peer range). It contains **zero** third-party runtime dependencies.
2. **Standard Schema Dependency:** Standard Schema is consumed strictly at the TypeScript type level via `@standard-schema/spec` as a dev dependency. No schema runtime is bundled.
3. **Optional Framework Peer Dependencies:**
   ```json
   {
     "peerDependencies": {
       "@vii-labs/core": ">=0.1.0-experimental.2",
       "react": ">=18.0.0",
       "@angular/core": ">=17.0.0",
       "vue": ">=3.3.0"
     },
     "peerDependenciesMeta": {
       "react": { "optional": true },
       "@angular/core": { "optional": true },
       "vue": { "optional": true }
     }
   }
   ```
4. **Tree-Shaking Guarantee:** Importing `@vii-labs/form` (the root entrypoint) bundles **zero** DOM or framework adapter code. Consumers using `@vii-labs/form/react` bundle only Core + React adapter code, leaving Angular and Vue code completely unreferenced.

---

## 4. Internal Module Graph & Clean Architecture Decomposition

To adhere strictly to `docs/governance/CODE_QUALITY_STANDARDS.md` (target $\le 250$ lines, hard limit $400$ lines per production file), the production Form implementation is decomposed into focused, single-responsibility modules.

### 4.1 Production Source Structure (`packages/form/src/`)

```text
packages/form/src/
├── core/
│   ├── types.ts              # Core domain interfaces, issue types, state types (<= 250 lines)
│   ├── path.ts               # Path parsing, traversal, null-prototype safety (<= 200 lines)
│   ├── field.ts              # createField leaf implementation (<= 250 lines)
│   ├── group.ts              # createFieldGroup object node implementation (<= 250 lines)
│   ├── array.ts              # createFieldArray collection node implementation (<= 250 lines)
│   ├── form.ts               # createForm root coordinator (<= 250 lines)
│   ├── external-binding.ts   # bindFormToExternalState synchronization (<= 220 lines)
│   ├── snapshot.ts           # deepCloneSnapshot with cycle & prototype safety (<= 180 lines)
│   └── diagnostics.ts        # Structural value-free diagnostics helpers (<= 150 lines)
├── validation/
│   ├── types.ts              # Validation rule, trigger, context interfaces (<= 150 lines)
│   ├── scheduler.ts          # Sync/async rule execution & debounce management (<= 250 lines)
│   ├── revision.ts           # Monotonic revision & AbortController tracking (<= 150 lines)
│   └── standard-schema.ts    # Standard Schema v1 fail-closed adapter (<= 180 lines)
├── parsers/
│   ├── types.ts              # Parser signatures and ParseIssue taxonomy (<= 120 lines)
│   └── builtins.ts           # createNumberParser, createStringParser, etc. (<= 180 lines)
├── submission/
│   ├── types.ts              # Submission state machine, action & result types (<= 150 lines)
│   ├── state-machine.ts      # Model A submission status coordinator (<= 200 lines)
│   ├── server-issues.ts      # ServerIssue taxonomy, path routing & sanitization (<= 220 lines)
│   └── array-snapshot.ts     # Submission-time array identity snapshots (<= 150 lines)
├── adapters/
│   ├── react/
│   │   ├── use-field.ts      # useField hook via useSyncExternalStore (<= 200 lines)
│   │   ├── use-form.ts       # useForm aggregate hook (<= 180 lines)
│   │   ├── use-field-array.ts# useFieldArray collection hook (<= 200 lines)
│   │   └── index.ts          # React adapter entrypoint (<= 50 lines)
│   ├── vanilla/
│   │   ├── bind-field.ts     # DOM element binding & event management (<= 250 lines)
│   │   ├── bind-form.ts      # Native <form> submit & lifecycle binding (<= 200 lines)
│   │   ├── a11y.ts           # ARIA projection & safe textContent sinks (<= 180 lines)
│   │   └── index.ts          # Vanilla adapter entrypoint (<= 50 lines)
│   ├── angular/
│   │   ├── signals.ts        # createAngularField & signal projections (<= 220 lines)
│   │   ├── lifecycle.ts      # DestroyRef integration (<= 120 lines)
│   │   └── index.ts          # Angular adapter entrypoint (<= 50 lines)
│   └── vue/
│       ├── composables.ts    # createVueField, useViiField, shallowRef bridges (<= 220 lines)
│       └── index.ts          # Vue adapter entrypoint (<= 50 lines)
└── index.ts                  # Public core entrypoint barrel (<= 80 lines)
```

### 4.2 Dependency Direction & Layering Invariants

```text
┌─────────────────────────────────────────────────────────────┐
│                 Framework Adapters Layer                    │
│   (@vii-labs/form/react, /vanilla, /angular, /vue)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (imports public form APIs)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Public Form API Layer                     │
│   (createForm, createField, createFieldGroup, createArray)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (composes domain modules)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Internal Domain Modules                    │
│   (validation, parsers, submission, path, snapshot)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (strictly depends on)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      @vii-labs/core                         │
│   (state, computed, batch, createScope, diagnostics)        │
└─────────────────────────────────────────────────────────────┘
```

**Architectural Invariants:**
1. **Downward Dependency Flow:** Dependencies point strictly downward. Domain modules NEVER import framework adapters.
2. **Core Isolation:** `@vii-labs/core` has ZERO knowledge of Form.
3. **No Circular References:** Modules within `core/`, `validation/`, `parsers/`, and `submission/` must maintain acyclic dependencies.
4. **Boundary Validation:** Untrusted input (such as schema issue payloads or user submit options) is validated at boundary entrypoints before reaching internal state nodes.

---

## 5. Public API Candidate & Classification

### 5.1 Classification Matrix

| Symbol / API | Classification | Target Stability | Rationale |
| :--- | :--- | :--- | :--- |
| `createForm(config, scope?)` | **PUBLIC CANDIDATE** | Experimental | Root form factory initializing field registry, submission, and scope. |
| `createField(config, scope?)` | **PUBLIC CANDIDATE** | Experimental | Standalone leaf field state factory. |
| `createFieldGroup(fields, config?, scope?)` | **PUBLIC CANDIDATE** | Experimental | Nested object node aggregating child states. |
| `createFieldArray(items, config?, scope?)` | **PUBLIC CANDIDATE** | Experimental | Repeatable collection node with stable item identity. |
| `standardSchema(schema)` | **PUBLIC CANDIDATE** | Experimental | Standard Schema v1 validator bridge. |
| `createNumberParser(options?)` | **PUBLIC CANDIDATE** | Experimental | Built-in string-to-number parser with raw retention. |
| `createStringParser(options?)` | **PUBLIC CANDIDATE** | Experimental | Built-in string trimmer/normalizer parser. |
| `bindFormToExternalState(form, state)` | **PUBLIC CANDIDATE** | Experimental | Bidirectional synchronization bridge to external Vii State. |
| `deepCloneSnapshot(data)` | **PUBLIC CANDIDATE** | Experimental | Cycle-safe, prototype-hardened immutable snapshot creator. |
| `useField(field)` | **PUBLIC CANDIDATE** (`/react`) | Experimental | React hook for leaf field state via `useSyncExternalStore`. |
| `useForm(form)` | **PUBLIC CANDIDATE** (`/react`) | Experimental | React hook for aggregate form status. |
| `useFieldArray(array)` | **PUBLIC CANDIDATE** (`/react`) | Experimental | React hook for dynamic collection nodes. |
| `bindField(field, element, options?)` | **PUBLIC CANDIDATE** (`/vanilla`) | Experimental | Vanilla DOM element binding with ARIA projection. |
| `bindForm(form, element, options?)` | **PUBLIC CANDIDATE** (`/vanilla`) | Experimental | Vanilla DOM form submit binding and lifecycle coordinator. |
| `createAngularField(field)` | **PUBLIC CANDIDATE** (`/angular`) | Experimental | Angular Signal handle with `DestroyRef` cleanup. |
| `createVueField(field)` | **PUBLIC CANDIDATE** (`/vue`) | Experimental | Vue `shallowRef` handle with `onScopeDispose` cleanup. |
| `FormInstance<T>` | **PUBLIC TYPE** | Experimental | Root form instance interface. |
| `FieldState<TRaw, TValue, TOutput>` | **PUBLIC TYPE** | Experimental | Leaf field instance interface. |
| `FieldGroup<T>` | **PUBLIC TYPE** | Experimental | Nested object group interface. |
| `FieldArray<T>` | **PUBLIC TYPE** | Experimental | Repeatable array collection interface. |
| `FieldIssue`, `ParseIssue`, `ServerIssue` | **PUBLIC TYPE** | Experimental | Structured issue taxonomy. |
| `ValidationRule<T>` | **PUBLIC TYPE** | Experimental | Sync/async validation rule signature. |
| `SubmissionStatus` | **PUBLIC TYPE** | Experimental | `"idle" \| "validating" \| "submitting" \| "succeeded" \| "failed" \| "cancelled"`. |
| `parsePath`, `sanitizePath` | **INTERNAL** | Internal | Path parsing and prototype-pollution traversal guards. |
| `collectArraySnapshots` | **INTERNAL** | Internal | Submission snapshot generator for in-flight array mapping. |
| `routeServerIssuesToTree` | **INTERNAL** | Internal | Recursive server issue routing algorithm. |
| `runValidationScheduler` | **INTERNAL** | Internal | Debounce, revision, and AbortController execution engine. |
| `visited` field status | **DEFERRED** | Deferred | Focused-at-least-once tracking; deferred until consumer demonstrates real need. |
| `async` parser pipeline | **DEFERRED** | Deferred | Async parsing rejected in F5 due to presentation race conditions; sync parsing only. |
| `setErrors(string[])` (legacy F1 API) | **REJECTED / RESEARCH-ONLY** | N/A | Replaced by structured `setValidationIssues` and `setServerIssues`. |
| `autoUnregisterOnUnmount` | **REJECTED / RESEARCH-ONLY** | N/A | Form owns canonical model tree; unmounting UI does not silently mutate domain state. |

---

## 6. Core Reactive Semantics & Push-Pull Invariants

### 6.1 Vii Core Integration
Vii Form depends directly on `@vii-labs/core` primitives:
- `state<T>(initial, comparator?)`: Holds mutable leaf values, touched, dirty, parseStatus, validationStatus, and submissionStatus.
- `computed<T>(evaluator, comparator?)`: Derives `valid`, `invalid`, `dirty`, `issues`, `submitting`, and aggregate object/array values lazily.
- `createScope(name?, parent?)`: Owns resource lifecycle, child detachment, and automatic teardown.
- `batch(fn)`: Enforces atomic multi-field updates without intermediate invalidation cascades.

### 6.2 The Computed Invalidation Dependency Caveat
Under `@vii-labs/core` push-pull lazy computed architecture, `State` subscribers execute in strict registration order. When an early subscriber is registered before a `Computed`'s invalidation listener is established:

> **The Invalidation Ordering Caveat:**
> A `State` subscriber registered before a `Computed`'s dependency invalidation listener may synchronously observe the **previous cached value** of that `Computed` when calling `computed.get()` inside its notification callback.

### 6.3 Production Consumer Rules
To eliminate stale reads across all internal modules and framework adapters:
1. **Rule 1 (Direct Signal Reading):** Adapters, event handlers, and internal derived status calculators must read underlying source `State` signals directly (e.g. `issuesState.get()`, `parseStatusState.get()`, `serverIssuesState.get()`) rather than querying derived aggregate computeds inside synchronous state update callbacks.
2. **Rule 2 (Direct Computed Subscription):** When an external consumer needs derived data, they must subscribe directly to the `Computed` itself (`computed.subscribe(val => ...)`), which guarantees fresh lazy evaluation prior to invocation.
3. **Rule 3 (Zero Core Modification):** Production Form Phase 1 must **NOT** alter `@vii-labs/core` reactive semantics or introduce speculative topological sorting into Core.

---

## 7. Raw vs Parsed Value Pipeline Contract

Vii Form enforces an explicit 5-stage value lifecycle to prevent presentation snap-back bugs:

$$\text{Raw Presentation Input} \xrightarrow{\text{parse}} \text{Domain Value} \xrightarrow{\text{validate}} \text{Validated Value} \xrightarrow{\text{transform}} \text{Submission Output}$$

```text
┌────────────────┐     ┌──────────────┐     ┌────────────────┐     ┌───────────────┐     ┌───────────────────┐
│ RawInput (TRaw)│ ──> │Domain (TValue│ ──> │Validated(TValue│ ──> │Transform (fn) │ ──> │Submission (TOutput│
│ (e.g. "05")    │     │(e.g. 5)      │     │(e.g. 5 >= 0)   │     │(e.g. x => x)  │     │(e.g. { age: 5 })  │
└────────────────┘     └──────────────┘     └────────────────┘     └───────────────┘     └───────────────────┘
```

### 7.1 Parser Failure & Presentation Retention
1. **Parse Success:** When raw text matches domain grammar (e.g. `"42"` $\rightarrow$ `42`), `value` is updated, `parseStatus` becomes `"valid"`, `parseIssue` is cleared, and validation rules proceed.
2. **Parse Failure:** When raw text fails parsing (e.g. `"-abc"` for a numeric parser):
   - `rawValue` retains the exact user keystroke sequence in memory.
   - Domain `value` remains pristine at its last known valid value.
   - `parseStatus` transitions to `"invalid"`, and `field.parseIssue` records the structured `ParseIssue`.
   - **Validation Rule Bypass:** Synchronous and asynchronous validation rules are **strictly bypassed** (never receiving invalid domain types).
3. **Display Ownership Rule:** On a parsed field, the UI control displays `rawValue`, never `String(value)`. Domain value is written back to the control only on unparsed fields (`parseStatus === "unparsed"`).

### 7.2 Rebasing & Reset Contract
- `form.reset()` restores initial domain baseline and initial raw baseline.
- On a parser-backed field, calling `field.reset(newDomainValue, newRawValue)` requires **both** values because parsers have no mathematical inverse. Calling single-argument `reset(newDomainValue)` on a parsed field throws a `TypeError`.

---

## 8. Validation Architecture

### 8.1 Rule Execution & Precedence
1. **Synchronous Rules First:** Synchronous rules run immediately on trigger (`change`, `blur`, `submit`, `manual`).
2. **Short-Circuit on Sync Failure:** If synchronous rules produce issues, the node transitions to `validationStatus: "invalid"`, and asynchronous validation rules are cancelled/skipped to prevent unnecessary network traffic.
3. **Async Validation & Debounce Ownership:**
   - Async rules run in parallel with a shared `AbortSignal`.
   - `debounceMs` is opt-in (default `0ms`). `"change"` triggers debounce; `"blur"`, `"submit"`, and `"manual"` validate immediately.
4. **Monotonic Revision Authority:**
   - Each node maintains an internal `validationRevision` counter.
   - Mutating a field increments `validationRevision` and aborts active `AbortController`s.
   - An async resolution commits state **only** if `revision === validationRevision` and `!signal.aborted`. Late results are silently discarded.
5. **Invariant: Cancellation $\neq$ Failure:** Aborting an async validation does NOT produce a validation issue and does NOT mark the field invalid.

### 8.2 Standard Schema v1 Boundary & Fail-Closed Semantics
- `standardSchema(schema)` bridges any Standard Schema v1 (`~standard`) object (Zod 4, Valibot, ArkType) into a Vii `ValidationRule`.
- **Fail-Closed Contract:** If a schema provider returns a malformed payload (e.g. non-array `issues`, throwing unexpected exceptions), the adapter fails closed with a structured `TypeError` and records an issue; it **never** falls through to valid.

---

## 9. FieldArray Identity & Dynamic Collection Contract

Dynamic array collections (`createFieldArray`) require first-class logical identity stability:

```text
┌─────────────────────────────────────────────────────────────┐
│                       FieldArray<T>                         │
│  - itemNodes: State<ArrayItemNode[]>                        │
│  - items: Computed<ArrayItemNode[]>                         │
│  - values: Computed<T[]>                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐     ┌───────────────────────────────┐
│     ArrayItemNode (id: "k1")  │     │     ArrayItemNode (id: "k2")  │
│  - fields: { name, email }    │     │  - fields: { name, email }    │
│  - scope: Child Scope         │     │  - scope: Child Scope         │
└───────────────────────────────┘     └───────────────────────────────┘
```

### 9.1 Stable Keys vs Positional Indices
1. **Keyed Collections:** Uses `keyExtractor(item)` to track items across `insert`, `remove`, `swap`, `move`, and `setValues`. Reordering items preserves child `Scope`, focus, touched state, and client issues.
2. **Unkeyed Collections:** Automatically assigns unique internal tokens (`vii_item_${counter}`) to guarantee identity stability without key collision risks.
3. **Identity-Strict Array Dirty Semantics:** An array is `dirty === false` if and only if its length matches baseline, its exact key identity sequence matches baseline, and all child nodes are pristine.

### 9.2 In-Flight Reorder Server Response Routing
1. At submission start, Form records an immutable snapshot mapping submitted positional indices to unique item IDs (`Map<number, string>`).
2. If the user reorders or swaps array items while submission is in-flight:
   - When server errors arrive referencing submitted index `0` (e.g. `["contacts", 0, "email"]`), the form resolves index `0` to original item ID `k1`, locates `k1`'s current position in the live array (e.g. index `2`), and routes the issue to `k1`.
   - Items that moved into index `0` remain clean.
3. If the submitted item was deleted during submission, the issue falls back cleanly to `form.serverIssues`.

---

## 10. Submission State Machine (Model A) & Server Issues

### 10.1 Submission State Machine

```text
       ┌──────────┐
       │   idle   │ ◄───────────────────────────────────────────────────┐
       └────┬─────┘                                                     │
            │ form.submit()                                             │
            ▼                                                           │
   ┌──────────────────┐                                                 │
   │    validating    │ ──── (invalid / parse error) ───────────────────┤
   └─────────┬────────┘                                                 │
             │ (valid)                                                  │
             ▼                                                           │
   ┌──────────────────┐                                                 │
   │    submitting    │ ──── (cancelled via cancelSubmit / reset) ──────┤
   └────┬────────┬────┘                                                 │
        │        │                                                      │
 (success)     (server rejection / error)                               │
        │        │                                                      │
        ▼        ▼                                                      │
 ┌──────────┐  ┌──────────┐                                             │
 │succeeded │  │  failed  │ ────────────────────────────────────────────┤
 └────┬─────┘  └────┬─────┘                                             │
      │             │                                                   │
      └─────────────┴────── (reset() / reinitialize() / next submit) ───┘
```

### 10.2 Model A Terminal Status Invariant
- **Model A Contract:** `submissionStatus` represents the terminal outcome of the *latest submission attempt* (`"succeeded"`, `"failed"`, `"cancelled"`).
- **User Edits Do Not Erase Terminal State:** When a user types into a field after a successful or failed submission, `submissionStatus` **remains** `"succeeded"` or `"failed"` while `dirty` transitions to `true`.
- **Resetting Status:** `submissionStatus` returns to `"idle"` only upon explicit `form.reset()`, `form.reinitialize()`, or the start of a new `form.submit()`.

### 10.3 Server Issue Ownership & Localized Clearing
- **Routing:** Server issues are routed to leaf fields or nested groups matching the structured issue path. Unmatched paths attach to `form.serverIssues`.
- **Localized Clearing on Edit:** Editing a field (`setValue` / `setRawValue`) clears **only** the server issues owned by that specific field node. Sibling server issues remain untouched.
- **Client/Server Coexistence:** Re-running client validation updates client validation issues without clearing active server issues.

---

## 11. Security Threat Model & Defense Invariants

| Threat Vector | Vulnerability Source | Production Defense Contract |
| :--- | :--- | :--- |
| **DOM XSS** | Hostile messages in validation, parse, or server issues | Issue messages are plain text/data. Vanilla adapter writes strictly to `textContent`. Framework adapters rely on template expression escaping. Zero `innerHTML` sinks. |
| **Prototype Pollution (Codes)** | `__proto__`, `constructor`, `prototype` in issue codes | Blocked with security exceptions in `sanitizeIssue`, `sanitizeParseIssue`, `sanitizeServerIssue`. |
| **Prototype Pollution (Paths)** | `__proto__` as field/path names in domain models | **Data vs Sink Principle:** `__proto__` is valid data in structured paths. Protection is enforced at object sinks: dictionaries use `Object.create(null)`, `Object.hasOwn`, and explicit own-property traversal. |
| **Malformed Schemas** | Schema providers throwing or returning malformed payloads | Standard Schema adapter validates return contracts and fails closed on invalid provider output. |
| **Hostile Getters / Proxies** | Output payloads with throwing getters or proxy traps | `deepCloneSnapshot` safely triggers getters, traverses traps, and isolates output data. |
| **Telemetry Leakage** | Diagnostics capturing passwords, tokens, or form values | Diagnostics events are strictly value-free: record only `revision`, `issueCount`, `status`, and `reason: Error.name`. Zero form values or messages in telemetry. |

---

## 12. Snapshot & Deep-Cloning Contract (`deepCloneSnapshot`)

The submission boundary and output pipeline produce an immutable snapshot via `deepCloneSnapshot(data)`.

### 12.1 Supported Types & Preservation Rules
- **Plain Objects:** Re-allocated using null-prototype `Object.create(null)` or clean object copies; own-enumerable properties copied.
- **Arrays:** Cloned into fresh array instances.
- **Cyclic & Shared References:** Tracked via `Map<object, object>`; cyclic and diamond references clone with identical graph topology without stack overflow.
- **`Map` & `Set`:** Cloned into fresh `Map` / `Set` instances with cloned entries.
- **`Date` & `RegExp`:** Cloned into fresh instances preserving timestamps and flags.
- **`__proto__` as Own Property:** Copied via `Object.defineProperty` as data without altering prototype chains.
- **Functions, Symbols, Promises:** Preserved by reference or excluded per transform options.

---

## 13. Framework Adapter Architecture

```text
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  React Adapter   │  │ Vanilla Adapter  │  │ Angular Adapter  │  │   Vue Adapter    │
│useSyncExternalSt.│  │bindField/bindForm│  │  Angular Signals │  │   shallowRef     │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │                     │
         └─────────────────────┼─────────────────────┴─────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Vii Form Core Engine                               │
│  (Pure State / Computed / Scope / Standard Schema / Submission Lifecycle)  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 13.1 React Adapter (`@vii-labs/form/react`)
- **Primitive:** `useSyncExternalStore` for tear-free React 18/19 concurrent rendering.
- **Snapshot Memoization:** Live store evaluation with referential snapshot memoization to eliminate render cascades.
- **Pre-Subscription Freshness:** Live store read on mount ensures mutations occurring before subscription are not lost.
- **StrictMode & Cleanup:** Clean unmount unsubscription verified with zero dangling listeners.
- **Render Scoping:** Keystrokes in a field trigger re-render **only** in that field's subscribed component (0 sibling re-renders).

### 13.2 Vanilla DOM Adapter (`@vii-labs/form/vanilla`)
- **Single Commit Event:** Binds `"change"` for checkbox/radio/select/file and `"input"` for text controls, eliminating duplicate validation runs per keystroke.
- **ARIA Projection:** Automatically sets `aria-invalid="true"` (only when invalid, never when pending) and links `aria-describedby` to issue element IDs.
- **Safe Sinks:** Writes issue messages strictly through `element.textContent = message`.
- **Unhandled Rejection Containment:** Submit listener exceptions route through `onSubmitException` callback.

### 13.3 Angular Adapter (`@vii-labs/form/angular`)
- **Signals Bridge:** Exposes read-only Angular Signals (`signal.asReadonly()`) for all form state and computeds.
- **Lifecycle Integration:** Subscriptions automatically cleaned via `DestroyRef.onDestroy` when available.

### 13.4 Vue Adapter (`@vii-labs/form/vue`)
- **Reactivity Bridge:** Exposes `shallowRef` wrapped in `shallowReadonly` for zero-overhead Vue reactivity.
- **Scope Cleanup:** Subscriptions automatically teardown via `onScopeDispose` within Vue's `effectScope`.

---

## 14. Browser & Accessibility Production Gate

Because F10 research was validated under Mock DOM and `react-test-renderer`, **real browser and accessibility validation is a mandatory acceptance requirement for Production Phase 1.**

### 14.1 Acceptance Criteria
1. **Real Chromium / Browser Smoke:** Automated Playwright/CDP suite executing interactive workflows in headless Chromium.
2. **Focus Management:** Verification of deterministic first-invalid field focus navigation upon submission failure.
3. **IME Composition Support:** Korean/Japanese/Chinese IME composition events must not trigger premature validation or snap-back on parsed inputs.
4. **WCAG 2.2 AA Compliance:** Proved accessible names, error description associations (`aria-describedby`), and invalid state indications (`aria-invalid`).
5. **Unmount & Navigation Cancellation:** Clean abort of active async validations upon route transitions and component unmounts.

---

## 15. Performance, Memory & Bundle Budgets

### 15.1 Baseline Targets (Derived from F9/F10 Evidence)
- **Leaf Mutation Latency:** $\le 1.0\ \mu\text{s}$ per keystroke on 100-field forms; $\le 0.5\ \mu\text{s}$ on 1,000-field forms.
- **FieldArray Swap Latency:** $\le 1.0\ \mu\text{s}$ on 50-item collections.
- **Bundle Budgets (Gzip Level 9):**
  - `@vii-labs/form` Core: $\le 10.5\ \text{kB}$ gzip.
  - `@vii-labs/form` Standalone `createField`: $\le 5.0\ \text{kB}$ gzip.
  - `@vii-labs/form/react` Adapter: $\le 2.0\ \text{kB}$ gzip incremental.
- **Memory Retention:** 0 active scope leaks, 0 dangling listeners, and $\le 100\ \text{kB}$ heap growth across 1,000 mount/dispose cycles.

### 15.2 Known Performance Risk: 1,000 Server Issue Routing Hotspot
- **Observed Bottleneck:** Routing 1,000 server issues across deeply nested forms required $\approx 51.5\ \text{ms}$ in research benchmarks due to unindexed recursive tree traversal.
- **Production Requirement (P1g / P1l):** Implement indexed path lookup (`Map<string, FieldNode>`) to achieve sub-5ms routing for 1,000 server issues.

---

## 16. Error Ownership & Async Unhandled Rejection Prevention

Vii Form enforces complete rejection ownership to prevent Node/browser unhandled rejection crashes:
1. **Scheduler Ownership:** Fire-and-forget async validations catch rejections, classify error types into diagnostics (`reason: "Error"`), and clear `pending` state cleanly without bubbling unhandled rejections.
2. **Action Ownership:** `form.submit()` delivers submit action rejections directly to the caller via the returned promise.
3. **DOM Submit Listener:** DOM events route action exceptions through the user-provided `onSubmitException` handler.
4. **Cancellation Exemption:** Aborted controllers resolve cleanly; `AbortError` is never treated as an unhandled rejection.

---

## 17. Resource Lifecycle & Scope Disposal Contract

1. **Root Form Disposal:** Calling `form.dispose()` synchronously disposes the root `Scope`, which cascades disposal to all child field nodes, array item scopes, active `AbortController`s, debounce timers, and external subscriptions.
2. **Child Detachment:** Dynamic array items automatically detach from their parent Scope in $O(1)$ time upon item removal or replacement, preventing memory accumulation.
3. **Idempotent Disposal:** Calling `dispose()` multiple times is a safe no-op.
4. **Post-Disposal Invariant:** Calling methods on a disposed form node throws a deterministic `Error("Form node is disposed")`.

---

## 18. Production Testing Strategy & Regression Mapping

### 18.1 Required Test Layers
1. **Unit Tests:** Individual field, group, array, parser, and scheduler unit tests (`packages/form/test/unit/`).
2. **Integration Tests:** Tree validation, cross-field rules, submission lifecycle, and server issue routing (`packages/form/test/integration/`).
3. **Framework Adapter Suites:** React, Vanilla, Angular, and Vue compliance suites (`packages/form/test/adapters/`).
4. **Historical Regression Suite:** Ported F1–F10 regression fixtures (`packages/form/test/regressions/`).
5. **Security & Privacy Suite:** Prototype pollution, XSS sinks, cyclic snapshot, and diagnostics sentinel privacy tests (`packages/form/test/security/`).
6. **Real Browser Smoke Suite:** Playwright tests in headless Chromium (`packages/form/test/browser/`).
7. **Clean Consumer Fixtures:** Packed `.tgz` artifact verification in clean temporary consumer projects.

---

## 19. Production Slice Roadmap (P1a – P1m)

```text
P1a (Architecture Contract) ➔ P1b (Package Skeleton) ➔ P1c (Field Core) ➔ P1d (Form Tree & Groups)
  ➔ P1e (Validation & Parsers) ➔ P1f (FieldArray & Identity) ➔ P1g (Submission & Server Issues)
  ➔ P1h (React Adapter) ➔ P1i (Vanilla Adapter) ➔ P1j (Angular & Vue Adapters)
  ➔ P1k (Browser & A11y Gate) ➔ P1l (Performance & Memory Gate) ➔ P1m (Graduation & Review)
```

| Slice | Title | Objective & Boundaries | Dependencies | Stop Condition & Publication Gate |
| :--- | :--- | :--- | :--- | :--- |
| **P1a** | **Architecture & Package Contract** | Author authoritative production architecture, package contract, and slice roadmap. Docs only. | Accepted F10 | Architecture committed; ZERO runtime code; NO publication. |
| **P1b** | **Package Skeleton & Governance** | Create `packages/form/` skeleton, `package.json`, TypeScript build config, linting, Vitest harness. | P1a | Skeleton builds and packs; NO runtime implementation; NO publication. |
| **P1c** | **Field Core** | Implement `createField`, leaf state signals, dirty/touched tracking, and Scope integration. | P1b | Field unit tests pass; line limits verified; NO publication. |
| **P1d** | **Form Tree, Groups & Aggregate State** | Implement `createFieldGroup`, `createForm`, path resolution, and aggregate computeds. | P1c | Tree aggregation tests pass; line limits verified; NO publication. |
| **P1e** | **Validation, Parsers & Standard Schema** | Implement sync/async scheduler, debounce, AbortSignal, parsers, and Standard Schema bridge. | P1d | Validation & parser tests pass; fail-closed verified; NO publication. |
| **P1f** | **FieldArray & Stable Identity** | Implement `createFieldArray`, key derivation, stable identity across reorders, child scope detachment. | P1e | Array mutation & identity tests pass; NO publication. |
| **P1g** | **Submission & Server Issues** | Implement Model A submission state machine, server issue routing, and snapshot identity mapping. | P1f | Submission & server issue tests pass; hotspot addressed; NO publication. |
| **P1h** | **React Adapter** | Implement `useField`, `useForm`, `useFieldArray` via `useSyncExternalStore` in `@vii-labs/form/react`. | P1g | React 19 test-renderer & render isolation tests pass; NO publication. |
| **P1i** | **Vanilla DOM Adapter** | Implement `bindField`, `bindForm`, ARIA projection, and safe textContent sinks in `@vii-labs/form/vanilla`. | P1g | DOM binding & event deduplication tests pass; NO publication. |
| **P1j** | **Angular & Vue Adapters** | Implement Angular signals handle (`/angular`) and Vue shallowRef handle (`/vue`). | P1g | Cross-framework compliance suite passes; NO publication. |
| **P1k** | **Browser / A11y / Historical Regressions** | Real Playwright browser smoke, IME composition, focus navigation, and all historical F1-F10 regressions. | P1h, P1i, P1j | Headless Chromium tests & 100% regressions pass; NO publication. |
| **P1l** | **Performance, Bundle & Memory Gate** | Execute standalone bundle builds, leak detection (1,000 cycles), and 1,000 server issue benchmarks. | P1k | All numeric release budgets satisfied; NO publication. |
| **P1m** | **Production Graduation & Public API Review** | Public API review, Changeset creation, documentation sync, and formal graduation to candidate. | P1l | Final review approval; package publication ONLY upon explicit release gate. |

---

## 20. Build vs Research Transfer Matrix

| Research Finding / Asset | Production Slice | Production Module | Required Regression Test |
| :--- | :--- | :--- | :--- |
| **Raw vs Domain Value Separation** | P1e | `parsers/builtins.ts` | Non-numeric string preserves raw presentation text while domain value stays pristine. |
| **Monotonic Async Validation Cancellation** | P1e | `validation/revision.ts` | 200 rapid keystrokes abort 199 requests with 0 stale commits and 0 unhandled rejections. |
| **Standard Schema Fail-Closed** | P1e | `validation/standard-schema.ts` | Non-array `issues` payload throws structured `TypeError` and never marks value valid. |
| **Data vs Sink Prototype Safety** | P1d / P1g | `core/path.ts`, `submission/server-issues.ts` | `__proto__` preserved as data in paths; object sinks remain unpolluted. |
| **FieldArray Stable Key Identity** | P1f | `core/array.ts` | Swapping array items preserves child Scope, focus, and error states. |
| **In-Flight Reorder Server Routing** | P1g | `submission/array-snapshot.ts` | Submitting array swap routes server response to logical item by submitted identity snapshot. |
| **Vanilla Single Commit Event** | P1i | `adapters/vanilla/bind-field.ts` | Keystroke fires validation pipeline exactly once per edit (no duplicate input+change). |
| **React Snapshot Freshness** | P1h | `adapters/react/use-field.ts` | Pre-subscription mutation does not lose snapshot freshness in `useSyncExternalStore`. |
| **React StrictMode Double-Mount** | P1h | `adapters/react/use-field.ts` | Double mount/unmount cycle retains active subscriptions with zero memory leaks. |
| **Model A Terminal Submission Status** | P1g | `submission/state-machine.ts` | Editing field after successful submission keeps `submissionStatus: "succeeded"` and `dirty: true`. |
| **Core Push-Pull Computed Caveat** | P1c / P1d | `core/field.ts`, `core/group.ts` | Status evaluators read source signals directly rather than derived computeds inside callbacks. |
| **DOM XSS Safe textContent Sinks** | P1i | `adapters/vanilla/a11y.ts` | Hostile HTML in server issue renders safely as text without script execution. |
| **Diagnostics Value-Free Privacy** | P1c / P1g | `core/diagnostics.ts` | Sentinel password/token strings verified absent from all emitted diagnostic events. |
| **Residual Browser Gap** | P1k | `test/browser/` | Real Chromium smoke verifying IME composition and focus management. |
| **1,000 Server Issue Scaling Hotspot** | P1g / P1l | `submission/server-issues.ts` | Indexed routing executes 1,000 server issues in $< 5\ \text{ms}$ (vs 51.5 ms unindexed). |

---

## 21. Architectural Decision Log

| # | Decision Topic | Selected Decision | Rationale | Rejected Alternatives | Revisit Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Packaging & Subpaths** | Single `@vii-labs/form` package with subpath exports (`/react`, `/vanilla`, `/angular`, `/vue`). | Minimizes maintenance overhead, aligns versioning, provides tree-shaking, and avoids package sprawl. | Separate packages (`@vii-labs/form-react`, etc.) for every adapter. | If framework peer incompatibilities force divergent release cadences. |
| **2** | **Framework Peer Dependencies** | Optional peer dependencies with `peerDependenciesMeta`. | Prevents unnecessary peer dependency installation warnings for users who only use one framework. | Mandatory peer dependencies or bundled framework code. | If package managers fail to resolve optional peers correctly. |
| **3** | **Public vs Internal API Surface** | Expose only `createForm`, `createField`, `createFieldGroup`, `createFieldArray`, `standardSchema`, parsers, and adapter hooks. | Keeps public surface small, understandable, and maintainable. | Exporting all internal helpers and scheduler utilities. | If external plugin developers require lower-level extension hooks. |
| **4** | **Reset vs Reinitialize Semantics** | `reset()` restores initial baseline; `reinitialize(newBaseline)` adopts new baseline and clears dirty state. On parsed fields, both domain and raw baselines are required. | Unambiguous baseline semantics; avoids presentation corruption on parsed fields. | Single-value reset guessing raw string representation. | If bidirectional invertible codecs are introduced in Vii Schema. |
| **5** | **Diagnostics Privacy Baseline** | Value-free structural telemetry by default (sentinel-tested). | Prevents credential/PII leaks into logging and debugging traces. | Full payload logging with redaction filters. | Explicit opt-in development tracing RFC. |
| **6** | **Standard Schema Dependency** | Type-only dependency on `@standard-schema/spec`; zero runtime validator dependencies. | Zero-dependency core; universal interop with Zod 4, Valibot, ArkType. | Bundling specific validator libraries or building a proprietary validator monolith. | Standard Schema spec breaking changes. |
| **7** | **Snapshot Support Boundary** | `deepCloneSnapshot` supports cycles, shared refs, Map, Set, Date, RegExp, plain objects, arrays, and own `__proto__`. | Prevents crashes on rich domain models without leaking attacker prototype members. | Native `structuredClone` (fails on functions/symbols) or naive JSON parse/stringify. | If Web Workers require transferable object streams. |
| **8** | **FieldArray Identity Model** | Explicit key extractor with automatic internal ID fallback; identity-strict dirty tracking. | Eliminates collision bugs across unkeyed collections; guarantees UI state preservation. | Positional-only index tracking. | If immutable persistent vector structures are adopted. |
| **9** | **Submission State Model** | Model A: Terminal status preserved across user edits; dirty tracks value freshness independently. | Semantic clarity; editing after submit does not pretend the prior submit never happened. | Model B: Value edits immediately reset status to `"idle"`. | Strong consumer UX request for auto-idle reset. |
| **10** | **Publication Timing** | Zero publication before final Production Graduation Gate (P1m). | Enforces rigorous verification before public release. | Publishing intermediate pre-alpha packages during P1c–P1l. | Explicit maintainer release approval. |

---

## 22. Non-Goals & Absolute Invariants for Phase 1

1. **NO Form Runtime in P1a:** Slice P1a is strictly architecture, contract, and roadmap documentation. Zero production runtime code is added in this slice.
2. **NO Source Migration Wholesale:** Research files under `research/form/` must NOT be ported wholesale into `packages/form/`. Production code must be freshly implemented against the modular architecture and quality budgets.
3. **NO Package Publication:** `@vii-labs/form` must NOT be published to npm during P1a–P1l.
4. **NO Modification to `@vii-labs/core`:** Production Form builds entirely on top of stable Core primitives without mutating Core runtime semantics.
