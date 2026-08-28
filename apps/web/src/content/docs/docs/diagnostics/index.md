---
title: Diagnostics
description: Observe Vii Core behavior with bounded, opt-in diagnostics and exportable traces.
---

Vii Diagnostics is an **opt-in observer** for Core activity. It records structured events into a bounded in-memory buffer and can export those events as a `vii.trace` document.

Diagnostics is not a telemetry service, Devtools application, OpenTelemetry bridge, logger, or remote monitoring product. Core does not send diagnostic data over the network.

## Create a diagnostics context

```ts
import { createDiagnostics, state } from "@vii-labs/core";

const diagnostics = createDiagnostics({
  mode: "development",
  maxEvents: 100,
  traceId: "checkout",
});

diagnostics.run(() => {
  const count = state(0);
  count.set(1);
});
```

`diagnostics.run()` is synchronous. Returning a Promise or thenable throws a `TypeError` because the ambient diagnostics context is not propagated across `await`.

## Modes

Diagnostics supports three modes:

| Mode | Behavior |
| --- | --- |
| `off` | Records nothing. |
| `development` | Records the full supported development metadata. |
| `production-safe` | Records a reduced surface intended to minimize caller-provided metadata. |

The default mode is `development`.

## Read events

```ts
const events = diagnostics.getEvents();
```

`getEvents()` returns a snapshot of the current buffer. Mutating the returned array does not mutate the collector.

Every event contains the experimental protocol version, an event ID, event type, timestamp, package identifier, optional correlation fields, and a structured payload.

## Bounded storage

```ts
const diagnostics = createDiagnostics({ maxEvents: 100 });
```

The buffer is bounded. When it reaches `maxEvents`, the oldest event is removed before the next event is appended.

The collector exposes the number of discarded events:

```ts
console.log(diagnostics.droppedEvents);
```

A bounded trace is therefore not guaranteed to contain the beginning of a long-running lifecycle.

## Export a trace

```ts
const trace = diagnostics.exportTrace();
```

The current export envelope is:

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

`vii.trace` `0.1` is experimental and may change under Vii governance.

## Clear the collector

```ts
diagnostics.clear();
```

`clear()` removes buffered events and resets `droppedEvents` to zero. It does not change the configured mode, sink, maximum size, or trace identity.

## Sinks are observers

A diagnostics collector may receive a sink:

```ts
const diagnostics = createDiagnostics({
  sink: {
    emit(event) {
      console.log(event.type);
    },
  },
});
```

Sink failures are isolated. If `emit()` throws, the runtime operation that produced the diagnostic event continues normally.

This is a core safety rule: diagnostics must not become part of application correctness.

## Production-safe mode

`production-safe` intentionally removes some caller-provided metadata.

Current behavior includes:

- configured `traceId` is omitted from recorded events and exported traces;
- caller-provided Scope names are removed from `scope.created` payloads;
- security-event `field` and `route` metadata are omitted;
- structural identifiers, event types, counts, security codes, surfaces, and reasons can remain.

Production-safe is a data-minimization mode, not a security certification. Applications are still responsible for what they explicitly put into their own sinks, logs, or surrounding infrastructure.

## Security diagnostics

Core exposes an experimental structured producer:

```ts
diagnostics.recordSecurity({
  code: "VII-SEC-008",
  surface: "path",
  reason: "blocked",
  field: "src/state.ts",
});
```

Security events use finite codes, surfaces, and reasons. In development mode, optional `field` and `route` metadata is normalized by removing line breaks and truncating it to 128 characters. In production-safe mode those two metadata fields are omitted.

`recordSecurity()` records observations. It does not enforce a policy, block an operation by itself, or send an alert remotely.

## A useful debugging workflow

1. Create a bounded diagnostics collector.
2. Run the synchronous Vii work you want to inspect inside `diagnostics.run()`.
3. Reproduce the state or lifecycle behavior.
4. Inspect `getEvents()` while debugging.
5. Export `vii.trace` when you need a portable snapshot.
6. Check `droppedEvents` before assuming the trace is complete.
7. Clear or dispose the surrounding application lifecycle when finished.

## Current limitations

Core Diagnostics currently does not provide:

- automatic async-context propagation;
- network transport;
- persistent storage;
- a browser inspector;
- a Devtools UI;
- an OpenTelemetry exporter;
- automatic distributed tracing;
- stable `vii.trace` compatibility guarantees.

## Related

- [Trace format](/docs/diagnostics/traces/)
- [Privacy and production-safe mode](/docs/diagnostics/privacy/)
- [Lifecycle](/docs/lifecycle/)
- [Scope](/docs/core/scope/)
