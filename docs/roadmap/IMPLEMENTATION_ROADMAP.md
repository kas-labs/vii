# Vii Implementation Roadmap

## Purpose

This roadmap converts the Vii product and architecture documentation into an executable development sequence.

The roadmap is evidence-driven. A phase is complete only when its exit criteria are satisfied. Dates are not commitments unless explicitly assigned to a milestone.

## Delivery principles

1. Start with the smallest useful runtime.
2. Validate architecture through real consumers.
3. Do not begin a major module before its prerequisites are stable.
4. Prefer thin adapters over duplicated implementations.
5. Treat diagnostics, security, testing, documentation, packaging, migrations, and agent governance as product work.
6. Keep research work separate from committed delivery.
7. Do not confuse multiple authoring profiles with multiple runtime models.
8. Do not build a general-purpose bundler before Vii-specific compiler value is proven.
9. Keep Intentloom, InLoom, agents, and AI providers outside the Vii production runtime.
10. Preserve human authority over architecture, security, governance, and releases.

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
- preserve clear boundaries between State, Query, Resource, and Stream concerns.

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
- evaluate whether agent context and task policies reduce or increase review cost.

Exit criteria:

- at least one real consumer uses the alpha package;
- major ergonomics issues are documented and resolved or explicitly deferred;
- migration path exists for accepted breaking changes;
- threat model assumptions are reviewed against the application;
- malicious fixtures cover the supported adapters and project patterns;
- agent-assisted tasks preserve provenance and deterministic evidence where used.

### Phase 5: Vii Query

Status: Planned

Goals:

- query cache, freshness, retention, cancellation, invalidation, and mutations;
- framework-neutral Query Core;
- diagnostics and hydration foundations;
- integration with State without making State depend on Query;
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
- Component Scope and Resource ownership;
- accessibility and security compiler diagnostics;
- source maps and IDE feasibility.

Exit evidence:

- all profiles share one runtime contract;
- lifecycle and diagnostics are equivalent;
- malicious template fixtures pass;
- performance and memory benefits are measured;
- tooling quality is sufficient for further investment.

### Phase 9: Native Web runtime and build research

Status: Research

Goals:

- DOM renderer;
- targeted reactive updates;
- Vite plugin;
- Vite development server integration;
- Rolldown production build;
- separate TypeScript checker;
- HMR protocol;
- client and server graphs;
- asset, route, and hydration manifests;
- optional Bun, Rspack, and Nx integration spikes.

Exit evidence:

- client and SSR reference applications build;
- HMR and source maps are usable;
- client/server secret boundary tests pass;
- build speed, memory, bundle size, and runtime memory are measured;
- Vii build orchestration provides value beyond a thin Vite preset.

### Phase 10: Vii Application Framework

Status: Vision

Potential goals:

- file-based and explicit routes;
- layouts;
- CSR and SSG;
- basic SSR and hydration;
- streaming;
- explicit hybrid route rules;
- typed loaders and server functions;
- security header generation;
- deployment adapters.

This phase advances only if the native runtime provides a clear advantage beyond existing framework adapters.

### Phase 11: Ecosystem and agent-assisted expansion

Status: Vision

Potential work:

- Forms;
- advanced Devtools;
- desktop and mobile packages;
- advanced Server integrations;
- additional UI components;
- Stream module and RxJS interop;
- partial hydration or islands research;
- additional build and deployment targets;
- Intentloom repository profiles and policy bundles;
- InLoom first-class Vii workflows;
- multi-agent task handoffs and conflict detection;
- optional AI diagnostics, migrations, and code assistance;
- local and remote provider adapters.

Protected architecture, security, governance, and release decisions remain human-controlled.

## Phase gate rule

A phase may begin in parallel only when:

- it does not destabilize committed work;
- it has a named owner;
- its dependencies are explicit;
- it is clearly marked as Research, Planned, or Vision;
- it cannot be mistaken for supported production functionality;
- its security and privacy boundaries are identified;
- its output can be deleted without blocking committed work;
- agent permissions and context boundaries are defined where automation is used.

## Stop rule

Research should stop or be deferred when:

- measured benefit does not justify complexity;
- compatibility or security cannot meet published gates;
- tooling quality would create an unacceptable developer experience;
- maintenance capacity is missing;
- existing framework adapters already solve the validated user need;
- agent host enforcement is insufficient;
- context provenance or privacy cannot meet policy;
- automation adds more review cost than value.
