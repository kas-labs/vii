# RFC 0011: Runtime Compatibility

- Status: Draft
- Area: Runtime

## Summary

Define a runtime-neutral foundation with explicit adapters for Browser, Node.js, Bun, Deno, and future edge environments.

## Proposal

1. Browser and Node.js begin as Tier 1 reference environments.
2. Bun and Deno begin as Tier 2 research targets until dedicated CI fixtures are stable.
3. Runtime-neutral packages may not import runtime-specific globals or modules directly.
4. Runtime and package manager are detected and reported separately.
5. npm remains the primary package registry during the initial release stages.
6. Runtime-specific behavior belongs in separate adapter packages where isolation improves dependency and testing boundaries.

## Motivation

Vii should allow application logic, contracts, diagnostics, and state behavior to remain portable without pretending that all runtimes provide identical capabilities.

## Compatibility tiers

- Tier 1: continuously tested and release blocking
- Tier 2: supported with documented compatibility limits
- Experimental: API and support may change
- Unsupported: outside the compatibility contract

## Required compliance tests

- clean install
- ESM import
- type checking
- package exports
- State behavior
- diagnostics behavior
- cancellation
- resource disposal
- server adapter behavior where applicable

## Alternatives rejected

### Node-only architecture

Rejected because it would make future Deno, Bun, worker, desktop, and mobile integrations more expensive.

### Lowest-common-denominator runtime

Rejected because Vii should expose capabilities honestly rather than removing useful platform features.

### One package with all runtime implementations

Not prohibited, but separate adapter packages are preferred when they prevent dependency leakage and improve testing.

## Open questions

- exact supported runtime versions
- conditional exports strategy
- when Bun and Deno graduate to Tier 1
- whether selected packages should also publish to JSR
- edge runtime identifiers and capability discovery
