# Vii Flow Subscription Identity and Upstream Ownership Baseline

Status: Research evidence, bounded correctness fixture only

## Scope

This slice records the minimum ownership behavior needed before considering replay or multicast
APIs. It uses the existing throwaway sources and Core Scope ownership; it does not add an ownership
registry, replay, multicast, or public Flow API.

The fixtures cover:

- a factory AsyncIterable creating one iterator per subscription;
- disposal of one AsyncIterable subscription initiating only its iterator cleanup;
- composed subscriptions isolating downstream disposal while sharing an explicit hot source;
- two Scope-owned subscriptions sharing one explicit hot source without cross-scope disposal.

The evidence distinguishes source identity from subscription identity: a factory source can create
independent upstream work per subscription, while an explicit hot source can be shared without
implicit replay. Raw emitted values are test-local assertions only.

## Reproduction

Commands run on 2026-08-21:

```text
pnpm exec vitest run research/flow/flow-ownership.test.ts --reporter=verbose --silent=false
pnpm exec vitest run research/flow/*.test.ts
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
```

The ownership file passed: one file and three tests passed. The full Flow suite passed: six files
and 24 tests passed. Environment: Node `v22.17.0`, pnpm `10.12.4`, Vitest `4.1.10`.

## Evidence

| Fixture                           | Result                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Factory AsyncIterable identity    | two subscriptions created two iterators                                             |
| Per-subscription cleanup          | disposing the first initiated only its `return()`; the second continued             |
| Composed hot-source subscriptions | disposing one mapped subscription did not stop the other                            |
| Scope ownership                   | disposing one Scope stopped only its subscription; the second received later events |

No replay or implicit multicast behavior was added or inferred. An explicit hot source remains
shared by its own source semantics; a factory source remains subscription-driven. Each subscription
is an independently disposable resource with its own upstream cleanup boundary.

## Limits

This is not evidence for replay, multicast, shared ref-counting, backpressure, throughput, memory,
or a public API. Broader ownership rules for a future explicit multicast adapter, upstream sharing,
and late-subscriber behavior remain design/research work. Flow remains Research-only.
