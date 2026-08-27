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

State Alpha does not include a native renderer, Query cache, Form engine, HTTP client, schema engine, RxJS requirement, deep proxy store, NgRx-style reducer architecture, or AI-required behavior.

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

### Vii Schema

Vii Schema is a candidate small, TypeScript-first runtime data-contract layer for validating unknown application input. It is not accepted as a package and must demonstrate meaningful value beyond integrating an existing mature validator.

Research scope:

- strongly typed runtime validation with input/output inference;
- small primitives and composition surface rather than a full TypeScript mirror;
- non-throwing `check`-style result as the application-oriented baseline, with throwing parse convenience under evaluation;
- explicit separation of validation, coercion, and transformation;
- zero-copy success-path research for validation-only schemas;
- minimal allocation on valid input and lazy materialization of issue paths;
- structured value-free errors suitable for Form and Diagnostics;
- compact internal Schema IR and an optional CSP-safe optimized validation plan;
- bundle-size, runtime, allocation/memory, and TypeScript compiler benchmarks;
- JSON Schema export for the portable subset without forcing JSON Schema to be the runtime representation;
- optional Form, HTTP, Query, server-boundary, configuration, worker-message, and AI structured-output integrations;
- browser, server, edge/worker, SSR, and compatibility evidence before runtime claims;
- security review for prototype pollution, getters/proxies, regexes, pathological depth/width, unions, recursion, transforms, and code-generation boundaries.

Research comparisons must include current representative approaches such as Zod 4, Zod Mini, Valibot, ArkType, TypeBox, Ajv where semantically fair, and a handwritten validator baseline. Vii must not claim to be faster, smaller, or simpler without reproducible evidence.

Vii Form must continue to support schema adapters and must not require Vii Schema. Vii HTTP must continue to support user-provided decoding/validation. Schema must remain independently usable and must not depend on State, Form, HTTP, Query, UI frameworks, build tools, server runtimes, or AI.

Vii Schema may move to Planned only after a real consumer need, an integration-vs-build comparison, a small prototype, reproducible performance/type-check evidence, security fixtures, and a clear public-contract proposal demonstrate Vii-specific value. An official adapter to an existing schema library is an acceptable research outcome.

See `docs/architecture/SCHEMA_ARCHITECTURE.md` and `docs/quality/SCHEMA_BENCHMARK_PLAN.md`.

### Vii Form — Complete (Research Accepted) / Production Phase 1 Active

Vii Form is the reactive, headless form state and validation engine for the Vii ecosystem, reusing State, Scope, diagnostics, and framework adapters.

Research track F0–F10 is complete and accepted via PR #166. Production Form Phase 1 is active, initiated with Slice P1a (Production Architecture & Package Contract).

Production Phase 1 scope:

