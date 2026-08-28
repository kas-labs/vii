---
title: Computed
description: Lazy cached derived values in Vii Core.
---

`computed(factory)` creates a derived reactive value.

```ts
import { computed, state } from "@vii-labs/core";

const count = state(2);
const doubled = computed(() => count.get() * 2);

doubled.get(); // 4
```

## Lazy evaluation

A Computed evaluates when read and caches its last result. It tracks State or Computed values read synchronously during evaluation.

When a dependency changes, the Computed becomes invalid. It recomputes when needed and notifies its own subscribers only when the derived result actually changes.

## Dynamic dependencies

Dependencies are tracked from the current execution. If a later execution stops reading a dependency, that dependency is released.

## Cycles

Circular Computed reads are rejected with `Computed cycle detected`.

## Disposal

A Computed exposes `dispose()`. Disposal releases dependency subscriptions and makes further use invalid. A Computed created inside `scope.run()` can be owned and disposed by that Scope automatically.

## Freshness rule

Dependency invalidation follows ordinary subscription ordering. A callback subscribed directly to a source State can run before a dependent Computed has received its invalidation callback if that source subscriber was registered earlier.

For code that requires derived updates, prefer subscribing to the Computed itself rather than assuming freshness inside a source-State subscriber.

## Related

- [State](/docs/core/state/)
- [Batch](/docs/core/batch/)
- [Scope](/docs/core/scope/)
