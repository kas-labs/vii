# RFC 0001: Vii Product Thesis

- Status: Draft
- Created: 2026-08-05
- Authors: Vitalii Kasap

## Summary

Vii will begin as a lightweight, observable, framework-agnostic TypeScript foundation. It will expand gradually through validated modules and adapters rather than launching as a complete framework.

## Motivation

Application behavior becomes difficult to understand when state, server data, framework rendering, platform capabilities, and diagnostics use unrelated models. Vii aims to preserve a clear causal and lifecycle model across those boundaries.

## Goals

- Provide a small and learnable State foundation.
- Work with Vanilla TypeScript, React, Angular, and Vue.
- Make lifecycle and resource ownership explicit.
- Emit structured diagnostics that explain why work occurred.
- Support progressive adoption.
- Keep production runtime deterministic and independent from AI.
- Establish contracts that can later support desktop, mobile, and server environments.

## Non-goals

- Building a full framework immediately.
- Replacing existing bundlers, package managers, desktop runtimes, mobile bridges, server frameworks, or ORMs.
- Requiring Vii UI, Vii Query, or AI to use Vii State.
- Supporting every framework and runtime in the first release.

## Initial committed scope

- Core store contract
- Selectors and batching
- Scopes, resources, and disposal
- Structured diagnostics
- Vanilla integration
- React, Angular, and Vue adapter proofs
- CLI foundation
- Testing and benchmark infrastructure

## Product architecture

```text
Core and protocols
→ State
→ framework adapters
→ diagnostics and CLI
→ real application validation
→ Query
→ UI and registry
→ platform and server research
```

## Differentiator

The primary differentiator is understandable execution: the ability to explain what changed, why it changed, which action caused it, and which scope owns the resulting work or resource.

## Compatibility

The core will avoid direct dependencies on framework and platform globals. Adapters will provide environment-specific integration.

## AI

AI remains optional development intelligence. Deterministic runtime and validation are authoritative.

## Open questions

- Final npm package names
- Exact initial State API
- Diagnostics event schema
- Scope and resource API
- Supported framework version ranges
- Initial license

## Decision

This RFC remains Draft until the initial architecture documents and follow-up RFCs for State, scopes, adapters, and diagnostics are reviewed.
