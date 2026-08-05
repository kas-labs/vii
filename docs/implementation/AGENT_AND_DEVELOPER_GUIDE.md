# Agent and Developer Guide

Status: Working collaboration rules

## Purpose

This guide explains how humans and AI agents should change the Vii repository without drifting away from the accepted architecture.

The repository documentation is the source of intended behavior. Code, tests, fixtures, RFCs, and ADRs provide implementation evidence.

## Before starting a task

Read the smallest relevant set of documents:

1. `docs/README.md`;
2. the current roadmap phase;
3. the architecture document for the affected package;
4. related RFCs and ADRs;
5. the package README and tests;
6. security and quality requirements for the changed boundary.

Do not infer that a Vision or Research feature is approved for implementation.

## Required task summary

Before editing code, state:

```text
Goal
In scope
Out of scope
Affected packages
Relevant RFC or ADR
Tests to add
Security impact
Compatibility impact
```

For a small bug fix, this may be a short PR description. For an architectural change, it should be a dedicated issue or RFC.

## Implementation workflow

Use this sequence:

```text
Understand
→ Inspect
→ Plan
→ Implement
→ Test
→ Validate package
→ Update docs
→ Report evidence
```

### Understand

Identify the actual user-visible or package-visible outcome.

### Inspect

Search existing code and documentation before creating a new abstraction.

### Plan

Choose the smallest change that satisfies acceptance criteria.

### Implement

Keep the dependency direction documented in `ARCHITECTURE_MAP.md`.

### Test

Add behavior, type, lifecycle, integration, or security tests appropriate to the change.

### Validate package

When public package behavior changes, validate the packed artifact in a clean consumer.

### Update docs

Update examples, limitations, compatibility, and migration notes where relevant.

### Report evidence

The PR should say what commands passed and what fixtures or measurements were used.

## Rules for AI agents

An AI agent must not:

- invent a supported API that is absent from accepted documents;
- silently add dependencies;
- create future package shells without a current task;
- merge or publish releases without explicit instruction;
- weaken security checks to make tests pass;
- replace deterministic behavior with an AI dependency;
- claim performance, compatibility, or security without evidence;
- implement Research or Vision work as if it were Committed.

When repository instructions and a task appear inconsistent, stop the implementation and describe the conflict.

## Dependency rules

Allowed direction:

```text
applications
→ adapters and tools
→ product modules
→ shared foundations
```

Examples:

- React adapter may depend on Core.
- Core may not depend on React adapter.
- CLI may inspect package metadata.
- Runtime packages may not depend on CLI.
- Testing helpers may depend on public contracts.
- Production Core must not depend on Testing.

## Coding principles

### Small public surface

Prefer fewer primitives with clear composition.

### Composition over inheritance

Prefer functions, contracts, and explicit capabilities over deep base classes.

### Explicit ownership

Subscriptions, timers, sockets, requests, and caches require a visible owner and cleanup path.

### Deterministic behavior

Core behavior should not depend on wall-clock timing, network access, random ordering, or framework scheduling unless explicitly provided as a capability.

### Secure defaults

User-controlled data remains data. Privileged operations require explicit APIs and validation.

### No premature generalization

Implement the current consumer need. Record future directions in issues or design notes rather than adding unused extension systems.

## Tests expected by change type

### Core runtime change

- unit behavior tests;
- type tests;
- lifecycle tests;
- diagnostics invariants;
- packed fixture when public API changes.

### Adapter change

- shared compliance suite;
- host-specific integration test;
- cleanup test;
- SSR isolation test where applicable.

### CLI change

- dry-run;
- deterministic plan;
- changed-file snapshot;
- idempotency;
- root confinement;
- JSON output where public.

### Security boundary change

- malicious input test;
- allow and deny cases;
- redaction test;
- documented threat and mitigation;
- no secret or raw payload logging.

### Build or packaging change

- clean build;
- package-content check;
- clean installation;
- public export resolution;
- declarations and source maps.

## Documentation style

Documentation should answer:

- What is this capability?
- Why does it exist?
- What is the mental model?
- What is the simplest example?
- What are the important edge cases?
- What is intentionally unsupported?
- How is correctness validated?

Use explicit status labels: Committed, Planned, Research, or Vision.

## Pull request checklist

A PR is ready for review when:

- scope is narrow and explained;
- acceptance criteria are satisfied;
- relevant tests pass;
- new dependencies are justified;
- package and compatibility impact are documented;
- security and privacy impact are addressed;
- docs are updated;
- no unrelated refactor is mixed in;
- completion evidence is included.

## Example task

Task: implement State equality behavior.

Expected plan:

```text
Goal: Skip propagation when Object.is(previous, next) is true.
In scope: State set/update and tests.
Out of scope: custom equality and Computed.
Package: Core.
Tests: NaN, -0, object identity, subscriber notification.
Security impact: none.
Compatibility: defines initial Alpha behavior.
```

Expected implementation evidence:

```text
pnpm test core
pnpm typecheck
pnpm build
pnpm pack:check
Vanilla fixture passes
```

## Escalation conditions

Request a decision before proceeding when:

- two documents prescribe different semantics;
- a public API must change;
- a dependency rule must be violated;
- a privileged capability lacks a security contract;
- the task requires a new package;
- an accepted RFC must be superseded;
- implementation evidence contradicts the current architecture.
