# Vii Component Model

Status: Research

## Purpose

This document defines the intended component model for a possible future Vii-native UI runtime and application framework.

The component model is not part of Vii State Alpha. It may advance only after the runtime-neutral State, Scope, Resources, Diagnostics, and adapter layers prove their value in real applications.

The goal is to offer a small and understandable component contract while allowing developers to organize source files in familiar ways.

> Multiple authoring profiles, one runtime model.

## Product principles

The component system should combine:

- predictable structure associated with Angular;
- function-first composition associated with React;
- Single-File Component ergonomics associated with Vue;
- compact authoring and compile-time optimization associated with Svelte;
- fine-grained reactive updates associated with Solid;
- small store ergonomics associated with Zustand;
- explicit ownership, disposal, and diagnostics defined by Vii.

These influences do not create separate framework implementations.

## One semantic model

Every supported authoring format must lower into the same component definition and Component IR.

```text
Vii Single-File Component ┐
Split TS / HTML / CSS      ├─> Vii Component IR ─> renderer targets
TSX                        │
Programmatic TypeScript    ┘
```

The following semantics remain identical in every format:

- props;
- events;
- state;
- computed values;
- actions;
- resources;
- lifecycle scope;
- styles;
- child ownership;
- diagnostics;
- server and client boundaries.

An authoring profile may change filenames, syntax, and generator conventions. It must not introduce another state engine, lifecycle system, scheduler, or dependency injection system.

## Recommended authoring profiles

### 1. Vii SFC

The recommended long-term native format is a `.vii` Single-File Component.

```html
<script lang="ts">
  import { state, computed } from '@vii-labs/state';

  const count = state(0);
  const doubled = computed(() => count() * 2);

  function increment() {
    count.update(value => value + 1);
  }
</script>

<template>
  <section>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubled }}</p>
    <button on:click="increment">Increment</button>
  </section>
</template>

<style scoped>
  section {
    display: grid;
    gap: 1rem;
  }
</style>
```

The template compiler may unwrap readable signals inside templates. TypeScript source keeps explicit reads:

```ts
count();
doubled();
```

### 2. Split component

A split profile supports teams that prefer separate TypeScript, HTML, CSS, and test files.

```text
counter/
├── counter.component.ts
├── counter.component.html
├── counter.component.css
└── counter.component.test.ts
```

```ts
import { component } from '@vii-labs/web';
import { counter } from './counter.store';

export default component({
  name: 'Counter',
  template: './counter.component.html',
  styles: ['./counter.component.css'],

  setup() {
    return {
      count: counter.count,
      doubled: counter.doubled,
      increment: counter.increment,
    };
  },
});
```

```html
<section>
  <p>Count: {{ count }}</p>
  <p>Double: {{ doubled }}</p>
  <button on:click="increment">Increment</button>
</section>
```

This provides Angular-like organization without requiring modules, classes, decorators, or an NgRx-style store.

### 3. TSX component

A TSX profile supports React and Solid developers.

```tsx
import { counter } from './counter.store';

export function Counter() {
  return (
    <section>
      <p>Count: {counter.count()}</p>
      <p>Double: {counter.doubled()}</p>
      <button onClick={counter.increment}>Increment</button>
    </section>
  );
}
```

The intended native Vii TSX semantics are fine-grained. A component initializes once and reactive reads bind specific consumers. A state change should not require executing the whole component function by default.

### 4. Programmatic TypeScript

A low-level programmatic profile must remain available for libraries, tests, custom renderers, and environments without the `.vii` compiler.

This proves that State, Scope, Resources, and the component contract are not compiler-only concepts.

## Canonical template syntax

Vii should define one canonical template syntax.

Recommended event syntax:

```html
<button on:click="save">Save</button>
```

Recommended bindings:

```html
<input bind:value="name" />
```

Two-way bindings should be limited to suitable form controls and explicit component contracts. General application data flow remains one-way:

```text
state -> computed -> view
event -> action -> state
```

Vue-like aliases such as `@click` should not become a separate language mode unless evidence demonstrates a strong need. Familiar CLI profiles should not multiply compiler semantics.

## Component definition

A conceptual internal contract:

```ts
interface ViiComponentDefinition<Props = unknown> {
  name: string;
  props?: PropsDefinition<Props>;
  setup(context: ComponentContext<Props>): ComponentSetup;
  view: ComponentView;
  styles?: ComponentStyles;
  metadata?: ComponentMetadata;
}
```

