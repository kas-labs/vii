# RFC 0013: Server Foundation

- Status: Draft
- Area: Server

## Summary

Define Vii Server as a framework-neutral foundation for typed contracts, isolated request scopes, validation, cancellation, diagnostics, and runtime adapters.

## Proposal

Vii Server begins with portable contracts and adapters rather than a new monolithic backend framework.

The initial scope includes:

- Fetch-compatible request and response boundary
- per-request scope
- cancellation through `AbortSignal`
- validation integration
- structured errors
- diagnostics correlation
- typed client generation
- Node.js reference adapter
- research adapters for Bun and Deno
- optional integrations with established server frameworks

## Contract requirements

A contract should be able to support:

- server handler registration
- input and output validation
- typed clients
- Query integration
- mocks and fixtures
- documentation and OpenAPI export
- trace correlation

The contract model should not be coupled exclusively to HTTP.

## Request isolation

Every request must receive an isolated scope. Stores, dependencies, diagnostics context, and disposable resources must not leak across requests.

## Runtime strategy

Node.js is the first reference runtime. Bun and Deno adapters reuse the same server and contract semantics.

## Out of scope

- custom ORM
- database engine
- hosted authentication
- payment system
- deployment platform
- API gateway
- mandatory dependency injection container
- replacement for established backend frameworks

## Graduation criteria

A broader server framework requires validated real-world consumers, stable request scopes, runtime compliance tests, end-to-end diagnostics, and demonstrated demand beyond adapters.

## Open questions

- exact contract API
- router responsibility
- schema library integration model
- transport adapter interface
- error serialization format
- OpenAPI generation ownership
