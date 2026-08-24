# Vii Ecosystem Evolution Vision

Status: Vision / Non-committed

## Purpose

This document describes a possible long-term shape for Vii without turning future possibilities into roadmap commitments.

Vii starts as a lightweight, observable TypeScript foundation. If the foundations prove useful in real applications, the same semantics may support a broader application ecosystem across web, server, desktop, mobile, edge, tooling, and AI-assisted development.

The governing rule is:

> Expand by projection from stable foundations, not by rebuilding every ecosystem tool.

Nothing in this document creates a package, public API, delivery date, compatibility promise, or implementation phase.

## Long-term shape

```text
                         Vii
                          |
                 framework-neutral Core
       State / Scope / Task / Flow / Diagnostics
                          |
        Schema / Query / Form / HTTP / Contracts
                          |
      +-------------------+-------------------+
      |                   |                   |
     Web                Server             Platform
      |                   |                   |
 CSR / SSG / SSR      Node/Bun/Deno      Desktop/Mobile/Edge
      |                   |                   |
      +-------------------+-------------------+
                          |
                    Vii Toolchain
          Compiler / Build / CLI / Workspace
                          |
                  AI integration layer
          MCP / models / tools / agents / evals
```

The dependency direction remains outward. Core must not acquire hidden DOM, server, native, build, model-provider, MCP, or agent-runtime dependencies.

## Platform evolution

### Web

Web remains the primary proving ground. Native components, Component IR, Router, Query, CSR, optional SSG/SSR, hydration, and build orchestration should mature here before more expensive platform abstractions are attempted.

### Server

Server development is a natural extension because Scope, Task, Schema, Codec, HTTP, Contracts, Query, and Diagnostics are not inherently browser-specific.

A future server layer should prefer Fetch-compatible request/response semantics and thin runtime adapters for Node, Bun, Deno, edge runtimes, or other compatible hosts.

Vii should not become a NestJS-style replacement merely to own server branding. Server capability should graduate only where Vii ownership, contracts, diagnostics, cancellation, or cross-platform reuse provide distinct value.

### Desktop

Desktop should begin through adapters around mature hosts such as Tauri rather than a new desktop runtime. Vii platform capabilities may expose typed contracts for filesystem, clipboard, windows, notifications, deep links, and similar host features while keeping host-specific implementation outside Core.

### Mobile

Mobile should evolve in stages:

1. prove Vii Core and application modules in React Native / Expo-style consumers through adapters;
2. validate lifecycle, Query, Form, Schema, Task, and Diagnostics semantics on mobile workloads;
3. research native platform capabilities and renderer constraints;
4. consider a Vii-native renderer only if Component IR and real applications demonstrate a meaningful performance, memory, DX, or maintenance advantage.

A WebView wrapper is not sufficient evidence for a native framework claim.

### Edge and workers

Fetch-compatible server contracts, explicit serialization, Scope isolation, and small optional packages should make edge and worker runtimes natural compatibility targets. Compatibility must be fixture-backed and must not assume Node globals.

## Shared platform capability model

Platform-specific APIs should be represented through explicit capabilities rather than leaking host globals through application code.

```text
Application
    |
Vii capability contract
    |
+---+----------+----------+----------+
|              |          |          |
Browser       Tauri     Native     Server/Edge
adapter       adapter    adapter     adapter
```

Candidate capabilities include storage, filesystem, clipboard, notifications, deep links, secure storage, environment/configuration, and runtime metadata.

Capability contracts must remain optional, typed, lifecycle-aware, testable, and security-conscious.

## Full-stack contract opportunity

A long-term advantage may come from one portable contract spanning server and clients without forcing one runtime or transport.

Conceptually:

```text
Schema / Contract
      |
+-----+---------+---------+
|               |         |
Server          Web      Mobile
handler         Query    Query
```

A contract may describe method, path or operation identity, input, output, errors, serialization, and authorization requirements. Server and client implementations remain separate execution boundaries.

Network calls must never be disguised as ordinary local function semantics in diagnostics, security, cancellation, or performance reasoning.

## Toolchain evolution

### Vii Build, not a bundler by default

Vii may own application-specific build semantics while delegating general bundling to mature engines.

```text
Vii Build
  |- Component IR transforms
  |- route/environment graphs
  |- client/server boundaries
  |- hydration/build manifests
  |- Vii diagnostics
  `- engine adapter
       |- Vite / Rolldown
       |- Bun
       |- Rspack
       `- future engine only if evidence requires it
```

`vii dev` and `vii build` may provide a coherent user experience without making the selected bundler a Vii runtime semantic.

A Vii-owned general-purpose bundler should be considered only if measured Vii-specific requirements cannot be met through replaceable mature engines.

### Vii Workspace, not an Nx replacement by default

Vii may understand project graphs, application graphs, task relationships, affected work, generated metadata, and migration boundaries while delegating execution/cache/orchestration to Nx or other engines when useful.

A future surface may include `vii graph`, `vii affected`, `vii check`, `vii test`, and `vii build`, but command coherence does not justify rebuilding an entire monorepo engine.

## AI-native ecosystem direction

AI should be a first-class integration target but never a hidden runtime dependency.

Vii should distinguish four layers:

```text
Deterministic Vii foundations
          |
AI contracts and provider adapters
          |
Tools / MCP / retrieval / model I/O
          |
Agents / workflows / assistant experiences
```

### Layer 1: deterministic foundations

State, Scope, Task, Flow, Query, Schema, Codec, Contracts, and Diagnostics remain useful without any model. AI integrations consume these foundations rather than changing their semantics.

### Layer 2: model/provider boundary

A future AI integration may define small provider-neutral contracts for model invocation, streaming tokens/events, structured output, cancellation, usage metadata, and model capabilities.

