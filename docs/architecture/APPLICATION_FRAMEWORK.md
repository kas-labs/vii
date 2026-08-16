# Vii Application Framework

Status: Vision with Research contracts

## Purpose

This document defines the long-term direction for a possible Vii application framework built above the proven Vii foundations.

The application framework is not part of State Alpha and is not a near-term replacement for Next.js, Nuxt, Angular, or existing Vite applications.

Its purpose is to define how a future Vii-native stack could combine:

- components;
- routing;
- layouts;
- data loading;
- explicit client and server boundaries;
- client-side rendering as the baseline application mode;
- optional SSR and SSG;
- optional streaming and hybrid route rules;
- optional server functions;
- deployment adapters.

The controlling rendering principle is:

> Rendering complexity is opt-in.

A developer who chooses CSR must not need to understand hydration, request scopes, streaming, server-only modules, or edge runtimes.

## Layering

```text
Vii Application Framework
├── @vii/app
├── @vii/router
├── @vii/web
├── @vii/server
├── @vii/query
└── @vii/build
        │
        v
Vii Core Foundations
├── State
├── Scope and Resources
├── Diagnostics
├── Contracts
└── Platform Capabilities
```

The application framework coordinates existing layers. It must not redefine their semantics.

## Lessons adopted

From Next.js:

- file-based routes;
- nested layouts;
- explicit server and client boundaries;
- route-level loading and error UI;
- streaming;
- server-side data loading;
- static generation;
- prefetching;
- metadata generation.

From Nuxt:

- clear project conventions;
- hybrid route rules;
- deployment and runtime presets;
- server-engine separation;
- middleware and plugins;
- route-level SSR, SSG, ISR, and client-only choices.

Vii should not copy React Server Components protocol, opaque caching behavior, hidden auto-imports, renderer-specific assumptions, or a full-stack model that silently turns presentation code into the application backend.

## Rendering philosophy

Vii starts from the simplest useful execution model and adds rendering capabilities progressively:

```text
CSR
  -> optional prerender / SSG
  -> optional SSR + hydration
  -> optional streaming / hybrid rendering
  -> optional typed server functions only when evidence justifies them
```

An application may remain CSR permanently and still use Vii State, Form, Query, HTTP, Router, UI, diagnostics, and framework adapters.

SSR is a presentation capability. It is not a requirement for Vii applications and it does not imply that Vii owns the application's domain backend.

See `docs/architecture/RENDERING_STRATEGY.md`.

## Rendering modes

### Client-side rendering

CSR is the baseline native application mode.

```text
request
-> minimal HTML shell
-> client bundle
-> application render
```

Useful for:

- authenticated dashboards;
- enterprise applications;
- local tools;
- highly interactive applications;
- desktop shells;
- applications where SEO and initial server HTML are not primary requirements.

CSR users should not need server-rendering concepts in normal development.

### Static generation

HTML is generated during build.

Useful for:

- documentation;
- marketing pages;
- blogs;
- content that changes only on deployment.

Static generation is opt-in and must not force a server runtime into deployment output.

### Server-side rendering

SSR is opt-in. HTML is generated for a request.

```text
request
-> request Scope
-> route match
-> data loading
-> server render
-> HTML response
-> hydration only where required
```

Useful for:

- personalized public pages;
- frequently changing public content;
- pages that need current data and indexable HTML.

An SSR route must justify the additional lifecycle, serialization, hydration, testing, memory, and security cost over CSR or static output.

### Incremental regeneration

A generated response may be cached and refreshed according to an explicit policy.

Vii must avoid unspecified or surprising caching. Cache ownership, key, freshness, invalidation, and runtime support must be visible.

### Streaming

Streaming is opt-in and requires evidence that it improves the target user experience.

The server may emit the application shell and resolved regions incrementally.

Streaming requires:

- deterministic request scopes;
- cancellation;
- error isolation;
- stable serialization;
- backpressure support;
- security headers before body streaming;
- diagnostics correlation.

### Hybrid rendering

Different routes may choose different modes explicitly.

