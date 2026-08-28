---
title: Privacy and production-safe mode
description: Data-minimization boundaries for Vii Core Diagnostics.
---

Vii Diagnostics is designed to observe runtime structure without turning application values into hidden telemetry.

The current Core collector is local and in-memory. It has no built-in network transport, telemetry backend, cookie integration, persistent storage, or automatic upload path.

## Development mode

`development` keeps the richest supported diagnostic metadata.

```ts
const diagnostics = createDiagnostics({
  mode: "development",
  traceId: "checkout",
});
```

Development mode may retain caller-provided correlation metadata and supported structural labels such as Scope names.

That makes it useful for local debugging, but application developers must still avoid placing secrets or sensitive business data into caller-controlled metadata or custom sinks.

## Production-safe mode

```ts
const diagnostics = createDiagnostics({
  mode: "production-safe",
  traceId: "checkout",
});
```

Current production-safe behavior reduces caller-provided metadata before buffering, sinking, or exporting it.

Specifically:

- configured `traceId` is omitted;
- caller-provided Scope names are removed from `scope.created` events;
- security-event `field` and `route` metadata are omitted;
- structural IDs and finite diagnostic/security classifications may remain.

Production-safe mode is intended to reduce accidental metadata exposure. It is not a substitute for application-level privacy review.

## State values

Core diagnostic events are structural. State values are not automatically included in the event schema.

This means ordinary State reads and writes do not silently serialize their values into the diagnostics buffer.

However, a host application can still expose information through its own code, custom sink, surrounding logs, filenames, request metadata, or other infrastructure. Vii cannot redact data it never controls.

## Security-event metadata

`recordSecurity()` supports optional development metadata:

```ts
diagnostics.recordSecurity({
  code: "VII-SEC-008",
  surface: "path",
  reason: "blocked",
  field: "src/state.ts",
  route: "/project",
});
```

In development mode, `field` and `route` are normalized by removing line breaks and limiting each value to 128 characters.

In production-safe mode, those optional fields are removed entirely. Finite `code`, `surface`, and `reason` classifications remain available so a consumer can understand the structural event without the same caller-provided detail.

## Sinks

A sink receives events synchronously as an observer:

```ts
const diagnostics = createDiagnostics({
  sink: {
    emit(event) {
      // The host decides what happens here.
    },
  },
});
```

Core catches sink failures so they cannot break the runtime operation that produced the event.

A sink is also the point where responsibility moves to the host application. If your sink writes to a server, log aggregator, database, or third-party service, that transport is **your application behavior**, not hidden Vii behavior.

## Practical guidance

For local debugging:

- use `development`;
- keep buffers small enough to inspect;
- use a correlation ID only when it materially helps;
- clear old traces when they are no longer useful.

For production evaluation:

- prefer `production-safe` unless richer metadata has a reviewed requirement;
- review every custom sink;
- treat exported traces as application data once you persist or transmit them;
- check `droppedEvents` before interpreting a trace as complete;
- do not put secrets into Scope names or custom diagnostic metadata.

## What production-safe does not promise

Production-safe does not mean:

- anonymized under every privacy regime;
- automatically compliant with GDPR or another legal framework;
- safe to upload to arbitrary third parties;
- a replacement for data classification;
- a security certification;
- a guarantee about host-application logs or infrastructure.

It is a bounded Core redaction mode with specific current semantics.

## Related

- [Diagnostics](/docs/diagnostics/)
- [Trace format](/docs/diagnostics/traces/)
- [Lifecycle ownership](/docs/lifecycle/ownership/)
