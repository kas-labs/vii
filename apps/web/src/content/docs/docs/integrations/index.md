---
title: Framework integrations
description: How Vii Core connects to Vanilla, React, Angular, and Vue today.
---

Vii Core is framework-neutral. Framework integrations are deliberately thin adapters around the same Core-readable state contract.

## Current availability

| Integration | Maturity | Availability |
| --- | --- | --- |
| Vanilla | Experimental Core usage | Available from Core source/packed artifact |
| React | Experimental | Private package |
| Angular | Experimental | Private package |
| Vue | Experimental | Private package |

The React, Angular, and Vue adapters exist in the repository, but their package manifests still set `private: true`. Do not treat the examples in this section as registry installation instructions.

## Shared rule

Core remains responsible for state, subscriptions, batching, selection semantics, and lifecycle primitives. Adapters only translate those semantics into the host framework.

## Choose an integration

- [Vanilla](/docs/integrations/vanilla/): use Core directly without an adapter.
- [React](/docs/integrations/react/): subscribe through `useSyncExternalStore` with `useVii()`.
- [Angular](/docs/integrations/angular/): bridge readable state into readonly Angular Signals.
- [Vue](/docs/integrations/vue/): bridge readable state into readonly shallow refs.

## SSR and request isolation

No adapter creates request-isolated stores for you. Server applications must create state per request when isolation is required and must not accidentally share one mutable global store between users.

Hydration data and serialization remain application responsibilities unless a future integration contract explicitly says otherwise.

## Related

- [Core](/docs/core/)
- [Lifecycle](/docs/lifecycle/)
- [Diagnostics](/docs/diagnostics/)
