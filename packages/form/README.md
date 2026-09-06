# @vii-labs/form

Preview reactive headless form state and validation engine for the Vii ecosystem.

## Status

**Preview Candidate (Phase 1 Graduation — P1m)**

- **Stability Classification:** `preview` (under [`docs/governance/API_STABILITY.md`](../../docs/governance/API_STABILITY.md)).
- **Publication Status:** **Private / Unpublished.** Publication remains strictly deferred pending explicit maintainer release approval (`"private": true` in `package.json`).

---

## 1. What Vii Form Is

`@vii-labs/form` is a framework-agnostic, fine-grained headless form state and validation engine. Built directly on top of the push-pull reactivity and deterministic `Scope` lifecycle of `@vii-labs/core`, Vii Form translates complex user interactions into an observable, type-safe form tree.

Vii Form separates presentation text from domain values, schedules synchronous and asynchronous validation with monotonic cancellation, routes structured server issues across dynamic structural mutations, and projects clean, zero-duplicate-state handles into React 18/19, Vanilla DOM, Angular 17+, and Vue 3.3+.

---

## 2. Installation Status & Candidate Caveat

> [!IMPORTANT]
> `@vii-labs/form` is currently an internal Preview Candidate (`"private": true`). It is not yet published to the public npm registry. Downstream workspace consumers consume the package via workspace linking or packed tarball fixtures.

When published under approved governance, the package contract requires:
- **Runtime Peer Dependency:** `@vii-labs/core` (`>=0.1.0-experimental.2`)
- **Type-Resolution Dependency:** `@standard-schema/spec` (`^1.1.0`, consumed type-only)
- **Optional Framework Peers:** `react` (`>=18.0.0`), `@angular/core` (`>=17.0.0`), `vue` (`>=3.3.0`)

Deep imports into package internals (such as `@vii-labs/form/dist/core/field.js`) are unsupported and disallowed by the package `exports` map.

---

## 3. Core Concepts

- **Push-Pull Reactivity:** Field state dimensions (`value`, `rawValue`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `issues`, `serverIssues`) are powered by `@vii-labs/core` `State` and `Computed` primitives.
- **Deterministic Scope Lifecycle:** Form trees and collection items allocate child scopes for subscriptions and computeds; disposing a node cleanly detaches its scope and tears down active timers.
- **Hierarchical Tree Aggregation:** A root `createForm` aggregates `createFieldGroup` objects, `createFieldArray` collections, and leaf `createField` nodes into cohesive tree-level states.
- **Presentation vs Domain Model:** Intermediate user input lives in `rawValue`, while parsed domain data lives in `value`. Intermediate parse failures preserve raw text in the DOM without snapping back.

---

## 4. `createField`

`createField` creates an observable leaf form node.

```ts
import { createField } from "@vii-labs/form";

const username = createField({
  initialValue: "alice",
  rules: [
    (val) => (val.length < 3 ? { code: "min_len", message: "Too short" } : null),
  ],
});

username.value.get(); // "alice"
username.valid.get(); // true

username.setValue("al");
username.valid.get(); // false
username.issues.get(); // [{ code: "min_len", message: "Too short", source: "rule" }]
```

Supported state signals:
- `value`: current domain value.
- `rawValue`: presentation string/value.
- `dirty`: boolean, true if value differs from initial baseline.
- `touched`: boolean, set to true on blur or manual commit.
- `pending`: boolean, true during in-flight async validation.
- `valid` / `invalid`: boolean derived status.
- `issues`: merged array of validation and parse issues.
- `serverIssues`: active server-routed issues.
- `parseStatus`: `"parsed"` | `"failed"` | `"unparsed"`.

---

## 5. `createFieldGroup`

`createFieldGroup` groups child form nodes into a structured object while aggregating validation, dirty, touched, and pending states.

```ts
import { createField, createFieldGroup } from "@vii-labs/form";

const userGroup = createFieldGroup({
  fields: {
    username: createField({ initialValue: "alice" }),
    email: createField({ initialValue: "alice@example.com" }),
  },
});

userGroup.value.get(); // { username: "alice", email: "alice@example.com" }
userGroup.valid.get(); // true
```

