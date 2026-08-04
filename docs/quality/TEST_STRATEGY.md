# Vii Test Strategy

## Purpose

Vii must be validated as an ecosystem, not only as a collection of isolated functions. Tests must prove correctness, lifecycle safety, compatibility, packaging integrity, and predictable behavior across supported environments.

## Test layers

### 1. Core correctness

Covers stores, derived values, subscriptions, batching, scopes, disposal, error handling, and deterministic notification behavior.

### 2. Contract tests

Every framework, runtime, platform, and server adapter must pass a shared compliance suite. Adapter tests verify that host-specific integrations preserve Core semantics.

### 3. Integration fixtures

The repository should contain clean consumer fixtures such as:

- `fixtures/vanilla-vite`
- `fixtures/react-vite`
- `fixtures/angular`
- `fixtures/vue-vite`
- `fixtures/node`
- `fixtures/bun`
- `fixtures/deno`
- later `fixtures/tauri` and `fixtures/capacitor`

Fixtures must install published or packed artifacts rather than relying only on source aliases.

### 4. Packaging tests

Every package release must validate:

- public `exports`
- ESM loading
- type declarations
- tree-shaking expectations
- side-effect declarations
- package contents
- source maps
- installability with supported package managers

### 5. Lifecycle and memory tests

Tests must prove that subscriptions, scopes, timers, sockets, observers, and derived graph nodes are released when ownership ends.

Memory regressions require reproducible fixtures and should not rely only on manual Devtools inspection.

### 6. SSR and request-isolation tests

Framework and Server integrations must prove:

- per-request state isolation
- no cross-request cache leakage
- safe hydration boundaries
- deterministic serialization
- cleanup after aborted requests

### 7. CLI and migration tests

CLI commands require tests for:

- analysis without mutation
- dry-run output
- deterministic plans
- file diffs
- idempotency
- rollback where supported
- JSON output stability
- mixed-framework and monorepo detection

Migrations must use fixture repositories and must be safe to rerun.

### 8. Registry tests

Registry validation covers manifests, integrity hashes, dependency graphs, framework targets, local modifications, update diffs, detach behavior, and rejection of hidden executable installation steps.

### 9. Accessibility tests

Vii UI combines automated checks with keyboard, focus, screen-reader, high-contrast, reduced-motion, and touch-target review. Automated accessibility checks are required but are not considered complete proof.

### 10. Performance tests

Benchmarks cover transfer size, execution time, memory, type-checking cost, and diagnostics overhead. Performance results must include environment and methodology.

## Required quality gates

A stable package cannot be released when:

- its Core or adapter compliance suite fails
- public types do not compile in supported TypeScript versions
- the package cannot be installed from a packed artifact
- a known cross-request or resource leak remains
- an accessibility-critical component fails its acceptance checks
- a migration modifies files outside its declared plan

## Flaky tests

Flaky tests are treated as defects. They must not be repeatedly retried until green without investigation. Quarantined tests require an issue, owner, reason, and removal date.

## Test ownership

Each package must declare:

- its required test layers
- supported environments
- fixture consumers
- performance checks
- package owner

## Initial State Alpha scope

The initial implementation must prioritize:

- store semantics
- equality behavior
- batching
- subscription ordering
- derived invalidation
- scope disposal
- resource ownership
- diagnostics invariants
- Vanilla reference integration