```ts
export default defineApp({
  rendering: {
    default: 'client',

    rules: {
      '/': { mode: 'static' },
      '/docs/**': { mode: 'static' },
      '/products/**': { mode: 'server' },
      '/dashboard/**': { mode: 'client' },
      '/editor/**': { mode: 'client' },
    },
  },
});
```

The exact API is illustrative. The important contract is that server rendering is selected, not silently assumed.

## SSR mental model

SSR is not one feature. It coordinates:

```text
route matching
+ request scope
+ server data loading
+ server rendering
+ serialization
+ client asset selection
+ hydration where required
+ security headers
+ disposal
```

A component rendered on the server may produce HTML without shipping all of its implementation JavaScript to the browser.

Interactive regions require client code and an explicit hydration boundary.

The framework must expose this complexity rather than pretending server and browser execution are identical.

## Hydration

Hydration connects server-produced HTML to client state, event handlers, and reactive bindings.

Rules:

- server and client initial output must be deterministic;
- hydration payloads use the approved serializer;
- payloads are schema-versioned;
- browser-only APIs do not execute during server render;
- server-only capabilities and secrets do not enter the client graph;
- mismatch diagnostics identify the source boundary;
- hydration must not evaluate strings as code;
- hydration should be limited to interactive regions where practical.

Vii may research partial hydration, islands, or resumability only after basic hydration is correct, secure, understandable, and measurable.

## Server and client boundaries

Execution location must be visible and compiler-checkable.

Conceptual environments are:

```text
shared
client
server
build
edge (optional research)
```

Potential source conventions include:

```text
user.shared.ts
user.client.ts
user.server.ts
```

Candidate explicit markers may also be researched:

```ts
import 'vii:server-only';
```

```ts
import 'vii:client-only';
```

Or component metadata:

```ts
export default component({
  runtime: 'client',
});
```

The exact syntax requires RFC and prototype evidence.

The build system must reject invalid imports before runtime where practical, including:

- client modules importing database access or server secrets;
- client modules importing Node-only capabilities such as `node:fs`;
- unconditional browser globals in server modules;
- Node-only packages in edge builds.

Diagnostics must identify the offending import chain and environment boundary.

## SSR and backend ownership

A Vii server-rendering layer is presentation infrastructure by default.

Recommended architecture:

```text
Browser
   ^
   | HTML / hydration
   |
Vii presentation server (optional)
   |
   | typed HTTP / service boundary
   v
Application backend
   |
Domain / database / queues / integrations
```

The backend may use NestJS, Fastify, Spring, .NET, Go, Rust, Laravel, Rails, or another stack.

Using Vii SSR must not require applications to move domain logic, database ownership, authentication authority, transactions, queues, or other backend responsibilities into Vii.

A full-stack deployment may be convenient for a small application, but convenience must not erase architectural boundaries.

## Routing

Vii should support two route declaration modes.

### File-based routes

```text
src/routes/
├── index.vii
├── about.vii
├── products/
│   ├── index.vii
│   └── [id].vii
└── dashboard/
    ├── layout.vii
    ├── index.vii
    ├── loading.vii
    └── error.vii
```

### Explicit routes

```ts
export const routes = defineRoutes([
  route('/', HomePage),
  route('/users/:id', UserPage),
]);
```

Both forms compile to one route graph.

## Layouts

Layouts provide shared route structure and scoped services.

A layout may own:

- navigation UI;
- route-level state;
- authentication context;
- query boundaries;
- loading and error boundaries;
- resources disposed when leaving the layout tree.

## Data loading

Server route loaders should be explicit and typed.

```ts
export const load = defineLoader({
  input: paramsSchema,

  async run({ params, request, signal, scope }) {
    return users.get(params.id, { signal });
  },
});
```

Data-loading rules:

- server validation is mandatory;
- cancellation uses `AbortSignal`;
- request scope owns temporary resources;
- cache policy is explicit;
- returned values are serializable according to declared schema;
- secrets are rejected from hydration payloads.

## Server functions

A server function is a typed remote boundary, not a normal local function that is silently moved across environments.

