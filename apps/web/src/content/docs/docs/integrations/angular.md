---
title: Angular
description: Experimental Angular adapter for Vii Core readable state.
---

`@vii-labs/angular` is an experimental, private adapter package. It is not a public registry installation path yet.

The adapter exposes Vii readable state as readonly Angular Signals.

```ts
import { state } from "@vii-labs/core";
import { viiSignal } from "@vii-labs/angular";

const count = state(0);
const countSignal = viiSignal(count);
```

## Injection-context ownership

`viiSignal(store)` resolves the current Angular `DestroyRef` and disposes the Core subscription with that lifecycle.

Selectors and equality are supported:

```ts
const completed = viiSignal(
  todoStore,
  (todos) => todos.filter((todo) => todo.done),
  { equal: sameTodos },
);
```

## Explicit ownership

Outside an Angular injection context, use `createViiSignal()`.

```ts
const handle = createViiSignal(count);

handle.signal();
handle.dispose();
```

The returned handle owns the Core subscription and `dispose()` is idempotent.

## SSR

Server applications must create request-isolated stores and dispose explicit handles when the request lifetime ends. Hydration-specific integration is not part of the current provisional contract.

## Availability and compatibility

The package manifest currently has `private: true` and version `0.0.0`. Its peer range starts at Angular 17, while current packed consumer evidence uses Angular 22.1.1. That evidence is not a universal compatibility promise.

## Related

- [Framework integrations](/docs/integrations/)
- [Scope](/docs/core/scope/)
- [Lifecycle ownership](/docs/lifecycle/ownership/)
