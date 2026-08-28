---
title: Batch
description: Group synchronous Vii Core writes into one propagation boundary.
---

`batch(callback)` groups synchronous writes so notifications wait until the outermost batch completes.

```ts
import { batch, state } from "@vii-labs/core";

const count = state(0);

batch(() => {
  count.set(1);
  count.update((current) => current + 1);
});
```

The writes commit immediately. Notification delivery is deferred until the batch boundary closes.

## Nested batches

Nested calls share the same outer propagation boundary.

If the same State is written repeatedly in one batch, subscribers observe its final queued value rather than every intermediate write notification.

Dependent Computed values are recomputed at most once per batch boundary when needed.

## Batch is not a transaction

A batch does not provide rollback.

```ts
batch(() => {
  count.set(1);
  throw new Error("failed");
});
```

The value committed before the error remains committed. Vii still delivers notifications for committed writes and reports errors after the queued work has been processed.

Use Batch for propagation coordination, not transactional state management.

## Related

- [State](/docs/core/state/)
- [Computed](/docs/core/computed/)
- [Scope](/docs/core/scope/)
