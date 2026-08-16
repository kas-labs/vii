# Vii Implementation Roadmap

## Purpose

This roadmap converts the Vii product and architecture documentation into an executable development sequence.

The roadmap is evidence-driven. A phase is complete only when its exit criteria are satisfied. Dates are not commitments unless explicitly assigned to a milestone.

## Delivery principles

1. Start with the smallest useful runtime.
2. Validate architecture through real consumers.
3. Do not begin a major module before its prerequisites are stable.
4. Prefer thin adapters over duplicated implementations.
5. Treat diagnostics, security, testing, documentation, packaging, migrations, accessibility, and agent governance as product work.
6. Keep research work separate from committed delivery.
7. Do not confuse multiple authoring profiles with multiple runtime models.
8. Do not build a general-purpose bundler before Vii-specific compiler value is proven.
9. Do not build a general-purpose test runner while mature engines meet Vii requirements; add Vii-specific testing intelligence instead.
10. Reuse mature engines behind replaceable boundaries when they do not compromise Vii semantics.
11. Make rendering complexity progressive and opt-in: CSR first, then static, SSR, streaming, and advanced server capabilities only when evidence justifies each layer.
12. Keep client, server, shared, build, and optional edge execution boundaries explicit and compiler-checkable.
13. Keep Intentloom, InLoom, agents, and AI providers outside the Vii production runtime.
14. Preserve human authority over architecture, security, governance, and releases.

## Phase sequence

### Phase 0: Repository, protocol, security, and engineering-context foundation

Status: Committed

Goals:

- bootstrap the monorepo;
- establish package boundaries;
- configure formatting, linting, testing, type checking, builds, and release validation;
- create architecture, security, RFC, ADR, implementation, and agent-policy indexes;
- define first protocol schemas and package conventions;
- maintain the initial threat model;
- create minimal consumer and malicious fixtures;
- consolidate implementation playbooks;
- define the Intentloom integration boundary;
- define agent context, permissions, approvals, mutation, rollback, and audit rules;
- optionally validate one read-only and one documentation-only Intentloom workflow.

Exit criteria:

- clean install from a fresh clone;
- one command runs validation for all projects;
- packed packages can be installed into at least one fixture;
- branch and release conventions are documented;
- security architecture and threat boundaries are referenced by Definition of Done;
- agent authority and stop conditions are explicit;
- packed runtime artifacts have no hidden Intentloom or AI dependency;
- Phase 1 issues are ready and independently actionable.

### Phase 1: Vii State Alpha

Status: Committed

Goals:

- implement State or Store primitives, computed values, subscriptions, batching, Scopes, and disposal;
- implement structured diagnostics hooks;
- publish a Vanilla TypeScript example;
- establish memory, security, and behavior contract tests;
- preserve clear boundaries between State, Query, Form, HTTP, Resource, and Stream concerns.

Exit criteria:

- public alpha API matches accepted RFCs or accepted superseding decisions;
- deterministic notification semantics are tested;
- disposal removes owned resources;
- diagnostics exclude raw values by default;
- request-isolated construction is demonstrated;
- package artifact works in a clean consumer fixture;
- documentation covers installation, mental model, API, limitations, and security assumptions.

Out of scope:

- native renderer;
- `.vii` compiler;
- Query cache;
- Form engine;
- HTTP client;
- mandatory RxJS;
- deep proxy Store;
- reducer or dispatch architecture;
- mandatory Intentloom or AI integration.

### Phase 2: Framework adapters and CLI foundation

Status: Committed

Goals:

- React, Angular, and Vue adapters;
- shared adapter compliance suite;
- `create-vii` prototype;
- `vii init`, `vii add state`, and `vii doctor`;
- deterministic project detection and dry-run output;
- safe generator engine foundations;
- stable machine-readable plans and reports for external tools;
- approval metadata without granting external clients implicit authority.

Exit criteria:

- each adapter passes the same semantic contract tests;
- no adapter reimplements Core State;
- SSR isolation is verified where applicable;
- CLI modifications are previewable, root-confined, and idempotent;
- registry scripts and hidden command execution remain disallowed;
- consumer fixtures cover supported frameworks;
- stale revision invalidates a mutation plan;
- external clients cannot bypass CLI validation.

### Phase 3: Diagnostics and Devtools foundation

Status: Planned

Goals:

- diagnostic event transport;
- trace and ownership inspection;
- bounded development buffer;
- machine-readable export;
- initial browser and CLI inspectors;
- production-safe redaction;
- structured security diagnostics;
- redacted diagnostics consumption by Intentloom and InLoom.

Exit criteria:

- important State transitions can be causally explained;
- diagnostics do not change runtime behavior;
- production-safe mode avoids State and request values by default;
- security events do not expose complete malicious payloads;
- agent consumers gain no mutation authority through diagnostics;
- overhead is measured and documented.

### Phase 4: Real application validation

Status: Planned

Goals:

