---
title: Lifecycle & Scope
description: A deeper guide to ownership, cleanup, and deterministic resource lifetime in Vii Core.
---

Vii uses `Scope` to make resource lifetime explicit.

A Scope is not a scheduler, async context, or dependency-injection container. It is a synchronous ownership boundary for disposable resources.

## The model

A useful mental model is:

```text
Scope
  ├─ subscription
  ├─ Computed
  ├─ cleanup function
  └─ child Scope
```

When the Scope is disposed, it disposes the resources it still owns.

This gives application code one place to express the lifetime of related reactive work.

## Create an ownership boundary

```ts
import { computed, createScope, state } from "@vii-labs/core";

const count = state(0);
const scope = createScope({ name: "counter-screen" });

scope.run(() => {
  const doubled = computed(() => count.get() * 2);

  doubled.subscribe((value) => {
    console.log(value);
  });
});

scope.dispose();
```

Subscriptions and Computed values created while `scope.run()` is active are owned by that Scope.

## `scope.run()` is synchronous

`scope.run()` establishes synchronous ambient ownership only. A callback returning a Promise or other thenable is rejected.

```ts
scope.run(() => {
  // synchronous resource creation is owned here
});
```

Do not use it as an async context boundary:

```ts
// Do not do this.
scope.run(async () => {
  await loadData();
});
```

Vii intentionally does not pretend that ownership can remain implicit across `await`.

For async workflows, create or attach resources explicitly at a lifetime boundary you control.

## Explicit ownership with `use()`

`scope.use()` accepts a cleanup function or an object with `dispose()`.

```ts
const removeListener = () => {
  window.removeEventListener("resize", onResize);
};

window.addEventListener("resize", onResize);
scope.use(removeListener);
```

It returns an idempotent detach handle:

```ts
const detach = scope.use(resource);

detach();
```

Detaching removes the resource from the Scope immediately. Detaching does **not** dispose the resource for you.

Use detach when ownership is transferred elsewhere or the resource should outlive the current Scope.

## Child scopes

```ts
const page = createScope({ name: "page" });
const panel = page.createChild({ name: "panel" });
```

The child is automatically owned by the parent. Disposing the parent disposes the child.

This naturally models nested application lifetimes such as page → panel → feature.

A child may also be disposed independently. The implementation removes it from the parent ownership list when that happens, so a later parent disposal does not dispose it twice.

## Deterministic cleanup order

Scope cleanup is LIFO: resources are disposed in reverse registration order.

```text
attach A
attach B
attach C

scope.dispose()

C disposed
B disposed
A disposed
```

This is useful when later resources depend on earlier resources during setup.

## Disposal is idempotent

Calling `dispose()` more than once is safe. After the first disposal, later calls do nothing.

A disposed Scope rejects new `run()`, `use()`, and `createChild()` operations.

## Cleanup failures

Vii attempts every owned cleanup even when one cleanup throws.

If one cleanup fails, that error is rethrown after the remaining resources are processed. If multiple cleanups fail, Vii throws `ScopeDisposalError`, an `AggregateError` containing those failures.

This prevents one broken cleanup from silently skipping the rest of the ownership tree.

## What Scope does not do

Current Core Scope does not provide:

- async disposal;
- implicit ownership across `await`;
- resource transfer APIs beyond explicit detach/re-attach patterns;
- persistence;
- scheduling;
- network cancellation by itself.

Those capabilities should not be inferred from the ownership model.

## Practical rule

Create a Scope where a real application lifetime starts, attach the work that belongs to that lifetime, and dispose the Scope where that lifetime ends.

## Related

- [Scope reference](/docs/core/scope/)
- [Ownership patterns](/docs/lifecycle/ownership/)
- [Cleanup patterns](/docs/lifecycle/cleanup/)
- [Getting Started](/docs/getting-started/)
