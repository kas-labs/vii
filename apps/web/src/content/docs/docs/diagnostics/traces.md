---
title: Trace format
description: Understand the current experimental vii.trace 0.1 export format.
---

`diagnostics.exportTrace()` returns a structured snapshot using the experimental `vii.trace` protocol.

```ts
const trace = diagnostics.exportTrace();
```

## Envelope

The current envelope is:

```ts
interface DiagnosticTrace {
  protocol: "vii.trace";
  version: "0.1";
  createdAt: string;
  events: readonly DiagnosticEvent[];
  droppedEvents: number;
  traceId?: string;
}
```

The protocol is experimental. Do not treat `0.1` as a long-term compatibility promise.

## Event shape

Each event currently has this shape:

```ts
interface DiagnosticEvent {
  protocolVersion: "0.1";
  id: string;
  type: string;
  timestamp: number;
  traceId?: string;
  package: "@vii-labs/core";
  causeId?: string;
  payload: Readonly<Record<string, unknown>>;
}
```

Event payloads contain structural metadata relevant to the event type. Core state values are not automatically copied into diagnostic events.

## Correlation

In `development` mode you may provide a `traceId`:

```ts
const diagnostics = createDiagnostics({
  traceId: "checkout",
});
```

The identifier is copied into events and the exported trace. Vii does not generate distributed trace context or propagate this identifier automatically across asynchronous boundaries.

`causeId` is an optional structural link between related events. It is not an authorization or causal-consistency mechanism.

## Bounded traces

A trace exports the collector's **current bounded buffer**, not an unbounded history.

If old events were dropped, the trace includes the count:

```ts
trace.droppedEvents;
```

This matters when interpreting ownership graphs or lifecycle sequences. A retained `scope.disposed` event can exist even if an earlier creation event has already been evicted from the buffer.

## Timestamps

Diagnostics uses the configured clock, or `Date.now` by default. Invalid or failing clocks are isolated from runtime behavior.

If a timestamp cannot be produced safely, Core falls back to a safe numeric value. `createdAt` similarly falls back to the Unix epoch if needed.

Diagnostics timestamps are observations. They must not affect state or lifecycle correctness.

## Export does not send data

`exportTrace()` returns an in-memory object. It does not:

- write a file;
- send a network request;
- upload telemetry;
- open Devtools;
- persist the trace.

The host application decides what to do with the returned object.

## Compatibility guidance

Because the protocol is experimental:

- validate `protocol` and `version` before consuming a trace;
- avoid assuming unknown event types are impossible;
- do not build irreversible storage formats around `0.1`;
- keep trace consumers tolerant of bounded/incomplete histories.

## Related

- [Diagnostics](/docs/diagnostics/)
- [Privacy and production-safe mode](/docs/diagnostics/privacy/)
