# RFC 0004: Diagnostics Protocol

- Status: Draft
- Authors: Kas Labs
- Created: 2026-08-05

## Summary

Define a versioned, structured diagnostics protocol for Vii runtime events, causal relationships, trace export, privacy, and external consumers.

## Motivation

Understandable execution is the primary Vii differentiator. This requires diagnostics to be designed with the runtime, not added later as formatted console logs.

The same protocol should support the CLI, Devtools, CI, InLoom, optional OpenTelemetry integration, and future assistants.

## Proposed event envelope

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

## Initial event families

- scopes;
- resources;
- stores;
- selectors;
- subscriptions;
- batches;
- structured errors.

Query, UI, server, and platform events will be defined in later RFCs.

## Proposed modes

### Off

Optional collection disabled with near-zero production overhead.

### Development

Detailed lifecycle and cause information.

### Production-safe

Bounded, redacted events without state values, secrets, source code, or personal data by default.

## Diagnostic sinks

```ts
interface DiagnosticSink {
  emit(event: ViiDiagnosticEvent): void;
  flush?(): void | Promise<void>;
}
```

Potential sinks include no-op, bounded in-memory storage, console rendering, Devtools transport, trace file export, and OpenTelemetry bridges.

## Prototype decision: bounded Core collector

P1.7 implements the smallest runtime-neutral collector without adding a network, telemetry, or
Devtools dependency:

```ts
const diagnostics = createDiagnostics({
  mode: "development",
  maxEvents: 100,
});

diagnostics.run(() => {
  const count = state(0);
  count.set(1);
});
```

- `createDiagnostics` creates an isolated collector; `run` establishes its synchronous context;
- the default mode is `development`; `off` disables collection and `production-safe` keeps the same
  value-free event shape;
- events use protocol version `0.1`, per-collector `diagnostic-N` IDs, an injectable clock for
  deterministic tests, and `@vii/core` as the package identifier;
- the in-memory store is a bounded ring buffer; the oldest event is dropped when full and
  `droppedEvents` reports the number removed;
- Core event payloads contain identifiers, versions, counts, and lifecycle metadata, never State
  values by default;
- sink failures are isolated and cannot change runtime behavior;
- the P1.7 prototype names events `state.*`, `computed.*`, `subscription.*`, `batch.*`,
  `scope.*`, and `resource.*`.

Cause and trace propagation remain reserved protocol fields. P1.7 provides stable entity and event
identifiers; richer cross-operation cause graphs require an accepted follow-up decision.

## Privacy defaults

The protocol excludes by default:

- state and form values;
- network bodies;
- authorization headers;
- environment variables;
- source code;
- user identifiers.

Redaction must happen before an event leaves the runtime boundary.

## Questions to resolve

- event identifier format;
- monotonic versus wall-clock timestamps;
- internal compact representation;
- trace and span propagation;
- buffer limits and sampling;
- dropped-event reporting;
- schema distribution;
- browser Devtools transport;
- event compatibility policy;
- stack capture rules.

## OpenTelemetry

OpenTelemetry may be supported through an adapter. It is not a dependency of Vii Core and does not replace Vii-specific concepts such as selector recomputation and scope ownership.

## Safety requirements

- diagnostics cannot change state semantics;
- failing sinks cannot break application updates;
- buffers are bounded;
- exported traces are versioned;
- redaction behavior is tested;
- values remain opt-in.

## Validation plan

1. Instrument the State prototype.
2. Render the same events in console and JSON consumers.
3. Verify deterministic event order within batches.
4. Benchmark off, development, and production-safe modes.
5. Validate exported traces against a schema.
6. Test malformed and failing sinks.
