# Vii Architecture Map

This document provides a consolidated view of the intended Vii ecosystem and the dependency direction between its layers.

## Architectural promise

Vii aims to provide one observable TypeScript core that can be adopted incrementally across frameworks and platforms without forcing application ownership into Vii.

The primary differentiator is understandable execution:

> One core. Any framework. Every important change explained.

A possible native Vii framework remains Research and Vision until the core proves its value through real consumers.

## Product and control-plane relationship

```text
Intentloom governs engineering context, policy, permissions, and task handoffs.
InLoom executes and assists through explicit tools and approvals.
Vii runs deterministic application behavior.
```

Intentloom and InLoom are development-time integrations. They are not Vii Core or application runtime dependencies.

## Layer map

```text
Engineering control plane (optional, development time)
  ├─ Intentloom engineering profile
  ├─ canonical context and repository memory
  ├─ agent permissions and task specifications
  ├─ approval and mutation policy
  ├─ validation and release restrictions
  └─ InLoom and other agent clients
             │ consumes plans, metadata, diagnostics, and evidence
             ▼
Applications and products
  ├─ React applications
  ├─ Angular applications
  ├─ Vue applications
  ├─ Vanilla TypeScript applications
  ├─ Server applications
  ├─ Tauri desktop applications
  ├─ Mobile research targets
  └─ Future Vii-native applications (Vision)
             │
Application framework and UI runtime (Research / Vision)
  ├─ Vii Component Model
  │   ├─ .vii SFC authoring
  │   ├─ split TS / HTML / CSS authoring
  │   ├─ TSX authoring
  │   └─ one Component IR
  ├─ Vii Web renderer and hydration
  ├─ Vii Router and layouts
  ├─ Vii App
  │   ├─ CSR
  │   ├─ SSG
  │   ├─ SSR
  │   ├─ streaming
  │   └─ hybrid route rules
  └─ Vii Build System
      ├─ Vii compiler
      ├─ route and environment graphs
      ├─ manifests and diagnostics
      └─ replaceable build engine
             │
Framework, build, and platform integrations
  ├─ React adapter
  ├─ Angular adapter
  ├─ Vue adapter
  ├─ Vanilla integration
  ├─ Vite / Rolldown build adapter (Research)
  ├─ Nx integration (Research)
  ├─ Rspack and Bun build adapters (Research)
  ├─ Node adapter
  ├─ Bun adapter (Research)
  ├─ Deno adapter (Research)
  ├─ Tauri capabilities (Research)
  └─ Capacitor / Tauri Mobile capabilities (Research)
             │
Product modules
  ├─ State
  ├─ Query (Planned)
  ├─ Stream and RxJS interop (Research)
  ├─ Form (Planned / Research)
  ├─ UI Foundation (Planned)
  ├─ Registry (Planned)
  ├─ Devtools UI (Planned)
  └─ Server Foundation (Research)
             │
Shared foundations
  ├─ Core contracts
  ├─ Scopes and resource ownership
  ├─ diagnostics protocol
  ├─ platform capability contracts
  ├─ testing and compliance contracts
  ├─ security policy and safe types
  └─ public stability metadata
             │
ECMAScript and selected Web Platform APIs
```

## Dependency rule

Dependencies flow downward inside Vii.

- Applications may depend on framework, adapters, integrations, and modules.
- The native Application Framework may coordinate modules and shared foundations.
- Framework, build, and platform adapters depend on stable Vii contracts, not the reverse.
- Product modules may depend on shared foundations.
- Shared foundations must not depend on frameworks, package managers, CLIs, UI renderers, bundlers, host runtimes, Intentloom, InLoom, or AI providers.
- Core packages must not import Node, Bun, Deno, DOM, Tauri, Vite, Nx, Capacitor, agent SDK, or model-provider APIs directly.

Intentloom and agent clients consume Vii metadata and tooling from outside the runtime dependency graph.

Reverse dependencies are prohibited unless a documented contract or generated artifact explicitly requires them.

## One component runtime rule

A future native component model may support familiar authoring profiles:

```text
Vii SFC
Angular-oriented split files
React-oriented TSX
programmatic TypeScript
```

These are source and generator choices, not separate runtimes.

They share:

```text
State
Computed
Store
Scope
Resources
Component IR
lifecycle
diagnostics
security semantics
```

## Reactive boundaries

```text
State      current value and dependency graph
Computed   derived current value
Resource   owned asynchronous operation
Query      cached remote state
Stream     event sequence over time
```

RxJS is optional interop for advanced streams. It is not required for ordinary Vii State.

## Cross-cutting systems

