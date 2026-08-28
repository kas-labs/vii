---
title: Ownership patterns
description: Practical ways to map application lifetimes onto Vii Scope ownership.
---

The central lifecycle question is simple: **who owns this resource, and when does that owner end?**

Vii Scope gives that answer a concrete runtime boundary.

## Page or screen lifetime

Create one Scope when a page, route, or screen becomes active. Dispose it when that surface is torn down.

```ts
const pageScope = createScope({ name: "settings-page" });

pageScope.run(() => {
  // page-local subscriptions and Computed values
});

// route leaves
pageScope.dispose();
```

## Nested feature lifetime

Use child scopes when part of a surface has a shorter lifetime than its parent.

```ts
const page = createScope({ name: "dashboard" });
const chart = page.createChild({ name: "chart" });
const inspector = page.createChild({ name: "inspector" });
```

Disposing `chart` does not affect the page or inspector. Disposing `page` cleans up every child it still owns.

## Explicit external resources

Not every resource is created by Vii. Attach ordinary cleanup functions explicitly.

```ts
const scope = createScope();

const controller = new AbortController();
scope.use(() => controller.abort());

const id = window.setInterval(refresh, 5_000);
scope.use(() => window.clearInterval(id));
```

The Scope does not understand these APIs. It only owns the cleanup you give it.

## Ownership transfer

`scope.use()` returns a detach handle.

```ts
const detach = sourceScope.use(resource);

detach();
targetScope.use(resource);
```

Detach first, then attach to the new owner. This keeps ownership explicit and avoids two scopes both assuming responsibility for the same resource.

The detach handle is idempotent.

## Keep ownership close to creation

Prefer code where resource creation and ownership assignment are easy to see together.

Good:

```ts
const unsubscribe = store.subscribe(onChange);
scope.use(unsubscribe);
```

Harder to reason about:

```ts
const unsubscribe = store.subscribe(onChange);
// many lines later, possibly in another module
scope.use(unsubscribe);
```

## Do not use a global Scope for convenience

A process-wide Scope can be legitimate for process-wide resources, but it should not become the default owner for page, component, request, or feature work. Overly broad ownership hides lifecycle mistakes instead of solving them.

## Request isolation

For server-side work, do not share one mutable Scope across unrelated requests. Create request-local ownership boundaries so request resources cannot leak into each other.

The exact framework integration belongs to later adapter documentation, but the ownership principle is already the same: one request lifetime, one request ownership boundary.

## Common ownership smells

Watch for:

- a resource with no obvious owner;
- two scopes both registering the same disposable object;
- a page-local subscription owned by an application-global Scope;
- async work that assumes `scope.run()` keeps ambient ownership after `await`;
- resources that are detached and never assigned a new owner;
- child scopes created without a clear parent lifetime reason.

## Related

- [Lifecycle & Scope](/docs/lifecycle/)
- [Cleanup patterns](/docs/lifecycle/cleanup/)
- [Scope reference](/docs/core/scope/)
