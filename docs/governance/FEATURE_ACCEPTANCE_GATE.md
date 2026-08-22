# Vii Feature Acceptance and Verification Gate

Status: Active repository policy

## Purpose

A Vii feature is not complete because implementation code exists or because the happy path works locally.

Every behavior-changing implementation must provide proportionate evidence that the changed behavior:

- works as specified;
- integrates correctly with the affected Vii boundary;
- does not regress established behavior;
- handles relevant failure, lifecycle, and cancellation paths;
- does not introduce known exploitable security or privacy weaknesses in the changed attack surface;
- remains compatible with the package, runtime, framework, and platform claims made by the change.

This policy applies to maintainers, contributors, and coding agents.

It complements `AGENTS.md`, `docs/governance/CODE_QUALITY_STANDARDS.md`, RFC/ADR governance, security policy, package validation, and CI. It does not replace more specific gates.

## Core rule

> No new runtime feature, behavior change, bug fix, public integration, generator, parser, serializer, transport, registry mutation, framework adapter behavior, or security-sensitive tooling change is complete until its required verification evidence exists and passes.

Documentation-only changes do not need runtime tests unless they change executable examples, generated contracts, machine-readable schemas, or supported behavior claims.

Research prototypes may use a narrower harness when their throwaway status and unsupported claims are explicit, but every conclusion drawn from the prototype still requires evidence appropriate to that conclusion.

## Required evidence classes

Before implementation, identify which evidence classes apply. Do not wait until the end of the task to decide how the change can be verified.

### 1. Functional correctness

For every new or changed behavior:

- add tests for the intended happy path;
- add tests for important boundary and invalid-input behavior;
- verify observable outputs, state transitions, lifecycle, errors, and side effects;
- test the public contract or stable internal contract rather than only private implementation details;
- keep nondeterministic inputs such as time, randomness, scheduling, network, filesystem, and host globals controllable where they affect correctness.

A feature with no reliable test seam is an architecture warning and must be explained before merge.

### 2. Regression protection

- Every bug fix requires a regression test that demonstrates the previous failure when safely expressible.
- Behavior changes must preserve relevant existing tests.
- When a change intentionally modifies an established contract, update the contract tests and document the compatibility or migration effect.
- Refactors must preserve behavior evidence before new behavior is layered on top.

### 3. Integration and consumer evidence

Add integration evidence at the boundary actually changed.

Depending on the feature, this may include:

- package-to-package integration tests;
- framework adapter tests;
- clean consumer fixtures;
- packed-package installation and import tests;
- CLI dry-run/apply/idempotency fixtures;
- browser-level tests;
- SSR/request-isolation fixtures;
- Node, Bun, Deno, browser, worker, desktop, or mobile compatibility fixtures when support is claimed;
- type-level tests for public TypeScript behavior;
- generated-artifact verification.

Unit tests alone are insufficient when the failure mode exists at an integration boundary.

### 4. Failure, cancellation, disposal, and recovery

When relevant, test:

- invalid input;
- partial failure;
- cancellation and `AbortSignal` propagation;
- disposal/unsubscription and retained-resource cleanup;
- stale or superseded asynchronous completion;
- repeated execution and idempotency;
- rollback/recovery semantics;
- timeout or unavailable dependency behavior;
- duplicate, conflicting, or concurrent operations.

Do not test only the success path for lifecycle-sensitive code.

### 5. Security and privacy evidence

Every change must consider whether it creates or modifies an attack surface.

For security-relevant changes, add proportionate adversarial fixtures for applicable risks such as:

- malformed or hostile structured input;
- prototype pollution and property injection;
- path traversal, symlink escape, or destination breakout;
- command or script injection;
- HTML/script injection and CSP violations;
- SSRF or unsafe URL handling;
- unsafe redirects;
- authorization or ownership bypass;
- secret, credential, cookie, request-body, user-content, or raw-value leakage;
- unsafe deserialization;
- unbounded recursion, alias chains, payload size, fan-out, or other denial-of-service surfaces;
- integrity/provenance mismatch;
- dependency or lifecycle-script execution;
- cross-request state leakage in SSR/server code.

Security testing is risk-based. Do not add irrelevant checklist tests only to satisfy the policy.

Passing automated tests does not prove that software has no vulnerabilities. The merge requirement is that the relevant threat surface has been reviewed, required adversarial tests pass, security findings are resolved or explicitly accepted under governance, and no known exploitable weakness is being hidden by the change.

### 6. Compatibility and artifact evidence

When relevant, verify:

- ESM/package exports;
- type declarations;
- tree-shaking and side-effect metadata;
- packed package contents;
- clean installation in a consumer fixture;
- SSR/non-browser import safety;
- supported framework lifecycle behavior;
- supported runtime/platform behavior;
- schema/protocol/version compatibility.

