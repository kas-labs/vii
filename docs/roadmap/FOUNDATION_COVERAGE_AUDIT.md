# Foundation Coverage Audit

Status: Working audit

## Purpose

This audit evaluates whether the Vii repository has enough product, architecture, governance, security, and execution documentation to begin implementation without treating the documentation as proof of a finished design.

The conclusion is intentionally nuanced:

- the architecture foundation is broad and unusually detailed for a pre-alpha project;
- the implementation order is sufficiently constrained to begin Phase 0;
- several policy and product decisions remain intentionally open;
- Intentloom and agent governance required a dedicated integration baseline;
- implementation playbooks needed to be consolidated into the main documentation path.

## Coverage summary

| Area | Coverage | Assessment |
|---|---|---|
| Product thesis and boundaries | Strong | Clear purpose, anti-goals, gradual adoption, deterministic core |
| System architecture | Strong | Layer map, dependency direction, package model, runtime boundaries |
| State and lifecycle | Strong for Alpha planning | State, Computed, Batch, Scope, Resources, disposal, open prototype questions |
| Diagnostics and observability | Strong | Structured, causal, bounded, privacy-safe protocol direction |
| Framework adapters | Strong | Thin adapter contract and shared compliance model |
| CLI and project mutation | Strong | Analyze, Plan, Preview, Apply, Validate, Report lifecycle |
| UI and registry | Strong as Planned architecture | Source, package, Web Components, tokens, integrity and lockfile direction |
| Runtime, server, desktop, mobile | Appropriate Research coverage | Capability model and research boundaries without false support claims |
| Native framework and build system | Appropriate Research and Vision coverage | Component IR, compiler, renderer, SSR and build direction remain gated |
| Security and privacy | Strong | Security architecture, threat model, trust boundaries, malicious fixtures |
| Quality and compatibility | Strong | Test layers, package fixtures, performance dimensions, compatibility tiers |
| Governance and releases | Strong | RFC, ADR, package lifecycle, API stability, release channels |
| Implementation roadmap | Strong | Phase gates, Definition of Done, issue breakdown, Phase 0 and State playbooks |
| Agent collaboration | Partial before this audit | General agent guide existed, but authority, context, permissions, and approvals needed dedicated documents |
| Intentloom integration | Missing before this audit | Required explicit product boundary and development-time integration contract |
| Legal and brand decisions | Open by design | License, trademarks, package names, domains, and organization-wide policy require separate decisions |

## What is sufficiently defined

The following decisions are clear enough to start repository implementation:

- Vii begins as a framework-neutral TypeScript foundation;
- the first implementation target is one buildable and packable Core package;
- State semantics come before Query, UI, native components, and the application framework;
- Scope owns lifecycle and disposable Resources;
- diagnostics are structured and privacy-safe by default;
- Vanilla is the first packed consumer fixture;
- React, Angular, and Vue adapters remain thin bridges;
- CLI mutations are deterministic, previewable, root-confined, and validated;
- Browser and Node are the first reference environments;
- Nx is repository orchestration, not a runtime dependency;
- AI remains optional and cannot replace deterministic validation;
- security, packaging, documentation, and compatibility are part of completion.

## What is intentionally unresolved

Implementation should not invent final answers for these items without evidence or a decision record:

- final public package names and npm publication layout;
- final license;
- exact supported Node, browser, TypeScript, and framework versions;
- numeric bundle and performance budgets;
- notification ordering and re-entrant State semantics;
- final diagnostics schema identifiers and buffering strategy;
- final component authoring format and compiler design;
- final SSR, routing, deployment, and build contracts;
- native mobile renderer direction;
- organization-wide governance across Kas Labs products;
- final Intentloom configuration and schema names;
- release signing, SBOM, and trusted publishing requirements.

These are not documentation failures. They are decision gates that depend on prototypes, users, or operational capacity.

## Gaps closed by this foundation PR

### 1. Implementation playbooks

The repository gains practical guides for:

- Phase 0 execution;
- State Alpha implementation;
- first implementation backlog;
- incremental repository structure;
- agent and developer collaboration;
- reusable task specifications.

### 2. Intentloom product boundary

Intentloom is defined as a development-time engineering-context and agent-governance system, not a Vii runtime dependency.

### 3. Agent authority

The repository gains explicit rules for:

- agent roles and operating modes;
- least-privilege capabilities;
- human approval boundaries;
- non-delegable decisions;
- audit evidence;
- stop and escalation conditions.

### 4. Context and memory

The repository gains a provenance-aware context hierarchy with freshness, trust, privacy, and no-hidden-memory rules.

### 5. Mutation protocol

The repository gains a complete approval lifecycle around the existing CLI mutation model.

## Remaining documentation work before a public Alpha

The project can begin Phase 0 now, but a public State Alpha will still require:

- package-specific README and API documentation;
- accepted or superseding decisions for implemented semantics;
- compatibility matrix with tested versions;
- published benchmark methodology and actual measurements;
- release and migration notes;
- vulnerability reporting channel and response ownership;
- final license and package publication configuration;
- consumer examples generated from tested code.

## Recommended next PR sequence

```text
P0.1 repository bootstrap
→ P0.2 TypeScript and ESM baseline
→ P0.3 lint, formatting, and test foundation
→ P0.4 Nx orchestration
→ P0.5 first buildable Core package
→ P0.6 package validation
→ P0.7 packed Vanilla fixture
→ P0.8 CI validation
→ P0.9 State Alpha implementation backlog
```

Intentloom work should proceed in parallel only as a small documentation and policy profile. It must not delay the first Core package.

## Definition of “foundation complete”

The documentation foundation is complete enough for implementation when:

- a developer can identify the current phase and non-goals;
- package dependency direction is unambiguous;
- the first PR sequence is explicit;
- security and quality gates are referenced from task templates;
- agents have bounded authority and stop conditions;
- open decisions are visible rather than hidden;
- no Research or Vision direction is presented as current support.

This does not mean the architecture will never change. It means future changes must be evidence-based, reviewable, and recorded through the existing governance process.
