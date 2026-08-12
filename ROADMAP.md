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

State Alpha does not include a native renderer, Query cache, Form engine, HTTP client, RxJS requirement, deep proxy store, NgRx-style reducer architecture, or AI-required behavior.

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

## Cross-phase ecosystem capability research — Research

This research may begin in parallel after the relevant Core contracts are stable enough to evaluate the capability. It must not delay committed State, adapter, CLI, diagnostics, or real-application work.

### Vii Form

Vii Form is a strong candidate application module because it can reuse State, Scope, diagnostics, framework adapters, and future Devtools directly.

Research scope:

- signal-first typed field tree;
- granular field state and subscriptions;
- dirty, touched, pending, validity, and structured errors;
- nested objects, arrays, dynamic fields, and multi-step forms;
- sync and async validation;
- cancellation of stale async validation;
- schema adapters without a mandatory validation provider;
- typed parsing and input/output transforms;
- submission lifecycle and server-field errors;
- accessible React, Angular, Vue, Vanilla, and future native-Vii bindings;
- bundle, memory, type-check, and rerender/update evidence.

Research references include Angular Signal Forms, TanStack Form, React Hook Form, Vue, and VeeValidate. Inspiration does not imply compatibility or copied APIs.

Vii Form may move to Planned only after State and Scope semantics are stable enough to support it and at least one real consumer demonstrates meaningful form complexity.

See `docs/architecture/FORM_ARCHITECTURE.md`.

### Vii HTTP

Vii HTTP is a separate transport research track. It must not duplicate Vii Query.

Research scope:

- Fetch-first request/response model;
- configured clients and deterministic per-request overrides;
- functional middleware;
- local request context metadata;
- AbortSignal cancellation and explicit timeout behavior;
- typed decoding without pretending compile-time generics validate network data;
- stable transport error categories;
- retries disabled by default, with explicit optional retry policy;
- SSR request isolation;
- browser, Node, Bun, and Deno compatibility fixtures when those tiers are claimed;
- production-safe diagnostics that do not capture credentials or bodies by default.

The intended separation is:

```text
Query = cache and server-state lifecycle
HTTP  = transport and request/response lifecycle
```

See `docs/architecture/HTTP_CLIENT.md`.

### Toolchain and testing

Vii should own framework-specific semantics and Vii-specific testing intelligence while reusing mature engines by default.

Research direction:

- keep Vitest as the canonical repository unit/contract runner while it meets project requirements;
- research `@vii/testing` for State, Scope, diagnostics, Query, Form, adapter, SSR, and lifecycle-specific assertions and fixtures rather than building a new general-purpose test runner;
- use browser automation such as Playwright when browser-level evidence is required;
- keep Vite and Rolldown as the first native framework build research direction;
- keep Bun and Rspack optional compatibility or engine adapters rather than Vii Core dependencies;
- study meta-frameworks such as Analog for orchestration and developer-experience lessons, not as runtime dependencies.

See `docs/strategy/ECOSYSTEM_CAPABILITY_STRATEGY.md`.

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
- Explicit transport boundary so Query can use Vii HTTP, Fetch, or another user-provided transport

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

Vii HTTP research may consume the portable transport lessons from this phase, but an HTTP module must remain independently useful and must not become a server framework.

## Phase 8: Native component research — Research

This phase begins only after State, Scope, adapters, and real applications validate the core model.

- One Vii Component contract
- `.vii` Single-File Component prototype
- Split TS, HTML, and CSS profile
- TSX profile
- Programmatic TypeScript profile
- Shared Component IR
- Fine-grained reactive bindings
- First-class template control-flow semantics for conditionals, keyed repetition, empty states, and branch selection
- Comparison of block, directive, and JavaScript/TSX authoring styles before freezing native template syntax
- Component Scope and cleanup
- Accessibility compiler diagnostics
- Security sink and client/server diagnostics
- Source maps and IDE research

All profiles must share one State, Scope, lifecycle, diagnostics, security, and control-flow runtime model even when their source syntax differs.

See `docs/architecture/TEMPLATE_CONTROL_FLOW.md`.

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

Vii owns compiler semantics and build orchestration. It does not initially build a new general-purpose JavaScript bundler or a replacement for Vitest.

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
- Cohesive `vii dev`, `vii build`, `vii test`, and `vii check` workflows over replaceable lower-level engines when justified

This phase is not a delivery promise and is not required for Vii State, Query, Form research, UI, or adapters to succeed.

## Phase 11: Ecosystem and agent-assisted expansion — Vision

- Advanced Form integrations if Vii Form graduates
- Advanced HTTP and server integrations if Vii HTTP graduates
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

A phase or capability advances only when:

- APIs are documented and tested;
- lifecycle and cleanup behavior are demonstrated;
- package and runtime compatibility is verified;
- performance claims are reproducible;
- security requirements and malicious fixtures pass;
- client/server and capability boundaries are documented;
- at least one real consumer validates the design;
- risks, privacy impact, accessibility impact, and breaking changes are documented;
- implementation support is not inferred from documentation alone;
- a new Vii-owned engine is not created when a mature replaceable engine meets the requirement without losing Vii semantics;
- agent-assisted work preserves provenance, permissions, approvals, and validation evidence where used.

## Framework decision rule

The native framework sequence may stop at any stage if:

- existing framework adapters provide sufficient value;
- compiler and renderer complexity exceeds demonstrated user benefit;
- security, accessibility, tooling, or compatibility quality cannot meet Vii standards;
- maintenance capacity is insufficient.

Vii Core remains useful independently of the framework decision.

## Ecosystem capability decision rule

A Form, HTTP, testing, build, template, or other ecosystem capability remains Research or is deferred when:

- an existing library solves the validated need without losing important Vii semantics;
- there is no real consumer;
- it would delay committed Core or adapter work;
- the capability cannot remain optional and tree-shakable where appropriate;
- maintenance cost exceeds demonstrated benefit;
- API, performance, security, accessibility, compatibility, or lifecycle requirements remain unclear.

## Agent decision rule

Agent integration may stop at documentation and read-only analysis if:

- host capability enforcement is insufficient;
- context freshness and provenance cannot be trusted;
- automation adds more review cost than value;
- remote-provider privacy cannot meet policy;
- deterministic CLI and validation surfaces are not mature enough.

Vii development remains fully possible without Intentloom, InLoom, agents, or AI providers.
