# Vii Form Architecture

Status: Research

## Purpose

Vii Form is a candidate framework-agnostic application module built on the Vii
State, Scope, lifecycle, and diagnostics foundations.

The goal is not to recreate Angular Forms, TanStack Form, React Hook Form, or
VeeValidate. The goal is to combine the strongest validated ideas into a smaller
Vii-native semantic model that remains usable from Vanilla TypeScript, React,
Angular, Vue, and a possible future Vii component runtime.

No public Form API is accepted by this document. Examples are illustrative and
must go through RFC review before implementation support is claimed.

## Why Form belongs in Vii

Forms are a good candidate for a native Vii module because their hardest
problems overlap directly with existing Vii concerns:

- granular reactive state;
- derived values;
- ownership and disposal;
- async cancellation;
- deterministic transitions;
- framework adapters;
- diagnostics;
- memory behavior;
- typed public contracts.

A Form module can become a real consumer of the State and Scope architecture
without forcing form semantics into Core.

Dependency direction remains:

```text
framework UI
   -> Form adapter
   -> @vii/form
   -> Vii State / Scope / Diagnostics contracts
```

Core must not depend on Form.

## Research inputs

### Angular Signal Forms

Useful ideas to evaluate:

- a writable model as the form data source;
- a typed field tree mirroring the model structure;
- reactive field state;
- schema-based validation and behavioral rules;
- conditional disabled, readonly, and hidden state;
- debounced and async validation;
- stale async work cancellation;
- explicit submission lifecycle;
- server validation errors bound back to fields.

Vii should not copy Angular dependency injection, template directives, or
framework-specific lifecycle assumptions into Form Core.

### TanStack Form

Useful ideas to evaluate:

- framework-agnostic headless core;
- deep TypeScript inference;
- granular subscriptions;
- nested object and array fields;
- configurable validation events;
- async validation and debounce;
- thin framework adapters.

Vii should avoid adopting complexity that exists only to compensate for another
framework's reactivity model when Vii State can provide the primitive directly.

### React Hook Form

Useful ideas to evaluate:

- low-boilerplate field registration;
- native HTML control ergonomics;
- isolated subscriptions rather than whole-form UI updates;
- small dependency surface;
- external schema resolver model.

Vii should not make uncontrolled DOM state the only canonical model because the
same Form Core must work outside React and with signal-first consumers.

### Vue and VeeValidate

Useful ideas to evaluate:

- simple field binding ergonomics;
- composable form and field APIs;
- clear form metadata such as dirty, touched, pending, and valid;
- controlled versus uncontrolled submitted values;
- schema integrations;
- distinction between input values and validated or transformed output values.

Vii should preserve explicit data-flow and avoid framework-specific proxy
semantics inside Form Core.

## Design principles

### 1. Headless and framework agnostic

`@vii/form` owns form behavior, not UI rendering.

React, Angular, Vue, native Vii templates, Web Components, or Vanilla consumers
must observe the same form semantics.

### 2. Signal-first granular state

A field exposes narrowly subscribable state. Changing one field must not imply a
whole-form or whole-component rerender.

Conceptual field state includes:

```text
value
initialValue
dirty
touched
visited
valid
invalid
pending
disabled
readonly
hidden
errors
```

Only evidence-backed states should enter the eventual public contract.

### 3. One source of form truth

The form model and field tree must have a clear ownership relationship.

Vii should avoid competing hidden copies of:

- DOM values;
- application model values;
- validation values;
- submitted values.

Where parsing or transformation changes the type, the distinction must be
explicit.

### 4. Input and output types may differ

A browser input may produce a string while the validated application value is a
number, date, URL, enum, or domain object.

The eventual design should support an explicit pipeline such as:

```text
raw input
  -> parse
  -> field value
  -> validate
  -> transform
  -> submission output
```

TypeScript should preserve those distinctions rather than collapsing them into
`any`.

### 5. Validation is composable, not provider locked

Vii Form should provide a small native validator contract and allow optional
schema adapters.

Potential integrations include Standard Schema-compatible tools, Zod, Valibot,
ArkType, Yup, and other validators without making one library mandatory.

Illustrative native rule shape:

```ts
validate(field.email, ({ value }) => {
  return value.includes('@')
    ? null
    : { code: 'email', message: 'Enter a valid email address' };
});
```

The final API is undecided.

### 6. Async validation is cancellable

Async validation must not allow stale responses to overwrite newer field state.

Conceptual lifecycle:

```text
value changes
  -> cancel stale validation
  -> run synchronous rules
  -> if eligible, schedule/debounce async rules
  -> pending = true
  -> commit result only for current validation revision
```

`AbortSignal` should be available where the validator performs cancellable I/O.

### 7. Validation triggers are explicit

The engine should support well-defined triggers such as:

- change/input;
- blur;
- submit;
- dependency change;
- manual validation.

Defaults must be documented and should not create surprising network or CPU work.

### 8. Submission is first class

Submission should be a lifecycle, not a helper that merely calls a callback.

Expected concerns include:

