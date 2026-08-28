---
title: Scope
description: Explicit lifecycle ownership and deterministic cleanup in Vii Core.
---

`createScope()` creates an explicit ownership boundary for synchronous resources.

```ts
import { computed, createScope, state } from "@vii-labs/core";

const scope = createScope({ name: "counter" });
const count = state(0);

scope.run(() => {
  count.subscribe((value) => console.log(value));
  computed(() => count.get() * 2);
});

scope.dispose();
```

Resources created during `scope.run()` can become owned by that Scope. Scope disposal cleans owned resources deterministically in reverse registration order.

## Synchronous ownership

`scope.run()` is intentionally synchronous. Returning a Promise or thenable is rejected because the ambient ownership context is not preserved across `await`.

Keep asynchronous work outside the ambient `run()` boundary unless a later API explicitly models that ownership.

## Explicit resources

Use `scope.use(resource)` when ownership should be explicit.

```ts
const unsubscribe = count.subscribe(console.log);
const detach = scope.use(unsubscribe);
```

Unsubscribe functions are valid resources. `scope.use()` returns an idempotent detach function that releases the resource from the Scope immediately so it will not be retained or disposed by the Scope later.

## Child scopes

`scope.createChild()` creates a child ownership boundary. Disposing the parent disposes its children.

## Disposal rules

Disposal is synchronous and idempotent. A disposed Scope rejects further `run()`, `use()`, and `createChild()` calls.

If multiple cleanups fail, Vii still attempts every cleanup and then reports the failures together through `ScopeDisposalError`.

## Why Scope matters

State itself is simple. Long-lived subscriptions, derived values, and other resources become harder to reason about once an application grows. Scope makes ownership explicit so cleanup is part of the architecture rather than an afterthought.

A dedicated lifecycle guide follows in D6.

## Related

- [State](/docs/core/state/)
- [Computed](/docs/core/computed/)
- [Batch](/docs/core/batch/)