- `@vii-labs/form` package skeleton and multi-adapter subpath distribution (`/react`, `/vanilla`, `/angular`, `/vue`);
- signal-first typed field tree (`createField`, `createFieldGroup`, `createFieldArray`, `createForm`);
- granular leaf reactivity and independent dirty, touched, pending, validity, and issue tracking;
- presentation Raw vs domain Value parser pipeline with presentation retention during parse errors;
- synchronous and asynchronous validation with monotonic revision protection and `AbortSignal` cancellation;
- provider-neutral Standard Schema v1 fail-closed adapter;
- dynamic `FieldArray` collections with stable logical identity across reorders;
- Model A submission state machine preserving terminal status across ordinary field edits;
- structured server issue routing to fields, groups, and array items across in-flight reorders via submission snapshots;
- thin framework adapters for React 18/19 (`useSyncExternalStore`), Vanilla DOM (`textContent`, ARIA projection), Angular Signals, and Vue `shallowRef`;
- real browser and WCAG 2.2 AA accessibility acceptance gate;
- performance and memory validation addressing the 1,000 server issue routing hotspot.

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md`.

### Vii HTTP

Vii HTTP is a separate transport research track. It must not duplicate Vii Query.

Research scope:

- Fetch-first request/response model;
- configured clients and deterministic per-request overrides;
- functional middleware;
- local request context metadata;
- AbortSignal cancellation and explicit timeout behavior;
- typed decoding without pretending compile-time generics validate network data;
- optional runtime response contracts through Vii Schema or user-provided validators if Schema research proves value;
- stable transport error categories;
- retries disabled by default, with explicit optional retry policy;
- SSR request isolation;
- browser, Node, Bun, and Deno compatibility fixtures when those tiers are claimed;
- production-safe diagnostics that do not capture credentials or bodies by default.

The intended separation is:

```text
Query  = cache and server-state lifecycle
HTTP   = transport and request/response lifecycle
Schema = optional runtime data contract at trust boundaries
```

See `docs/roadmap/HTTP_CLIENT_RESEARCH.md` and `docs/architecture/HTTP_CLIENT.md`.

### Toolchain and testing

Vii should own framework-specific semantics and Vii-specific testing intelligence while reusing mature engines by default.

Research direction:

- keep Vitest as the canonical repository unit/contract runner while it meets project requirements;
- research `@vii-labs/testing` for State, Scope, diagnostics, Query, Form, Schema, adapter, SSR, and lifecycle-specific assertions and fixtures rather than building a new general-purpose test runner;
- use browser automation such as Playwright when browser-level evidence is required;
- keep Vite and Rolldown as the first native framework build research direction;
- keep Bun and Rspack optional compatibility or engine adapters rather than Vii Core dependencies;
- study meta-frameworks such as Analog for orchestration and developer-experience lessons, not as runtime dependencies.

See `docs/strategy/ECOSYSTEM_CAPABILITY_STRATEGY.md`.

## Phase 5: Vii Query — Complete (Research Accepted)

- Query cache prototype and deterministic QueryKey canonicalization (P5.1)
- Request deduplication and execution generation tracking (P5.2)
- Native AbortSignal cancellation, freshness (staleTime), invalidation, and GC (gcTime) (P5.3)
- Mutation execution model, optimistic cache transactions, and race-safe rollback (P5.4)
- SSR Request Scope isolation, server prefetching, versioned dehydration, and hardened hydration (P5.5)
- Value-safe structural diagnostics and absolute privacy enforcement (P5.6)
- Framework integration fixtures and compliance suite for React, Angular, and Vue (P5.7)
- Performance benchmarks and Build-vs-Buy gate confirming Option A graduation (`docs/strategy/QUERY_BUILD_VS_BUY_EVALUATION.md`) (P5.8)

See `docs/roadmap/PHASE_5_QUERY.md` and `docs/architecture/QUERY_ARCHITECTURE.md`.

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
- Optional schema contracts at request/input boundaries without coupling server foundations to one validator
- Transport abstraction
- CSRF, SSRF, filesystem, command, upload, and serialization security contracts

Vii HTTP and Schema research may consume portable lessons from this phase, but both capabilities must remain independently useful and must not become a server framework.

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
- CSR reference application before SSR becomes a framework requirement
- Vite plugin prototype
- Vite development server integration
- Rolldown production build
- Separate TypeScript checking
- HMR protocol
- Explicit client, server, shared, and build environment graphs
- Route, asset, and hydration manifests
- Compiler diagnostics for invalid cross-environment imports
- Build speed, memory, and output-size measurements
- Optional Bun and Rspack adapter research
- Optional `@vii-labs/nx` integration research

Vii owns compiler semantics and build orchestration. It does not initially build a new general-purpose JavaScript bundler or a replacement for Vitest.

## Phase 10: Vii Application Framework — Vision

A standalone Vii application framework is considered only if native component and build prototypes provide a clear benefit beyond adapters.

Rendering follows progressive complexity:

```text
CSR baseline
-> optional SSG / prerender
-> optional SSR + hydration
-> optional streaming / hybrid rendering
-> optional advanced server functions
```

Possible scope:

- Router
- File-based and explicit routes
- Nested layouts
- CSR as the independently usable default native rendering mode
- Optional SSG / prerender
- Optional SSR and hydration
- Optional streaming
- Explicit hybrid route rules
- Explicit shared, client, server, build, and optional edge boundaries
- Compiler/build diagnostics for invalid environment imports
- Typed loaders and optional server functions whose remote/network semantics remain visible
- Optional runtime validation contracts at trust boundaries without hiding network semantics
- Deployment adapters
- Cohesive `vii dev`, `vii build`, `vii test`, and `vii check` workflows over replaceable lower-level engines when justified

SSR is presentation infrastructure by default. Using it must not require Vii to own application domain logic, database access, transactions, queues, or the backend architecture.

A CSR application must not pay the conceptual, bundle, lifecycle, or tooling cost of unused SSR, hydration, streaming, or server-function features.

See `docs/architecture/RENDERING_STRATEGY.md`.

This phase is not a delivery promise and is not required for Vii State, Query, Schema, Form research, UI, or adapters to succeed.

## Phase 11: Ecosystem and agent-assisted expansion — Vision

- Advanced Schema integrations if Vii Schema graduates
- Advanced Form integrations if Vii Form graduates
- Advanced HTTP and server integrations if Vii HTTP graduates
- Advanced server adapters
- Desktop patterns
- Mobile patterns
- Advanced UI components
- Stream module or RxJS interop expansion
- Partial hydration or islands research only after basic SSR/hydration is proven
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
- rendering complexity is not introduced when a simpler mode solves the validated need;
- SSR, hydration, streaming, or server functions demonstrate measurable value over the simpler mode below them;
- a new Vii-owned engine is not created when a mature replaceable engine meets the requirement without losing Vii semantics;
- agent-assisted work preserves provenance, permissions, approvals, and validation evidence where used.

## Framework decision rule

The native framework sequence may stop at any stage if:

- existing framework adapters provide sufficient value;
- CSR or static output solves the validated product need without additional server-rendering complexity;
- compiler and renderer complexity exceeds demonstrated user benefit;
- security, accessibility, tooling, or compatibility quality cannot meet Vii standards;
- maintenance capacity is insufficient.

Vii Core remains useful independently of the framework decision.

## Ecosystem capability decision rule

A Schema, Form, HTTP, testing, build, template, rendering, or other ecosystem capability remains Research or is deferred when:

- an existing library solves the validated need without losing important Vii semantics;
- there is no real consumer;
- it would delay committed Core or adapter work;
- the capability cannot remain optional and tree-shakable where appropriate;
- maintenance cost exceeds demonstrated benefit;
- API, performance, security, accessibility, compatibility, lifecycle, type-system, or execution-boundary requirements remain unclear.

## Agent decision rule

Agent integration may stop at documentation and read-only analysis if:

- host capability enforcement is insufficient;
- context freshness and provenance cannot be trusted;
- automation adds more review cost than value;
- remote-provider privacy cannot meet policy;
- deterministic CLI and validation surfaces are not mature enough.

Vii development remains fully possible without Intentloom, InLoom, agents, or AI providers.
