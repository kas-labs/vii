# Vii Implementation Roadmap

## Purpose

This roadmap converts the Vii product and architecture documentation into an executable development sequence.

The roadmap is evidence-driven. A phase is complete only when its exit criteria are satisfied. Dates are not commitments unless explicitly assigned to a milestone.

## Delivery principles

1. Start with the smallest useful runtime.
2. Validate architecture through real consumers.
3. Do not begin a major module before its prerequisites are stable.
4. Prefer thin adapters over duplicated implementations.
5. Treat diagnostics, testing, documentation, and migrations as product work.
6. Keep research work separate from committed delivery.

## Phase sequence

### Phase 0: Repository and protocol foundation

Status: Committed

Goals:

- bootstrap the monorepo;
- establish package boundaries;
- configure formatting, linting, testing, type checking, builds, and release validation;
- create architecture and RFC indexes;
- define first protocol schemas and package conventions;
- create minimal consumer fixtures.

Exit criteria:

- clean install from a fresh clone;
- one command runs validation for all projects;
- packed packages can be installed into at least one fixture;
- branch and release conventions are documented;
- Phase 1 issues are ready and independently actionable.

### Phase 1: Vii State Alpha

Status: Committed

Goals:

- implement stores, derived values, subscriptions, batching, scopes, and disposal;
- implement structured diagnostics hooks;
- publish a Vanilla TypeScript example;
- establish memory and behavior contract tests.

Exit criteria:

- public alpha API matches accepted RFCs or accepted superseding decisions;
- deterministic notification semantics are tested;
- disposal removes owned resources;
- package artifact works in a clean consumer fixture;
- documentation covers installation, mental model, API, and limitations.

### Phase 2: Framework adapters and CLI foundation

Status: Committed

Goals:

- React, Angular, and Vue adapters;
- shared adapter compliance suite;
- `create-vii` prototype;
- `vii init`, `vii add state`, and `vii doctor`;
- deterministic project detection and dry-run output.

Exit criteria:

- each adapter passes the same semantic contract tests;
- no adapter reimplements Core state;
- SSR isolation is verified where applicable;
- CLI modifications are previewable and idempotent;
- consumer fixtures cover supported frameworks.

### Phase 3: Diagnostics and Devtools foundation

Status: Planned

Goals:

- diagnostic event transport;
- trace and ownership inspection;
- bounded development buffer;
- machine-readable export;
- initial browser and CLI inspectors.

Exit criteria:

- important state transitions can be causally explained;
- diagnostics do not change runtime behavior;
- production-safe mode avoids state values by default;
- overhead is measured and documented.

### Phase 4: Real application validation

Status: Planned

Goals:

- integrate Vii into at least one non-trivial reference application;
- gather external alpha feedback;
- simplify APIs based on evidence;
- confirm memory, packaging, and type-check behavior in a larger project.

Exit criteria:

- at least one real consumer uses the alpha package;
- major ergonomics issues are documented and resolved or explicitly deferred;
- migration path exists for accepted breaking changes.

### Phase 5: Vii Query

Status: Planned

Goals:

- query cache, freshness, retention, cancellation, invalidation, and mutations;
- framework-neutral Query Core;
- diagnostics and hydration foundations;
- integration with State without making State depend on Query.

### Phase 6: Vii UI and Registry foundation

Status: Planned

Goals:

- design tokens;
- behavior primitives;
- registry schema and lockfile;
- initial source-owned components;
- package and Web Components experiments.

### Phase 7: Runtime, platform, and server research

Status: Research

Goals:

- Node reference adapter;
- Bun and Deno compatibility fixtures;
- Fetch-based Server Foundation spike;
- Tauri and Capacitor capability experiments;
- typed transport contract prototype.

### Phase 8: Ecosystem expansion

Status: Vision

Potential work:

- Forms;
- advanced Devtools;
- desktop and mobile packages;
- Server integrations;
- additional UI components;
- Router research;
- optional AI assistance governed by Intentloom.

## Phase gate rule

A phase may begin in parallel only when:

- it does not destabilize committed work;
- it has a named owner;
- its dependencies are explicit;
- it is clearly marked as research or planned;
- it cannot be mistaken for supported production functionality.
