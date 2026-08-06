# Vii Roadmap

This roadmap separates near-term commitments from long-term possibilities. Dates are intentionally secondary to quality gates.

## Status definitions

- **Committed**: accepted for implementation and tied to a milestone.
- **Planned**: accepted direction without a fixed delivery commitment.
- **Research**: architecture and feasibility are not yet approved as a support promise.
- **Vision**: long-term possibility, not a delivery promise.

## Phase 0: Product, protocol, security, and engineering-context foundation — Committed

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
- Security Architecture and maintained Threat Model
- Clear separation between State, Query, Resource, and Stream concerns
- Implementation playbooks and first independently actionable backlog
- Intentloom integration boundary
- Agent governance, context provenance, permissions, approvals, and stop conditions
- Foundation coverage audit with visible unresolved decisions

Phase 0 Intentloom work is limited to repository policy, context, task, and validation contracts. It is not a Vii runtime dependency and must not delay the first Core package.

## Phase 1: Vii State Core — Committed

- State or Store contract
- Read, update, and subscribe operations
- Computed values and selectors
- Batching
- Scopes and disposal
- Resource ownership foundations
- Structured diagnostics
- Serialization foundations
- Vanilla integration
- Unit, lifecycle, type, security, and benchmark suites

State Alpha does not include a native renderer, Query cache, RxJS requirement, deep proxy store, NgRx-style reducer architecture, or AI-required behavior.

## Phase 2: Framework adapters and CLI — Committed

- React adapter
- Angular adapter
- Vue adapter
- Adapter compliance suite
- SSR and hydration research through existing frameworks
- `create-vii`
- `vii init`
- `vii add`
- `vii doctor`
- Safe generator foundations
- Machine-readable CLI output
- Deterministic Analyze, Plan, Preview, Apply, Validate, Report lifecycle
- Approval metadata and task-scoped execution surfaces for external development tools

Native component generators, build commands, Nx support, autonomous agents, and release automation remain Research until their underlying layers exist.

## Phase 3: Devtools and explainability foundation — Planned

- Trace viewer
- State and dependency graph
- Scope and resource ownership graph
- Exportable trace format
- CLI inspection
- Production-safe diagnostics mode
- Security event inspection with redaction
- OpenTelemetry bridge research
- Redacted diagnostic consumption by Intentloom and InLoom
- Causal explanations that remain observational and cannot mutate runtime behavior

## Phase 4: Real application validation — Planned

- Reference applications
- External alpha testers
- API simplification
- Memory lifecycle validation
- Bundle, execution, memory, and type-check budgets
- Threat-model review against real deployments
- Malicious fixtures for supported adapters and runtimes
- Review of agent task quality against real engineering work

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
- Server-data security and serialization review

## Phase 6: Vii UI foundation — Planned

- Design token format
- Renderless behaviors
- Accessible primitives
- Source, package, and Web Component distribution modes
- Registry schema and lockfile
- CLI installation, diff, and update flows
- React, Angular, Vue, Web Components, and Vanilla targets
- Safe template and registry content policies

## Phase 7: Platform and server foundation — Research

- Platform capability contracts
- Node reference runtime
- Bun and Deno compatibility
- Tauri desktop spike
- Capacitor mobile spike
- Typed server contracts
- Request Scopes
- Validation and authorization metadata
- Transport abstraction
- CSRF, SSRF, filesystem, command, upload, and serialization security contracts

## Phase 8: Native component research — Research

This phase begins only after State, Scope, adapters, and real applications validate the core model.

- One Vii Component contract
- `.vii` Single-File Component prototype
- Split TS, HTML, and CSS profile
- TSX profile
- Programmatic TypeScript profile
- Shared Component IR
- Fine-grained reactive bindings
- Component Scope and cleanup
- Accessibility compiler diagnostics
- Security sink and client/server diagnostics
- Source maps and IDE research

All profiles must share one State, Scope, lifecycle, diagnostics, and security model.

## Phase 9: Native Web runtime and build research — Research

- DOM renderer
- Component initialization and targeted updates
- Vite plugin prototype
- Vite development server integration
- Rolldown production build
- Separate TypeScript checking
- HMR protocol
- Client and server environment graphs
- Route and asset manifests
- Build speed, memory, and output-size measurements
- Optional Bun and Rspack adapter research
- Optional `@vii/nx` integration research

Vii owns compiler semantics and build orchestration. It does not initially build a new general-purpose JavaScript bundler.

## Phase 10: Vii Application Framework — Vision

A standalone Vii application framework is considered only if native component and build prototypes provide a clear benefit beyond adapters.

Possible scope:

- Router
- File-based and explicit routes
- Nested layouts
- CSR and SSG
- Basic SSR and hydration
- Streaming
- Explicit hybrid route rules
- Server and client boundaries
- Typed loaders and server functions
- Deployment adapters
- CSP and Trusted Types integration

This phase is not a delivery promise and is not required for Vii State, Query, UI, or adapters to succeed.

## Phase 11: Ecosystem and agent-assisted expansion — Vision

- Forms
- Advanced server adapters
- Desktop patterns
- Mobile patterns
- Advanced UI components
- Stream module or RxJS interop expansion
- Partial hydration or islands research
- Additional build and deployment targets
- Intentloom repository profiles and policy bundles
- InLoom first-class Vii workflows
- Multi-agent task handoffs and conflict detection
- Optional AI diagnostics and migration assistance
- Provider-neutral local and remote model adapters

AI remains optional. Protected architecture, security, governance, and release decisions remain human-controlled.

## Quality gates

A phase advances only when:

- APIs are documented and tested;
- lifecycle and cleanup behavior are demonstrated;
- package and runtime compatibility is verified;
- performance claims are reproducible;
- security requirements and malicious fixtures pass;
- client/server and capability boundaries are documented;
- at least one real consumer validates the design;
- risks, privacy impact, and breaking changes are documented;
- implementation support is not inferred from documentation alone;
- agent-assisted work preserves provenance, permissions, approvals, and validation evidence where used.

## Framework decision rule

The native framework sequence may stop at any stage if:

- existing framework adapters provide sufficient value;
- compiler and renderer complexity exceeds demonstrated user benefit;
- security, accessibility, tooling, or compatibility quality cannot meet Vii standards;
- maintenance capacity is insufficient.

Vii Core remains useful independently of the framework decision.

## Agent decision rule

Agent integration may stop at documentation and read-only analysis if:

- host capability enforcement is insufficient;
- context freshness and provenance cannot be trusted;
- automation adds more review cost than value;
- remote-provider privacy cannot meet policy;
- deterministic CLI and validation surfaces are not mature enough.

Vii development remains fully possible without Intentloom, InLoom, agents, or AI providers.
