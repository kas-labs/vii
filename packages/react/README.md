# @vii/react

This experimental adapter connects Vii Core readable values to React through
`useSyncExternalStore`. Core remains the source of truth for State, equality, subscriptions, and
batching; the adapter only translates React subscription and snapshot semantics.

```tsx
const count = state(0);

function Counter() {
  const value = useVii(count);
  return <span>{value}</span>;
}
```

Selectors and custom equality are supported:

```tsx
const completed = useVii(todoStore, (todos) => todos.filter((todo) => todo.done), sameTodos);
```

The package is private and experimental while the adapter package naming and selector overloads in
RFC 0005 remain Draft. SSR uses the store snapshot as the server snapshot; applications must create
request-isolated stores and provide equivalent initial data during hydration.
