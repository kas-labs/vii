# Vii Architecture Map

This document provides a consolidated view of the intended Vii ecosystem and the dependency direction between its layers.

## Architectural promise

Vii aims to provide one observable TypeScript core that can be adopted incrementally across frameworks and platforms without forcing application ownership into Vii.

The primary differentiator is understandable execution:

> One core. Any framework. Every important change explained.

## Layer map

```text
Applications and products
  ├─ React applications
  ├─ Angular applications
  ├─ Vue applications
  ├─ Vanilla TypeScript applications
  ├─ Server applications
  ├─ Tauri desktop applications
  └─ Mobile research targets
             │
Framework and platform integrations
  ├─ React adapter
  ├─ Angular adapter
  ├─ Vue adapter
  ├─ Vanilla integration
  ├─ Node adapter
  ├─ Bun adapter (research)
  ├─ Deno adapter (research)
  ├─ Tauri capabilities (research)
  └─ Capacitor/Tauri Mobile capabilities (research)
             │
Product modules
  ├─ State
  ├─ Query (planned)
  ├─ UI Foundation (planned)
  ├─ Registry (planned)
  ├─ Devtools UI (planned)
  └─ Server Foundation (research)
             │
Shared foundations
  ├─ Core contracts
  ├─ scopes and resource ownership
  ├─ diagnostics protocol
  ├─ platform capability contracts
  ├─ testing/compliance contracts
  └─ public stability metadata
             │
ECMAScript and selected Web Platform APIs
```

## Dependency rule

Dependencies flow downward.

- Applications may depend on adapters and modules.
- Adapters may depend on shared contracts and the module they expose.
- Product modules may depend on shared foundations.
- Shared foundations must not depend on frameworks, package managers, CLIs, UI renderers, or host runtimes.
- Core packages must not import Node, Bun, Deno, DOM, Tauri, or Capacitor APIs directly.

Reverse dependencies are prohibited unless a documented contract or generated artifact explicitly requires them.

## Cross-cutting systems

### Diagnostics

Diagnostics describe causal behavior across stores, queries, adapters, commands, server requests, and platform operations. Diagnostics consumers observe behavior but must not alter it.

### Scopes and resources

Scopes define ownership and lifetime. Stores, subscriptions, requests, timers, sockets, platform handles, and other disposable resources must have visible ownership.

### CLI

The CLI is an orchestration layer over declarative project analysis and transformations. It does not define runtime semantics.

### Registry

The registry distributes declarative manifests, source files, metadata, and integrity information. It cannot silently execute arbitrary installation code.

### AI and InLoom

AI is optional. Deterministic Vii functionality must remain usable without AI services. InLoom and agent integrations consume structured project plans, diagnostics, and machine-readable CLI output rather than becoming hidden runtime dependencies.

## Initial implementation boundary

The first implementation slice contains:

1. monorepo and package validation infrastructure;
2. shared contracts where required by the first package;
3. a deterministic State prototype;
4. scopes, disposal, and bounded diagnostics;
5. a Vanilla consumer fixture;
6. framework adapters only after Core semantics are validated.

Query, UI, Registry, Server, desktop, mobile, and a standalone framework remain outside the first implementation slice.

## Architecture evidence

An architectural claim is considered validated only when supported by one or more of:

- executable tests;
- consumer fixtures;
- packed-package installation tests;
- benchmarks or measured budgets;
- compatibility matrices;
- accepted RFCs and ADRs;
- real application usage.

Documentation alone records intent. It does not prove implementation support.
