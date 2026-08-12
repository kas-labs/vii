# Vii Template Control Flow

Status: Research

## Purpose

This document defines the semantic requirements for control flow in a possible
future Vii-native template compiler.

It does not select final source syntax. The syntax must be validated through
compiler prototypes, readability studies, tooling quality, accessibility,
performance, and migration ergonomics before an RFC can freeze it.

The key rule is:

> Control flow is compiler semantics, not a collection of runtime directives.

## Why this belongs in native component research

Conditional rendering and list rendering are fundamental template operations.
If Vii eventually owns a native component compiler, control flow should lower
into the same Component IR as ordinary bindings instead of requiring hidden
components or a second reactive runtime.

The feature belongs to the native component/compiler layer, not Vii State Core
and not framework adapters.

```text
source template
  -> parser
  -> typed template analysis
  -> control-flow IR
  -> Component IR
  -> renderer
```

State, Scope, lifecycle, diagnostics, and security semantics remain shared with
the rest of Vii.

## Research inputs

### Angular built-in control flow

Angular's modern template syntax uses built-in control-flow blocks such as:

```text
@if / @else if / @else
@for / @empty
@switch / @case / @default
```

The useful ideas for Vii are:

- control flow is first-class template syntax rather than imported structural directives;
- list identity is explicit through a tracking expression;
- empty-list fallback is part of the loop construct;
- branch structure is visible and readable;
- the compiler can use type information and optimize DOM preservation.

Vii should not automatically copy Angular's `@` syntax. The semantic model is
more important than the token choice.

### Vue directives

Vue demonstrates a concise attribute-oriented model with `v-if`, `v-else`, and
`v-for`, plus keyed list rendering.

Useful lessons:

- syntax can remain close to HTML;
- conditional and repeated fragments should work without extra DOM wrappers;
- key identity is important for preserving local UI state;
- implicit precedence between multiple directives can become confusing and
  should be avoided in Vii.

### React and JSX

React uses JavaScript control flow and array operations rather than a separate
template control-flow language.

Useful lessons:

- developers already understand JavaScript branching;
- TSX should preserve ordinary JavaScript composition;
- stable keys are essential for list identity;
- native Vii template syntax and Vii TSX do not need identical source notation
  if they lower into one semantic IR.

## Required semantic operations

A native Vii template compiler should research at least four core operations.

### Conditional branch

Conceptual operation:

```text
if condition
  render branch A
else if condition
  render branch B
else
  render fallback
```

Requirements:

- reactive dependency tracking only for expressions that affect the branch;
- deterministic branch switching;
- correct creation and disposal of child Scopes;
- no retained event listeners or resources from removed branches;
- source-mapped diagnostics;
- type narrowing where the compiler can prove it safely.

### Repetition

Conceptual operation:

```text
for item of items
  track stable identity
  render item block
```

Requirements:

- stable identity for dynamic collections;
- minimal DOM movement and recreation;
- preserved component/local state when identity is preserved;
- deterministic insertion, removal, and reorder behavior;
- nested loop scopes;
- contextual metadata such as index/count only when useful;
- explicit behavior for invalid or duplicate keys.

Index-based identity should be documented as safe only for collections where
identity really follows position.

### Empty state

A repeated block should support an explicit empty fallback without requiring
application authors to duplicate the collection condition manually.

Conceptually:

```text
for item of items
  render item
empty
  render fallback
```

The empty branch owns its own Scope and must dispose cleanly when the collection
becomes non-empty.

### Switch or pattern branch

A branch operation should support multiple discrete cases without requiring deep
nested conditionals.

Research should evaluate:

- strict equality cases;
- TypeScript union narrowing;
- exhaustiveness diagnostics;
- default branches;
- future pattern matching only if TypeScript and JavaScript semantics make it
  predictable and maintainable.

Vii should not invent a large custom pattern language prematurely.

## Candidate source syntax

No syntax is selected yet.

Possible research families include:

### Block syntax

```html
@if (user()) {
  <user-card />
} @else {
  <sign-in />
}
```

Benefits:

- visually explicit branches;
- easy multi-element blocks;
- strong compiler ownership.

Risks:

- may look too Angular-specific;
- introduces non-HTML tokens;
- requires editor, formatter, parser, and language-server support.

### Vii-specific block syntax

```html
#if (user()) {
  <user-card />
} #else {
  <sign-in />
}
```

or another token family could reduce direct API imitation, but different syntax
is not valuable by itself. It must improve readability or tooling.

### Element or directive syntax

```html
<template if="user()">
  <user-card />
</template>
```

or:

```html
<user-card v:if="user()" />
```

Benefits:

