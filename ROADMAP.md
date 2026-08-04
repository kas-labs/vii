# Vii Roadmap

This roadmap separates near-term commitments from long-term possibilities. Dates are intentionally secondary to quality gates.

## Status definitions

- **Committed**: accepted for implementation and tied to a milestone.
- **Planned**: accepted direction without a fixed delivery commitment.
- **Research**: architecture and feasibility are not yet approved.
- **Vision**: long-term possibility, not a delivery promise.

## Phase 0: Product and protocol foundation — Committed

- Product thesis and product boundaries
- Core vocabulary and anti-goals
- Package classification
- Runtime-neutral design rules
- Scope and resource ownership model
- Diagnostics event protocol
- Framework adapter contract
- Benchmark and compatibility policies
- RFC and ADR processes
- Repository, CI, release, and security foundations

## Phase 1: Vii State Core — Committed

- Store contract
- Read, update, and subscribe operations
- Selectors and derived values
- Batching
- Scopes and disposal
- Resource ownership
- Structured diagnostics
- Serialization foundations
- Vanilla integration
- Unit, lifecycle, type, and benchmark suites

## Phase 2: Framework adapters and CLI — Committed

- React adapter
- Angular adapter
- Vue adapter
- Adapter compliance suite
- SSR and hydration research
- `create-vii`
- `vii init`
- `vii add`
- `vii doctor`
- Machine-readable CLI output

## Phase 3: Devtools foundation — Planned

- Trace viewer
- State and dependency graph
- Scope and resource ownership graph
- Exportable trace format
- CLI inspection
- Production-safe diagnostics mode
- OpenTelemetry bridge research

## Phase 4: Real application validation — Planned

- Reference applications
- External alpha testers
- API simplification
- Memory lifecycle validation
- Bundle, execution, memory, and type-check budgets

## Phase 5: Vii Query — Planned

- Query cache
- Request deduplication and cancellation
- Explicit freshness and retention
- Invalidation and mutations
- Optimistic updates
- Hydration
- Memory budgets
- Framework adapters
- Query diagnostics

## Phase 6: Vii UI foundation — Planned

- Design token format
- Renderless behaviors
- Accessible primitives
- Source, package, and Web Component distribution modes
- Registry schema and lockfile
- CLI installation, diff, and update flows
- React, Angular, Vue, Web Components, and Vanilla targets

## Phase 7: Platform and server foundation — Research

- Platform capability contracts
- Node reference runtime
- Bun and Deno compatibility
- Tauri desktop spike
- Capacitor mobile spike
- Typed server contracts
- Request scopes
- Transport abstraction

## Phase 8: Expansion — Research

- Forms
- Server adapters
- Desktop patterns
- Mobile patterns
- Advanced UI components
- Router research

## Phase 9: Framework decision — Vision

A standalone Vii framework or renderer will only be considered after the core modules have proven their value in real applications and adapters are no longer sufficient.

## Quality gates

A phase advances only when:

- APIs are documented and tested
- lifecycle and cleanup behavior are demonstrated
- package and runtime compatibility is verified
- performance claims are reproducible
- at least one real consumer validates the design
- risks and breaking changes are documented
