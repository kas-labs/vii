# Vii Application Primitives Research

Status: Research direction

## Purpose

This document maps the next application-level research capabilities that may connect Vii Core, Schema, Form, HTTP, Query, native framework work, and future platform integrations without turning Vii into a collection of unrelated replacement libraries.

The research set is:

- Vii Router;
- Vii Codec / Serialization;
- Vii Task / Async;
- Vii Storage;
- Vii Contracts.

Later candidates are Config / Environment, typed Request Context, Observability adapters, i18n integration, and Auth contracts. They are intentionally not promoted to first-class implementation work by this document.

## Why these primitives belong together

The current ecosystem already has State, Scope, Diagnostics, Query, Form research, HTTP research, and Schema research. The next architectural risk is fragmentation at application boundaries.

Without shared rules, URL params, HTTP payloads, persisted state, worker messages, route loaders, server contracts, request context, and async operations can each invent different validation, serialization, error, cancellation, and lifecycle semantics.

The proposed model is:

```text
Vii Core
  State / Scope / Diagnostics
        |
        +--> Vii Schema
        |      runtime trust-boundary validation
        |
        +--> Vii Codec
        |      typed external representation
        |
        +--> Vii Contracts
        |      typed input/output/error boundary metadata
        |
        +--> Vii Task
        |      async lifecycle / cancellation
        |
        +--> application capabilities
               Router
               HTTP
               Query
               Form
               Storage
```

This is a research map, not a package commitment.

## Design rules

1. Core must not depend on Router, Codec, Task, Storage, Contracts, Schema, network, browser APIs, or framework code.
2. Capabilities must remain independently useful where practical.
3. Validation, serialization, transport, cache, persistence, navigation, and async lifecycle are separate concerns.
4. Existing mature libraries are valid final implementation choices when Vii-specific semantics do not justify ownership.
5. Every capability needs a real consumer before graduation from Research.
6. Runtime and TypeScript compiler cost must be measured, not assumed.
7. Security and privacy boundaries must be explicit at every external-data boundary.
8. SSR, desktop, mobile, worker, and edge support are claims only after compatibility evidence exists.
9. Heap identity is not a portable boundary contract: values crossing storage, worker, server/client, hydration, or remote-function boundaries require an explicit representation.
10. One subsystem must not silently duplicate another subsystem's ownership semantics merely for convenience.

## Priority order

Research priority is intentionally ordered:

1. Codec / Serialization and Contracts, because they define reusable boundary semantics.
2. Router, because navigation becomes central once Vii grows toward an application framework.
3. Task / Async, because HTTP, Query, Form, Router, Storage, workers, and AI integrations all need cancellation and lifecycle semantics.
4. Storage, because persistence is valuable but should build on Schema/Codec/Task decisions rather than inventing its own model.

This order does not create delivery dates.

## Router research emphasis

Current cross-framework research strengthens the Router direction without changing its status.

Vii Router should research:

- typed path params and search params after explicit parsing/validation boundaries;
- explicit loader dependency projection rather than arbitrary hidden reads;
- deterministic loader identity for accepted navigation and speculative preload;
- preload causes such as intent, viewport, render, and programmatic triggers;
- bounded speculative work with Scope ownership and AbortSignal-compatible cancellation;
- route-local transient data without duplicating Query's shared remote-state cache;
- route-tree TypeScript compiler scaling as a required performance budget;
- structural Diagnostics that can explain why a loader reran without capturing raw URLs or user values.

The controlling boundary is:

```text
Router
  navigation / route state / loader scheduling / preload intent
        |
        +--> Query when shared remote-state retention is required
        +--> Task for explicit async lifecycle where appropriate
        +--> Schema / Codec for external URL representation
```

Router must not grow its own general-purpose mutation, invalidation, freshness, and GC engine when Query owns those semantics.

See `ROUTER_ARCHITECTURE.md` and `CROSS_FRAMEWORK_DEEP_RESEARCH.md`.

## Request Context research

TanStack Start and other server-oriented application frameworks demonstrate the value of typed per-request context, but Vii should not introduce a global context bag.

A future Request Context seam may carry request-local capabilities such as:

- authenticated principal or authorization capabilities;
- locale;
- trace/correlation identity;
- request-local service handles;
- deployment/runtime metadata safe for the current environment.

The ownership model should be:

```text
Request Scope
  |- Request Context
  |- QueryClient when required
  |- loaders / server functions
  |- resources
  `- Diagnostics correlation
```

Research rules:

- no process-global mutable request context;
- request values do not cross concurrent requests;
- secrets are not hydrated or serialized by default;
- context should be typed and capability-oriented rather than an unbounded `Record<string, unknown>`;
- route authorization is not a substitute for authorization at a server-function or server-route boundary.

Request Context remains a later candidate until server/application research has a concrete consumer.

## Serialization as a shared constraint

Qwik's resumability model makes serialization constraints unusually visible, but the lesson applies even without adopting resumability.

Vii should treat server/client hydration, Query dehydration, storage, worker messages, server functions, and generated contracts as representation boundaries rather than assuming arbitrary JavaScript heap objects can move between environments.

This strengthens the case for Codec/Serialization research while keeping it independent of any one rendering model.

Resumability itself remains deferred until basic SSR/hydration is correct and measured.

## Later candidates

### Config / Environment

Potential direction: typed and validated client/server/build/test configuration using Schema and explicit environment boundaries.

Anti-goal: Vii must not create a proprietary environment variable system or silently expose server secrets to client bundles.

### Observability

Potential direction: map Vii Diagnostics semantic events to OpenTelemetry, Sentry, Datadog, console, or custom sinks.

Anti-goal: do not build a new telemetry backend, logger ecosystem, or tracing transport when mature standards exist.

### i18n

Potential direction: framework-neutral reactive locale state and typed message integration.

Anti-goal: do not create a full translation-management platform or duplicate mature message-format ecosystems without demonstrated Vii-specific value.

### Auth

Potential direction: session state, route guards, HTTP middleware, Query invalidation, and SSR propagation contracts around provider adapters.

Anti-goal: Vii should not become an identity provider, password database, OAuth authorization server, or token issuer.

Route guards may improve navigation UX but must never be documented as sufficient authorization for independently callable server functions or endpoints.

## Graduation rule

A primitive may move from Research to Planned only when:

- at least one real application needs it;
- the boundary against neighboring Vii capabilities is clear;
- build-vs-integrate analysis is complete;
- API and type-system prototypes are small enough to reason about;
- bundle/runtime/type-check evidence is reproducible;
- lifecycle, cancellation, security, and privacy tests exist where relevant;
- compatibility claims are backed by fixtures;
- maintenance burden is proportionate to user value.

See the dedicated architecture documents for Router, Codec / Serialization, Task / Async, Storage, and Contracts.
