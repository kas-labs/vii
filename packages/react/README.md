# @vii-labs/react

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

### Object Selectors and Re-render Cost

By default, `useVii` compares selected values using `Object.is`. If a selector constructs and returns
a new object or array reference on every invocation (e.g. `useVii(store, (s) => ({ a: s.a, b: s.b }))`),
`Object.is` will treat each fresh reference as distinct whenever any part of the store changes.
As a result, multiple components selecting different slices via inline object literals will all re-render
on any store update. To avoid unnecessary re-renders with composite return values, provide an explicit
`equality` comparator (such as shallow equality) or use discrete scalar selectors:

```tsx
// Re-renders only when `a` or `b` values change:
const { a, b } = useVii(store, (s) => ({ a: s.a, b: s.b }), (prev, next) => prev.a === next.a && prev.b === next.b);
```

request-isolated stores and provide equivalent initial data during hydration.
