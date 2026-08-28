---
title: Vanilla
description: Use Vii Core directly without a framework adapter.
---

Vanilla is the simplest Vii integration model: use `@vii-labs/core` directly and connect State subscriptions to your own application boundary.

There is no separate Vanilla adapter package in the current repository.

```ts
import { state } from "@vii-labs/core";

const count = state(0);
const output = document.querySelector("[data-count]");

const unsubscribe = count.subscribe((value) => {
  if (output) output.textContent = String(value);
});

count.set(1);
```

## Ownership

If the subscription belongs to a feature or mounted UI region, attach it to a Scope so cleanup is deterministic.

```ts
import { createScope, state } from "@vii-labs/core";

const scope = createScope({ name: "counter-view" });
const count = state(0);

scope.run(() => {
  count.subscribe((value) => {
    console.log(value);
  });
});

scope.dispose();
```

## When Vanilla is useful

Use direct Core integration when you are working with DOM code, a small application shell, framework-independent libraries, tests, server-side coordination, or when you want complete control over rendering and ownership.

## What Core does not do

Core does not render DOM, patch templates, manage component trees, or provide hydration. Those remain application or framework responsibilities.

## Related

- [State](/docs/core/state/)
- [Scope](/docs/core/scope/)
- [Lifecycle ownership](/docs/lifecycle/ownership/)
