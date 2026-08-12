# Scope and Resource Ownership

Status: Draft

## Purpose

Vii uses scopes to make lifecycle and ownership explicit. A scope represents a boundary that owns stores, subscriptions, derived nodes, timers, sockets, observers, workers, and other disposable resources.

This model is intended to support browser components, routes, server requests, mobile screens, desktop windows, tests, and background jobs without changing the core ownership rules.

## Goals

- Predictable cleanup
- Clear parent and child ownership
- No hidden process-wide state
- Better diagnostics for retained resources
- Framework-independent lifecycle semantics
- Safe SSR request isolation
- Explicit transfer and disposal rules

## Scope examples

- application scope;
- framework component scope;
- route scope;
- server request scope;
- desktop window scope;
- mobile screen scope;
- test scope;
- background job scope.

## Conceptual API

```ts
const scope = createScope({ name: "checkout" });

scope.run(() => {
  cart.subscribe(renderCart);
});

scope.use(createTimer());
const child = scope.createChild({ name: "checkout-validation" });

scope.dispose();
```

The initial Core API is synchronous and experimental. `scope.run` owns subscriptions and Computed
values created during its callback; `scope.use` also accepts cleanup functions. A child scope is
owned by its parent.

## Resource contract

The initial common resource contract is synchronous. It can later be extended with a separate async
disposal API without making ordinary subscription cleanup asynchronous.

```ts
interface ViiResource {
  dispose(): void;
}
```

Functions returned by subscriptions may be adapted into resources.

## Ownership rules

1. A resource may have one owning scope.
2. A child scope is owned by its parent unless detached explicitly.
3. Disposing a parent disposes its children.
4. Disposal is idempotent.
5. Resources are disposed in reverse registration order (LIFO).
6. New resources cannot be attached to a disposed scope.
7. Multiple cleanup failures are reported as a structured `ScopeDisposalError` after all resources
   have been attempted.
8. Asynchronous context propagation and resource transfer are not part of the initial contract.

## Parent and child scopes

```text
Application
├── Route: dashboard
│   ├── Component: filters
│   └── Component: table
└── Background synchronization
```

The diagnostics layer should expose this ownership graph without requiring application values.

## Transfer

Resource transfer between scopes is an advanced operation. It must be explicit and should not be part of the earliest Alpha unless a real use case requires it.

Possible future contract:

```ts
targetScope.adopt(resource);
```

Transfer must update diagnostics and prevent double disposal.

## Asynchronous disposal

Some resources require asynchronous cleanup, such as persistent connections or server resources. The model may expose separate synchronous and asynchronous disposal operations, but ordinary store and subscription cleanup must remain simple.

Potential direction:

```ts
await scope.disposeAsync();
```

The implementation must define timeout and error aggregation behavior before this API is accepted.

## Framework integration

Framework adapters map native lifecycle boundaries to Vii scopes:

- React component unmount;
- Angular `DestroyRef`;
- Vue `onScopeDispose`;
- server request completion;
- Tauri window close;
- mobile screen disposal.

Adapters must not weaken core disposal guarantees.

## Diagnostics

Scopes should expose metadata such as:

- identifier;
- name;
- parent;
- lifecycle status;
- resource counts by type;
- creation and disposal times;
- retained child scopes;
- last known cause.

Core diagnostic `scope.created` events currently include the generated scope identifier, optional
scope name, and optional `parentScopeId`. This is an observational ownership edge for trace
inspection; it does not expose application values or grant consumers lifecycle mutation authority.

Values and secrets are excluded by default.

## Memory analysis

Vii may report potential retention issues, for example:

```text
Scope checkout was disposed, but 3 externally owned subscribers still reference store cart.
```

Diagnostics must describe observed facts. It must not claim a JavaScript memory leak without sufficient evidence.

## Non-goals

- Replacing framework dependency injection
- Owning all third-party resources automatically
- Relying on garbage collection finalizers for correctness
- Hiding resource creation
- Treating every store as global application state

## Quality gates

- nested disposal is deterministic;
- repeated disposal is safe;
- framework unmount cleans subscriptions;
- request scopes cannot share mutable state accidentally;
- errors during cleanup are aggregated and observable;
- ownership appears correctly in diagnostics;
- lifecycle tests do not depend solely on nondeterministic garbage collection.
