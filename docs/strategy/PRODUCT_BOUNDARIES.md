# Vii Product Boundaries

Vii is intentionally broad in vision and narrow in execution. These boundaries prevent the project from expanding faster than it can be validated.

## Global rules

A new module or package requires:

1. A real problem and first consumer.
2. An explanation of why an existing module or integration is insufficient.
3. A public contract and lifecycle model.
4. A test and documentation strategy.
5. Bundle, memory, and maintenance budgets.
6. An RFC when public architecture is affected.

## Vii State is not

- a UI framework
- a persistence service
- a collaborative database
- a mandatory immutable architecture
- a Redux-compatible action and reducer system
- a hidden deep-proxy reactivity layer

## Vii Query is not

- a database
- a backend service
- a generated API client by default
- an offline database
- a realtime synchronization platform

## Vii CLI is not

- a package manager
- a bundler
- a replacement for Vite, Angular CLI, Nx, Tauri CLI, or native build tools
- an executor of untrusted registry code
- an AI requirement

## Vii UI is not

- a Tailwind-only library
- only a Web Components library
- an obligation for Vii State or Query users
- one DOM implementation forced onto every framework
- a universal native mobile renderer

## Vii Server Foundation is not

- a NestJS clone
- an ORM
- an authentication provider
- a cloud platform
- a queue, database, or payment system
- a full HTTP framework in its first stage

## Mobile and desktop boundaries

The first platform work will reuse established runtimes through adapters:

- Tauri for desktop research
- Capacitor or Tauri Mobile for web-based mobile research
- React Native as a later native target

Vii will not create a new desktop runtime, mobile bridge, or native renderer during the foundation stages.

## Framework boundary

A standalone Vii renderer or full-stack framework remains a long-term possibility. It will not begin until State, Query, adapters, diagnostics, and real applications demonstrate that an independent framework solves a problem integrations cannot solve.

## AI boundary

AI may explain, propose, and assist. Deterministic tools must validate results. AI must not silently publish packages, change stable public APIs, upload source code, or make irreversible changes without explicit approval.
