# Vii Contracts Architecture

Status: Research direction

## Purpose

Vii Contracts is a candidate boundary-description model for typed input, output, errors, and optional Schema/Codec metadata that can be reused across HTTP endpoints, Router loaders, server functions, worker messages, CLI actions, tests, and AI/tool integrations.

The intent is not remote-procedure-call magic. Network, process, worker, and trust boundaries must remain visible.

## Candidate model

A contract may conceptually describe:

```text
Contract
  input
  output
  errors
  optional schema validation
  optional codec/serialization
  diagnostics metadata
  boundary kind
```

A research-only API shape might resemble:

```ts
const GetUser = contract({
  input: UserIdSchema,
  output: UserSchema,
  errors: {
    notFound: NotFoundSchema,
  },
});
```

No syntax is accepted by this document.

## Why a shared contract layer may matter

Without a shared model, HTTP, Router, server functions, workers, tests, and AI tools can each define incompatible descriptions of the same boundary.

A successful Vii Contract could provide one explainable description while adapters handle transport-specific behavior.

```text
             Contract
          /     |      \
       HTTP   Router   Worker
        |       |        |
      Server   Loader    Message
```

## Boundaries

Contracts must not own:

- transport execution;
- caching;
- navigation;
- persistence;
- authentication infrastructure;
- authorization decisions;
- business logic;
- schema validation implementation;
- serialization implementation.

Those belong to dedicated capabilities or application code.

## Provider neutrality

A contract must be able to reference Vii Schema if it graduates, but validation must remain provider-neutral where feasible. Codec integration must likewise be optional.

## Error model

Research should prefer structured, typed error categories over thrown-string conventions. It must distinguish expected domain/boundary errors from transport failures, programmer errors, cancellation, and unexpected exceptions.

Raw sensitive values should not become diagnostic metadata by default.

## AI and tool boundaries

Contracts may be useful for structured AI/tool inputs and outputs, but AI is optional and must not shape Core semantics. Contract metadata must never grant tool authority, permissions, or execution rights by itself.

## Security requirements

Research must cover:

- trust-boundary validation;
- authorization remaining explicit and external to type validation;
- confused-deputy risks;
- contract metadata exposure;
- unsafe automatic execution;
- prompt/tool schema injection boundaries;
- secret and PII redaction;
- version skew between producer and consumer;
- downgrade and compatibility behavior.

## Anti-goals

Vii Contracts must not become:

- a hidden RPC system;
- a mandatory backend framework;
- a permission system;
- a network protocol;
- a code-generation requirement;
- a replacement for OpenAPI, JSON Schema, protobuf, GraphQL, or other standards where interoperability is more valuable.

Interop adapters are preferred over format ownership.

## Evidence required before graduation

- one real contract reused across at least two boundary adapters;
- comparison against plain TypeScript plus Schema/OpenAPI-style approaches;
- evidence that abstraction reduces duplication rather than hiding semantics;
- TypeScript compiler-cost measurements for realistic contract graphs;
- versioning and compatibility tests;
- security review of authority and trust boundaries;
- clear stop rule if adapters to existing standards provide equal value.