---

## 6. `createFieldArray`

`createFieldArray` manages repeatable dynamic collections with stable logical item identities.

```ts
import { createField, createFieldArray } from "@vii-labs/form";

const hobbies = createFieldArray({
  items: [createField({ initialValue: "reading" })],
});

// Append new item
hobbies.append(createField({ initialValue: "hiking" }));

// Reorder items without losing focus or child scope identity
hobbies.move(0, 1);

// Remove item
hobbies.remove(0);

// Items expose stable opaque IDs:
const firstItem = hobbies.items.get()[0];
console.log(firstItem.id); // stable string ID
```

---

## 7. `createForm`

`createForm` is the root orchestrator coordinating recursive validation, Model A submission lifecycle, baseline reinitialization, and server issue routing.

```ts
import { createForm, createField, createFieldGroup } from "@vii-labs/form";

const form = createForm({
  fields: {
    user: createFieldGroup({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    }),
  },
});

// Reinitialize baseline
form.reinitialize({
  value: { user: { name: "Bob" } },
  rawValue: { user: { name: "Bob" } },
});
```

---

## 8. Validation

Vii Form executes synchronous and asynchronous validation rules with monotonic revision tracking.

- **Sync Rules:** Synchronous functions returning `ValidationIssueInput | null`.
- **Async Rules:** Return `Promise<ValidationIssueInput | null>`, receiving `ValidationRuleContext` with `signal: AbortSignal`.
- **Trigger Modes:** Configurable via `validateOn: "change" | "blur" | "submit" | "manual"`.
- **Debounce:** Async rules support optional `debounceMs`. In-flight timers are cleanly cancelled on new input, reset, or disposal.
- **Stale Commit Suppression:** Rapid keystrokes abort previous async operations via `AbortSignal`; stale async resolutions are automatically discarded.

---

## 9. Parsers: Raw vs Value Contract

Vii Form formally segregates user-facing presentation text from parsed domain data.

```ts
import { createField, createNumberParser } from "@vii-labs/form";

const age = createField<number, string>({
  initialValue: 25,
  initialRawValue: "25",
  parser: createNumberParser({ trim: true }),
});

// Intermediate invalid typing (e.g. typing "-" or incomplete decimal)
age.setRawValue("05");
age.rawValue.get(); // "05" (preserved in DOM)
age.value.get();    // 5 (parsed domain integer)

age.setRawValue("abc");
age.rawValue.get(); // "abc" (no DOM snap-back)
age.value.get();    // 5 (last known valid domain value retained)
age.valid.get();    // false (parse failure issue active)
```

Built-in parser factories:
- `createNumberParser(options?)`: strict decimal grammar parser.
- `createStringParser(options?)`: whitespace-trimming parser.

---

## 10. Standard Schema Integration

