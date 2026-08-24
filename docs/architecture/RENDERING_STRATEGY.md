# Vii Rendering Strategy

Status: Research

## Purpose

Vii should support modern rendering capabilities without forcing every application to pay the architectural and cognitive cost of server rendering.

The default design principle is:

> Rendering complexity is opt-in.

A Vii application should remain understandable as a client application unless the developer explicitly chooses static generation, server rendering, streaming, or another server-assisted mode.

## Core position

Vii does not treat SSR as the default architecture for all applications.

The preferred progression is:

```text
CSR
  -> optional prerender / SSG
  -> optional SSR + hydration
  -> optional streaming / hybrid rendering
  -> optional partial hydration / islands research
  -> optional resumability research
  -> optional typed server functions only when evidence justifies them
```

The ordering is intentional. Partial hydration, islands, and resumability must not become prerequisites for correct basic SSR/hydration.

A project may remain at CSR permanently and still use the Vii State, Form, Query, HTTP, Router, UI, diagnostics, and framework-adapter ecosystem.

## Why CSR is the baseline

CSR keeps the execution model simple:

```text
Browser UI
  -> HTTP / transport boundary
  -> Backend API
```

This is especially appropriate for authenticated dashboards, enterprise applications, highly interactive tools, desktop shells, and applications where SEO and initial server HTML are not primary requirements.

CSR users should not need to understand hydration, request scopes, server-only modules, streaming, or edge runtimes.

## Why SSR still exists

SSR can provide real value for public product and content pages, documentation, marketing pages, blogs, news, and pages that need current server data and indexable HTML.

SSR is therefore a rendering option, not a universal recommendation.

## Rendering modes

Vii may research the following modes independently.

### Client

```text
request
-> HTML shell
-> client bundle
-> client render
```

### Static

```text
build
-> HTML files
-> CDN / static hosting
```

### Server

```text
request
-> request Scope
-> route and data loading
-> server render
-> HTML
-> hydration only where interaction requires it
```

### Streaming

```text
request
-> shell
-> progressive server regions
-> hydration boundaries
```

### Hybrid

Different routes may choose different rendering policies.

Illustrative syntax only:

```ts
defineRoutes([
  route('/', Home, { render: 'static' }),
  route('/products/:id', Product, { render: 'server' }),
  route('/dashboard', Dashboard, { render: 'client' }),
]);
```

The exact public API requires RFC and prototype evidence.

## Explicit environment boundaries

Vii should make execution location visible rather than infer it through surprising runtime behavior.

Conceptual environments:

```text
shared
client
server
build
edge (optional research)
```

Potential source conventions may include:

```text
user.shared.ts
user.client.ts
user.server.ts
```

or explicit compiler metadata. The exact syntax remains Research.

The build/compiler layer must reject invalid dependency edges before runtime where practical.

Examples:

```text
client -> server secret        reject
client -> node:fs              reject
server -> unconditional window reject
edge -> Node-only package      reject
```

Diagnostics should identify the import chain and environment boundary that caused the violation.

## SSR is presentation infrastructure

A Vii server-rendering layer must not automatically become the application's domain backend.

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

The application backend may be implemented with NestJS, Fastify, Spring, .NET, Go, Rust, Laravel, Rails, or another stack.

Vii must not require applications to move domain logic, database ownership, authentication authority, transactions, queues, or other backend responsibilities into the frontend framework merely to use SSR.

## Server functions

Typed server functions may be researched later, but they must remain visibly remote operations.

They must not pretend that a network boundary is a normal local function call.

Any server-function design must preserve visible semantics for serialization, authentication and authorization, latency, cancellation, failure, retries, observability, and security policy.

Diagnostics should be able to show the client-to-server boundary explicitly.

A route guard or client/navigation authorization check is not sufficient authorization for an independently callable server function. Authorization must be enforced at the remote boundary that reads or mutates protected data.

## Hydration cost rule

Hydration is not free.

An SSR feature must justify additional complexity in dual server/client execution, serialization, mismatch handling, lifecycle ownership, browser-only and server-only APIs, bundle size, memory, testing, and security.

Vii should prefer the smallest hydration boundary that preserves required interactivity.

## Partial hydration and islands research

Partial hydration or islands may be researched only after basic SSR/hydration behavior is correct, deterministic, secure, and measurable.

The research question is not whether islands are fashionable. It is whether reducing hydrated client work produces a meaningful user benefit for Vii applications without fragmenting ownership, State, Scope, Query, routing, or diagnostics semantics.