### Security

Security applies to every layer.

The Security Foundation defines:

- safe interpolation and DOM sinks;
- safe SSR serialization and hydration;
- server input and network policies;
- capability authority;
- CLI and registry trust;
- plugin boundaries;
- supply-chain controls;
- AI prompt-injection defense;
- agent permission and approval boundaries;
- maintained threat models and malicious fixtures.

Security is not isolated inside one package or one final audit.

### Diagnostics

Diagnostics describe causal behavior across stores, queries, components, routes, builds, adapters, commands, server requests, security policy decisions, and platform operations.

Diagnostics consumers observe behavior but must not alter runtime semantics.

Intentloom or agent clients may consume redacted diagnostic events. They cannot gain mutation authority through the diagnostics channel.

### Scopes and resources

Scopes define ownership and lifetime. Stores, computed values, effects, subscriptions, requests, timers, sockets, component trees, server requests, platform handles, and other disposable resources have visible ownership.

### CLI

The CLI is an orchestration layer over declarative project analysis and transformations.

It supports safe generation, migration, build commands, and optional workspace adapters without defining runtime semantics.

The mutation lifecycle is:

```text
Analyze
→ Plan
→ Preview
→ Approve
→ Apply
→ Validate
→ Report
```

Approval and rollback are development-governance concerns layered around deterministic CLI plans.

### Build System

The Vii Build System owns:

- Component compilation;
- Component IR target transforms;
- route and environment graphs;
- server/client boundaries;
- hydration entries;
- manifests;
- Vii diagnostics.

A replaceable engine such as Vite/Rolldown initially performs general bundling.

### Nx

Nx remains optional.

`@vii-labs/nx` may expose Vii generators, inferred tasks, graph metadata, affected execution, and migrations through the shared Vii CLI and Build Core.

Vii does not become an Nx replacement and does not require an Nx workspace.

### Registry

The registry distributes declarative manifests, source files, metadata, and integrity information.

It cannot silently execute arbitrary installation code or grant build plugin authority.

### Intentloom

Intentloom is an optional engineering control plane.

It may provide:

- a Vii repository profile;
- canonical context manifests;
- repository memory with provenance and expiry;
- task specifications and handoffs;
- least-privilege capability policy;
- architecture and security checks;
- release restrictions;
- provider-neutral context for agents.

Intentloom cannot:

- become a Vii Core dependency;
- change runtime semantics through policy;
- bypass repository permissions;
- accept RFCs or ADRs;
- merge or publish without authority;
- make AI mandatory.

### AI and InLoom

AI is optional. Deterministic Vii functionality remains usable without AI services.

InLoom and other agent clients consume structured project plans, diagnostics, context manifests, and machine-readable CLI output rather than becoming hidden runtime dependencies.

Files, webpages, issue text, logs, generated content, and tool results are untrusted AI context. Model output remains a proposal and cannot bypass deterministic permissions, security policy, or the CLI plan.

### Agent context and memory

Engineering context is selected by task, versioned, freshness-checked, and provenance-preserving.

Accepted decisions, current contracts, tests, and roadmap status take precedence over external references and ephemeral agent memory.

Material context influencing a change must be visible in the task, pull request, decision record, or audit evidence.

## Initial implementation boundary

The first implementation slice contains:

1. monorepo and package validation infrastructure;
2. shared contracts where required by the first package;
3. a deterministic State prototype;
4. Scopes, disposal, and bounded diagnostics;
5. a Vanilla consumer fixture;
6. framework adapters only after Core semantics are validated.

The initial Intentloom slice is limited to repository documentation, policy references, and one read-only or documentation-mutation workflow. It must not block the Core implementation sequence.

Query, native components, the Application Framework, Build System implementation, UI, Registry, expanded Server, desktop, and mobile remain outside the first implementation slice.

## Research sequence

The long-term framework sequence is evidence-driven:

```text
State and Scope
→ framework adapters and real applications
→ native component prototypes
→ one Component IR
→ Web renderer
→ basic SSR and hydration
→ router and Vii App
→ hybrid rendering
→ additional build and runtime adapters
```

The sequence may stop if existing framework adapters provide sufficient value.

## Architecture evidence

An architectural claim is considered validated only when supported by one or more of:

- executable tests;
- consumer fixtures;
- packed-package installation tests;
- malicious security fixtures;
- benchmarks or measured budgets;
- compatibility matrices;
- accepted RFCs and ADRs;
- real application usage;
- external security or architecture review where appropriate.

Agent plans, generated text, and model confidence are not implementation evidence by themselves.

Documentation records intent. It does not prove implementation support.