Vii Form natively bridges any validator conforming to the [Standard Schema v1 specification](https://standardschema.dev) (Zod 4, Valibot, ArkType, etc.) using `standardSchema()`.

```ts
import { createField, standardSchema } from "@vii-labs/form";
import { z } from "zod"; // schema authoring only

const emailField = createField({
  initialValue: "",
  rules: [standardSchema(z.string().email())],
});
```

- **Zero Runtime Dependencies:** `@standard-schema/spec` is declared in `dependencies` and consumed strictly type-only (`import type`). Vii Form bundles zero third-party schema runtimes.
- **Fail-Closed Guarantee:** Malformed schema output (non-array `issues`) throws a structured `TypeError` and never allows invalid input to pass.

---

## 11. Submission: Model A Contract

Vii Form implements **Model A** submission semantics:

1. `form.submit(action, options?)` executes recursive tree validation with `trigger: "submit"`.
2. Blocks submission if any field has parse or validation issues.
3. If valid, captures an immutable deep-cloned domain value snapshot and executes `action(outputSnapshot, context)`.
4. **Model A Invariant:** Terminal submission status (`"succeeded"` or `"failed"`) persists across later field edits. Subsequent edits update `dirty: true` while `submissionStatus` remains `"succeeded"`.

```ts
const result = await form.submit(async (values) => {
  return { ok: true, result: values };
});

if (result.status === "succeeded") {
  console.log("Submitted:", result.result);
}
```

---

## 12. Server Issues

Backend validation issues route deterministically into form nodes via `ServerIssueInput`:

```ts
await form.submit(async (val) => {
  return {
    ok: false,
    issues: [
      { code: "unique", message: "Email taken", path: ["user", "email"] },
    ],
  };
});
```

- **Localized Clearing:** Editing `user.email` immediately clears its server issues without wiping sibling issues.
- **Collection Identity Mapping:** In-flight array reorders route server issues to the intended logical item via submission-time identity snapshots.

---

## 13. React Adapter (`@vii-labs/form/react`)

Provides React 18 & 19 hooks backed by `useSyncExternalStore`:

```tsx
import { useField, useForm } from "@vii-labs/form/react";

function UserProfile({ form }) {
  const { fields, valid, submitting, submit } = useForm(form);
  const name = useField(fields.user.fields.name);

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(async () => ({ ok: true })); }}>
      <input
        value={name.rawValue}
        onChange={(e) => name.setRawValue(e.target.value)}
        onBlur={() => name.blur()}
      />
      {name.issues.map((issue) => (
        <span key={issue.message}>{issue.message}</span>
      ))}
    </form>
  );
}
```

- **Fine-Grained Render Isolation:** Modifying a single field re-renders only components subscribing to that field.
- **StrictMode Safety:** Double mount/unmount cycles safely recreate subscriptions without destroying canonical form nodes.

---

## 14. Vanilla DOM Adapter (`@vii-labs/form/vanilla`)

Binds native form controls directly to canonical fields with accessible ARIA management:

```ts
import { bindField, bindForm } from "@vii-labs/form/vanilla";

const fieldBinding = bindField(usernameField, inputElement, {
  issueElement: errorSpanElement,
});

const formBinding = bindForm(form, formElement, {
  action: async (val) => ({ ok: true }),
  onSubmitException: (err) => console.error("Submit exception:", err),
});

// Teardown
fieldBinding.dispose();
formBinding.dispose();
```

- **Single Commit Event Model:** Binds `"input"` for text controls and `"change"` for checkbox/radio/select-one without duplicate triggers.
- **Safe Text Sink:** Server and validation issue text is projected strictly through `textContent`, neutralizing script execution or HTML injection.
- **Non-Destructive ARIA:** Preserves pre-existing `aria-invalid` and `aria-describedby` attributes upon disposal.

---

## 15. Angular Adapter (`@vii-labs/form/angular`)

Projects canonical nodes into native Angular Signals (`@angular/core` `>=17.0.0`):

```ts
import { createAngularField, createAngularForm } from "@vii-labs/form/angular";

const fieldHandle = createAngularField(field, { destroyRef });
const formHandle = createAngularForm(form, { destroyRef });

// Read signals:
console.log(fieldHandle.value());
console.log(formHandle.submissionStatus());
```

---

## 16. Vue Adapter (`@vii-labs/form/vue`)

Projects canonical nodes into readonly Vue `shallowRef` handles (`vue` `>=3.3.0`):

```ts
import { createVueField, createVueForm } from "@vii-labs/form/vue";

const fieldHandle = createVueField(field);
const formHandle = createVueForm(form);

// Read shallow refs:
console.log(fieldHandle.value.value);
console.log(formHandle.submissionStatus.value);
```

---

## 17. Lifecycle & Ownership Contract

| Node / Handle | Creator / Owner | Who Disposes It? | What Disposal Cancels | Does it Dispose Child Nodes? |
| :--- | :--- | :--- | :--- | :--- |
| `FieldState` | `createField` | Application caller | In-flight async validation & debounce timers | N/A (leaf) |
| `FieldGroup` | `createFieldGroup` | Application caller | All child node subscriptions | Yes (disposes child fields/groups) |
| `FieldArray` | `createFieldArray` | Application caller | Collection subscriptions & dynamic child scopes | Yes (disposes non-baseline items) |
| `FormInstance` | `createForm` | Application caller | In-flight submit, validation, root subscriptions | Yes (disposes whole tree) |
| `React hook` | `useField` / `useForm` | React lifecycle | Component unmount tears down external store listener | **NO** (canonical nodes survive unmount) |
| `Vanilla binding` | `bindField` / `bindForm` | Application caller | Removes DOM event listeners and signal observers | **NO** (canonical nodes survive unbinding) |
| `Angular handle` | `createAngular*` | Caller / `DestroyRef` | Unregisters signal sync listeners | **NO** (canonical nodes survive teardown) |
| `Vue handle` | `createVue*` | Caller / `effectScope` | Unregisters shallowRef sync listeners | **NO** (canonical nodes survive teardown) |

---

## 18. Accessibility (a11y) Scope

The Vanilla DOM adapter implements automated accessibility invariants verified via `@axe-core/playwright` under Chromium:
- **ARIA Attribute Projection:** `aria-invalid="true"` is asserted only when a field is invalid, and restored to its initial state when valid or disposed.
- **Describedby Linking:** Additively links `issueElement.id` into `aria-describedby` without clobbering existing application descriptions.
- **Focus Preservation:** Re-validating or projecting error messages preserves active input focus and caret positions.
- **Scope Limit:** Vii Form provides accessible state synchronization for native controls. It does not generate visual styles, contrast palettes, or application heading hierarchies.

---

## 19. Performance & Bundle Evidence

All performance metrics and size budgets are enforced by 41 automated HARD budget checks in CI.

- **Leaf Mutation Latency:** Single-field update with local subscriber executes in ~0.45 – 0.81 µs ($O(1)$ size-insensitive across 10 to 1,000 fields) with 0 sibling subscriber notifications.
- **Memory Retention:** 0 retained scopes, 0 retained subscriptions, and 0 retained timers after 500 complete form lifecycle cycles.
- **Tree-Shaking Boundaries:**
  - Standalone `createField` (Core external): ~14.34 kB minified (3.78 kB gzip).
  - Root `@vii-labs/form` (Core external): ~49.88 kB minified (11.24 kB gzip).
  - React adapter: ~5.07 kB minified (1.08 kB gzip).
  - Vanilla adapter: ~8.45 kB minified (2.29 kB gzip).
  - Angular adapter: ~6.13 kB minified (1.25 kB gzip).
  - Vue adapter: ~5.71 kB minified (1.21 kB gzip).

See [`docs/performance/FORM_P1L_BASELINE.md`](../../docs/performance/FORM_P1L_BASELINE.md) for full benchmark methodology and runner environment details.

---

## 20. Stability & Migration Policy

- **Current Level:** `preview` (under [`docs/governance/API_STABILITY.md`](../../docs/governance/API_STABILITY.md)).
- **Pre-1.0 Compatibility:** As a Preview Candidate, APIs are usable and documented but subject to refinement before 1.0. Any breaking changes will include explicit migration notes in changesets and release documentation.
- **Zero Silent Removals:** Deprecated APIs will provide replacement guidance before scheduled retirement.

---

## 21. Limitations & Non-Goals

### Limitations
- **Select-Multiple:** Native `<select multiple>` binding is deferred and currently fails closed with an explicit `TypeError`.
- **Browser Gate Scope:** Automated browser acceptance is executed against headless Chromium via Playwright; cross-browser certification (Safari/Firefox) and native OS IME candidate UI interaction are outside automated scope.

### Non-Goals
- **NOT a UI Component Library:** Does not provide styled buttons, inputs, modals, or CSS.
- **NOT an HTTP Client:** Does not perform network requests or fetch operations.
- **NOT a Schema DSL:** Does not provide a proprietary schema builder; integrates external schemas via Standard Schema v1.
- **NOT an Auto-Focus Manager:** Does not arbitrarily steal browser focus on validation errors.
- **NOT an Authorization Boundary:** Client-side validation improves user experience and does not replace backend security validation.
