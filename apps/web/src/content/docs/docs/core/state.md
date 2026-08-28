---
title: State
description: Mutable reactive values in Vii Core.
---

`state(initialValue)` creates a mutable reactive value.

```ts
import { state } from "@vii-labs/core";

const count = state(0);

count.get();
count.set(1);
count.update((current) => current + 1);
```

## Reads and writes

`get()` returns the current committed value. `set(next)` commits a replacement value. `update(updater)` receives the current value and commits the updater result.

Writes are synchronous. The new value is committed before subscribers are notified.

## Subscriptions

```ts
const unsubscribe = count.subscribe((value) => {
  console.log(value);
});

unsubscribe();
```

Subscriptions run in registration order. Each subscription is independent, and the returned unsubscribe function is idempotent.

If a subscription is removed during notification, it will not run later in that same notification cycle. A subscription added during notification starts observing from the next change.

## Re-entrant writes

A subscriber may write again. The nested value is committed immediately, while its notification is queued until the current notification finishes. Vii drains that synchronous queue before the outermost write returns.

## Errors

Vii attempts all listeners even if one listener throws. A single listener error is rethrown after delivery. Multiple listener errors are reported together as an `AggregateError`.

## Common mistakes

Do not assume a source State subscriber sees every dependent Computed already invalidated. If you need derived-value notifications, subscribe to the Computed itself.

Do not treat State as persistence. Core does not persist values to storage or a server.

## Related

- [Computed](/docs/core/computed/)
- [Batch](/docs/core/batch/)
- [Scope](/docs/core/scope/)
