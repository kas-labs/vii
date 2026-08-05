# Vii Build System

Status: Research

## Purpose

This document defines how a future Vii-native component and application framework should compile source, run a development server, build production artifacts, and support multiple deployment environments.

Vii should own the framework-specific build contract without immediately building a complete JavaScript bundler from scratch.

> Vii owns component compilation and build orchestration. A replaceable engine performs general-purpose bundling.

## Distinct responsibilities

The build system separates:

```text
Compiler
  parses and transforms Vii source

Bundler
  resolves modules, builds graphs, splits chunks, and emits assets

Development server
  serves modules, watches files, and coordinates HMR

Type checker
  validates TypeScript semantics and declarations

Vii CLI
  provides one user-facing workflow and diagnostics
```

These responsibilities may share caches and graphs, but their contracts remain visible.

## Initial engine recommendation

The first native Vii build prototype should use:

```text
TypeScript Vii compiler
+ Vite development server and plugin API
+ Rolldown production bundling
+ separate TypeScript type checking
```

Reasons:

- fast development startup and HMR;
- framework-oriented plugin model;
- support for client and server environments;
- mature asset and CSS handling;
- a path to direct Rolldown integration later;
- less infrastructure risk than a new bundler;
- replaceable engine behind Vii commands.

## Engine position

Potential engines:

```text
Vite / Rolldown   default research engine
Rspack            optional enterprise and Webpack migration target
Bun               optional runtime and build target
Webpack           legacy integration target
Turbopack         architectural reference, not a dependency
```

Turbopack is tightly coupled to Next.js semantics and should not become Vii infrastructure.

## User-facing commands

Developers interact with Vii rather than the underlying engine:

```bash
vii dev
vii build
vii preview
vii analyze
vii check
```

The engine is configuration, not the primary product API.

```ts
export default defineConfig({
  build: {
    engine: 'vite',
  },
});
```

This permits engine replacement without changing normal project commands.

## Package model

Candidate packages:

```text
@vii/compiler-core
@vii/compiler-sfc
@vii/compiler-template
@vii/build-core
@vii/build-vite
@vii/build-rspack
@vii/build-bun
@vii/cli-core
@vii/cli
```

Only packages backed by implementation need and owners should be created.

## Compiler pipeline

```text
Component source
  -> source scanner
  -> script, template, and style parsers
  -> semantic validation
  -> Component IR
  -> target transforms
  -> client module
  -> server module
  -> CSS asset
  -> hydration metadata
  -> source maps and diagnostics
```

The compiler must preserve source locations through every transform.

## Component IR relationship

The Component IR is owned by Vii, not by Vite, Rolldown, Bun, or Rspack.

The IR contains framework semantics such as:

- reactive bindings;
- event bindings;
- component boundaries;
- scopes and resource ownership;
- server and client classification;
- hydration data;
- accessibility warnings;
- security sink types;
- style scoping;
- diagnostic source maps.

Bundler engines receive generated modules and assets.

## Build Core contract

Illustrative engine contract:

```ts
export interface ViiBuildEngine {
  dev(options: DevOptions): Promise<DevServer>;
  build(options: BuildOptions): Promise<BuildResult>;
  watch(options: WatchOptions): Promise<BuildWatcher>;
  preview(options: PreviewOptions): Promise<PreviewServer>;
}
```

Framework configuration, route graph, environment graph, manifests, and diagnostics should be defined by `@vii/build-core`.

## Environment graph

The framework may build multiple related graphs:

```text
Client graph
├── interactive components
├── hydration entries
├── browser assets
└── CSS

Server graph
├── routes
├── loaders
├── server components
├── middleware
└── HTML renderer

Optional edge graph
├── portable routes
├── worker entry
└── restricted capabilities
```

A shared source module may appear in more than one graph only when its imports and capabilities are valid for each environment.

## Import boundary checks

The build system must reject:

- server secrets imported by client entries;
- filesystem or process capabilities in browser code;
- browser globals in unconditional server code;
- Node-only packages in edge builds;
- client-only components used as server-only implementation without an explicit boundary;
- dynamic code generation that violates security policy.

These checks should use stable diagnostic codes.

## Development server

The development server coordinates:

- source transformation;
- route discovery;
- client and server module graphs;
- SSR requests;
- HMR;
- overlay diagnostics;
- source maps;
- static assets;
- proxy rules;
- security development headers where practical.

The first implementation may rely on Vite. Vii still owns the framework protocol and generated modules.

## HMR

HMR should update the narrowest safe boundary.

Examples:

```text
style change
  -> replace style asset

template binding change
  -> replace component render module

store implementation change
  -> preserve compatible State only when contract is unchanged

server loader change
  -> invalidate server module and affected route
```

State preservation must be explicit and safe. HMR must not silently retain incompatible resources, subscriptions, or security contexts.

## Incremental compilation

The compiler should maintain dependency and ownership information sufficient to invalidate only affected outputs.

Potential cache keys:

- source content hash;
- compiler version;
- configuration hash;
- target environment;
- dependency public contract hash;
- plugin versions;
- security policy version.

A cache hit must not bypass validation whose inputs changed.

## Route compilation

The application framework produces a route graph.

The build system uses it for:

- route-level code splitting;
- lazy development compilation;
- prerender entries;
- SSR entries;
- middleware association;
- asset preloading;
- route manifests;
- deployment grouping.

