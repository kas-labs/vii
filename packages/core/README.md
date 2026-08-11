# @vii/core

This is the first buildable Vii package created by the Phase 0 repository bootstrap.

The package currently exposes the experimental `state` factory:

```ts
import { state } from "@vii/core";

const count = state(0);
count.set(1);
count.update((current) => current + 1);
count.get(); // 2
```

State changes can be observed synchronously with `subscribe`:

```ts
const unsubscribe = count.subscribe((value) => {
  console.log(value);
});

unsubscribe();
```

Subscriptions run in registration order. Duplicate subscriptions are independent, and each returned
unsubscribe function is idempotent. Unsubscribing during notification prevents that subscription from
running later in the same notification; subscriptions created during notification start on the next
change. State commits the new value before notifying listeners. All listeners are attempted even when
one throws; a single listener error is rethrown, while multiple errors are reported as an
`AggregateError`.

Reentrant writes, Computed, Batch, Scope, Query, UI, adapters, and CLI work belong to later
implementation tasks.