Do not infer package correctness from source-level unit tests alone.

### 7. Performance, bundle, and memory evidence

When a change can materially affect Vii's performance thesis, measure the affected dimension rather than asserting it.

Applicable evidence may include:

- before/after benchmark;
- representative workload benchmark;
- bundle or packed-artifact size;
- tree-shaking result;
- allocation or retention test;
- disposal/leak fixture;
- TypeScript compiler-cost measurement.

Do not introduce arbitrary budgets after implementation merely to make a result pass. Budgets require a baseline or accepted product requirement.

### 8. Accessibility evidence

For user-interface behavior, include the level of accessibility evidence appropriate to the feature:

- semantic role/state contract tests;
- keyboard interaction tests;
- focus lifecycle tests in a real DOM/browser when focus is part of behavior;
- automated accessibility audits where useful;
- forced-colors/reduced-motion/RTL checks when affected;
- browser/assistive-technology validation when the support claim requires it.

Automated accessibility tests do not justify a blanket `100% accessible` claim.

## Verification pyramid

Use the smallest reliable test for each invariant, then add boundary evidence where lower-level tests cannot prove the real behavior.

A typical implementation may need:

```text
unit / contract tests
        ↓
integration / adapter tests
        ↓
consumer / package / browser fixtures
        ↓
security, compatibility, performance, or accessibility evidence where applicable
```

Not every feature requires every layer. Every omitted layer must be irrelevant to the changed risk or already covered by an equivalent existing fixture.

## Negative and adversarial testing rule

For parsers, validators, serializers, codecs, transports, registries, CLI mutations, server handlers, file operations, hydration boundaries, configuration readers, and other untrusted-input surfaces, happy-path tests are never sufficient by themselves.

The task plan must identify representative invalid and hostile cases before implementation is considered complete.

## Test-first expectation

For behavior changes with a clear test seam, prefer red-green or equivalent test-first evidence:

1. establish or add the failing/required behavior test;
2. implement the smallest correct change;
3. make the focused test pass;
4. run relevant neighboring/regression tests;
5. run repository validation before publication.

Research may begin with exploratory fixtures, but accepted behavior must end with repeatable automated evidence where practical.

## Merge gate

Before committing or opening an implementation pull request, run the relevant focused checks.

Before merge, the change must have:

- required focused tests passing;
- regression tests passing;
- required integration/consumer fixtures passing;
- applicable adversarial/security tests passing;
- applicable compatibility/accessibility/performance evidence recorded;
- `git diff --check` passing locally when available;
- repository `pnpm validate` passing for implementation changes unless an explicitly documented diagnostic PR exists to fix a known failure;
- CI required checks passing;
- complete diff reviewed for accidental scope, unsafe debug code, secrets, generated noise, and unsupported claims.

A PR must not be described as complete when required evidence was not run. Record environmental blockers and the exact remaining verification instead.

## Pull request evidence

Implementation PRs must summarize, when applicable:

- feature/behavior tested;
- focused functional tests;
- regression coverage;
- integration or consumer fixtures;
- negative/adversarial cases;
- security/privacy review result;
- compatibility/package/runtime evidence;
- accessibility evidence;
- performance/bundle/memory evidence;
- `pnpm validate` and CI status;
- known limitations and deferred risks.

Do not use vague statements such as `tests added`, `security checked`, or `works correctly` when exact evidence can be named.

## Agent requirements

Coding agents must treat verification as part of implementation, not as an optional final cleanup step.

For each implementation task, the agent must:

1. identify required evidence during preflight;
2. add or update tests together with the behavior;
3. include relevant failure and adversarial cases;
4. run focused checks while iterating;
5. run the canonical repository validation before publication;
6. inspect the complete diff;
7. report exact commands/results and unresolved verification gaps in `DUTY_WATCH.md`;
8. stop rather than claim completion when a required gate cannot be demonstrated.

Agents must never invent test results, security conclusions, benchmark numbers, or CI status.

## Relationship to research phases

Evidence-first research follows the same principle but does not accidentally create support promises.

A research slice must define what its fixtures are intended to prove and what they cannot prove.

For build-vs-buy work, each candidate must be compared against the same relevant behavior, security, compatibility, maintenance, and performance criteria. A custom Vii implementation does not win merely because it was implemented locally.

## Completion rule

A task is complete only when implementation, tests, required security/compatibility evidence, documentation, validation, project-state updates, and Duty Watch handoff are mutually consistent.

If any required verification remains, mark the task `partial` or the PR explicitly incomplete. Do not convert missing evidence into an assumption.