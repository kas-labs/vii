# Diagnostics Protocol

Status: Draft

## Purpose

Vii diagnostics describe what happened, why it happened, and which runtime objects participated. Diagnostics are a first-class protocol, not an afterthought added only for a graphical Devtools application.

The protocol must be consumable by:

- console tooling;
- Vii CLI;
- browser Devtools;
- CI;
- InLoom;
- optional OpenTelemetry bridges;
- external tools;
- Vii Assistant.

## Principles

- Structured events instead of formatted log strings
- Stable event names and versioned schemas
- Causal relationships between events
- Minimal production overhead
- No values or personal data by default
- Explicit redaction
- Transport-independent format
- Deterministic runtime behavior without diagnostics consumers

## Modes

### Off

No optional diagnostic collection. Production stubs should have near-zero overhead.

### Development

Full lifecycle, causes, dependency changes, timing, and developer metadata. Application values still require explicit opt-in.

### Production-safe

Limited events suitable for operational traces. Values, source code, secrets, and sensitive fields are excluded by default.

## Initial event families

```text
scope.created
scope.disposing
scope.disposed

resource.attached
resource.detached
resource.disposed

state.created
state.updated
state.update_skipped

computed.created
selector.recomputed
computed.disposed

subscription.created
subscription.notified
subscription.disposed

batch.started
batch.committed
batch.failed

error.raised
```

The P1.7 Core prototype uses the `state.*` and `computed.*` names above. The broader protocol may
later provide store and selector aliases when those higher-level modules exist.

Query, UI, server, and platform families will be added by their own RFCs.

Structured security diagnostics are proposed separately in
[`RFC 0023`](../../rfcs/0023-security-diagnostics-event-contract.md). Until that RFC is accepted
and implemented, Core does not expose a security-event recording API. The proposed boundary uses a
finite code, surface, and reason in an immutable `security.event` payload and excludes raw input,
credentials, complete malicious payloads, and other sensitive data by construction.

## Event envelope

```ts
interface ViiDiagnosticEvent<TPayload = unknown> {
  protocolVersion: string;
  id: string;
  type: string;
  timestamp: number;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  causeId?: string;
  runtime?: string;
  platform?: string;
  package: string;
  payload: TPayload;
}
```

The final representation may use more compact internal structures, but exported traces must use a documented schema.

## Causality

Vii should distinguish chronology from causality.

Example:

```text
user action
→ store update
→ selector recomputation
→ framework notification
→ component render
```

Each event may reference a cause or parent span. Events that occur later in time are not automatically treated as caused by previous events.

## Store update payload

Conceptual example:

```json
{
  "storeId": "store_cart",
  "storeName": "cart",
  "previousVersion": 4,
  "nextVersion": 5,
  "reason": "user-update",
  "changed": true,
  "subscriberCount": 3
}
```

State values are not included by default.

## Selector recomputation payload

```json
{
  "selectorId": "selector_total",
  "selectorName": "cart-total",
  "dependencies": ["store_cart"],
  "reason": "dependency-version-changed",
  "durationMs": 0.12,
  "changed": true
}
```

## Trace export

Exported traces should use an open versioned structure:

```json
{
  "protocol": "vii.trace",
  "version": "0.1",
  "createdAt": "2026-08-05T00:00:00Z",
  "events": []
}
```

Exports must support redaction and size limits.

The P3.6 Core foundation exposes `diagnostics.exportTrace()` as a JSON-safe snapshot of the
collector's bounded ring buffer. It uses `protocol: "vii.trace"` and `version: "0.1"`, includes
`createdAt`, `events`, and `droppedEvents`, and inherits Core's value-free event boundary. It does
not write files, connect transports, or add a Devtools/runtime dependency; file export, custom
redaction policies, and external schema compatibility remain deferred.

Core also accepts an optional `traceId` when creating a diagnostics collector. When supplied, the
identifier is copied to each event and the exported trace envelope for correlation. It is not
inferred, propagated across asynchronous boundaries, or treated as an authorization token. In
`production-safe` mode, the identifier is omitted and caller-provided `scope.created` names are
redacted before events reach the in-memory buffer, sink, or exported trace. Core-generated
identifiers and structural counts remain available for inspection.

The private `@vii/cli-core` `inspectTrace()` operation consumes an in-memory `vii.trace` `0.1`
snapshot as a read-only Phase 3 inspection consumer. It validates the protocol/version and returns
total events, dropped-event count, deterministic first-seen event-type counts, and a structural
Scope/resource ownership graph. The graph contains only generated IDs and parent links; names,
values, other payload fields, files, network, and mutation authority are outside its output
interface. It does not stabilize the trace schema or introduce a terminal CLI command.

## Diagnostic sinks

Potential sink contract:

```ts
interface DiagnosticSink {
  emit(event: ViiDiagnosticEvent): void;
  flush?(): void | Promise<void>;
}
```

Possible sinks:

- no-op;
- in-memory ring buffer;
- console renderer;
- file export through a platform adapter;
- Devtools connection;
- OpenTelemetry bridge.

Core currently exposes a bounded in-memory collector through `createDiagnostics(options)`. Its
`run` method establishes the diagnostic context for State, Computed, Batch, and Scope operations.
The collector defaults to development mode, accepts `off` and `production-safe`, drops the oldest
events when its limit is reached, and exposes the number of dropped events. Sink failures are
isolated from runtime behavior.

## Privacy and redaction

Default rules:

- no store values;
- no form values;
- no authorization headers;
- no environment variables;
- no source code;
- no user identifiers;
- no network bodies.

Applications may explicitly enable selected fields. Redaction happens before events leave the runtime boundary.

## Performance

Diagnostics must be benchmarked separately in off, development, and production-safe modes.

The protocol must support:

- bounded buffers;
- sampling for high-volume production events;
- dropped-event counters;
- lazy payload construction;
- disabled stack capture by default.

## OpenTelemetry bridge

A future adapter may map Vii traces and events into OpenTelemetry spans, metrics, and logs. The internal protocol remains richer for application-specific concepts such as selector recomputation and scope ownership.

OpenTelemetry is an integration target, not a dependency of Vii Core.

## Errors

Diagnostic failures must never corrupt application state. A failing sink should be isolated and reported through a safe fallback mechanism where possible.

## Versioning

Event schemas are versioned independently from package implementation details. Breaking schema changes require migration notes and compatibility handling in official consumers.

## Quality gates

- State behavior is identical with diagnostics on or off;
- event order is deterministic within synchronous transactions;
- causes are preserved across batches;
- buffers are bounded;
- redaction is tested;
- exported traces validate against the schema;
- malformed or failing sinks cannot break state updates;
- production-safe mode excludes values by default.