```ts
export const updateProfile = defineServerAction({
  input: profileSchema,
  output: userSchema,
  authorization: 'authenticated',

  async run(input, context) {
    return context.users.update(context.user.id, input);
  },
});
```

The compiler may generate a client call, but the boundary must remain visible in source, diagnostics, authorization policy, and generated manifests.

A server-function design must preserve visible network semantics for:

- serialization;
- authentication and authorization;
- latency;
- cancellation;
- failure;
- retries;
- diagnostics and tracing.

Server functions are an advanced opt-in capability and are not required for Vii applications.

## Project structure

Conventional route-oriented project:

```text
src/
├── app.vii
├── routes/
├── components/
├── layouts/
├── middleware/
├── features/
├── server/
│   ├── routes/
│   ├── services/
│   └── middleware/
└── vii.config.ts
```

Feature-oriented project:

```text
src/
├── app/
├── features/
│   ├── users/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── users.store.ts
│   │   ├── users.server.ts
│   │   └── users.routes.ts
│   └── billing/
└── main.ts
```

Vii conventions should assist navigation without making one directory layout a runtime requirement.

## Middleware

Middleware must declare environment and responsibility.

Examples:

```text
request middleware
authentication middleware
route middleware
response header middleware
client navigation guard
```

Middleware must not become an untyped global chain. Order, scope, cancellation, and error behavior require explicit contracts.

## Metadata

Pages and layouts may produce typed metadata:

```ts
export const metadata = defineMetadata({
  title: 'Vii Documentation',
  description: 'Observable TypeScript foundations.',
});
```

Dynamic metadata executes in the appropriate server or static build context and must follow escaping and URL policies.

## Runtime adapters

The application framework targets adapters rather than one hosting vendor.

Potential targets:

```text
Node
Bun
Deno
Fetch-compatible workers
serverless functions
static output
Tauri local server or command bridge
```

A target becomes supported only after dedicated fixtures and compatibility tests exist.

## Security baseline

The application framework must provide:

- context-aware escaping;
- safe SSR serialization;
- strict client and server import boundaries;
- CSP and Trusted Types integration;
- secure cookies;
- CSRF protection for cookie-authenticated mutations;
- request body limits;
- schema validation;
- origin validation;
- SSRF-resistant server fetch policies;
- no hidden execution of user-controlled strings;
- request-scoped security diagnostics.

See `docs/security/SECURITY_ARCHITECTURE.md`.

## Build relationship

The application framework defines:

- route graph;
- environment graph;
- server/client boundaries;
- hydration entries;
- asset manifests;
- deployment output contracts.

The build engine performs module resolution, transformations, bundling, splitting, and optimization.

See `docs/architecture/BUILD_SYSTEM.md`.

## CLI

Candidate commands:

```bash
vii create app my-app
vii generate page users
vii generate route users/[id]
vii generate layout dashboard
vii generate middleware auth
vii generate server-route users
vii dev
vii build
vii preview
```

Generators use the common CLI analysis, plan, preview, apply, validate, and report lifecycle.

## Non-goals for initial research

- cloning every Next.js or Nuxt feature;
- a proprietary hosting platform;
- a custom database or ORM;
- hidden data caching;
- mandatory server rendering;
- making SSR the default for every route;
- requiring a Vii-owned backend to use Vii SSR;
- hiding client/server execution boundaries;
- React Server Components compatibility;
- production edge support before fixtures exist;
- a universal native mobile renderer.

## Graduation criteria

The application framework may become Planned only when:

- the native component model is validated;
- CSR works as an independently understandable baseline;
- SSR and hydration work in a reference application without making them mandatory;
- request isolation and disposal are demonstrated;
- build output is portable across Node and one additional target;
- route rendering rules are explicit and testable;
- environment-boundary diagnostics fail invalid imports before runtime where practical;
- security requirements pass malicious fixtures;
- client bundle, server memory, hydration, and runtime budgets are measured;
- SSR or streaming prototypes demonstrate measured value over the simpler rendering mode below them;
- the framework offers a clear benefit over Vii adapters in existing frameworks.