- marking eligible fields touched;
- validating before action execution;
- preventing accidental duplicate submission;
- exposing submitting state;
- cancellation where meaningful;
- mapping server errors to form or field errors;
- preserving typed submitted output.

Conceptual example:

```ts
await profile.submit(async ({ value, signal }) => {
  await api.put('/profile', { json: value, signal });
});
```

### 9. Server errors are structured

Backend validation errors should be representable without mutating validator
implementation details.

Conceptually:

```text
field error
form error
submission error
```

Errors should carry stable machine-readable codes and optional human-readable
messages.

### 10. Nested forms and collections are real use cases

The architecture must model:

- nested objects;
- arrays and repeatable sections;
- dynamic fields;
- multi-step forms;
- conditional sections.

Identity for array items should be explicit when UI preservation depends on it.

### 11. Native HTML remains valuable

Vii adapters should preserve HTML form semantics where possible:

- labels;
- `name`;
- native input types;
- autocomplete;
- browser accessibility behavior;
- submit and reset semantics.

A Vii abstraction must not make ordinary accessible HTML harder to write.

### 12. Accessibility is part of the contract

Adapters and future Vii UI controls should make it straightforward to associate:

- labels;
- descriptions;
- error messages;
- required state;
- invalid state;
- focus on failed submission.

Automated checks are necessary but do not replace keyboard and screen-reader
acceptance testing.

## Illustrative authoring model

A possible signal-oriented API could resemble:

```ts
const login = form(
  {
    email: '',
    password: '',
  },
  schema => {
    required(schema.email);
    email(schema.email);
    required(schema.password);
    minLength(schema.password, 8);
  },
);
```

The field tree could expose granular reads:

```ts
login.email.value();
login.email.dirty();
login.email.touched();
login.email.pending();
login.email.errors();
login.valid();
login.submitting();
```

This is a research sketch, not a public API decision.

## Framework adapter expectations

### React

The adapter should subscribe only to state selected by the consuming hook or
component. It must not force whole-form rerenders.

### Angular

The adapter should expose signal-friendly field state and integrate with Angular
lifecycle cleanup without making Angular DI a Form Core requirement.

### Vue

The adapter should expose Vue-compatible refs or bindings while keeping Form Core
free from Vue proxy semantics.

### Native Vii templates

If a native template compiler graduates, form controls may receive concise
binding syntax backed by the same Form Core contract.

## Diagnostics

Form diagnostics may eventually explain:

- which field changed;
- why validation ran;
- which rule failed by code;
- whether async work was scheduled, cancelled, or superseded;
- which field caused aggregate validity to change;
- why submission was blocked;
- which fields remain pending.

Diagnostics must not include form values, passwords, tokens, full server error
payloads, or other sensitive input by default.

## Performance requirements

Research prototypes should measure:

- form creation cost;
- field update cost;
- validation cost;
- nested and array field cost;
- number of notified subscribers;
- memory after repeated creation and disposal;
- async validation cancellation behavior;
- adapter rerender or update counts;
- bundle and type-check cost.

Performance claims require reproducible fixtures and methodology.

## Security and privacy

- Treat form input as untrusted data.
- Client validation is UX, not an authorization boundary.
- Server-side validation remains required for server trust decisions.
- Diagnostics and Devtools must redact sensitive values by default.
- Schema and validation errors must not execute code from untrusted remote data.
- File inputs, HTML inputs, URL fields, and rich content require separate security review.
- Async validation must respect request cancellation and origin policy.

## Relationship to Query and HTTP

Form does not own network transport or server-state caching.

```text
Form
  submission state / validation / field errors
      |
      +--> application action
                |
                +--> Query mutation, Vii HTTP, Fetch, or another client
```

Form may integrate with Query or HTTP through optional helpers, but those modules
remain independently usable.

## Proposed module boundary

Candidate package:

```text
@vii/form
```

Potential adapter packages should not be created until the shared adapter pattern
and real consumers justify them.

No package name is a publication promise.

## Graduation criteria

Vii Form may move from Research to Planned only after:

- State and Scope semantics are stable enough to host field ownership;
- at least one real application demonstrates meaningful form complexity;
- a prototype proves granular field subscriptions;
- nested objects and arrays are type-safe;
- async validation cancellation is deterministic;
- framework adapters preserve one semantic model;
- accessibility integration is demonstrated;
- bundle, runtime, memory, and type-check costs are measured;
- external schema integration works without a mandatory schema dependency;
- Form provides measurable value beyond using an existing library directly.

## Primary research references

- Angular Signal Forms: https://angular.dev/guide/forms/signals/overview
- Angular form logic: https://angular.dev/guide/forms/signals/form-logic
- Angular form submission: https://angular.dev/guide/forms/signals/form-submission
- TanStack Form: https://tanstack.com/form/latest
- React Hook Form: https://react-hook-form.com/
- VeeValidate typed schemas: https://vee-validate.logaretm.com/v4/guide/composition-api/typed-schema/

These are research inputs, not compatibility targets.
