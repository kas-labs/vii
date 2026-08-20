# Vii Application Primitives Research Roadmap

Status: Research

This roadmap defines how Router, Codec / Serialization, Task / Async, Storage, and Contracts may be investigated without changing the committed delivery sequence or creating package promises.

## Research thesis

Vii should avoid fragmented boundary semantics as it grows from reactive Core into an application ecosystem.

The hypothesis is that a small set of reusable primitives can connect existing and planned layers:

```text
Core
  State / Scope / Diagnostics
          |
       Schema
          |
   Codec / Contracts
       /    |     \
   Router  HTTP   Storage
      |      |       |
      +---- Task -----+
             |
           Query
```

This diagram expresses relationships, not mandatory dependencies.

## Track A: Codec / Serialization

Priority: High

Questions to answer:

- Can one explicit encode/decode model remove duplicate serialization rules across URL, HTTP, Storage, hydration, and workers?
- Can it remain standalone and provider-neutral?
- What subset is portable across browser/server/worker environments?
- Does a first-party codec add enough value over direct platform APIs and existing libraries?

Graduation evidence:

- real consumer across at least two representation boundaries;
- round-trip and malicious-input tests;
- runtime/allocation/bundle/type-check measurements;
- explicit security review.

## Track B: Contracts

Priority: High

Questions to answer:

- Can one boundary description be reused across HTTP, Router loaders, workers, server functions, tests, and AI tools without hiding transport semantics?
- Can contracts remain metadata rather than authority or execution capability?
- Is OpenAPI/JSON Schema/protobuf/GraphQL interop more valuable than owning a new format?

Graduation evidence:

- one real contract reused across at least two adapters;
- type-system and versioning evidence;
- security review for trust and authority boundaries;
- proof of reduced duplication.

## Track C: Router

Priority: High, but after initial Codec/Contract semantics are understood

Questions to answer:

- Can Vii provide type-safe and runtime-safe path/search handling with low TypeScript cost?
- Can loaders remain explicit about network/cache behavior?
- Can route Scope ownership simplify cleanup?
- Can the same semantics support existing-framework adapters and a future native Vii framework?

Graduation evidence:

- multi-route real consumer;
- browser history + memory-router fixtures;
- malformed URL/open redirect security tests;
- route-tree TypeScript compiler benchmarks;
- comparison with mature routers.

## Track D: Task / Async

Priority: High

Questions to answer:

- Is there meaningful repeated lifecycle logic across HTTP, Form validation, Router loaders, Storage, workers, and AI calls?
- Can a tiny Task primitive improve cancellation/disposal without becoming Query or RxJS?
- Can Scope disposal cleanly propagate AbortSignal cancellation?

Graduation evidence:

- two different real capability consumers;
- cancellation/race/disposal stress tests;
- memory-retention checks;
- proof that direct Promise + AbortController is insufficient for the repeated use cases.

## Track E: Storage

Priority: Medium-High after Schema/Codec/Task boundaries stabilize enough for experimentation

Questions to answer:

- What is the smallest honest cross-platform persistence contract?
- Which platform differences must remain visible?
- How should migrations, validation, corruption, quotas, and cancellation behave?
- Can State persistence be an optional helper rather than Storage's core semantic?

Graduation evidence:

- real persistence consumer;
- migration/corruption/malicious-record fixtures;
- driver compatibility evidence;
- security review;
- platform API/library comparison.

## Later candidate research

These candidates may be documented further when a real trigger appears, but are not first-priority tracks now.

### Config / Environment

Typed, validated configuration with explicit client/server/build/test boundaries. Server secrets must never become client-visible by convenience API.

### Observability adapters

Diagnostics-to-OpenTelemetry/Sentry/Datadog/custom adapters. Vii should emit semantic events, not build a telemetry backend.

### i18n integration

Reactive locale and typed-message integration only if Vii-specific runtime/framework value appears. Mature message-format ecosystems should be reused where possible.

### Auth contracts

Session/guard/middleware integration around external identity providers. Vii must not become an identity provider, password store, OAuth server, or token issuer.

## Cross-track quality gates

No track advances from Research merely because documentation exists.

Required gates include:

- real consumer evidence;
- build-vs-integrate comparison;
- small public-contract proposal;
- runtime, bundle, memory/allocation, and TypeScript compiler measurements where relevant;
- cancellation/lifecycle correctness where relevant;
- security/privacy tests;
- compatibility fixtures;
- explicit maintenance and stop decision.

## Stop rules

Stop, defer, or integrate an existing library when:

- Vii-specific semantics are weak;
- maintenance burden exceeds demonstrated value;
- a mature library plus thin adapter provides the same application benefit;
- the abstraction hides network, persistence, security, or execution boundaries;
- TypeScript inference becomes expensive or fragile;
- a capability would delay committed Core, adapter, CLI, diagnostics, or real-application validation work.

## Architecture references

- `docs/architecture/APPLICATION_PRIMITIVES_RESEARCH.md`
- `docs/architecture/CODEC_SERIALIZATION.md`
- `docs/architecture/CONTRACTS_ARCHITECTURE.md`
- `docs/architecture/ROUTER_ARCHITECTURE.md`
- `docs/architecture/TASK_ASYNC.md`
- `docs/architecture/STORAGE_ARCHITECTURE.md`
- `docs/architecture/SCHEMA_ARCHITECTURE.md`
- `docs/architecture/HTTP_CLIENT.md`
- `docs/architecture/FORM_ARCHITECTURE.md`
