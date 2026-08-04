# Vii Core Principles

## 1. Start small

Vii begins with a small State foundation and validates each public contract before expanding.

## 2. One mental model

Core concepts should remain few and explicit:

- store
- snapshot
- selector
- subscription
- batch
- scope
- resource
- disposal

## 3. Deterministic runtime

The production runtime must not depend on AI, cloud services, telemetry, or external API keys.

## 4. Framework neutrality

Core behavior must not depend on React, Angular, Vue, or another rendering system. Framework adapters translate Vii contracts without redefining them.

## 5. Runtime neutrality

Runtime-neutral packages use ECMAScript, Web Platform APIs where appropriate, and injected capability contracts. Platform globals belong in adapters.

## 6. Explicit lifecycle

Every subscription, derived value, cache observer, timer, socket, or other resource must have a clear owner and cleanup path.

## 7. Understandable execution

Important changes should have structured causes. Diagnostics should explain why work happened rather than only showing that it happened.

## 8. Progressive adoption

Every major module is optional. Existing applications can adopt one capability without migrating the whole stack.

## 9. Honest performance

Performance claims require reproducible source code, environment details, raw results, and clear limitations.

## 10. Small production surface

Development tools, diagnostics UI, generators, and migrations must not enter production bundles unless explicitly imported.

## 11. Privacy by default

No hidden telemetry, source upload, or state-value collection. Diagnostics must support redaction and production-safe modes.

## 12. User ownership

Users should be able to understand, replace, remove, or detach Vii modules. Vii UI source distribution should leave application code under user control.

## 13. Standards before invention

Vii should use established standards and runtimes where they are sufficient, including npm, ESM, Web APIs, OpenTelemetry bridges, Tauri, Capacitor, and existing server frameworks.

## 14. Evidence before expansion

A new package requires a first consumer, documented need, maintenance owner, lifecycle model, tests, and an exit strategy.
