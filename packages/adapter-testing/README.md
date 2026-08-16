# @vii-labs/adapter-testing

This private package contains the shared compliance suite used by Vii adapter implementations. It
is intentionally test-only while the public adapter package names and selector API remain under
the draft RFC process.

The suite verifies the adapter-facing contract through a small harness: current snapshot reads,
update delivery, selected-value equality, nested batching, explicit unsubscribe, disposal,
request-isolated factories, server snapshots when provided, and TypeScript inference.

Adapters should translate these operations to their host lifecycle and rendering APIs. They must not
implement a second State graph or scheduler.
