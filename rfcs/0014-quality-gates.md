# RFC 0014: Quality Gates

- Status: Draft
- Area: Quality

## Summary

Vii adopts ecosystem-level quality gates covering correctness, contracts, packaging, lifecycle safety, compatibility, accessibility, performance, and security.

## Motivation

A library can pass unit tests while still failing consumers through broken exports, framework lifecycle mismatches, request-state leakage, memory retention, invalid generated code, or expensive public types. Vii therefore requires evidence at the boundaries users actually depend on.

## Proposal

The project establishes these mandatory test categories:

1. Core correctness
2. Shared adapter compliance
3. Consumer fixture installation
4. Packaging and public exports
5. Scope and resource cleanup
6. SSR and request isolation
7. CLI, migration, and registry safety
8. Accessibility for UI packages
9. Performance and TypeScript cost
10. Security-sensitive boundary tests

Stable releases may define package-specific subsets, but omissions must be documented.

## Quality-gate principles

- Tests must use packed or published artifacts where consumer behavior is being validated.
- Flaky tests are defects, not a normal release condition.
- Performance claims require reproducible methodology.
- Accessibility requires manual and automated evidence.
- Migration commands must be deterministic and idempotent.
- Adapter support requires the shared compliance suite.
- Runtime support requires explicit fixtures and a published tier.

## Initial State Alpha gates

State Alpha must prove:

- deterministic store behavior
- defined equality semantics
- batching behavior
- subscription ordering
- derived invalidation
- scope and resource disposal
- bounded diagnostics behavior
- Vanilla consumer installation
- package exports and type declarations

## Alternatives considered

### Unit tests only

Rejected because they do not validate package, runtime, framework, or lifecycle boundaries.

### Add quality rules after implementation

Rejected because architecture and public APIs would be created without acceptance criteria.

## Open questions

- Exact CI matrix and operating systems
- Benchmark baseline hardware and variance policy
- Browser automation provider
- Memory-test implementation per runtime
- Accessibility review workflow

## Consequences

The project accepts slower, more deliberate releases in exchange for trustworthy compatibility and reduced ecosystem breakage.
