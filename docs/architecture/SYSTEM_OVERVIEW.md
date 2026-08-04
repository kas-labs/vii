# Vii System Overview

## Architectural goal

Vii is organized as a small runtime-neutral foundation with optional modules, adapters, tools, and distribution layers.

```text
Applications
├── React
├── Angular
├── Vue
├── Vanilla
├── Desktop
├── Mobile
└── Server

Adapters and integrations
├── Framework adapters
├── Runtime adapters
├── Platform capability adapters
└── External integrations

Product modules
├── State
├── Query
├── Form
├── Router
└── UI behaviors

Foundation
├── Core graph and lifecycle
├── Scope and resource ownership
├── Protocols and contracts
└── Structured diagnostics
```

## Foundation layer

The foundation contains no framework-specific or platform-specific behavior.

It is responsible for:

- reactive graph primitives
- subscriptions
- batching
- scopes
- disposal
- resource ownership
- event causality
- serialization contracts
- diagnostics events

Foundation packages must not directly depend on DOM APIs, Node internals, Bun globals, Deno globals, or framework runtimes.

## Product modules

Modules add focused application capabilities on top of the foundation.

Initial modules:

- Vii State
- Vii Query
- Vii Devtools protocol

Later candidates:

- Vii Form
- Vii Router
- Vii Virtual
- Vii Table
- Vii UI

Each module remains optional and must define its own lifecycle, diagnostics, compatibility, and package budget.

## Adapter layer

Adapters connect stable Vii contracts to external environments.

Examples:

- React adapter
- Angular adapter
- Vue adapter
- Node runtime adapter
- Bun runtime adapter
- Deno runtime adapter
- Tauri platform adapter
- Capacitor platform adapter

Adapters must not redefine core semantics. They translate lifecycle, rendering, scheduling, and platform capabilities into the Vii model.

## Tooling layer

Tooling includes:

- Vii CLI
- create-vii
- Devtools UI
- testing utilities
- benchmark harnesses
- migration tooling
- registry tooling

Tooling may depend on development environments, but it must not leak into production runtime packages.

## Distribution layer

Vii will use npm as the initial primary package registry.

The distribution model may include:

- installable packages
- source-owned UI components
- project templates
- registry items
- migrations
- themes and tokens

## Understandable execution

The complete architecture should preserve causal relationships.

```text
User action
→ state or form event
→ query or command
→ transport
→ server handler
→ response
→ cache invalidation
→ selector recomputation
→ framework update
```

Each step may emit structured diagnostics using a shared trace context.

## Simplicity rule

Simple use must remain simple.

```ts
const counter = createStore(0);
```

An application container, platform capability registry, or diagnostics setup must not be required for basic State usage. More advanced lifecycle management may be introduced only when the application needs it.
