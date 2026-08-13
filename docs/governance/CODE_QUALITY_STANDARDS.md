# Vii Code Quality Standards

These standards apply to maintainers, contributors, and coding agents. They complement the repository governance, RFC/ADR processes, API stability policy, test strategy, and package lifecycle rules.

The goal is not to maximize abstractions. The goal is to keep Vii small, understandable, replaceable, testable, observable, and safe to evolve.

## 1. Decision order

When concerns compete, use this order:

1. security, privacy, ownership, compatibility, and explicit approval boundaries;
2. accepted specifications, RFCs, ADRs, and public contracts;
3. correctness and observable runtime behavior;
4. bundle size, memory lifecycle, SSR safety, and performance budgets;
5. maintainability and testability;
6. local style preferences.

SOLID, Clean Architecture, DRY, KISS, YAGNI, and composition are design heuristics. They do not justify unused interfaces, layers, packages, factories, registries, or services. New abstractions need a real consumer, a stable boundary, a test seam, lifecycle separation, or demonstrated duplication.

## 2. Cohesion and dependency direction

- One module should have one primary reason to change.
- Core/domain behavior must not depend on React, Angular, devtools UI, bundlers, package managers, filesystem, network, or host-specific APIs unless that dependency is the explicit purpose of the package.
- Dependencies point toward stable contracts and lower-level runtime primitives.
- Framework adapters depend on core. Core never depends on adapters.
- Package-private implementation details must not leak into public contracts accidentally.
- Put validation at boundaries rather than duplicating rules in each adapter.
- Prefer pure functions and explicit inputs for deterministic behavior.
- Keep side effects, scheduling, timers, host globals, diagnostics sinks, and platform access behind narrow typed boundaries.
- Avoid generic `utils`, `helpers`, `common`, or `manager` modules that collect unrelated responsibilities.
- Barrel files may expose cohesive public contracts but should not become implementation homes.

## 3. Code size budgets

Line limits are guardrails, not a formatting game. Count formatted physical lines in hand-written files.

### Hand-written production source

- Preferred target: no more than **250 lines** per file.
- Refactoring review begins above **300 lines**.
- Hard limit for a new or substantially expanded production file: **400 lines** unless an approved exception is documented.

### Tests

- Preferred target: no more than **400 lines** per test file.
- Hard review threshold for a new test file: **700 lines**.
- Split tests by behavior, contract, boundary, or scenario, not by arbitrary line ranges.

### Existing oversized files

Existing oversized files are debt, not precedent.

- Do not grow them by default.
- A meaningful behavior change should extract at least one cohesive responsibility, or record a concrete decomposition follow-up.
- Prefer incremental behavior-preserving extraction over broad rewrites.

Generated files, lockfiles, snapshots, vendored code, machine-produced schemas, benchmark result data, and declarative tables may exceed these limits when their status is clear.

## 4. Function and method budgets

- Preferred target: **40 lines** per function or method.
- Hard review threshold: **80 lines** unless an approved exception exists.
- Preferred cyclomatic complexity: **10 or less**.
- Complexity review threshold: **15**.
- Preferred maximum nesting depth: **3**.
- Prefer no more than **4 positional parameters**. Use a typed options object when arguments form one concept.

Split functions by named behavior and responsibility. Do not hide important ordering, batching, rollback, scheduling, or lifecycle semantics merely to satisfy a number.

## 5. Runtime and library correctness

Vii runtime behavior must be explicit and testable.

For relevant changes, review:

- subscription ownership and disposal;
- retained references and leak risk;
- batching boundaries and update ordering;
- derived-state invalidation and recomputation behavior;
- error propagation;
- sync/async semantics;
- SSR and non-browser safety;
- use of global state;
- tree-shaking and package side effects;
- ESM/package export correctness;
- packed artifact contents;
- type declarations and public type compatibility;
- diagnostics overhead when disabled and enabled.

Do not introduce hidden mutable singleton state when scoped state can be explicit.

## 6. Testability requirements

- Every behavior change requires tests at the lowest reliable level.
- Every bug fix requires a regression test that fails before the fix when safely expressible.
- Add integration, adapter, consumer-fixture, package-artifact, type, SSR, or compatibility tests at the boundary being changed.
- Test public behavior and invariants rather than private implementation order.
- Keep time, randomness, scheduling, host globals, network, and external processes controllable in tests when used.
- A refactor should preserve existing behavior tests before new behavior is added.
- Snapshot tests are not sufficient evidence by themselves for public API compatibility, memory lifecycle, security, package contents, or performance claims.

