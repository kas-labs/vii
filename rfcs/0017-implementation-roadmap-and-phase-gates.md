# RFC 0017: Implementation Roadmap and Phase Gates

- Status: Draft
- Authors: Kas Labs
- Created: 2026-08-05

## Summary

Adopt an evidence-driven implementation roadmap with explicit phase gates, milestone outcomes, issue quality requirements, and a shared Definition of Done.

## Motivation

Vii has a broad long-term vision. Without delivery gates, research and future modules could compete with the foundational work required for a reliable first release.

This RFC converts the architecture into an ordered execution model while preserving room for research.

## Proposal

### Phase order

1. repository and protocol foundation;
2. State Alpha;
3. framework adapters and CLI foundation;
4. diagnostics and Devtools foundation;
5. real application validation;
6. Query;
7. UI and Registry;
8. runtime, platform, and server research;
9. ecosystem expansion.

### Phase gates

A phase is complete only when its documented exit criteria are satisfied.

Code completion alone is insufficient. Tests, documentation, package validation, compatibility evidence, and migration notes are part of completion where applicable.

### Parallel research

Research may run in parallel when it:

- has a named owner;
- does not destabilize committed work;
- has explicit dependencies and limits;
- is clearly marked as research;
- is not represented as production support.

### Milestones

Milestones describe verifiable outcomes rather than only dates.

Initial milestones:

- documentation foundation;
- repository bootstrap;
- State prototype;
- Scope and diagnostics prototype;
- State Alpha;
- framework adapters and CLI Alpha.

### Issue requirements

Implementation issues should include:

- outcome;
- scope and non-goals;
- acceptance criteria;
- dependencies;
- tests;
- documentation;
- compatibility impact;
- security and privacy considerations;
- completion evidence.

### Definition of Done

The shared Definition of Done covers architecture, implementation, tests, performance, documentation, packaging, release, security, privacy, and review evidence.

## Phase 0 commitment

Phase 0 includes:

- pnpm workspace;
- Nx orchestration;
- strict ESM-first TypeScript baseline;
- linting, formatting, tests, builds, and package validation;
- GitHub Actions baseline;
- Core, Protocol, and Testing package boundaries only when needed;
- a clean Vanilla consumer fixture;
- Phase 1 backlog.

Phase 0 excludes the complete State implementation and all later ecosystem modules.

## Consequences

### Benefits

- protects the small-step delivery strategy;
- gives contributors clear entry points;
- makes progress measurable;
- prevents research from becoming accidental product commitments;
- treats quality and documentation as delivery work.

### Costs

- more up-front issue and milestone discipline;
- phase gates may delay visible feature expansion;
- roadmap documents require maintenance as evidence changes.

## Alternatives

### Date-first roadmap

Rejected because dates without stable implementation evidence encourage hidden scope reduction or premature releases.

### Build all package shells immediately

Rejected because empty packages create false architecture commitments and maintenance overhead.

### Implement State before repository validation

Rejected because packaging and consumer problems should be discovered before the public API grows.

## Unresolved questions

- final numeric performance budgets;
- exact CI matrix for the first implementation milestone;
- final Node and pnpm version policy;
- whether the documentation application belongs in the first or second bootstrap milestone.