Required comparisons must include:

- shipped client JavaScript;
- hydration CPU time;
- interaction readiness;
- memory retained before and after interaction;
- boundary serialization cost;
- number of runtime roots/scopes;
- complexity of cross-boundary state and events;
- development and TypeScript compiler cost.

Decision: Research only.

## Resumability research

Qwik demonstrates that a framework can serialize enough execution metadata and application state to resume in the browser without replaying ordinary hydration.

Vii should treat this as an advanced research direction, not a current rendering assumption.

Resumability changes or constrains:

- Component IR;
- closure capture and serializability;
- event dispatch;
- build chunking;
- State representation;
- server/client transfer format;
- compiler analysis;
- developer authoring rules.

Therefore resumability may advance only when:

1. basic SSR and hydration are already correct and measured;
2. the native Component IR exists and can express execution boundaries;
3. serialization contracts are versioned and secure;
4. measured startup or memory gains are materially better than simpler partial-hydration approaches;
5. CSR-only applications pay no runtime or bundle cost for the capability;
6. the programming model remains understandable enough to satisfy Vii's observability goals.

The key transferable lesson from Qwik is adopted earlier than resumability itself:

> Heap identity is not a portable server-to-client contract.

Any value that crosses a server/client continuation boundary requires an explicit representation.

## Execution-aware code splitting

Future Component IR may expose enough structure for the build system to split code by behavior rather than only by source module.

Conceptual research shape:

```text
Component IR
  |- render dependencies
  |- event behaviors
  |- effects/tasks
  |- async boundaries
  `- environment requirements
         |
         v
execution-aware chunk graph
```

This is a compiler/build optimization, not a Core semantic. It should advance only after comparison with ordinary module-level code splitting demonstrates measurable bundle or interaction improvements.

## Progressive complexity rule

Each rendering level must be independently understandable.

```text
Level 0  Vii Core and modules
Level 1  CSR
Level 2  Static generation / prerender
Level 3  SSR + hydration
Level 4  Streaming / hybrid rendering
Level 5  Partial hydration / islands research
Level 6  Resumability research
Level 7  Advanced server functions and full-stack conveniences
```

Using Level 1 must not require learning Level 3 through Level 7 concepts.

## Default and opt-in rules

- CSR is the baseline native application mode.
- SSG/prerender is opt-in.
- SSR is opt-in.
- hydration exists only where SSR output becomes interactive.
- streaming is opt-in and requires measured value.
- partial hydration/islands remain research until basic hydration evidence exists.
- resumability is not a default or prerequisite for Vii SSR.
- edge runtime support is not assumed.
- server functions are not required to use Vii applications.
- no rendering mode may silently enable hidden data caching.
- no server-rendering mode may silently absorb backend domain ownership.
- no advanced rendering mode may add runtime/bundle cost to CSR-only applications merely by existing in the ecosystem.

## Evidence requirements

A rendering capability advances only when reference applications demonstrate:

- correct lifecycle and request isolation;
- deterministic server/client output where required;
- safe serialization;
- no secret leakage into client artifacts or hydration payloads;
- measurable initial-render benefit for the target use case;
- acceptable client bundle, server memory, and runtime cost;
- clear diagnostics for environment-boundary errors;
- understandable developer experience compared with the simpler rendering level below it.

Advanced rendering research must additionally measure serialization size, parse cost, lazy-chunk count, interaction-triggered network work, retained closures/state, and the amount of application JavaScript avoided or deferred.

## Stop rule

Vii should not add or advance a rendering mode when:

- the measured user benefit does not justify its complexity;
- CSR or static output solves the validated need;
- hydration or environment-boundary behavior remains confusing;
- security and request isolation cannot meet Vii requirements;
- the feature turns Vii into an unnecessary replacement for an application's backend architecture;
- an advanced model requires broad Component IR or authoring constraints for marginal startup gains;
- serialization overhead cancels the JavaScript/runtime work saved;
- the capability increases common-case bundle, memory, or TypeScript cost for applications that do not use it.

## Relationship to the application framework

The future Vii Application Framework coordinates rendering modes but does not make server rendering mandatory.

See:

- `docs/architecture/APPLICATION_FRAMEWORK.md`
- `docs/architecture/BUILD_SYSTEM.md`
- `docs/architecture/SERVER_FOUNDATION.md`
- `docs/architecture/CROSS_FRAMEWORK_DEEP_RESEARCH.md`
- `docs/quality/TEST_STRATEGY.md`