- integrate Vii into at least one non-trivial reference application;
- gather external alpha feedback;
- simplify APIs based on evidence;
- confirm memory, packaging, type-check, and security behavior in a larger project;
- identify real Form and transport pain rather than designing those modules from demos alone;
- evaluate whether agent context and task policies reduce or increase review cost.

Exit criteria:

- at least one real consumer uses the alpha package;
- major ergonomics issues are documented and resolved or explicitly deferred;
- migration path exists for accepted breaking changes;
- threat model assumptions are reviewed against the application;
- malicious fixtures cover the supported adapters and project patterns;
- agent-assisted tasks preserve provenance and deterministic evidence where used.

## Cross-phase capability research

Status: Research

This work may run in parallel only when it does not destabilize committed work. Architecture documents and prototypes are allowed; package creation and support claims require the normal roadmap and governance gates.

### Form research track

Prerequisites to begin meaningful prototype work:

- State and Scope contracts are stable enough to model field ownership;
- at least one real application contains non-trivial forms;
- the adapter compliance model is usable for React, Angular, and Vue experiments.

Research goals:

- signal-first typed field tree;
- granular field state;
- sync and async validation;
- cancellation and debounce semantics;
- schema-provider neutrality;
- input/output transformations;
- nested object, array, dynamic, and multi-step forms;
- submission lifecycle and server-field errors;
- framework-neutral semantics with thin adapters;
- accessibility and native HTML integration;
- diagnostics without sensitive values;
- bundle, memory, update-count, and type-check evidence.

Primary architecture: `docs/architecture/FORM_ARCHITECTURE.md`.

A Form implementation milestone should be proposed only after research demonstrates meaningful value over using an existing form library directly.

### HTTP research track

Prerequisites to begin meaningful prototype work:

- Query's transport boundary is understood well enough to prevent duplication;
- real applications demonstrate repeated request-layer boilerplate;
- platform compatibility and server isolation requirements are explicit.

Research goals:

- Fetch-first transport;
- configured clients and deterministic overrides;
- functional middleware;
- local request context;
- AbortSignal cancellation;
- timeout semantics;
- runtime response decoding;
- stable transport errors;
- retries disabled by default;
- SSR isolation and security boundaries;
- browser, Node, Bun, and Deno fixtures when support is claimed;
- production-safe diagnostics.

Primary architecture: `docs/architecture/HTTP_CLIENT.md`.

Vii HTTP must remain transport. It must not become another Query cache or server framework.

### Toolchain and test research track

Goals:

- continue using Vitest as the canonical repository test runner while it satisfies project requirements;
- prototype Vii-specific matchers, fixtures, and compliance utilities before considering a `@vii-labs/testing` package;
- use browser automation for browser-level evidence instead of building a browser runner;
- keep Vite/Rolldown as the first native build research direction;
- keep Bun and Rspack replaceable optional adapters or compatibility targets;
- study Analog and other meta-frameworks for orchestration, not as dependencies or APIs to copy.

Primary strategy: `docs/strategy/ECOSYSTEM_CAPABILITY_STRATEGY.md`.

### Native template control-flow research track

This research belongs to the native component/compiler program and must not introduce template semantics into Core or framework adapters.

Goals:

- define control-flow IR for conditionals, keyed repetition, empty states, and switch-like branches;
- prove Scope creation and disposal for branches and repeated items;
- preserve stable list identity, focus, local state, and Resources;
- compare block, directive, and JavaScript/TSX authoring styles;
- evaluate syntax tooling, source maps, accessibility, SSR/hydration, and security;
- avoid committing to Angular-style `@` syntax until prototypes show it is the best Vii syntax.

Primary architecture: `docs/architecture/TEMPLATE_CONTROL_FLOW.md`.

### Rendering strategy research track

This track defines progressive rendering without making server rendering a default framework assumption.

Goals:

- establish CSR as the independently usable baseline native application mode;
- prove static generation separately from a server runtime;
- add SSR only as an opt-in route/application capability;
- make hydration boundaries explicit and as small as practical;
- make shared, client, server, build, and optional edge environments compiler-visible;
- reject invalid environment imports before runtime where practical;
- keep Vii SSR as presentation infrastructure that can call an independently owned backend;
- preserve visible network semantics for any future server-function abstraction;
- require measured value before streaming, partial hydration, islands, resumability, or advanced full-stack conveniences advance.

Primary architecture: `docs/architecture/RENDERING_STRATEGY.md`.

### Phase 5: Vii Query

Status: Planned

Goals:

- query cache, freshness, retention, cancellation, invalidation, and mutations;
- framework-neutral Query Core;
- diagnostics and hydration foundations;
- integration with State without making State depend on Query;
- explicit transport contract so Query can use Vii HTTP, native Fetch, or another user-supplied client;
- secure serialization and server-data boundaries.

### Phase 6: Vii UI and Registry foundation

Status: Planned

Goals:

