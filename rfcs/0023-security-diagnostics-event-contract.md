# RFC 0023: Security Diagnostics Event Contract

- Status: Accepted
- Authors: Kas Labs
- Created: 2026-08-12

## Summary

Define the smallest experimental Core boundary for structured security diagnostics. The boundary
records a stable code, security surface, and finite reason while excluding raw input, credentials,
and complete malicious payloads. It is an implementation RFC for the security-diagnostics direction
described by RFC 0020; it does not make RFC 0020 Accepted or make the diagnostics protocol Stable.

## Governance decision

Accepted on 2026-08-15 by an explicit maintainer governance decision.

Acceptance approved this bounded experimental contract for implementation without accepting RFC
0020 or stabilizing the `vii.trace` protocol. The first implementation slice now provides
`recordSecurity`, uses the existing `addState` symlink guard as a real producer, and validates the
event through the existing read-only `inspectTrace` consumer. The implementation preserves the
bounded, value-free, production-safe, read-only diagnostics model and remains subject to the testing
and security evidence listed below.

## Motivation

Phase 3 requires security event inspection with redaction. Existing Core diagnostics can preserve
safe lifecycle metadata, but they do not yet define how security-relevant events are represented.
Adding ad hoc strings at future call sites would make redaction, correlation, and compatibility
inconsistent.

## Goals

- provide one transport-independent `security.event` shape;
- use finite codes, surfaces, and reasons rather than raw security input;
- preserve the existing bounded collector, sink isolation, trace correlation, and mode semantics;
- omit sensitive contextual fields in `production-safe` mode before buffering or sinking;
- make security events useful to future CLI, Devtools, CI, and external consumers without granting
  diagnostics consumers mutation authority.

## Non-goals

- implementing template, URL, filesystem, command, registry, or capability enforcement;
- accepting or storing request bodies, credentials, source code, stack traces, or malicious payloads;
- defining a terminal CLI, browser inspector, network transport, telemetry, or OpenTelemetry bridge;
- replacing application authorization or making RFC 0020 Accepted;
- promising a Stable event schema before real consumers and security review exist.

## Proposed design

The collector gains an experimental synchronous recording method:

```ts
type SecurityDiagnosticCode =
  | "VII-SEC-001" // input rejected
  | "VII-SEC-002" // input truncated
  | "VII-SEC-003" // unsafe URL
  | "VII-SEC-004" // template blocked
  | "VII-SEC-005" // serialization rejected
  | "VII-SEC-006" // secret boundary violation
  | "VII-SEC-007" // command denied
  | "VII-SEC-008" // path escape blocked
  | "VII-SEC-009" // filesystem access denied
  | "VII-SEC-010" // registry integrity mismatch
  | "VII-SEC-011" // capability denied
  | "VII-SEC-012" // malformed payload
  | "VII-SEC-013" // log injection rejected
  | "VII-SEC-014" // cross-request isolation violation
  | "VII-SEC-015"; // unsupported security policy

type SecurityDiagnosticSurface =
  | "input"
  | "template"
  | "url"
  | "serialization"
  | "command"
  | "path"
  | "filesystem"
  | "registry"
  | "capability"
  | "request";

type SecurityDiagnosticReason =
  | "rejected"
  | "blocked"
  | "truncated"
  | "malformed"
  | "denied"
  | "integrity_mismatch"
  | "isolation_violation"
  | "unsupported_policy";

interface SecurityDiagnosticInput {
  code: SecurityDiagnosticCode;
  surface: SecurityDiagnosticSurface;
  reason: SecurityDiagnosticReason;
  field?: string;
  route?: string;
  causeId?: string;
}

interface Diagnostics {
  recordSecurity(input: SecurityDiagnosticInput): void;
}
```

The emitted event uses the existing versioned envelope and the immutable event type
`security.event`:

