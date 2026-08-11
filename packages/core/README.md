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

This first State slice is intentionally limited to synchronous read/write behavior. Subscriptions,
Computed, Batch, Scope, Query, UI, adapters, and CLI work belong to later implementation tasks.