- design tokens;
- behavior primitives;
- registry schema and lockfile;
- initial source-owned components;
- package and Web Component experiments;
- registry integrity, provenance, path, and permission checks;
- safe raw content policies.

### Phase 7: Runtime, platform, and server research

Status: Research

Goals:

- Node reference adapter;
- Bun and Deno compatibility fixtures;
- Fetch-based Server Foundation spike;
- Tauri and Capacitor capability experiments;
- typed transport contract prototype;
- validation, authorization, CSRF, SSRF, filesystem, command, upload, and serialization policies.

This phase may provide compatibility evidence to Vii HTTP research, but it does not require an HTTP package to exist.

### Phase 8: Native component research

Status: Research

Prerequisites:

- State and Scope behavior validated;
- framework adapters used in real applications;
- maintenance capacity for compiler and tooling work;
- accepted or superseding component RFC.

Goals:

- `.vii` SFC prototype;
- split TS, HTML, and CSS prototype;
- TSX prototype;
- programmatic TypeScript prototype;
- one Component IR;
- fine-grained bindings;
- first-class template control-flow IR;
- Component Scope and Resource ownership;
- accessibility and security compiler diagnostics;
- source maps and IDE feasibility.

Exit evidence:

- all profiles share one runtime contract;
- lifecycle, control flow, and diagnostics are equivalent;
- conditional and keyed-list compiler fixtures work;
- malicious template fixtures pass;
- performance and memory benefits are measured;
- tooling quality is sufficient for further investment.

### Phase 9: Native Web runtime and build research

Status: Research

Goals:

- DOM renderer;
- targeted reactive updates;
- CSR reference application before SSR work becomes a framework requirement;
- Vite plugin;
- Vite development server integration;
- Rolldown production build;
- separate TypeScript checker;
- HMR protocol;
- explicit client, server, shared, and build graphs;
- asset, route, and hydration manifests;
- compiler diagnostics for invalid environment imports;
- optional Bun, Rspack, and Nx integration spikes.

Exit evidence:

- a CSR reference application builds and runs without requiring server-rendering concepts;
- a separate SSR research application builds only after CSR foundations are validated;
- HMR and source maps are usable;
- client/server secret boundary tests pass;
- invalid cross-environment imports fail deterministically;
- build speed, memory, bundle size, hydration cost, and runtime memory are measured where applicable;
- Vii build orchestration provides value beyond a thin Vite preset.

Vii does not create a replacement bundler or Vitest-equivalent merely to own the entire toolchain.

### Phase 10: Vii Application Framework

Status: Vision

Potential goals:

- file-based and explicit routes;
- layouts;
- CSR as the default and independently usable native rendering mode;
- optional SSG / prerender;
- optional SSR and hydration;
- optional streaming and hybrid route rules;
- explicit shared, client, server, build, and optional edge boundaries;
- typed loaders and optional server functions with visible remote semantics;
- security header generation;
- deployment adapters;
- cohesive `vii dev`, `vii build`, `vii test`, and `vii check` commands over replaceable engines when justified.

SSR remains presentation infrastructure by default and must not require Vii to own the application's domain backend, database, transactions, queues, or business logic.

This phase advances only if the native runtime provides a clear advantage beyond existing framework adapters. Each rendering layer advances independently and must demonstrate value over the simpler layer below it.

### Phase 11: Ecosystem and agent-assisted expansion

Status: Vision

Potential work:

- advanced Form integrations if Form graduates;
- advanced HTTP and server integrations if HTTP graduates;
- advanced Devtools;
- desktop and mobile packages;
- additional UI components;
- Stream module and RxJS interop;
- partial hydration or islands research only after basic SSR/hydration is proven;
- additional build and deployment targets;
- Intentloom repository profiles and policy bundles;
- InLoom first-class Vii workflows;
- multi-agent task handoffs and conflict detection;
- optional AI diagnostics, migrations, and code assistance;
- local and remote provider adapters.

Protected architecture, security, governance, and release decisions remain human-controlled.

## Phase gate rule

A phase or research track may begin in parallel only when:

- it does not destabilize committed work;
- it has a named owner;
- its dependencies are explicit;
- it is clearly marked as Research, Planned, or Vision;
- it cannot be mistaken for supported production functionality;
- its security, privacy, and accessibility boundaries are identified;
- its output can be deleted without blocking committed work;
- agent permissions and context boundaries are defined where automation is used.

## Stop rule

Research should stop or be deferred when:

- measured benefit does not justify complexity;
- compatibility, accessibility, or security cannot meet published gates;
- tooling quality would create an unacceptable developer experience;
- maintenance capacity is missing;
- an existing mature library or engine solves the validated need without losing important Vii semantics;
- existing framework adapters already solve the validated user need;
- CSR or static rendering solves the target use case without SSR complexity;
- an SSR/full-stack feature blurs backend ownership without a measured product benefit;
- committed Core or adapter delivery is being delayed;
- agent host enforcement is insufficient;
- context provenance or privacy cannot meet policy;
- automation adds more review cost than value.
