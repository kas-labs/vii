# Framework Adapter Contract

Status: Draft

## Purpose

Vii adapters connect the framework-agnostic runtime to a host framework without reimplementing State, Query, scopes, diagnostics, or lifecycle rules.

Official initial targets:

- Vanilla TypeScript
- React
- Angular
- Vue

The same Vii store and derived value must preserve their meaning across every adapter.

## Core rule

An adapter translates host lifecycle and rendering APIs into Vii subscriptions. It must not create a second state model.

```text
Vii Core owns behavior.
The adapter owns framework integration.
The application owns domain state.
```

## Required capabilities

Every official adapter must support:

1. reading the current snapshot;
2. subscribing to updates;
3. selecting a derived snapshot;
4. custom equality for selected values;
5. automatic cleanup through the host lifecycle;
6. explicit cleanup outside a host lifecycle;
7. batching compatibility;
8. named stores and diagnostic metadata;
9. server snapshot support where the host supports SSR;
10. request-safe state creation for SSR;
11. stable TypeScript inference;
12. production builds without development diagnostics UI.

## Adapter boundaries

Adapters may depend on:

- `@kas-labs/vii`;
- the target framework as a peer dependency;
- small framework-specific helpers when justified.

Adapters must not:

- duplicate Vii graph logic;
- silently mutate application state;
- require a global singleton;
- introduce network calls;
- bundle the target framework;
- require Vii UI, Query, Devtools, CLI, or AI;
- depend on private framework internals;
- change notification order or equality semantics.

## Reference contract

Conceptually, adapters consume a minimal external-store contract:

```ts
export interface ViiReadable<T> {
  get(): T;
  subscribe(listener: () => void): () => void;
}

export interface ViiSelectable<T> extends ViiReadable<T> {
  readonly name?: string;
}
```

The exact public types remain subject to the Core Store RFC.

## React direction

The React adapter should use official external-store integration APIs and expose a small native hook surface.

Candidate API:

```tsx
const value = useVii(store);
const completed = useVii(store, selectCompleted, Object.is);
```

Requirements:

- stable snapshots;
- Strict Mode safety;
- no mandatory Context;
- optional Context for dependency injection;
- SSR server snapshot support;
- no tearing introduced by the adapter;
- cleanup on unmount.

The initial private implementation lives in `packages/react` and exposes `useVii` through
`useSyncExternalStore`. Core remains the source of truth for snapshots, selection, equality, batching,
and subscription cleanup. The adapter provides the server snapshot required by React; applications
remain responsible for request-isolated stores and equivalent hydration data.

## Angular direction

The Angular adapter should expose Vii values as Angular Signals while respecting Angular injection and destruction lifecycles.

Candidate API:

```ts
readonly count = viiSignal(counterStore);
```

Requirements:

- standalone component support;
- `DestroyRef`-based cleanup where available;
- zoneless compatibility;
- SSR and hydration testing;
- optional RxJS interop;
- no requirement to wrap every store in an Angular service.

The initial private implementation lives in `packages/angular`. `viiSignal` creates a readonly
Angular Signal and binds the Core subscription to the current `DestroyRef`; `createViiSignal` returns
an explicit `{ signal, dispose }` handle for request or non-injection lifecycles. Selector and custom
equality options remain at the adapter edge while Core owns snapshot, batching, and subscription
semantics.

## Vue direction

The Vue adapter should expose readonly shallow reactive values and avoid double deep-proxy reactivity.

Candidate API:

```ts
const count = useVii(counterStore);
```

Requirements:

- Composition API first;
- cleanup through Vue scope disposal;
- readonly value exposure;
- SSR-safe factories;
- no automatic global singleton;
- no deep wrapping of Vii-managed values.

## Vanilla direction

Vanilla TypeScript is the reference proof that Vii Core is framework-independent.

The Vanilla experience uses the Core API directly and must not require a separate adapter package for basic State usage.

Examples must cover:

- DOM rendering;
- Web Workers;
- Node-compatible non-DOM usage;
- explicit subscription cleanup.

## SSR rules

Adapters must never create process-wide user state implicitly.

Every SSR integration must provide or document:

- per-request application factories;
- server snapshot creation;
- serialization boundaries;
- hydration restoration;
- cleanup after request completion;
- behavior on version mismatch;
- protection against cross-request state leakage.

## Compliance suite

Every official or community adapter seeking compatibility status must pass the same suite:

```text
reads the initial snapshot
receives updates
skips equal selections
handles nested batching
disposes subscriptions
handles disposed stores
preserves diagnostic cause information
supports server snapshots when applicable
isolates parallel SSR requests
preserves public TypeScript inference
does not bundle the framework runtime
```

The initial source-level suite lives in the private `packages/adapter-testing` workspace package. It
is exercised by a Core-backed reference adapter and deliberately does not establish the final public
package name or selector overloads while RFC 0005 remains Draft.

## Compatibility levels

- **Official**: maintained by Kas Labs and included in release validation.
- **Verified**: third-party adapter passing the published compliance suite.
- **Community**: available without Kas Labs compatibility guarantees.
- **Experimental**: API or behavior may change without migration support.

## Open questions

- exact selector overloads;
- error handling during framework rendering;
- server snapshot versioning;
- adapter package naming;
- framework version support windows;
- whether adapter-specific diagnostic events are part of the core protocol.
