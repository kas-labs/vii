# Vii Server Foundation

Status: Research

## Purpose

Vii Server begins as a framework-neutral foundation for contracts, request scopes, cancellation, validation, diagnostics, security policy, and runtime adapters.

It does not begin as a replacement for established HTTP frameworks.

A possible future Vii Application Framework may build SSR, routing, loaders, server functions, and deployment outputs above these foundations.

See:

- `APPLICATION_FRAMEWORK.md`
- `BUILD_SYSTEM.md`
- `../security/SECURITY_ARCHITECTURE.md`
- RFC 0019
- RFC 0020

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
├── security policy
├── Fetch handler
└── runtime and framework adapters
```

## Core principle

Server application behavior should be portable while transport, runtime, authentication, database, and framework integration remain replaceable.

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

Runtime support still requires dedicated fixtures and capability documentation.

## Request scope

Every request receives an isolated Scope.

A request Scope may own:

- request metadata;
- cancellation signal;
- dependency instances;
- database transaction handle;
- diagnostics context;
- authentication and authorization context;
- temporary resources;
- loader and rendering resources.

Request-scoped State, services, caches, diagnostics, authorization data, and resources must never leak between requests.

The Scope is disposed after completion, cancellation, streaming termination, or unrecoverable failure.

## Contract model

```ts
const getUser = defineContract({
  name: 'users.get',
  method: 'GET',
  path: '/users/:id',
  input: userIdSchema,
  output: userSchema,
  authorization: 'authenticated',
});
```

The exact API remains experimental.

A contract may support:

- server validation;
- authorization metadata;
- typed client generation;
- Query integration;
- mocks;
- tests;
- documentation;
- OpenAPI export;
- diagnostics correlation;
- security review metadata.

## Validation

Client validation improves usability. Server validation is mandatory for untrusted input.

Validation must cover:

- type;
- required fields;
- maximum body, object, collection, and string sizes;
- numeric ranges;
- allowed values;
- Unicode normalization policy;
- semantic and business rules;
- content type.

Validation does not replace parameterized queries, output encoding, authorization, or capability checks.

## Authentication and authorization

Vii Server may provide typed context and middleware contracts, but application policy remains explicit.

Rules:

- authentication is not authorization;
- protected operations check authorization on the server;
- object-level authorization occurs for every protected resource;
- hiding client UI is not a security boundary;
- server functions declare authorization requirements;
- denial responses avoid unnecessary information disclosure.

## Transport independence

A contract is not limited to HTTP.

Potential transports:

- HTTP;
- WebSocket;
- worker messages;
- Tauri commands;
- native bridges;
- local in-process execution.

Transport-specific behavior remains in adapters.

Security, validation, cancellation, authorization, and diagnostics semantics should remain equivalent where the transport supports them.

## SSR foundation

A future application framework may use Server Foundation for:

```text
request
-> isolated Scope
-> route match
-> loader execution
-> server render
-> safe serialization
-> response or stream
-> disposal
```

SSR requirements:

- no process-global mutable application State by default;
- deterministic initial rendering;
- approved HTML-safe serializer;
- only declared hydration values cross to the client;
- server secrets and capabilities never serialize;
- browser-only APIs do not execute unguarded on the server;
- request cancellation reaches loaders and resources;
- streaming resources are disposed on disconnect.

## Safe serialization

Hydration data should be embedded as non-executable, schema-versioned data rather than generated JavaScript source.

The serializer must protect HTML parser boundaries and reject unsupported values, secrets, capability handles, and opaque security types.

## CSRF and cookies

Cookie-authenticated state-changing requests should support:

- CSRF token validation;
- `Origin` validation;
- Fetch Metadata checks;
- secure content-type policy;
- session binding;
- `HttpOnly`, `Secure`, and appropriate `SameSite` defaults;
- `__Host-` prefixes where applicable.

State-changing `GET` requests are not supported by default.

## Server fetch and SSRF

Untrusted URLs must not enter unrestricted server fetch.

Preferred named service:

```ts
const githubApi = defineHttpService({
  origins: ['https://api.github.com'],
});
```

Policies may constrain:

- scheme;
- origin;
- DNS and IP range;
- loopback, private, and link-local access;
- redirects;
- method and headers;
- credential forwarding;
- timeout;
- response size.

## Command and filesystem capabilities

Server code should receive explicit, scoped capabilities rather than ambient unrestricted authority.

Command execution:

```ts
command.run('git', ['status'], {
  shell: false,
});
```

Filesystem access:

```ts
const uploads = filesystem.scope('/app/uploads', {
  read: true,
  write: false,
});
```

Capability contracts do not replace host permissions. They provide visible authority, policy, testing, and diagnostics.

## Data access guidance

Database integrations should promote parameterized operations.

Dynamic identifiers, sort directions, and query operators use validated allowlists.

Request objects are not forwarded directly as NoSQL filters.

Vii Server does not become an ORM.

## File uploads

Server helpers may standardize:

- request and file size limits;
- extension allowlists;
- MIME and content inspection;
- generated storage names;
- root-confined isolated storage;
- antivirus or sandbox integration points;
- archive traversal protection;
- safe response headers.

No file is assumed safe because of its extension or browser-provided content type.

## Initial integrations

Research integrations may include:

```text
@vii-labs/fastify
@vii-labs/hono
@vii-labs/nest
```

Only integrations with real consumers, security review, and compliance tests should become official packages.

## Runtime adapters

Potential packages:

```text
@vii-labs/server-node
@vii-labs/server-bun
@vii-labs/server-deno
@vii-labs/server-fetch
```

Node.js is the first reference runtime.

Bun, Deno, workers, and edge environments remain lower tiers until dedicated compatibility and malicious fixtures are stable.

## Application Framework relationship

The Server Foundation does not itself define:

- file-based routing;
- layouts;
- SSR route rules;
- hydration entries;
- SSG or ISR;
- client asset manifests;
- deployment presets.

Those concerns belong to the possible Vii Application Framework described in `APPLICATION_FRAMEWORK.md`.

## Diagnostics

A request should preserve causal context across:

```text
client action
-> mutation
-> transport
-> server contract
-> validation and authorization
-> handler
-> data access
-> response
-> cache update
```

Production-safe diagnostics avoid capturing secrets, cookies, authorization headers, form bodies, response bodies, database values, and full malicious payloads by default.

Security events use structured schemas and stable codes.

## Structured errors

Server errors use stable codes and explicit recoverability metadata.

Transport adapters map errors to protocol-specific responses without exposing internal stacks, secrets, queries, or filesystem paths in production.

## Security headers

Future SSR adapters should support typed generation of:

- Content Security Policy;
- Trusted Types directives;
- frame restrictions;
- content type protection;
- referrer policy;
- permissions policy;
- cache policy appropriate to authentication and content.

Configuration must not imply that one header replaces safe rendering or authorization.

## Out of scope

The first Server Foundation does not include:

- a new ORM;
- a database engine;
- a hosted authentication service;
- payment processing;
- deployment orchestration;
- an API gateway;
- a mandatory dependency injection container;
- a full NestJS replacement;
- a complete Next.js or Nuxt replacement;
- universal plugin sandboxing.

## Graduation criteria

A broader Vii Server or Application Framework may be researched further only after:

- contracts are validated in real applications;
- request Scopes are stable;
- Node and at least one additional runtime pass compatibility tests;
- diagnostics work end to end;
- validation and authorization boundaries are demonstrated;
- cross-request isolation passes concurrency tests;
- malicious input, SSRF, CSRF, path, serialization, and upload fixtures pass;
- security boundaries are documented;
- users demonstrate a need beyond adapters.
