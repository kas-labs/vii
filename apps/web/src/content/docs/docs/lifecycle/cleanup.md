---
title: Cleanup patterns
description: Deterministic cleanup, failure handling, and lifecycle mistakes in Vii Scope.
---

Cleanup is part of the ownership contract, not a best-effort afterthought.

## Register cleanup immediately

When you create a resource that needs teardown, attach its cleanup to the owning Scope as part of the same operation.

```ts
const controller = new AbortController();
scope.use(() => controller.abort());
```

This reduces the chance that a later early return or exception leaves the resource unowned.

## Prefer idempotent resources

Vii makes `Scope.dispose()` and detach handles idempotent. Resources supplied through the `ViiResource` interface should also make their own `dispose()` idempotent.

That keeps nested teardown safe and predictable.

## Understand reverse-order cleanup

Resources are disposed in reverse registration order.

If B depends on A during its lifetime, register A first and B second. Teardown then naturally runs B before A.

```text
setup database
setup subscription using database

teardown subscription
teardown database
```

## Cleanup continues after failures

A failing cleanup does not stop later cleanups from running.

```ts
scope.use(() => cleanupA());
scope.use(() => cleanupB());
scope.use(() => cleanupC());
```

During disposal, C, B, and A are all attempted even if one throws.

One failure is rethrown directly. Multiple failures are reported as `ScopeDisposalError`.

## Detached means no longer owned

```ts
const detach = scope.use(resource);
detach();
```

After detaching, the Scope no longer disposes that resource. Detach is not equivalent to dispose.

If nothing else owns the resource after detach, you are responsible for its later cleanup.

## Do not hide async cleanup inside synchronous disposal assumptions

Current Scope cleanup is synchronous. A cleanup callback returning a Promise is not awaited by the Scope contract.

Do not design teardown that depends on asynchronous completion being managed by `scope.dispose()`.

Use an explicit higher-level async shutdown process if your application needs async resource finalization.

## Child scopes and cleanup

A child Scope is an owned resource of its parent. Parent disposal therefore tears down child scopes before earlier parent resources according to normal reverse registration order.

A child disposed independently detaches itself from the parent, preventing duplicate cleanup later.

## Common cleanup mistakes

### Forgetting ownership

```ts
store.subscribe(onChange);
```

If that subscription should end with a feature lifetime, either create it inside `scope.run()` or attach its unsubscribe function with `scope.use()`.

### Assuming `dispose()` is a reset

A disposed Scope cannot be reused. Create a new Scope for a new lifetime.

### Swallowing disposal errors blindly

Cleanup errors can indicate leaked resources or broken teardown assumptions. Handle them deliberately rather than automatically ignoring them.

### Detaching without transferring ownership

A detached resource is no longer managed by the original Scope. Make its new owner explicit.

## Lifecycle checklist

Before shipping a feature, ask:

1. What creates each long-lived subscription/resource?
2. Which Scope owns it?
3. When is that Scope disposed?
4. Are shorter-lived subfeatures child scopes?
5. Are external resources registered with `use()`?
6. Is any detach followed by an explicit new owner?
7. Does cleanup depend on unsupported async disposal?

## Related

- [Lifecycle & Scope](/docs/lifecycle/)
- [Ownership patterns](/docs/lifecycle/ownership/)
- [Scope reference](/docs/core/scope/)