## 7. TypeScript rules

- Keep TypeScript strict.
- Do not weaken types with broad `any`, unchecked casts, or type assertions used to suppress design problems.
- Prefer explicit discriminated states for lifecycle and asynchronous behavior.
- Public generic types should remain understandable and should not impose excessive compile-time complexity for marginal API convenience.
- Avoid exposing internal implementation types accidentally through inferred public exports.
- Preserve compatibility intentionally. Public type changes follow the API stability and RFC policies.

## 8. Framework adapters

- Core is the source of truth for behavior.
- Adapters translate framework lifecycle and subscription semantics without reimplementing core rules.
- Framework-specific dependencies must not enter canonical core packages.
- Adapter tests should prove cleanup, update behavior, ownership, and expected framework integration.
- Keep adapters thin enough that framework upgrades can be isolated.

### React and TypeScript

- Components and Hooks must be pure: keep side effects out of render, call Hooks only at the top
  level of React functions, and treat props, state, and Hook values as immutable render snapshots.
- Bridge external stores with `useSyncExternalStore` or a documented equivalent that preserves stable
  snapshots, selector equality, SSR behavior, and subscription cleanup. Test unmount and Strict Mode
  behavior whenever an adapter owns subscriptions or event listeners.
- Keep React at the adapter or application edge. Core contracts must not import React, React DOM, or
  browser globals.
- Keep TypeScript strict. Model state, command results, and lifecycle transitions with explicit
  object and discriminated-union types; do not use `any`, broad casts, or assertions to bypass an
  unclear boundary.
- Use [React Rules](https://react.dev/reference/rules) and
  [React with TypeScript](https://react.dev/learn/typescript) as the implementation reference.

## 9. Performance, bundle, and memory evidence

Performance is part of Vii's product thesis, so claims require evidence.

- Benchmark methodology must be reproducible and documented.
- Record environment assumptions and comparison scope.
- Avoid benchmark-specific production code unless the optimization improves representative workloads and remains maintainable.
- Measure before and after performance-sensitive changes when practical.
- Bundle changes should inspect packed artifacts and tree-shaking behavior where relevant.
- Memory-sensitive changes should test disposal/retention behavior where practical and avoid claims that cannot be demonstrated.
- A faster microbenchmark does not automatically justify a more complex architecture.

## 10. Security, privacy, and dependencies

- No hidden telemetry or network access.
- New runtime dependencies require explicit justification. Zero runtime dependencies remains the preferred default for low-level core packages when practical.
- Dependencies must not be added only to save a small amount of straightforward code when they materially increase supply-chain, bundle, maintenance, or compatibility cost.
- Validate untrusted input at package/tooling boundaries.
- Keep secrets out of logs, fixtures, diagnostics exports, examples, and repository history.
- Security/privacy default changes require the appropriate RFC/maintainer review.

## 11. Exceptions

An exception is allowed only when following the default rule would reduce correctness, safety, compatibility, performance, or clarity.

The pull request must record:

- the exact rule and affected file/function;
- measured value and configured/default limit;
- why splitting or simplifying is unsafe now;
- why the exception is narrower than alternatives;
- responsible package/area;
- expiry, review trigger, or concrete follow-up.

Exceptions are not permanent precedent and must not be copied into unrelated code.

## 12. Preflight for implementation work

Before writing implementation code:

1. inspect relevant product boundaries, RFCs/ADRs, package contracts, tests, and neighboring modules;
2. identify the responsibility being changed and intended dependency direction;
3. check the size and likely growth of touched production files;
4. identify extraction points before adding behavior to oversized files;
5. identify runtime, adapter, package, SSR, bundle, memory, security, or compatibility risks;
6. state the tests and evidence required for completion;
7. identify any needed exception before implementation rather than after exceeding a limit.

## 13. Pull request evidence

Implementation pull requests must state, when applicable:

- which architectural/package boundary changed;
- whether public API or compatibility changed;
- which files were split or intentionally kept together;
- whether source/function budgets were exceeded;
- tests, builds, packed-artifact checks, benchmarks, or static checks run;
- bundle/memory/SSR impact;
- dependencies added or removed;
- exceptions and follow-up work;
- migration/documentation impact.

Clean Architecture or SOLID is not considered satisfied because folders or interfaces were added. Evidence is lower coupling, clearer responsibility, stable dependency direction, replaceable edges, and focused tests.
