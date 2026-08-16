# @vii-labs/vue

Experimental Vue adapter for the Vii Core readable-state contract.

`useVii(store)` exposes a readonly shallow ref and disposes its Core subscription with the current
Vue effect scope. Use `createViiRef(store)` outside a Vue scope, such as an SSR factory; it returns a
`{ ref, dispose }` handle for explicit lifecycle ownership. Selector and equality arguments stay at
the adapter edge while Core remains responsible for snapshots, batching, and subscription semantics.

The package is private and experimental while RFC 0005 remains Draft. The packed consumer proof
currently runs against Vue 3.5.41. The adapter does not deep-wrap Vii-managed values, create a global
singleton, or define a hydration serialization contract; applications own request isolation and
hydration data.