Vii should not create an LLM provider or require one vendor. OpenAI, Anthropic, Google, local models, or future providers should remain adapters behind explicit boundaries when integrations are justified.

Structured output should reuse Schema/Codec contracts where possible instead of creating an AI-only validation system.

### Layer 3: tools and MCP

MCP is a strong interoperability target for exposing and consuming tools, resources, applications, and long-running work.

As of the MCP 2026-07-28 specification, the protocol core is stateless and HTTP-friendly, list results can carry cache hints, tool schemas use full JSON Schema 2020-12, and capabilities such as Tasks and MCP Apps evolve through extensions. Vii should integrate through the official protocol/SDK rather than inventing an incompatible protocol.

Potential Vii roles:

- expose Vii Contracts or server operations as MCP tools through an adapter;
- map the portable subset of Vii Schema to MCP tool input/output JSON Schema;
- consume external MCP tools behind typed contracts;
- bind MCP request lifetime to Vii Scope and AbortSignal cancellation;
- represent long-running MCP Tasks through Task/Flow-compatible adapters where semantics match;
- correlate tool calls through Diagnostics without recording secrets or full prompts by default;
- support MCP Apps only at an application/UI integration layer, never in Core.

MCP transport/session semantics must not leak into Vii Core. Protocol versions and extensions must remain adapter concerns.

### Layer 4: agents and workflows

A future agent layer may coordinate models, tools, memory/retrieval, approvals, and deterministic application actions.

Candidate architecture:

```text
Agent Scope
  |- model adapter
  |- tool registry
  |- MCP clients
  |- Task executions
  |- Flow event stream
  |- approval gates
  |- budget / timeout policy
  `- Diagnostics correlation
```

Important invariants:

- an agent run has explicit ownership and disposal;
- cancellation is first-class;
- tool side effects are explicit and policy-controlled;
- model output is untrusted input until validated;
- authorization happens at the tool/server boundary, not because a model requested an action;
- retries distinguish model calls, reads, and side-effecting writes;
- budgets for tokens, time, tool calls, concurrency, and retained context are explicit;
- human approval can be required for sensitive or destructive operations;
- prompts, secrets, personal data, and tool payloads are not captured by Diagnostics by default;
- deterministic application behavior must not silently depend on probabilistic model output.

### Vii Assistant

The existing Vii Assistant direction remains separate from production application semantics. It may use structured Diagnostics and repository metadata to explain execution, suggest fixes, generate tests, assist migrations, inspect performance, or help author Vii applications.

Assistant capabilities should be replaceable and removable. An application built with Vii must remain buildable, testable, debuggable, and runnable without an AI service.

## AI development experience

Vii can also become easier for coding agents to understand without embedding AI into runtime packages.

Potential future work:

- machine-readable package and capability manifests;
- stable architecture metadata and ownership graphs;
- generated JSON Schema for public configuration/contracts;
- concise agent-facing documentation derived from canonical docs;
- deterministic CLI inspection commands;
- MCP server exposing safe repository/framework knowledge and diagnostics;
- structured migration plans and codemod contracts;
- reproducible eval fixtures for AI-generated Vii code;
- security policies describing which tools/actions require approval.

The goal is not "AI writes everything." The goal is to make Vii semantics legible to both humans and tools.

## Performance and size principles

Future platform and AI work must preserve the same discipline as Core:

- no AI/model/MCP dependency in Core;
- no mobile/server/SSR cost in a basic browser consumer;
- no agent runtime in applications that only need model invocation;
- provider adapters remain separately installable and tree-shakable;
- streaming should apply backpressure and bounded buffering;
- agent/tool concurrency must be bounded;
- context, traces, tool results, and model messages require explicit retention policies;
- large model SDKs should not become mandatory transitive dependencies when thin HTTP/provider adapters are sufficient;
- memory, bundle, startup, allocation, network, and TypeScript compiler costs require reproducible evidence.

## Suggested evolution order

This is dependency order, not schedule:

```text
Core / Scope / Diagnostics
        |
Query / Schema / Form / HTTP / Task / Flow
        |
Router / Contracts / Codec
        |
Web components / Component IR / Build
        |
Application framework + server research
        |
Desktop / edge adapters
        |
React Native / mobile adapters
        |
native renderer research only if justified
```

AI work can advance mostly orthogonally after the required deterministic seams exist:

```text
Schema + Task + Flow + Contracts + Diagnostics
        |
model/provider adapters
        |
structured output + streaming
        |
MCP adapters / tool registry
        |
agent/workflow research
        |
Assistant and advanced AI-native tooling
```

## Non-goals

This vision does not authorize Vii to build:

- a new LLM;
- a model hosting platform;
- an MCP fork or proprietary replacement protocol;
- an unbounded autonomous-agent runtime;
- a package manager;
- a general-purpose bundler without evidence;
- an Nx replacement without evidence;
- a mobile native renderer before adapter-based validation;
- a desktop runtime;
- a cloud platform merely to complete a product checklist.

## Graduation gates

A vision item moves into Research only when there is a concrete problem, consumer, or architectural dependency to investigate.

Research moves into Planned only when it has:

1. a distinct Vii value proposition;
2. a small public contract;
3. clear ownership and cancellation semantics;
4. security/privacy boundaries;
5. bundle, memory, runtime, and type-check budgets;
6. portability evidence;
7. build-vs-buy comparison;
8. real consumer fixtures;
9. maintenance cost proportional to user value;
10. no hidden dependency added to Core.

## Summary

The long-term ambition is not to make Vii own every layer. It is to make a small set of Vii semantics reusable across many layers.

Web proves the model first. Server, desktop, mobile, edge, build, workspace, MCP, models, and agents may then become optional projections or integrations around the same explicit ownership, cancellation, contracts, and diagnostics foundations.
