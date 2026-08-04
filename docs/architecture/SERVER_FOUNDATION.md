# Vii Server Foundation

## Purpose

Vii Server begins as a framework-neutral foundation for contracts, request scopes, cancellation, validation, diagnostics, and runtime adapters.

It does not begin as a replacement for established HTTP frameworks.

## Initial architecture

```text
Vii Server Foundation
├── contracts
├── request context
├── scopes and resources
├── validation integration
├── cancellation
├── structured errors
├── diagnostics
├── Fetch handler
└── runtime and framework adapters
```

## Core principle

Server application behavior should be portable while transport and runtime integration remain replaceable.

## Fetch-first boundary

The portable server boundary should prefer standard Web APIs:

```ts
Request
Response
Headers
URL
AbortSignal
ReadableStream
```

This improves compatibility with Node.js, Bun, Deno, workers, and edge environments.

## Request scope

Every request receives an isolated scope.

A request scope may own:

- request metadata
- cancellation signal
- dependency instances
- database transaction handle
- diagnostics context
- temporary resources

Request-scoped state must never leak between requests.

## Contract model

```ts
const getUser = defineContract({
  name: 'users.get',
  method: 'GET',
  path: '/users/:id',
  input: userIdSchema,
  output: userSchema,
});
```

The exact API remains experimental.

A contract may support:

- server validation
- typed client generation
- Query integration
- mocks
- tests
- documentation
- OpenAPI export
- diagnostics correlation

## Transport independence

A contract is not limited to HTTP.

Potential transports:

- HTTP
- WebSocket
- worker messages
- Tauri commands
- native bridges
- local in-process execution

Transport-specific behavior remains in adapters.

## Initial integrations

Research integrations may include:

```text
@kas-labs/vii-fastify
@kas-labs/vii-hono
@kas-labs/vii-nest
```

Only integrations with real consumers and compliance tests should become official packages.

## Runtime adapters

Potential packages:

```text
@kas-labs/vii-server-node
@kas-labs/vii-server-bun
@kas-labs/vii-server-deno
@kas-labs/vii-server-fetch
```

Node.js is the first reference runtime.

## Diagnostics

A request should preserve causal context across:

```text
client action
→ mutation
→ transport
→ server contract
→ handler
→ data access
→ response
→ cache update
```

Production-safe diagnostics must avoid capturing secrets and user payloads by default.

## Structured errors

Server errors should use stable codes and explicit recoverability metadata.

Transport adapters map those errors to protocol-specific responses.

## Out of scope

The first Server Foundation does not include:

- a new ORM
- a database engine
- a hosted authentication service
- payment processing
- deployment orchestration
- an API gateway
- a mandatory dependency injection container
- a full NestJS replacement

## Graduation criteria

A broader Vii Server framework may be researched only after:

- contracts are validated in real applications
- request scopes are stable
- Node and at least one additional runtime pass compliance tests
- diagnostics work end to end
- security boundaries are documented
- users demonstrate a need beyond adapters
