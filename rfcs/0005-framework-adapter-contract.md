# RFC 0005: Framework Adapter Contract

- Status: Draft
- Authors: Kas Labs
- Target: Vii State Alpha

## Summary

Define one compliance contract for React, Angular, Vue, Vanilla, and future framework adapters.

## Motivation

Framework support is useful only if the same Vii store preserves consistent semantics everywhere. Without a formal contract, adapters may gradually duplicate runtime behavior, diverge in lifecycle rules, or expose unrelated mental models.

## Proposal

Official adapters must translate host-framework rendering and lifecycle facilities to the Vii readable/subscription contract.

They must preserve:

- snapshot meaning;
- equality behavior;
- batching behavior;
- causal diagnostic context;
- disposal semantics;
- SSR request isolation.

Official initial package direction:

```text
@kas-labs/vii
@kas-labs/vii-react
@kas-labs/vii-angular
@kas-labs/vii-vue
```

Vanilla State usage is provided by `@kas-labs/vii` directly.

## Required compliance tests

Each adapter must pass shared tests for:

- initial snapshot;
- updates;
- equal selection suppression;
- batched updates;
- cleanup;
- disposed stores;
- diagnostic cause preservation;
- SSR snapshots where applicable;
- parallel request isolation;
- type inference;
- packaging without bundled framework runtime.

## Framework direction

### React

Use public external-store integration APIs. Context is optional and intended for dependency injection, not required for every store.

### Angular

Expose Vii values through Signals and bind cleanup to Angular lifecycle facilities. RxJS interop is optional.

### Vue

Expose readonly shallow reactive values and avoid deep proxying Vii-owned data.

### Vanilla

Use Core directly and serve as the reference proof of framework independence.

## Rejected alternatives

### Separate state implementation per framework

Rejected because it breaks shared behavior and increases maintenance.

### Require framework dependency injection everywhere

Rejected because simple standalone stores should remain simple.

### Depend on private framework internals

Rejected because compatibility and maintainability would be fragile.

## Unresolved questions

- final hook and helper names;
- selector overload design;
- framework support windows;
- exact SSR hydration contract;
- adapter-specific diagnostic event names;
- whether wrappers and native adapters share one package.

## Acceptance criteria

- one published compliance suite exists;
- proof-of-concept adapters work with the same store fixture;
- adapters introduce no second graph or scheduler;
- cleanup and SSR isolation are tested;
- public APIs are documented with equivalent examples.
