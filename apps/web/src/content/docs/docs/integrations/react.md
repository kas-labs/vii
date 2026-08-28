---
title: React
description: Experimental React adapter for Vii Core readable state.
---

`@vii-labs/react` is an experimental, private adapter package. It is not a public registry installation path yet.

The adapter connects Vii readable state to React through `useSyncExternalStore`.

```tsx
import { state } from "@vii-labs/core";
import { useVii } from "@vii-labs/react";

const count = state(0);

function Counter() {
  const value = useVii(count);
  return <span>{value}</span>;
}
```

## Selectors

`useVii()` supports selectors and an optional equality function.

```tsx
const completed = useVii(
  todoStore,
  (todos) => todos.filter((todo) => todo.done),
  sameTodos,
);
```

The default equality is `Object.is`.

If your selector constructs a new object or array each time, provide a comparator when reference changes would otherwise trigger unnecessary renders.

## Lifecycle

React owns the adapter subscription through `useSyncExternalStore`. Vii Core remains responsible for the underlying readable state and its semantics.

The adapter does not create application stores, global providers, or request isolation automatically.

## SSR

The current adapter provides the same selection path for client and server snapshots. Applications are responsible for creating request-isolated stores and providing equivalent initial data during hydration.

This is a provisional integration contract, not a promise of a complete hydration framework.

## Availability

The package manifest currently has `private: true` and version `0.0.0`. Treat this page as documentation of the repository adapter contract, not as evidence that `pnpm add @vii-labs/react` is currently supported.

## Related

- [Framework integrations](/docs/integrations/)
- [Core](/docs/core/)
- [Lifecycle](/docs/lifecycle/)