The exact public API remains subject to prototypes and RFC review.

## Component IR

The compiler should produce an explicit Component IR containing at least:

- static DOM structure;
- dynamic bindings;
- event bindings;
- child component references;
- style assets and scoping data;
- client and server boundaries;
- hydration metadata;
- source locations;
- accessibility diagnostics;
- security sink classifications;
- lifecycle ownership information.

A single IR enables multiple renderer targets without duplicating source semantics.

## Fine-grained rendering

The preferred update model is:

```text
state node
  -> computed dependencies
  -> exact template or TSX consumer
  -> targeted renderer update
```

The renderer should avoid a mandatory virtual DOM and broad component reruns when direct bindings are sufficient.

Compiler optimization must preserve runtime semantics. Code using State without the compiler must remain correct, even if it is less optimized.

## State and actions

A component may use local State directly:

```ts
const open = state(false);
const label = computed(() => open() ? 'Close' : 'Open');

function toggle() {
  open.update(value => !value);
}
```

Shared feature logic should normally live outside the component:

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

Components consume stores. Components do not own another hidden state runtime.

## Resources and lifecycle

Every mounted component owns a Scope.

The component Scope may own:

- effects;
- event listeners;
- subscriptions;
- timers;
- requests;
- observers;
- child scopes;
- renderer handles.

Unmounting a component disposes its Scope. Cleanup must not rely on every application developer remembering manual teardown calls.

Resources must remain inspectable through diagnostics.

## Effects

Effects are escape hatches for communication with external systems.

Good use:

```ts
effect(() => {
  document.title = pageTitle();
});
```

Avoid writing derived values through effects:

```ts
const doubled = computed(() => count() * 2);
```

The compiler and lint rules should guide users toward `computed` rather than effect-driven state propagation.

## Dependency access

Vii may offer a small function-first context API:

```ts
provide(UserService, userService);
const service = use(UserService);
```

This is scoped dependency access, not a requirement for all application objects to use a dependency injection container.

## Decorators

Decorators must not be the primary component API.

Reasons:

- they encourage a class-only model;
- they hide behavior in metadata;
- they increase compiler and tooling complexity;
- they create legacy and standards-compatibility questions;
- they are unnecessary for function-first composition.

An optional `@vii-labs/decorators` syntax adapter may be researched for Angular-oriented teams, but Core, State, Scope, and Component IR must not depend on it.

## Folder organization

Vii should support both route-oriented and feature-oriented projects.

Feature example:

```text
src/
├── app/
├── features/
│   └── users/
│       ├── components/
│       ├── pages/
│       ├── users.store.ts
│       ├── users.query.ts
│       └── users.test.ts
├── shared/
└── main.ts
```

The framework should provide conventions without forcing every application into one directory layout.

## Security defaults

- Text interpolation uses text nodes, not raw HTML sinks.
- Event handlers are function references, never code strings.
- Dynamic URL bindings are validated according to URL policy.
- Raw HTML requires an explicit safe type and sanitizer.
- Client and server imports are statically classified.
- Inline executable strings, `eval`, and generated event code are forbidden.

See `docs/security/SECURITY_ARCHITECTURE.md`.

## Progressive disclosure

A beginner should need only:

```text
component
state
computed
```

An application developer later learns:

```text
store
action
resource
scope
query
```

Advanced systems expose:

```text
custom equality
transactions
renderer adapters
hydration
compiler plugins
diagnostics protocols
```

Advanced capability must not expand the beginner mental model unnecessarily.

## CLI profiles

Generators should expose profiles rather than separate runtimes:

```bash
vii generate component user-card --style=sfc
vii generate component user-card --style=split
vii generate component user-card --style=tsx
vii generate component user-card --style=ts
```

Workspace defaults belong in `vii.config.ts`.

## Graduation criteria

A native Vii component runtime may move from Research to Planned only after:

- State and Scope semantics are stable;
- at least two real applications validate the model;
- SFC, split, and TSX prototypes lower to one IR;
- fine-grained updates are measured against stated budgets;
- SSR serialization and hydration are demonstrated;
- accessibility and security compiler diagnostics work;
- source maps and IDE behavior are usable;
- the native runtime provides a clear advantage beyond existing adapters.
