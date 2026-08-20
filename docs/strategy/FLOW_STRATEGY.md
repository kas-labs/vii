# Vii Flow Ecosystem Strategy

Status: Research direction

## Thesis

Vii should not build an RxJS clone. The opportunity is a smaller temporal/event orchestration layer that complements Vii State/Computed and Vii Task.

The candidate value proposition is:

```text
signal-like simplicity
+ composable temporal operators
+ Scope lifecycle
+ AbortSignal cancellation
+ AsyncIterable/Web Streams interop
+ Vii Diagnostics
```

## Learn, do not copy

Research inputs include RxJS for operator composition and cancellation patterns; Angular/Solid/Vue/Preact signal systems for fine-grained current-value reactivity; native AbortController for cancellation; AsyncIterable and WHATWG Streams for platform interoperability and demand-aware streaming; and the TC39 Signals proposal for future signal interoperability.

These are research references, not compatibility promises or mandatory dependencies.

## Concept budget

The intended developer mental model should stay small:

- State: current retained value;
- Computed: derived current value;
- Task: one async execution;
- Flow: values/events over time;
- Scope: ownership and cleanup.

Avoid requiring users to learn a large taxonomy of Subject variants, scheduler types, multicast modes, or hundreds of operators for ordinary application work.

## Integration rule

Flow must be optional. State, Query, Form, HTTP, Router, and Storage must not require Flow merely because it exists. A capability should consume Flow only when temporal composition demonstrably simplifies its implementation or public API.

## Build vs integrate

Before a first-party runtime is accepted, compare:

1. direct platform primitives;
2. RxJS with a thin Vii Scope/State adapter;
3. a small first-party Flow prototype.

Choose the smallest option that preserves Vii semantics and gives measurable application benefit.

## Performance rule

Performance goals are hypotheses, not claims. Investigate low allocations, direct State bridges, deterministic disposal, no mandatory scheduler, and safe stateless operator fusion. Publish semantically fair benchmarks before describing Vii Flow as faster or smaller.

## Primary research references

- RxJS documentation and source;
- TC39 Signals proposal;
- Angular Signals;
- Solid fine-grained reactivity;
- WHATWG Streams;
- JavaScript AsyncIterator/AsyncIterable and AbortController platform semantics.

Revalidate current primary documentation before freezing an RFC or benchmark baseline.
