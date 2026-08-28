---
title: Getting Started
description: Build your first Vii Core state flow with State, Computed, Batch, and Scope.
---

Vii Core is currently experimental and has **not been published to npm yet**. This guide therefore uses the repository/packed-artifact flow that is supported by the current project state instead of pretending a registry install already works.

## 1. Get the current Core package

From a checkout of the Vii repository, create the current Core tarball:

```bash
pnpm --filter @vii-labs/core pack --pack-destination ./artifacts
```

Then install the generated tarball into the project where you want to evaluate Vii:

```bash
pnpm add ./artifacts/vii-labs-core-0.1.0-experimental.2.tgz
```

The first planned public candidate is `@vii-labs/core@0.1.0-experimental.2` on the `next` tag, but publication is governed by a separate release approval. Until that happens, do not rely on `pnpm add @vii-labs/core` from the registry.

## 2. Create your first State

```ts
import { state } from "@vii-labs/core";

const count = state(0);

count.get(); // 0
count.set(1);
count.update((current) => current + 1);
count.get(); // 2
```

A State stores a value and exposes explicit reads and writes. `get()` reads the current value, `set()` replaces it, and `update()` derives the next value from the current value.

## 3. Subscribe to changes

```ts
const unsubscribe = count.subscribe((value) => {
  console.log("count changed", value);
});

count.set(3);
unsubscribe();
```

Subscriptions are synchronous. The returned unsubscribe function is idempotent, so calling it more than once is safe.

Use explicit subscriptions when you need to react to State changes outside a framework adapter.

## 4. Derive values with Computed

```ts
import { computed, state } from "@vii-labs/core";

const price = state(20);
const quantity = state(2);
const total = computed(() => price.get() * quantity.get());

total.get(); // 40
quantity.set(3);
total.get(); // 60
```

Computed values are lazy and cached. They track synchronous State or Computed reads and invalidate when those dependencies change.

A Computed can also be subscribed to when your consumer needs derived-value notifications.

## 5. Group synchronous writes with Batch

```ts
import { batch, state } from "@vii-labs/core";

const firstName = state("Ada");
const lastName = state("Lovelace");

batch(() => {
  firstName.set("Grace");
  lastName.set("Hopper");
});
```

Writes inside `batch()` commit immediately, but notifications wait until the outermost batch finishes. Repeated writes to the same State notify only its final value for that batch boundary.

`batch()` is **not** a transaction. If its callback throws, writes that already committed are not rolled back.

## 6. Own resources with Scope

```ts
import { computed, createScope, state } from "@vii-labs/core";

const scope = createScope({ name: "counter-screen" });
const count = state(0);

scope.run(() => {
  count.subscribe((value) => {
    console.log("count", value);
  });

  computed(() => count.get() * 2);
});

count.set(1);
scope.dispose();
```

Resources created inside `scope.run()` are owned by that Scope where the Core contract supports ownership. Calling `scope.dispose()` performs deterministic synchronous cleanup in reverse registration order.

`scope.run()` itself is intentionally synchronous. Do not return a Promise or cross an `await` boundary from the callback.

## 7. Attach an explicit resource

You can also attach a disposable resource directly:

```ts
const unsubscribe = count.subscribe((value) => {
  console.log(value);
});

scope.use(unsubscribe);
```

When the Scope is disposed, the attached unsubscribe function is called unless it was detached earlier.

This makes ownership visible instead of relying on hidden global lifecycle behavior.

## 8. A small complete example

```ts
import { batch, computed, createScope, state } from "@vii-labs/core";

const scope = createScope({ name: "cart" });
const quantity = state(1);
const unitPrice = state(25);
const total = computed(() => quantity.get() * unitPrice.get());

scope.run(() => {
  total.subscribe((value) => {
    console.log("total", value);
  });
});

batch(() => {
  quantity.set(2);
  unitPrice.set(30);
});

console.log(total.get()); // 60

scope.dispose();
```

This example shows the current Core model in one place:

- State owns mutable reactive values;
- Computed derives values from reactive reads;
- Batch groups synchronous notification propagation;
- Scope makes lifecycle ownership and cleanup explicit.

## 9. What to learn next

This Getting Started guide intentionally stops at the first-use path. The next documentation slices will cover the Core primitives in depth, including exact edge cases, lifecycle semantics, Diagnostics, framework integrations, examples, and generated API reference.

For now, remember that Vii is still experimental. APIs may change under repository governance, and package availability is separate from capability maturity.
