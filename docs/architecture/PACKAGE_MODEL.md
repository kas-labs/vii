# Vii Package Model

Every official package belongs to one category.

## Core

Runtime-neutral foundations with the strongest stability requirements.

Examples:

- `@kas-labs/vii`
- `@kas-labs/vii-protocol`
- `@kas-labs/vii-contracts`

## Module

Optional application capabilities built on Core.

Examples:

- `@kas-labs/vii-query`
- `@kas-labs/vii-form`
- `@kas-labs/vii-router`

## Adapter

Bridges Vii contracts to a framework, runtime, or platform.

Examples:

- `@kas-labs/vii-react`
- `@kas-labs/vii-angular`
- `@kas-labs/vii-vue`
- `@kas-labs/vii-runtime-node`

## Tool

Development-only tooling.

Examples:

- `@kas-labs/vii-cli`
- `@kas-labs/vii-devtools`
- `@kas-labs/vii-testing`

## Distribution

Packages and services used to create projects or distribute source-owned assets.

Examples:

- `create-vii`
- Vii Registry schemas and clients

## Integration

Optional bridges to external systems.

Examples:

- `@kas-labs/vii-opentelemetry`
- `@kas-labs/vii-fastify`
- `@kas-labs/vii-nest`

## Package proposal requirements

A package proposal must define:

- category
- first consumer
- public purpose
- dependency direction
- runtime and framework support
- lifecycle and cleanup behavior
- diagnostics behavior
- bundle and memory budget
- test strategy
- stability level
- maintenance owner
- deprecation and removal path

## Dependency direction

Dependencies should flow inward:

```text
Applications
→ adapters and integrations
→ modules
→ core and protocols
```

Core packages must never depend on framework adapters, UI implementations, CLI packages, or Devtools UI.

## Naming

Package names remain provisional until a dedicated naming RFC is accepted. npm under the `@kas-labs` scope is the initial distribution target.
