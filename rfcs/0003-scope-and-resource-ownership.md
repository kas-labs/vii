# RFC 0003: Scope and Resource Ownership

- Status: Draft
- Authors: Kas Labs
- Created: 2026-08-05

## Summary

Introduce an explicit ownership model for stores, subscriptions, derived nodes, timers, sockets, observers, workers, and other disposable resources.

## Motivation

Vii intends to work across browser components, routes, server requests, mobile screens, desktop windows, tests, and background jobs. These environments have different lifecycle APIs, but they share the same fundamental question: who owns a resource and when must it be released?

Without an explicit model, lifecycle behavior becomes adapter-specific and difficult to diagnose.

## Proposed direction

```ts
interface ViiResource {
  dispose(): void;
}

const scope = createScope({ name: "checkout" });
scope.use(resource);
scope.dispose();
```

Scopes may create child scopes and own Vii stores.

## Prototype decisions

The first Core implementation resolves the initial lifecycle questions with a synchronous Scope:

```ts
const scope = createScope({ name: "checkout" });

scope.run(() => {
  cart.subscribe(renderCart);
});

scope.dispose();
```

- `scope.run(work)` owns subscriptions and Computed values created synchronously by `work`;
- `scope.use(resource)` accepts a resource or cleanup function;
- `scope.createChild()` registers a child with its parent;
- resources are disposed in reverse registration order (LIFO);
- disposal is idempotent, and disposed Scopes reject `run`, `use`, and `createChild`;
- one cleanup error is rethrown; multiple errors are reported through `ScopeDisposalError`, which
  preserves every error after all cleanups are attempted.

The Alpha `ViiResource` contract is synchronous. Async disposal, resource transfer, and propagation
across asynchronous boundaries remain future work.

## Proposed rules

1. Every attached resource has one owning scope.
2. Parent disposal disposes child scopes.
3. Disposal is idempotent.
4. The disposal order is deterministic and documented.
5. Disposed scopes reject new resources.
6. Diagnostics record creation, attachment, and disposal.
7. Framework adapters map native lifecycle boundaries to scopes.
8. Request-scoped state cannot silently become process-global.

## Questions to resolve

- LIFO or FIFO resource disposal;
- synchronous versus asynchronous disposal APIs;
- cleanup error aggregation;
- resource transfer between scopes;
- detached child scopes;
- production behavior for updates after disposal;
- integration with framework dependency injection;
- context propagation across asynchronous work.

## Alternatives

### Framework-only lifecycle

Rejected because it cannot provide consistent behavior in Vanilla, server, desktop, mobile, and tests.

### Garbage-collection finalizers

Rejected as a correctness mechanism because finalization is nondeterministic.

### Global registries

Rejected as a default because they encourage process-wide mutable state and complicate SSR isolation.

## Diagnostics

The ownership graph should expose identifiers, names, parent-child relations, resource types, counts, and lifecycle status. Resource values and secrets are not included by default.

## Validation plan

- nested disposal tests;
- adapter unmount tests;
- parallel SSR request isolation;
- disposal error tests;
- ownership graph snapshots;
- memory-retention experiments without relying solely on finalizers.
