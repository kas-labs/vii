# @vii-labs/angular

Experimental Angular adapter for the Vii Core readable-state contract.

`viiSignal(store)` bridges a Core snapshot into an Angular readonly Signal and ties its subscription
to the current Angular `DestroyRef`. Use `createViiSignal(store)` when the signal is created outside
an injection context; it returns a `{ signal, dispose }` handle for explicit lifecycle ownership.

Core remains responsible for snapshots, selection, equality, batching, and subscription semantics.
The package is private and experimental while RFC 0005 remains Draft. SSR integrations must create
request-isolated stores and dispose explicit handles at request completion. The packed consumer proof
currently runs against Angular 22.1.1; hydration-specific integration is not part of this provisional
contract yet. Compatibility claims remain limited to the adapter's source tests and packed fixture.
