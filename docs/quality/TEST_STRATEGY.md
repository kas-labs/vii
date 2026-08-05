# Vii Test Strategy

## Purpose

Vii must be validated as an ecosystem, not only as a collection of isolated functions. Tests must prove correctness, lifecycle safety, compatibility, packaging integrity, security, and predictable behavior across supported environments.

Documentation records intent. Fixtures and tests provide evidence.

## Test layers

### 1. Core correctness

Covers State, computed values, subscriptions, batching, Scopes, disposal, errors, and deterministic notification behavior.

Required areas include:

- equality and skipped updates;
- dependency tracking;
- computed invalidation;
- nested batches;
- re-entrancy policy;
- disposal;
- error recovery;
- diagnostics invariants.

### 2. Contract tests

Every framework, runtime, platform, build, and server adapter must pass a shared compliance suite appropriate to its category.

Adapter tests verify that host-specific integrations preserve Core semantics rather than implementing a second State, lifecycle, diagnostics, or security model.

### 3. Integration fixtures

The repository should contain clean consumer fixtures such as:

- `fixtures/vanilla-vite`;
- `fixtures/react-vite`;
- `fixtures/angular`;
- `fixtures/vue-vite`;
- `fixtures/node`;
- later `fixtures/bun` and `fixtures/deno`;
- research `fixtures/vii-sfc`;
- research `fixtures/vii-split`;
- research `fixtures/vii-tsx`;
- research `fixtures/vii-ssr`;
- later `fixtures/tauri` and `fixtures/capacitor`.

Fixtures install published or packed artifacts rather than relying only on source aliases.

Research fixtures do not imply support.

### 4. Packaging tests

Every package release must validate:

- public `exports`;
- ESM loading;
- type declarations;
- tree-shaking expectations;
- side-effect declarations;
- package contents;
- source maps;
- installability with supported package managers;
- absence of unintended secrets and development files;
- declared provenance and release metadata where available.

### 5. Lifecycle and memory tests

Tests must prove that subscriptions, Scopes, timers, sockets, observers, requests, component nodes, and derived graph nodes are released when ownership ends.

Memory regressions require reproducible fixtures and must not rely only on manual Devtools inspection.

Required scenarios:

- repeated mount and unmount;
- route transitions;
- aborted requests;
- failed resources;
- HMR replacement where implemented;
- post-disposal retained-object checks.

### 6. SSR and request-isolation tests

Framework and Server integrations must prove:

- per-request State and service isolation;
- no cross-request cache or authorization leakage;
- safe hydration boundaries;
- deterministic serialization;
- cleanup after aborted requests;
- streaming cancellation;
- no server secret in client bundles or payloads;
- hydration mismatch behavior that does not use unsafe raw HTML fallback.

### 7. Compiler and authoring-profile tests

A future native component compiler must validate:

- `.vii` SFC parsing;
- split TS, HTML, and CSS parsing;
- TSX lowering;
- programmatic TypeScript compatibility;
- equivalent Component IR and lifecycle semantics;
- source maps;
- accessibility diagnostics;
- security sink classification;
- client and server boundary checks;
- malformed source and fuzz inputs.

All authoring profiles must pass shared semantic fixtures.

### 8. Build system tests

A future Vii Build System requires fixtures for:

- Vite development transforms;
- Rolldown production output;
- client and server environment graphs;
- route-level splitting;
- CSS and asset output;
- HMR boundaries;
- build cache invalidation;
- manifest generation;
- packed production output;
- optional Bun, Rspack, and Nx research adapters;
- rejection of environment boundary violations.

Build engines must not change Vii runtime semantics.

### 9. CLI and migration tests

CLI commands require tests for:

- analysis without mutation;
- dry-run output;
- deterministic plans;
- project-root confinement;
- file diffs;
- idempotency;
- atomic or recoverable writes where supported;
- rollback guidance;
- JSON output stability;
- mixed-framework and monorepo detection;
- component authoring profiles;
- hidden command and path-traversal rejection.

