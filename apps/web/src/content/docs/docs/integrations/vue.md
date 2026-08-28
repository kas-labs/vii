---
title: Vue
description: Experimental Vue adapter for Vii Core readable state.
---

`@vii-labs/vue` is an experimental, private adapter package. It is not a public registry installation path yet.

The adapter exposes Vii readable state as a readonly shallow ref.

```ts
import { state } from "@vii-labs/core";
import { useVii } from "@vii-labs/vue";

const count = state(0);
const countRef = useVii(count);
```

## Effect-scope ownership

When `useVii()` runs inside an active Vue effect scope, the underlying Core subscription is disposed with that scope.

Selectors and equality are supported:

```ts
const completed = useVii(
  todoStore,
  (todos) => todos.filter((todo) => todo.done),
  sameTodos,
);
```

The adapter uses shallow refs and does not deep-wrap Vii-managed values.

## Explicit ownership

Outside a Vue effect scope, use `createViiRef()` and retain the returned handle.

```ts
const handle = createViiRef(count);

handle.ref.value;
handle.dispose();
```

In development, calling `useVii()` without an active effect scope warns because automatic disposal cannot be guaranteed.

## SSR

Server applications own request-isolated store creation, explicit disposal, and hydration data. The current adapter does not define a hydration serialization contract or create a global singleton.

## Availability and compatibility

The package manifest currently has `private: true` and version `0.0.0`. Its peer range starts at Vue 3.2, while current packed consumer evidence uses Vue 3.5.41. That evidence is not a universal compatibility promise.

## Related

- [Framework integrations](/docs/integrations/)
- [Core](/docs/core/)
- [Lifecycle ownership](/docs/lifecycle/ownership/)
