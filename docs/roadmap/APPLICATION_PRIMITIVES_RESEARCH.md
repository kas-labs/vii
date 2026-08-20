# Vii Application Primitives Research Roadmap

Status: Research

This roadmap defines how Router, Codec / Serialization, Task / Async, Flow, Storage, and Contracts may be investigated without changing the committed delivery sequence or creating package promises.

## Research thesis

Vii should avoid fragmented boundary and orchestration semantics as it grows from reactive Core into an application ecosystem.

```text
Core
  State / Computed / Scope / Diagnostics
          |
       Schema
          |
   Codec / Contracts
       /    |     \
   Router  HTTP   Storage
      |      |       |
      +---- Task -----+
             |
            Flow
             |
           Query
```

This diagram expresses relationships, not mandatory dependencies. Flow is temporal/event orchestration, not a second State graph or a required dependency of Query.

## Track A: Codec / Serialization

Priority: High

Research whether one explicit encode/decode model can remove duplicate serialization rules across URL, HTTP, Storage, hydration, and workers while remaining standalone and provider-neutral.

Graduation requires real use across at least two representation boundaries, round-trip/malicious-input tests, performance/type evidence, and security review.

## Track B: Contracts

Priority: High

Research reusable boundary descriptions across HTTP, Router loaders, workers, server functions, tests, and AI tools without hiding transport or authority semantics.

Graduation requires a real contract reused across adapters, type/versioning evidence, security review, and proof of reduced duplication.

## Track C: Router

Priority: High, after initial Codec/Contract semantics are understood

Research type-safe and runtime-safe URL handling, explicit loaders, Scope ownership, low TypeScript cost, framework adapters, and future native Vii routing.

Graduation requires a multi-route consumer, history/memory fixtures, malformed URL/open-redirect tests, compiler benchmarks, and mature-router comparison.

## Track D: Task / Async

Priority: High

Task models one asynchronous execution lifecycle. Research whether repeated cancellation/disposal logic across HTTP, Form, Router, Storage, workers, and AI calls justifies a tiny primitive beyond Promise + AbortController.

Graduation requires at least two consumers, cancellation/race/disposal stress tests, memory checks, and proof that platform primitives alone are insufficient.

## Track E: Vii Flow

Priority: Medium-High, after State/Scope semantics are stable and alongside Task research

Flow is the candidate temporal/event orchestration layer:

```text
State     = current value
Computed  = derived current value
Task      = one async execution
Flow      = values/events over time
```

Research questions:

- Can Vii combine signal-like simplicity with a deliberately small set of RxJS-style composition capabilities?
- Can Scope + AbortSignal provide simpler deterministic cancellation and disposal?
- Can State, Task, AsyncIterable, and ReadableStream interoperate without hidden semantic conversions?
- Can stateless operator chains use a low-allocation execution plan or safe fusion?
- Can the API remain understandable without Subjects, scheduler concepts, and a very large operator catalog?
- Does a first-party Flow provide enough value over RxJS plus adapters and native platform primitives?

Prototype scope should focus on map/filter/distinct, temporal operators, merge/combine, switch-latest cancellation, scan/error handling, State bridges, AsyncIterable/Web Streams adapters, and value-safe Diagnostics.

Graduation evidence:

- at least two real consumers with temporal/event orchestration;
- build-vs-RxJS and direct-platform comparison;
- cancellation, reentrancy, disposal, and memory-retention stress tests;
- runtime/allocation/bundle/tree-shaking/type-check benchmarks;
- AsyncIterable and ReadableStream interoperability;
- small public API proposal and explicit anti-goals.

An RxJS adapter is an acceptable outcome.

See `docs/architecture/FLOW_ARCHITECTURE.md` and `docs/quality/FLOW_BENCHMARK_PLAN.md`.

## Track F: Storage

Priority: Medium-High after Schema/Codec/Task boundaries stabilize enough for experimentation

Research the smallest honest cross-platform persistence contract, including migrations, validation, corruption, quotas, cancellation, and optional State persistence helpers.

Graduation requires a real persistence consumer, migration/corruption/malicious-record fixtures, driver compatibility evidence, security review, and platform/library comparison.

## Later candidate research

### Config / Environment

Typed, validated configuration with explicit client/server/build/test boundaries. Server secrets must never become client-visible by convenience API.

### Observability adapters

Diagnostics-to-OpenTelemetry/Sentry/Datadog/custom adapters. Vii should emit semantic events, not build a telemetry backend.

### i18n integration

Reactive locale and typed-message integration only if Vii-specific runtime/framework value appears. Mature message-format ecosystems should be reused where possible.

### Auth contracts

Session/guard/middleware integration around external identity providers. Vii must not become an identity provider, password store, OAuth server, or token issuer.

## Cross-track quality gates

No track advances merely because documentation exists. Require real consumer evidence, build-vs-integrate comparison, small public contracts, runtime/bundle/memory/type measurements where relevant, lifecycle correctness, security/privacy tests, compatibility fixtures, and an explicit maintenance/stop decision.

## Stop rules

Stop, defer, or integrate an existing library when Vii-specific semantics are weak; maintenance exceeds value; a mature library plus thin adapter solves the need; an abstraction hides network/persistence/security/execution boundaries; TypeScript inference becomes expensive; or research would delay committed Core, adapters, CLI, diagnostics, or real-application validation.

## Architecture references

- `docs/architecture/APPLICATION_PRIMITIVES_RESEARCH.md`
- `docs/architecture/CODEC_SERIALIZATION.md`
- `docs/architecture/CONTRACTS_ARCHITECTURE.md`
- `docs/architecture/ROUTER_ARCHITECTURE.md`
- `docs/architecture/TASK_ASYNC.md`
- `docs/architecture/FLOW_ARCHITECTURE.md`
- `docs/architecture/STORAGE_ARCHITECTURE.md`
- `docs/architecture/SCHEMA_ARCHITECTURE.md`
- `docs/architecture/HTTP_CLIENT.md`
- `docs/architecture/FORM_ARCHITECTURE.md`
- `docs/quality/FLOW_BENCHMARK_PLAN.md`
