# RFC 0019: Application Framework and Build System Direction

Status: Proposed

## Summary

Define the long-term direction for a possible Vii application framework with routing, layouts, SSR, hydration, SSG, streaming, hybrid route rules, server functions, and a replaceable build-engine architecture.

The initial build recommendation is a Vii-owned compiler and orchestration layer using Vite and Rolldown rather than a new general-purpose bundler.

## Motivation

A native component runtime alone does not provide a complete application experience.

Developers value Next.js and Nuxt because they combine routing, server rendering, data loading, conventions, build tooling, and deployment outputs.

Vii needs a coherent future direction without prematurely committing to a full framework or hosting platform.

## Goals

- Separate Vii Core, UI Runtime, and Application Framework.
- Support explicit client, static, server, incremental, streaming, and hybrid rendering.
- Support file-based and explicit routes.
- Define server/client module boundaries.
- Preserve request scopes and cancellation.
- Use explicit cache and route rules.
- Own Component IR, route graph, environment graph, manifests, and diagnostics.
- Use replaceable bundler engines.
- Start with Vite/Rolldown.
- Support optional Bun, Rspack, Webpack, and Nx integrations later.
- Keep normal commands stable across engines.

## Non-goals

- Shipping this framework during State Alpha.
- Cloning Next.js or Nuxt feature-for-feature.
- Implementing React Server Components.
- Creating a proprietary hosting service.
- Writing a complete JavaScript bundler before framework validation.
- Requiring Nx or Bun.
- Promising edge support without fixtures.

## Detailed design

### Layering

```text
Vii App
├── router
├── layouts
├── rendering rules
├── loaders and actions
├── server/client boundaries
├── SSR and hydration
└── deployment manifests
        │
        v
Vii Web + Server + Query + Build
        │
        v
State + Scope + Resources + Diagnostics
```

### Route rules

Illustrative configuration:

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
      '/editor/**': { mode: 'client' },
    },
  },
});
```

Caching behavior must be explicit and inspectable.

### SSR

```text
request
-> isolated Scope
-> route match
-> validation and loaders
-> server render
-> safe serialization
-> response and assets
-> hydration where required
-> disposal
```

### Build architecture

```text
Vii source
-> Vii compiler
-> Component IR
-> client/server target transforms
-> Vii build graph and manifests
-> engine adapter
-> Vite/Rolldown initially
```

### User-facing commands

```bash
vii dev
vii build
vii preview
vii analyze
```

### Engines

```text
Vite/Rolldown default research engine
Rspack optional enterprise engine
Bun optional runtime and build adapter
Webpack legacy integration
Turbopack architectural reference only
```

### Nx

`@vii-labs/nx` consumes the same build and generator engine.

It may provide task inference, generators, project graph metadata, affected execution, and migrations.

Vii remains independently usable.

## Public API impact

Potential future packages:

```text
@vii-labs/app
@vii-labs/router
@vii-labs/web
@vii-labs/server
@vii-labs/build-core
@vii-labs/build-vite
@vii-labs/nx
```

No package is created until implementation need, owner, consumer, tests, and lifecycle plan exist.

## Compatibility

- Node is the first server reference target.
- Browser and Node begin as Tier 1 when implemented.
- Bun, Deno, workers, Rspack, and other adapters require dedicated fixtures.
- Engine differences must not change component, State, route, or security semantics.

## Diagnostics and observability

The system should explain:

- route matching;
- rendering mode selection;
- loader and cache decisions;
- client/server graph classification;
- compilation and invalidation;
- HMR boundaries;
- hydration mismatches;
- build output composition;
- request and resource disposal.

## Security and privacy

Required foundations:

- strict template sinks;
- safe SSR serialization;
- server/client secret checks;
- CSP and Trusted Types integration;
- request validation;
- CSRF and secure cookie defaults;
- SSRF-resistant fetch policies;
- no code-string execution;
- plugin and build permission review;
- no telemetry or source upload by default.

## Alternatives

### Build directly on Bun

Useful as an optional adapter, but rejected as the mandatory foundation because it would impose one runtime and provide a narrower framework ecosystem path.

### Build directly on Webpack

Rejected for the default path due to configuration and maintenance weight. Kept as a compatibility target.

### Write a new bundler first

Rejected because it delays validation of Vii-specific value and recreates a large independent product.

### Use Turbopack

Rejected as a dependency because it is closely coupled to Next.js architecture.

### Expose Vite directly as the product API

Rejected because Vii needs stable framework commands, graphs, manifests, and security contracts that can outlive one engine.

## Risks

- framework scope may distract from State and adapter validation;
- build abstraction may become too generic;
- SSR introduces large security and correctness requirements;
- Vite or Rolldown evolution may require adapter maintenance;
- multiple engines may fragment behavior if compliance tests are weak.

## Migration

No current user migration is required.

Future projects should keep `vii dev` and `vii build` stable while engine migrations are handled through configuration and CLI migrations.

## Validation plan

- compile a native SFC client application;
- build server and client graphs;
- render and hydrate one SSR route;
- generate one static route;
- verify request isolation;
- measure build time, memory, bundle size, and runtime memory;
- test HMR and source maps;
- reject client/server boundary violations;
- test malicious SSR payloads;
- prototype Nx task inference without requiring Nx for standalone use.

## Unresolved questions

- exact route manifest format;
- first supported deployment adapters;
- cache contract for incremental regeneration;
- partial hydration versus full hydration sequence;
- direct Rolldown integration timing;
- whether Rspack is the first secondary engine;
- final package naming.
