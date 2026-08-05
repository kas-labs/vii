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
- client and server boundaries;
- SSR;
- SSG;
- streaming;
- hybrid route rules;
- server functions;
- deployment adapters.

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
- server and client boundaries;
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

Vii should not copy React Server Components protocol, opaque caching behavior, hidden auto-imports, or renderer-specific assumptions.

## Rendering modes

### Client-side rendering

```text
request
-> minimal HTML shell
-> client bundle
-> application render
```

Useful for:

- local tools;
- highly interactive authenticated applications;
- desktop shells;
- applications where SEO and initial HTML are not priorities.

### Static generation

HTML is generated during build.

Useful for:

- documentation;
- marketing pages;
- blogs;
- content that changes only on deployment.

### Server-side rendering

HTML is generated for a request.

```text
request
-> request scope
-> route match
-> data loading
-> server render
-> HTML response
-> client hydration where required
```

Useful for:

- personalized pages;
- frequently changing public content;
- pages that need current data and indexable HTML.

### Incremental regeneration

A generated response may be cached and refreshed according to an explicit policy.

Vii must avoid unspecified or surprising caching. Cache ownership, key, freshness, invalidation, and runtime support must be visible.

### Streaming

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

Different routes may choose different modes.

```ts
export default defineApp({
  rendering: {
    default: 'server',

    rules: {
      '/': { mode: 'static' },
      '/docs/**': { mode: 'static' },
      '/products/**': {
        mode: 'isr',
        revalidate: '5m',
      },
      '/dashboard/**': {
        mode: 'server',
        auth: true,
      },
      '/editor/**': {
        mode: 'client',
      },
    },
  },
});
```

The exact API is illustrative.

## SSR mental model

SSR is not one feature. It coordinates:

```text
route matching
+ request scope
+ server data loading
+ server rendering
+ serialization
+ client asset selection
+ hydration or resumable bindings
+ security headers
+ disposal
```

A component rendered on the server may produce HTML without shipping all of its implementation JavaScript to the browser.

Interactive regions require client code and an explicit hydration boundary.

## Hydration

Hydration connects server-produced HTML to client state, event handlers, and reactive bindings.

Rules:

- server and client initial output must be deterministic;
- hydration payloads use the approved serializer;
- payloads are schema-versioned;
- browser-only APIs do not execute during server render;
- server-only capabilities and secrets do not enter the client graph;
- mismatch diagnostics identify the source boundary;
- hydration must not evaluate strings as code.

Vii may research partial hydration, islands, or resumability after basic hydration is correct and measurable.

## Server and client boundaries

Candidate explicit markers:

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

The build system must reject invalid imports such as a client component importing database access or server environment secrets.

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

A server function is a typed remote boundary, not a normal function that is silently moved across environments.

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
- React Server Components compatibility;
- production edge support before fixtures exist;
- a universal native mobile renderer.

## Graduation criteria

The application framework may become Planned only when:

- the native component model is validated;
- SSR and hydration work in a reference application;
- request isolation and disposal are demonstrated;
- build output is portable across Node and one additional target;
- route rules are explicit and testable;
- security requirements pass malicious fixtures;
- client bundle and memory budgets are measured;
- the framework offers a clear benefit over Vii adapters in existing frameworks.
