# Vii Package Model

Every official package belongs to one category and follows the dependency direction, lifecycle, quality, security, and ownership rules defined by Vii governance.

Package names remain provisional until a dedicated naming and distribution decision is accepted.

## Core

Runtime-neutral foundations with the strongest stability requirements.

Examples:

- `@vii-labs/state`
- `@vii-labs/contracts`
- `@vii-labs/protocol`
- `@vii-labs/scope`
- `@vii-labs/diagnostics`

Core packages must not depend on UI frameworks, CLIs, bundlers, package managers, host runtimes, or native platforms.

## Module

Optional application capabilities built on Core.

Examples:

- `@vii-labs/query`
- `@vii-labs/form`
- `@vii-labs/http`
- `@vii-labs/router`
- `@vii-labs/stream`
- `@vii-labs/ui`

Modules do not silently become part of every client bundle.

Form is a candidate State/Scope-backed application module. HTTP is a candidate Fetch-first transport module. Both remain subject to their architecture research, package proposal requirements, real-consumer evidence, and roadmap gates before publication or support claims.

## Native framework

Research and Vision packages for a possible future Vii-native component and application framework.

Potential examples:

- `@vii-labs/web`
- `@vii-labs/app`
- `@vii-labs/compiler-core`
- `@vii-labs/compiler-sfc`
- `@vii-labs/build-core`

No native framework package becomes official until the State, Scope, and adapter layers prove their value and the package satisfies the normal proposal requirements.

## Adapter

Bridges Vii contracts to a framework, runtime, platform, or build engine.

Examples:

- `@vii-labs/react`
- `@vii-labs/angular`
- `@vii-labs/vue`
- `@vii-labs/runtime-node`
- `@vii-labs/build-vite`
- `@vii-labs/build-rspack`
- `@vii-labs/build-bun`

Adapters do not implement another State, Scope, diagnostics, security, or component semantic model.

## Tool

Development-only tooling.

Examples:

- `@vii-labs/cli`
- `@vii-labs/cli-core`
- `@vii-labs/devtools`
- `@vii-labs/testing`
- `@vii-labs/nx`

Tool packages may be privileged and require explicit filesystem, process, network, and environment security review.

`@vii-labs/testing` is a possible Vii-specific assertion, fixture, and compliance layer. It is not a commitment to build a new general-purpose test runner while mature runners such as Vitest satisfy the repository's needs.

## Distribution

Packages and services used to create projects or distribute source-owned assets.

Examples:

- `create-vii`;
- Vii Registry schemas and clients;
- registry lockfile tools;
- release metadata tools.

Declarative source distribution is separate from executable plugin distribution.

## Integration

Optional bridges to external systems.

Examples:

- `@vii-labs/opentelemetry`;
- `@vii-labs/rxjs`;
- `@vii-labs/fastify`;
- `@vii-labs/hono`;
- `@vii-labs/nest`.

An integration must preserve Vii lifecycle, diagnostics, compatibility, and security contracts where applicable.

## Package proposal requirements

A package proposal must define:

- category;
- first consumer;
- public purpose;
- dependency direction;
- runtime and framework support;
- lifecycle and cleanup behavior;
- diagnostics behavior;
- security and privacy boundaries;
- required capabilities;
- bundle, execution, memory, and type-check budget;
- test strategy;
- malicious or abuse-case fixtures where applicable;
- stability level;
- maintenance owner;
- vulnerability response owner;
- deprecation and removal path;
- reason the capability cannot remain internal or inside an existing package.

## Dependency direction

Dependencies flow inward:

```text
Applications
-> native framework, adapters, and integrations
-> modules
-> core and protocols
```

Build and tool packages may consume public Core and compiler contracts, but Core never depends on them.

Core packages must never depend on:

- framework adapters;
- native UI implementations;
- application framework packages;
- CLI packages;
- Devtools UI;
- Vite, Rolldown, Rspack, Webpack, Bun build APIs, or Nx;
- Node, DOM, Tauri, Capacitor, or mobile APIs.

## Component authoring profiles

SFC, split TS/HTML/CSS, TSX, and programmatic TypeScript are source profiles.

They do not justify separate State, Scope, lifecycle, or application-framework packages.

One compiler family may provide format-specific frontends that lower into a shared Component IR.

Template control-flow syntax may differ between native templates and TSX, but conditional branches, keyed repetition, Scope ownership, disposal, and renderer behavior must lower to one control-flow semantic model.

## State, Query, Form, HTTP, Resource, and Stream packages

The package model preserves conceptual separation:

```text
@vii-labs/state    current values and dependency graph
@vii-labs/query    cached remote state and server-state lifecycle
@vii-labs/form     form field state, validation, and submission lifecycle
@vii-labs/http     request/response transport and middleware
@vii-labs/stream   optional event streams
@vii-labs/rxjs     optional RxJS interop
```

Resource ownership belongs to shared Scope foundations and relevant modules rather than a universal async abstraction that absorbs every use case.

Query may use Vii HTTP, native Fetch, or another user-provided transport. HTTP must not silently become a second Query cache, and Form must not own network transport or server-state caching.

## Build packages

The future Build System distinguishes framework orchestration from bundler engines.

```text
@vii-labs/build-core
  owns environment graph, route graph, manifests, and engine contracts

@vii-labs/build-vite
  adapts Vite and Rolldown

@vii-labs/build-rspack
  optional enterprise adapter

@vii-labs/build-bun
  optional Bun adapter
```

The engine must not change Vii runtime semantics.

## Nx

`@vii-labs/nx` is an optional external workspace integration.

It consumes the shared CLI and Build Core for generators, inferred tasks, graph metadata, affected execution, and migrations.

Vii remains usable without Nx.

## Security classification

Packages should declare whether they are:

```text
runtime-neutral
browser runtime
server runtime
build-time executable
development tool
native capability bridge
remote distribution client
AI integration
```

Build-time executables, native bridges, distribution clients, network transports, and AI integrations require stronger permission and threat review than passive runtime-neutral libraries.

## Naming

Package names and the final npm scope remain provisional.

The initial distribution target is npm, but documentation must not treat example names as published packages until releases exist.
