# Vii HTTP Client

Status: Research

## Purpose

Vii HTTP is a candidate small, typed, Fetch-first transport module for Vii
applications.

It is intentionally separate from Vii Query.

The design goal is to provide the useful ergonomics of Angular HttpClient,
Axios, and small Fetch clients such as Ky while preserving explicit behavior,
runtime portability, cancellation, testability, and Vii diagnostics.

No public HTTP API is accepted by this document. Examples are illustrative and
must pass RFC review before implementation support is claimed.

## Boundary: HTTP is transport, Query is server state

The most important rule is:

```text
Vii Query
  cache
  freshness
  retention
  deduplication
  invalidation
  optimistic state
  mutation lifecycle
        |
        v
Vii HTTP
  request creation
  headers
  query parameters
  body encoding
  response decoding
  middleware
  timeout
  cancellation
  transport errors
        |
        v
Fetch-compatible transport
```

Query may use Vii HTTP, native Fetch, or a user-provided transport. Vii HTTP may
be used without Query.

HTTP must not silently become a second cache or server-state engine.

## Why a Vii HTTP module may be useful

Plain Fetch is a strong web platform primitive, but applications repeatedly need
consistent handling for:

- base URLs;
- headers and authentication;
- query parameter encoding;
- JSON request and response helpers;
- timeouts;
- cancellation;
- typed response decoding;
- request metadata;
- middleware;
- normalized transport errors;
- testing seams;
- diagnostics;
- SSR-safe configuration.

A small Vii module may be justified if it makes these concerns consistent across
Vii Query, forms, server rendering, framework adapters, and Devtools without
creating a large hidden runtime.

## Research inputs

### Angular HttpClient

Useful ideas to evaluate:

- typed request/response APIs;
- functional interceptor chains;
- request metadata through `HttpContext`-style concepts;
- predictable request objects;
- testing utilities;
- Fetch-backed operation in modern environments.

Vii should not copy Angular dependency injection or framework-specific provider
configuration into HTTP Core.

### Axios

Useful ideas to evaluate:

- configured client instances;
- base URL and defaults;
- request-level overrides;
- request and response interceptors;
- method helpers;
- AbortController cancellation;
- normalized response/error ergonomics.

Vii should avoid carrying legacy transport semantics that are unnecessary when a
Fetch-compatible API can satisfy the supported environments.

### Ky

Useful ideas to evaluate:

- a small Fetch-based API;
- configured instances;
- method helpers;
- hooks;
- timeout support;
- response validation;
- modern browser, Node, Bun, and Deno portability.

Vii should not copy automatic retry defaults blindly because retries may belong
at the Query or application layer and duplicate retries can create surprising
network behavior.

## Design principles

### 1. Fetch first

The default transport should be based on the standard Fetch request/response
model where supported.

The Vii API should remain compatible with a replaceable transport contract so
that tests, constrained runtimes, or future platform adapters can substitute a
transport deliberately.

### 2. Small core

HTTP should remain focused on transport. It should not absorb:

- server-state caching;
- global application state;
- GraphQL semantics;
- RPC code generation;
- persistence;
- offline synchronization;
- background queues;
- authorization business rules.

Those concerns belong to Query, application code, integrations, or future
packages when justified.

### 3. Configured clients

Applications should be able to create isolated clients with defaults rather than
mutating process-wide globals.

Illustrative example:

```ts
const api = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 10_000,
});
```

A client instance should be immutable or predictably extendable. Global mutable
defaults should be avoided.

### 4. Request-level overrides

Per-request configuration should override client defaults explicitly.

Conceptually:

```ts
await api.get('/users', {
  timeout: 3_000,
  headers: {
    Accept: 'application/json',
  },
});
```

The final merge rules must be documented and deterministic.

### 5. Functional middleware

Vii should evaluate a functional middleware chain inspired by Angular
interceptors and modern Fetch hooks.

Conceptual shape:

```ts
const auth = httpMiddleware(async (request, next) => {
  return next(request.withHeaders({
    Authorization: `Bearer ${token}`,
  }));
});
```

Possible concerns include:

- authentication headers;
- correlation metadata;
- timing;
- request shaping;
- error mapping;
- explicit retry policy;
- test substitution.

Middleware order must be deterministic and observable.

### 6. Request context is not a header

Applications need metadata that affects middleware without being sent to the
server.

Conceptual example:

```ts
await api.get('/profile', {
  context: {
    auth: 'required',
    retry: 'none',
    trace: true,
  },
});
```

The final API may use typed tokens or another approach to avoid stringly typed
global metadata.

Context must remain local request metadata unless a middleware explicitly maps
it to an outgoing header or body.

### 7. AbortSignal is the cancellation primitive

Cancellation should use `AbortSignal` where the environment supports it.

```ts
const controller = new AbortController();

const request = api.get('/search', {
  signal: controller.signal,
});

controller.abort();
```

Vii should not invent a second cancellation primitive unless evidence proves
that the platform primitive is insufficient.

### 8. Timeout is explicit

Timeout should be implemented as a documented cancellation policy and report a
stable timeout error.

Timeout values must not be hidden inside middleware that users cannot inspect.

### 9. Retries are off by default

Automatic retries can duplicate side effects and interact badly with Query-level
retry policies.

Recommended default:

```text
HTTP retry: none
Query retry: explicit Query policy
HTTP retry middleware: optional and deliberate
```

Any HTTP retry helper must consider:

- idempotency;
- method;
- response status;
- `Retry-After`;
- cancellation;
- total timeout budget;
- duplicate side effects;
- observability.

### 10. Typed transport does not mean trusted data

A TypeScript generic such as `get<User>()` does not validate network input.

Vii should support runtime decoding or validation without requiring one schema
library.

Illustrative approaches:

```ts
const response = await api.get<User>('/users/42');
```

for compile-time typing, and:

```ts
const response = await api.get('/users/42', {
  parse: UserSchema,
});
```

for runtime validation.

The exact API and Standard Schema compatibility require research.

### 11. Stable error categories

The transport should distinguish failure classes rather than exposing one opaque
error shape.

Candidate categories:

```text
HttpStatusError
NetworkError
TimeoutError
AbortError
DecodeError
ConfigurationError
```

The final names are undecided.

Errors should preserve useful safe metadata such as status and method without
including credentials or complete sensitive bodies by default.

### 12. Body handling remains explicit

The API should support common body types without hiding transformations:

- JSON;
- text;
- `FormData`;
- `URLSearchParams`;
- `Blob` / binary data where supported;
- streams where the target runtime supports them.

Large or streaming bodies must not be copied silently for retries or diagnostics.

### 13. Runtime portability

Research should target a common baseline that can be validated across:

- modern browsers;
- Node;
- Bun;
- Deno;
- SSR runtimes where Fetch semantics are available.

A runtime is supported only after dedicated fixtures pass. Documentation must
not infer support from API similarity.

### 14. SSR and request isolation

Server usage requires per-request isolation of:

- authentication state;
- cookies;
- request metadata;
- trace context;
- mutable defaults.

A global client may be safe only when its configuration is immutable and contains
no request-specific secret or authorization state.

### 15. Security defaults

HTTP is a security boundary.

The design must account for:

- credential forwarding across origins;
- SSRF in server environments;
- unsafe redirect handling;
- header injection;
- sensitive diagnostics;
- cookie and credential modes;
- CSRF where cookies are used for authorization;
- untrusted response parsing;
- upload/download limits;
- URL scheme validation;
- secret leakage into client bundles.

Platform-specific protections belong to the appropriate server or runtime layer,
but HTTP must expose enough information to enforce them.

## Illustrative API

A possible small API could resemble:

```ts
const api = createHttpClient({
  baseURL: '/api',
  middleware: [auth(), timing()],
});

const user = await api.get('/users/42', {
  parse: UserSchema,
});

await api.post('/users', {
  json: {
    name: 'Ada',
  },
});
```

This is a design sketch, not an accepted API.

## Query integration

Vii Query should consume a generic request function rather than hard-code Vii
HTTP as a runtime dependency.

Conceptually:

```ts
query({
  key: ['user', userId()],
  fetch: ({ signal }) => api.get(`/users/${userId()}`, { signal }),
});
```

This preserves:

- Query independence;
- user choice of transport;
- cancellation propagation;
- testability;
- smaller package boundaries.

## Form integration

Vii Form submission may call Query mutations, Vii HTTP, Fetch, or application
services.

HTTP does not own form validation state. Form does not own transport internals.

Server field errors may be converted by application code or an optional helper
into structured Form errors.

## Diagnostics

A future Vii diagnostics integration may explain:

- request start and completion;
- method and sanitized route identity;
- duration;
- cancellation reason category;
- timeout;
- middleware stages;
- Query correlation when explicitly provided;
- response status class;
- decode failures.

Diagnostics must not capture by default:

- Authorization headers;
- cookies;
- request or response bodies;
- URL credentials;
- arbitrary query parameters;
- personal data;
- secrets.

Any opt-in body inspection belongs to a separately reviewed development tool,
not the default runtime diagnostics contract.

## Testing strategy

HTTP research requires deterministic tests for:

- request construction;
- URL and query encoding;
- header merge behavior;
- middleware ordering;
- context isolation;
- timeout;
- user cancellation;
- stale/cancelled request behavior;
- response decoding;
- error categories;
- redirects where controlled by the runtime;
- request isolation on server;
- malicious URL/header/body cases;
- packed artifact consumers;
- Node, browser, Bun, and Deno compatibility as those tiers are claimed.

Tests should inject or intercept the transport instead of requiring live external
network access.

## Candidate package boundary

Potential package:

```text
@vii/http
```

The package name is provisional. A package must not be created until the normal
package proposal requirements, consumer evidence, and roadmap trigger exist.

## Graduation criteria

Vii HTTP may move from Research to Planned only after:

- Query's transport boundary is understood well enough to avoid duplication;
- at least one real application demonstrates repeated transport boilerplate;
- the Fetch-first contract works in the initial compatibility matrix;
- cancellation and timeout semantics are deterministic;
- middleware does not create hidden side effects;
- diagnostics can remain useful without leaking sensitive data;
- runtime decoding works without a mandatory schema provider;
- bundle and execution overhead are measured;
- the module provides meaningful value beyond a small local Fetch wrapper or an existing client.

## Primary research references

- Angular HttpClient: https://angular.dev/guide/http
- Angular interceptors: https://angular.dev/guide/http/interceptors
- Axios instances: https://axios-http.com/docs/instance
- Axios cancellation: https://axios-http.com/docs/cancellation
- Ky: https://github.com/sindresorhus/ky
- Fetch standard surface: https://developer.mozilla.org/docs/Web/API/Fetch_API

These are research inputs, not compatibility targets.