Migrations use fixture repositories and are safe to rerun.

### 10. Nx integration tests

When `@vii/nx` exists, test:

- project inference;
- generators using the shared CLI engine;
- inferred build, test, type-check, and dev tasks;
- affected execution;
- project graph metadata;
- migrations;
- operation in an Nx workspace without changing standalone Vii behavior.

### 11. Registry tests

Registry validation covers:

- manifests;
- integrity hashes;
- dependency graphs;
- framework targets;
- local modifications;
- update diffs;
- detach behavior;
- path traversal;
- archive extraction;
- provenance where supported;
- permission declarations;
- rejection of hidden executable installation steps;
- distinction between declarative components and executable plugins.

### 12. Security tests

Security evidence includes:

- context-specific output encoding;
- XSS payload corpus;
- raw HTML safe-type enforcement;
- unsafe URL protocols;
- CSS and event binding restrictions;
- Content Security Policy fixtures;
- Trusted Types fixtures;
- parser and SSR serializer fuzzing;
- malicious hydration payloads;
- cross-request leakage;
- CSRF and origin checks;
- SSRF policies;
- SQL and NoSQL integration guidance fixtures;
- command injection and shell restrictions;
- path traversal and symlink escape;
- file upload and archive abuse;
- sensitive diagnostics and log injection;
- malicious registry and plugin cases;
- dependency and secret scanning;
- AI prompt-injection tool tests.

A known critical injection, secret-leak, cross-request, registry-execution, or authorization-boundary defect blocks release.

### 13. Accessibility tests

Vii UI and native components combine automated checks with keyboard, focus, screen-reader, high-contrast, reduced-motion, and touch-target review.

Automated accessibility checks are required but are not considered complete proof.

The native compiler should provide source-level accessibility diagnostics where practical.

### 14. Performance tests

Benchmarks cover:

- transfer size;
- State execution;
- fine-grained rendering;
- memory and cleanup;
- type-checking cost;
- compiler transform time;
- development startup;
- HMR latency;
- production build time;
- build peak memory;
- diagnostics overhead;
- SSR latency and streaming behavior.

Performance results include environment and methodology.

### 15. AI safety tests

If AI tooling gains project access, tests cover:

- direct and indirect prompt injection;
- untrusted repository and webpage instructions;
- denied secret access;
- path, command, and origin policy;
- approval gates;
- deterministic CLI plan enforcement;
- no direct execution of model output;
- provider and data-scope configuration.

## Required quality gates

A stable package cannot be released when:

- its Core or adapter compliance suite fails;
- public types do not compile in supported TypeScript versions;
- the package cannot be installed from a packed artifact;
- a known cross-request or resource leak remains;
- a known release-blocking security defect remains;
- an accessibility-critical component fails its acceptance checks;
- a migration modifies files outside its declared plan;
- a build emits server secrets into a client artifact;
- a registry operation can execute undeclared code;
- security claims lack corresponding fixtures.

## Flaky tests

Flaky tests are defects. They must not be repeatedly retried until green without investigation.

Quarantined tests require an issue, owner, reason, risk classification, and removal date. Security tests should not be silently quarantined.

## Test ownership

Each package declares:

- required test layers;
- supported environments;
- fixture consumers;
- performance checks;
- security and abuse-case tests;
- package owner;
- vulnerability-response owner.

## Initial State Alpha scope

The initial implementation prioritizes:

- State semantics;
- equality behavior;
- batching;
- subscription ordering;
- computed invalidation;
- Scope disposal;
- Resource ownership foundations;
- diagnostics invariants;
- SSR-safe construction;
- diagnostics privacy;
- Vanilla reference integration;
- packed artifact consumption.

Native component, build, SSR framework, Nx, and expanded security fixtures are introduced only when those layers enter Research implementation milestones.
