# Vii RFC Process

RFCs are required for substantial changes to public APIs, architecture, package boundaries, compatibility, or project governance.

## RFC lifecycle

- Draft
- Discussion
- Accepted
- Rejected
- Implemented
- Superseded
- Withdrawn

## When an RFC is required

Use an RFC for:

- new public modules or packages
- stable public API changes
- runtime or framework support policies
- serialization or diagnostics protocols
- package naming
- plugin systems
- security-sensitive capabilities
- major CLI behavior
- governance changes

Small fixes, documentation corrections, tests, and internal refactors do not require an RFC unless they change a public contract.

## Required sections

Each RFC should include:

1. Summary
2. Motivation
3. Goals
4. Non-goals
5. Proposed design
6. Public API or protocol impact
7. Lifecycle and resource ownership
8. Compatibility
9. Diagnostics and privacy
10. Performance implications
11. Alternatives considered
12. Migration and rollback
13. Testing strategy
14. Unresolved questions

## Decision principles

An RFC is evaluated according to:

- user value
- simplicity
- consistency with Vii principles
- progressive adoption
- lifecycle safety
- framework and runtime neutrality
- implementation and maintenance cost
- evidence from prototypes or real consumers

## Acceptance

During the founder-led stage, the project maintainer makes the final decision after discussion and records the reasoning. As the maintainer group grows, governance may be revised through another RFC.

Acceptance approves the direction, not necessarily immediate implementation.
