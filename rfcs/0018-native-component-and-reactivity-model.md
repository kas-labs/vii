# RFC 0018: Native Component and Reactivity Model

Status: Proposed

## Summary

Define a future Vii-native component model with one runtime contract, multiple authoring profiles, fine-grained signal-based reactivity, explicit lifecycle ownership, and optional stream interop.

## Motivation

Developers value different authoring ergonomics:

- Angular-style separated files and predictable structure;
- React-style TSX and function composition;
- Vue-style Single-File Components;
- Svelte-style compact templates and compile-time optimization;
- Solid-style fine-grained updates;
- Zustand-style small stores.

Supporting these preferences through separate runtimes would multiply complexity and produce incompatible mental models.

Vii needs one semantic model that can be expressed through several source layouts.

## Goals

- One Component IR and lifecycle model.
- Recommended `.vii` Single-File Components.
- Optional split TS, HTML, and CSS authoring.
- Optional TSX authoring.
- Programmatic TypeScript escape hatch.
- Signal-based fine-grained reactivity.
- Small Store composition without reducers or dispatch boilerplate.
- Explicit Scope and Resource ownership.
- Compiler optimization without compiler-only State semantics.
- Function-first dependency access.
- Decorators optional, never foundational.

## Non-goals

- Delivering the native renderer during State Alpha.
- Supporting multiple template languages with different semantics.
- Reimplementing React, Angular, Vue, Svelte, or Solid.
- Requiring RxJS for normal state.
- Building an NgRx-style mandatory architecture.
- Introducing deep proxy reactivity in the first State release.

## Detailed design

### Authoring profiles

```text
.vii SFC
split TS / HTML / CSS
TSX
programmatic TypeScript
```

All profiles lower into one Component IR.

### Shared semantics

```text
props
events
state
computed
actions
resources
scope
styles
view
server/client classification
diagnostics
```

### Reactive vocabulary

Long-term vocabulary:

```text
state
computed
store
action
batch
effect
scope
resource
```

State Alpha may expose a smaller subset.

### State example

```ts
const count = state(0);
const doubled = computed(() => count() * 2);

function increment() {
  count.update(value => value + 1);
}
```

### Store example

```ts
export const counter = store('counter', () => {
  const count = state(0);
  const doubled = computed(() => count() * 2);

  function increment() {
    count.update(value => value + 1);
  }

  return { count, doubled, increment };
});
```

### Rendering

Native Vii rendering should connect exact reactive consumers rather than rerunning an entire component for every local update.

```text
state -> computed -> exact view binding
```

A mandatory virtual DOM is not required.

### Streams

RxJS remains optional for complex event streams.

```text
@vii/state
@vii/query
@vii/stream
@vii/rxjs
```

State answers what the current value is. Streams represent event sequences over time.

## Public API impact

This RFC does not stabilize exact function names. It reserves the conceptual package and API boundaries for future prototypes.

## Compatibility

- State remains runtime-neutral.
- Existing React, Angular, Vue, and Vanilla adapters remain valid.
- Native components may be introduced without changing adapter semantics.
- Authoring profiles must compile to identical runtime contracts.

## Diagnostics and observability

Diagnostics should expose:

- State changes;
- action causes;
- computed invalidation;
- exact consumer updates;
- Scope ownership;
- Resource creation and disposal;
- component mount and unmount boundaries.

## Security and privacy

- interpolation is text by default;
- raw HTML requires an opaque safe type;
- event bindings are function references;
- URL contexts use policy validation;
- server and client boundaries are explicit;
- diagnostics exclude raw values by default.

## Alternatives

### One mandatory SFC format

Simpler tooling, but unnecessarily excludes teams that prefer split files or TSX.

### Multiple independent component runtimes

Rejected because it multiplies lifecycle, State, rendering, documentation, testing, and security complexity.

### Decorator-first class components

Rejected as the primary API because it hides behavior in metadata and imposes a class-oriented model.

### React-compatible rendering semantics

Possible as an adapter, but not selected as the native model because fine-grained binding better matches Vii State and runtime-size goals.

## Risks

- supporting too many authoring profiles may expand tooling;
- Component IR may become overgeneralized;
- compiler and source-map work is substantial;
- TSX fine-grained semantics may surprise React developers;
- automatic signal unwrapping must remain limited and explainable.

## Migration

No migration is required. This RFC defines a future direction.

## Validation plan

- prototype one counter and one data-heavy component in all profiles;
- compile every profile to one IR;
- verify identical lifecycle and diagnostics;
- compare direct bindings, memory, and bundle size;
- test SSR and hydration;
- test malicious interpolation and raw HTML cases;
- validate IDE and source-map behavior.

## Unresolved questions

- final State read syntax, `value()` versus `value.get()`;
- exact template control-flow syntax;
- whether TSX ships in the first native renderer milestone;
- whether scoped styles use generated attributes, native scopes, or target-specific strategies;
- whether optional decorator syntax provides enough value to maintain.