```json
{
  "protocolVersion": "0.1",
  "id": "diagnostic-7",
  "type": "security.event",
  "timestamp": 0,
  "traceId": "checkout",
  "causeId": "diagnostic-6",
  "package": "@vii/core",
  "payload": {
    "code": "VII-SEC-001",
    "surface": "input",
    "reason": "rejected"
  }
}
```

`field` and `route` are development metadata only. They are normalized to bounded strings with
carriage returns and line feeds removed, and are omitted in `production-safe` mode. The API never
accepts a raw payload, body, value, credential, source location, or free-form message. `traceId`
continues to come only from the collector options and follows the existing production-safe rule.
Unknown future fields may be ignored by compatible consumers.

## Public API or protocol impact

This is an additive experimental API contract for `@vii/core`. It extends the existing
`Diagnostics` type and adds no package or transport boundary. `security.event` belongs to the
Draft `vii.trace` protocol and must not be consumed as a Stable schema. A later RFC or governance
decision may rename, split, or remove the method and codes before 1.0.

## Lifecycle and resource ownership

Security event recording is synchronous and observational. It allocates only when diagnostics are
enabled, uses the existing bounded ring buffer, and sends the immutable event to the existing sink.
It creates no subscriptions, scopes, resources, timers, files, network connections, or background
work. A failing clock or sink remains isolated according to the existing collector contract.

## Compatibility

Existing callers are unaffected because the method is additive and events are opt-in through an
explicit call. `off` mode records nothing. Development mode may retain bounded `field` and `route`
metadata. Production-safe mode omits those fields and caller-provided trace correlation before the
event reaches the buffer or sink. The event uses protocol version `0.1`; changing its required
payload fields requires a protocol migration note.

## Diagnostics and privacy

The API is deliberately metadata-only. Security producers must map sensitive input to a finite code
and reason before calling it. Redaction occurs at the Core boundary as defense in depth, not as a
replacement for producer-side validation. Complete malicious payloads, credentials, cookies,
authorization headers, request/response bodies, State values, and personal data are prohibited.
Security consumers remain read-only and receive no mutation authority.

## Performance implications

The implementation should use the existing `record` path and avoid a second buffer or serializer.
The `off` path should return before normalization. Development-only string normalization removes CR/LF
and caps each optional metadata string at 128 characters; production-safe mode skips optional
metadata. Performance coverage must compare
off, development, and production-safe security recording separately from ordinary State writes.

## Alternatives considered

- **Free-form security messages:** rejected because they invite secret and payload leakage and make
  schema compatibility impossible.
- **One event type per security code:** rejected because event type injection complicates consumers;
  the immutable `security.event` type carries a finite code instead.
- **A separate security package:** deferred until a real producer requires a package boundary;
  Core already owns the diagnostics collector.
- **Immediate Stable API:** rejected because RFC 0020 is Proposed, RFC 0004 is Draft, and the first
  producer/consumer slice does not constitute external schema validation or security review.

## Migration and rollback

No migration is required while the method is experimental. If the proposal is rejected, remove the
method and its tests before publication without affecting existing diagnostic events. If accepted,
future producers can adopt it independently; callers must not depend on optional development
metadata. Promotion to Preview requires consumer fixtures, schema validation, and a security review.

## Testing strategy

- public Core test for the exact `security.event` envelope and finite payload;
- tests proving `off` mode does not record or normalize metadata;
- tests proving production-safe mode omits `field`, `route`, and trace correlation;
- CR/LF and maximum-length normalization tests for development metadata;
- sink and clock failure isolation tests;
- trace export JSON round-trip and bounded-buffer tests;
- Vanilla packed consumer coverage for the first producer/consumer slice;
- malicious-input corpus proving complete payloads never enter the event.

## Unresolved questions

- whether all fifteen RFC 0020 candidate codes are needed by the first real producer;
- whether `route` should be replaced by a producer-owned route class rather than a bounded string;
- whether security events need a separate dropped-event counter or the existing trace counter is
  sufficient;
- which external consumer, if any, validates the first version before Preview;
- whether a future implementation RFC should add schema files for machine-readable consumers.