## Production outputs

Illustrative output:

```text
dist/
├── client/
│   ├── assets/
│   ├── routes/
│   └── manifest.json
├── server/
│   ├── entry.js
│   ├── routes/
│   └── server-manifest.json
└── metadata/
    ├── build-manifest.json
    ├── integrity.json
    └── diagnostics-summary.json
```

Actual output is target-specific.

## Tree shaking and package design

Vii packages should be:

- ESM-first;
- side-effect-free where true;
- explicit about exports;
- free from hidden global registration;
- split by optional capability;
- validated from packed artifacts.

Framework features must not enter client bundles merely because configuration support exists.

## Runtime size strategy

A small production runtime depends on architecture, not only minification.

Priorities:

- compile static template work;
- generate direct DOM bindings where possible;
- avoid mandatory virtual DOM;
- remove development diagnostics from production when configured;
- keep security checks that protect runtime boundaries;
- split router, query, forms, streams, UI, and server features;
- lazy-load route code;
- hydrate only interactive regions where supported.

## Build performance strategy

- native bundling engine;
- incremental module graph;
- persistent cache;
- parallel independent transforms;
- one parse per source representation where practical;
- minimal AST round trips;
- route-lazy development compilation;
- affected-only validation;
- separate fast transform and full type-check processes.

## Memory strategy

Build tooling should:

- release stale graph nodes;
- avoid retaining complete source text in multiple representations;
- bound diagnostic history;
- share immutable interned metadata;
- stream large assets;
- expose memory profiles in benchmarks;
- avoid worker counts that exceed useful parallelism.

Application runtime memory is addressed separately through fine-grained State and Scope disposal.

## Bun

Bun may be supported as:

- package manager;
- server runtime;
- optional build adapter;
- possible standalone CLI packaging tool.

Bun must not be mandatory for Node, browser, Deno, or other Vii users.

Candidate command:

```bash
vii build --engine=bun
```

Support requires dedicated fixtures, feature documentation, and known limitations.

## Rspack and Webpack

Rspack is a potential enterprise adapter for large workspaces and Webpack-compatible migrations.

Webpack integration may remain available for legacy applications that adopt Vii State or adapters without using the native Vii application framework.

Neither engine changes Vii runtime semantics.

## Nx integration

`@vii/nx` should adapt Vii tasks into Nx rather than duplicate the build system.

```text
@vii/build-core
     ^
     ├── Vii CLI
     └── @vii/nx
```

Nx integration may provide:

- inferred `dev`, `build`, `test`, `typecheck`, and `preview` tasks;
- generators;
- project graph metadata;
- affected execution;
- migrations;
- Nx Console support.

Vii remains usable without Nx.

## Plugin security

Build plugins are privileged code.

The plugin system must document and, where technically possible, constrain:

- filesystem access;
- process execution;
- network access;
- environment variables;
- generated code;
- cache participation;
- client and server graph mutation.

Remote registry items must never silently become executable build plugins.

## Compiler security

The compiler must classify and reject unsafe constructs including:

- code strings used as event handlers;
- unsanitized raw HTML sinks;
- unsafe URL protocols;
- secret imports into client code;
- dynamic executable script generation;
- unsafe hydration serialization;
- route parameters used as filesystem paths without validation.

See `docs/security/SECURITY_ARCHITECTURE.md`.

## Source maps and diagnostics

Every compiler error should include:

- stable code;
- original source file and range;
- generated phase where relevant;
- clear explanation;
- suggested safe correction;
- documentation reference;
- JSON representation.

Generated client and server code should map back to `.vii`, template, script, and style source locations.

## Testing

Required fixtures include:

- basic SFC client build;
- split component build;
- TSX build;
- CSS and scoped style output;
- SSR build;
- hydration build;
- route splitting;
- server/client boundary violations;
- malicious template fixtures;
- package manager consumers;
- Node reference server;
- optional Bun and Rspack research fixtures.

## Why not build a bundler first

A complete bundler requires years of work across parsing, resolution, CommonJS interop, tree shaking, splitting, CSS, assets, source maps, minification, HMR, caching, plugins, runtimes, and compatibility.

Writing it first would delay validation of the distinct Vii value:

- observable State;
- explicit Scope and Resources;
- component semantics;
- security diagnostics;
- SSR boundaries;
- CLI experience.

Vii may later replace more engine layers only after profiling identifies a real bottleneck that cannot be addressed through plugins, compiler improvements, caching, or direct Rolldown integration.

## Evolution path

```text
Phase A
TypeScript compiler prototype and Vite plugin

Phase B
Component IR, HMR, client/server builds, and SSR

Phase C
Incremental compiler cache and route graph optimization

Phase D
Native parser or template compiler for measured bottlenecks

Phase E
Direct Rolldown integration where valuable

Phase F
Evidence-based decision on further native bundling work
```

## Graduation criteria

The build system moves from Research to Planned only after:

- the component model is accepted;
- a client application and SSR application build successfully;
- source maps and HMR are usable;
- security boundary checks work;
- packed production output passes consumer fixtures;
- build speed, memory, and output size are measured;
- the engine abstraction proves useful with at least one secondary adapter or test engine;
- Vii-specific orchestration provides value beyond a thin Vite configuration.