- more HTML-like parsing;
- familiar to directive-oriented ecosystems.

Risks:

- attribute precedence and composition can become implicit;
- multi-branch structures may become verbose;
- control flow can look like runtime DOM attributes even when it is compiler-only.

### TSX

Vii TSX should normally use JavaScript:

```tsx
return user()
  ? <UserCard />
  : <SignIn />;
```

Lists use normal JavaScript operations with stable Vii renderer identity
semantics.

Vii should not force native-template syntax into TSX merely for visual
uniformity.

## Recommended research direction

The first compiler prototype should evaluate a block syntax because it maps
cleanly to control-flow IR and keeps branches explicit.

However, the project must not commit to `@if` or another token before comparing:

- parser complexity;
- formatter behavior;
- syntax highlighting;
- language-server support;
- TypeScript expression integration;
- readability in nested templates;
- migration ergonomics for Angular, Vue, and JSX users;
- source-map quality;
- generated code size;
- runtime update cost.

The final syntax should feel native to Vii rather than intentionally different
or intentionally familiar.

## List identity

List identity is a semantic requirement, not optional decoration.

A future syntax should make the stable key visible when the collection can
reorder, insert, or remove items.

Conceptual example:

```html
@for (user of users(); track user.id) {
  <user-row user="user" />
}
```

The exact syntax is undecided, but the compiler must understand the identity
expression so it can preserve the correct DOM nodes, component Scopes, focus,
form state, and resources.

## Reactive execution model

Control flow should use fine-grained dependencies.

```text
condition signal changes
  -> reevaluate condition
  -> change branch only if branch identity changes

collection signal changes
  -> diff tracked identities
  -> update only affected item blocks
```

A change inside one item should not cause unrelated list items to recreate when
fine-grained bindings are available.

## Scope and lifecycle

Each instantiated control-flow branch or repeated item owns a child Scope.

When a branch or item disappears, Vii must dispose:

- effects;
- event listeners;
- subscriptions;
- requests;
- observers;
- child components;
- renderer resources.

A later Devtools view should be able to explain branch and list ownership without
changing runtime behavior.

## Accessibility

Compiler syntax must preserve normal accessible HTML and component semantics.

Control-flow compilation must not:

- insert meaningless wrapper elements merely to manage branches;
- break label/control relationships;
- reset focus unnecessarily during keyed list updates;
- hide invalid focus movement caused by branch changes;
- weaken semantic HTML.

Accessibility diagnostics should point to the original template source.

## Security

Control-flow expressions are code compiled from project source, not strings
executed at runtime.

The compiler must not implement conditions or event handlers using `eval`,
`new Function`, inline code-string attributes, or unsafe generated HTML.

Branches do not change the existing raw-HTML, URL, event, client/server, or
secret-boundary policies.

## Diagnostics

Development diagnostics may explain:

- which condition changed;
- which branch became active;
- which keyed items were inserted, moved, or removed;
- duplicate or unstable keys;
- branch Scope creation and disposal;
- unusually expensive list reconciliation.

Diagnostics should remain bounded and must not record application values by
default.

## Testing requirements

A control-flow prototype requires fixtures for:

- conditional mount/unmount;
- nested branches;
- keyed insert/remove/reorder;
- duplicate and unstable keys;
- empty-to-non-empty transitions;
- nested loops;
- focus preservation;
- component Scope disposal;
- Resource cancellation;
- SSR rendering and hydration;
- source maps;
- type narrowing;
- malformed syntax;
- accessibility cases;
- malicious template expressions.

## Relationship to component authoring profiles

The native `.vii` and split-template profiles may share the canonical template
syntax.

TSX and programmatic TypeScript may use JavaScript control flow while lowering
to equivalent Component IR operations.

Therefore:

> Multiple source syntaxes may exist, but there is only one control-flow runtime model.

## Graduation criteria

Template control flow can move from Research to Planned only when:

- the Component IR has an accepted direction;
- State and Scope semantics are stable;
- at least one conditional and keyed-list prototype works in both client and SSR
  fixtures;
- list reconciliation preserves identity and cleanup correctly;
- syntax tooling is usable;
- accessibility and security fixtures pass;
- generated output, update cost, and memory behavior are measured;
- the syntax provides a clear benefit beyond using TSX or existing framework
  adapters.

## Primary research references

- Angular control flow: https://angular.dev/guide/templates/control-flow
- Vue conditional rendering: https://vuejs.org/guide/essentials/conditional
- Vue list rendering: https://vuejs.org/guide/essentials/list
- React conditional rendering: https://react.dev/learn/conditional-rendering
- React list rendering and keys: https://react.dev/learn/rendering-lists

These are design references, not syntax or compatibility commitments.
