# Vii

Vii is a lightweight, observable TypeScript foundation for state, data, and application behavior across frameworks.

> One core. Any framework. Every important change explained.

Vii begins as a small framework-agnostic TypeScript core. It may grow gradually through validated modules such as State, Query, Devtools, CLI, UI, platform adapters, and server contracts.

A native component runtime and application framework are long-term Research and Vision directions, not current implementation promises.

## Current stage

The repository bootstrap foundation is now implemented: pnpm, Nx, strict TypeScript, ESM package
validation, linting, formatting, Vitest, and CI are in place. Core currently exposes experimental
State and Computed runtime primitives; the public API remains pre-alpha and intentionally small.

The foundation is detailed enough to begin Phase 0 repository bootstrap, but documentation remains design intent rather than implementation evidence.

## What we implement first

The first technical sequence is:

```text
pnpm and Nx repository bootstrap
→ strict TypeScript and ESM package baseline
→ one buildable and packable Core package
→ State read, write, subscriptions, and re-entrant update semantics
→ Computed and disposal
→ Batch and Scope
→ bounded Diagnostics
→ packed Vanilla consumer fixture
→ React, Angular, and Vue adapters
→ small CLI foundation
```

Practical instructions:

- [Implementation Guide](./docs/implementation/IMPLEMENTATION_GUIDE.md)
- [Phase 0 Execution Playbook](./docs/implementation/PHASE_0_EXECUTION_PLAYBOOK.md)
- [State Alpha Execution Guide](./docs/implementation/STATE_ALPHA_EXECUTION.md)
- [First Implementation Backlog](./docs/implementation/FIRST_IMPLEMENTATION_BACKLOG.md)
- [Agent and Developer Guide](./docs/implementation/AGENT_AND_DEVELOPER_GUIDE.md)
- [Foundation Coverage Audit](./docs/roadmap/FOUNDATION_COVERAGE_AUDIT.md)

## Current commitments

- Product thesis and architecture documentation
- Runtime-neutral Core contracts
- Vii State research and prototype
- Scope, Resource ownership, and Diagnostics protocol
- Vanilla, React, Angular, and Vue adapters
- CLI foundation and project diagnostics
- Security Architecture and ecosystem Threat Model
- Reproducible tests, benchmarks, malicious fixtures, and package validation
- Development-time agent governance and Intentloom integration boundaries

## Intentloom and agents

Intentloom is the engineering-context and agent-governance control plane for Vii development.

```text
Intentloom governs engineering work.
InLoom executes and assists.
Vii runs application behavior.
```

Intentloom, InLoom, agents, and AI providers are optional development integrations. They are not Vii production runtime dependencies.

Agent-assisted work must remain:

- task-scoped and least-privilege;
- previewable and attributable;
- controlled by deterministic validation;
- subject to RFC, ADR, security, and release governance;
- usable with local models, remote providers, or AI disabled;
- unable to merge, publish, weaken security, or accept decisions without explicit authority.

See:

- [Intentloom Integration Architecture](./docs/integrations/INTENTLOOM_INTEGRATION.md)
- [Agent Governance](./docs/agents/AGENT_GOVERNANCE.md)
- [Context and Memory Model](./docs/agents/CONTEXT_AND_MEMORY_MODEL.md)
- [Mutation and Approval Protocol](./docs/agents/MUTATION_AND_APPROVAL_PROTOCOL.md)
- [RFC 0021](./rfcs/0021-intentloom-integration-and-agent-governance.md)

## Long-term direction

Vii may evolve into a modular application ecosystem for web, desktop, mobile, and server development.

Research directions include:

- one native Component Model with SFC, split-file, TSX, and programmatic authoring profiles;
- fine-grained signal-based rendering;
- Router, layouts, SSR, SSG, streaming, and hybrid route rules;
- a Vii-owned compiler and Build System using replaceable engines;
- Vite and Rolldown as the initial build research path;
- optional Bun, Rspack, Webpack, and Nx integrations;
- secure-by-default templates, SSR, server contracts, CLI, registry, plugins, and AI tooling.

These areas remain separated into Committed, Planned, Research, and Vision stages. See [ROADMAP.md](./ROADMAP.md).

## Architectural levels

```text
Vii Core
  State, Scope, Resources, Diagnostics, Contracts

Vii modules and adapters
  Query, UI, Server, React, Angular, Vue, runtime integrations

Development control plane
  Intentloom context, policy, permissions, task and evidence contracts

Future Vii UI Runtime
  Component Model, Component IR, DOM rendering, hydration

Future Vii Application Framework
  Router, layouts, SSR, SSG, streaming, route rules, build outputs
```

Different component authoring profiles must share one State, lifecycle, diagnostics, security, and rendering contract.

## Principles

- Start small and validate before expanding
- Deterministic runtime, optional AI
- Framework and runtime neutrality at the Core
- Explicit lifecycle and Resource ownership
- Structured diagnostics and understandable execution
- Secure by default, explicit privileged operations
- Data does not implicitly become executable code
- No hidden network calls, source uploads, or telemetry by default
- Honest performance claims backed by reproducible evidence
- User freedom and gradual adoption
- Multiple authoring profiles, one runtime model
- Replaceable tools and build engines behind stable Vii contracts
- Agent context with provenance, freshness, and visible authority
- Human control over protected architecture, security, and release actions

## Security

Security is part of architecture and Definition of Done.

Vii documentation covers:

- safe template and DOM sinks;
- SSR serialization and hydration;
- server validation, CSRF, SSRF, command, path, and upload boundaries;
- capability permissions;
- CLI and registry trust;
- plugin and supply-chain security;
- diagnostics privacy;
- AI prompt-injection defense;
- agent permissions, context poisoning, approvals, and audit evidence.

See:

- [Security Architecture](./docs/security/SECURITY_ARCHITECTURE.md)
- [Threat Model](./docs/security/THREAT_MODEL.md)
- [Security and Privacy](./docs/quality/SECURITY_AND_PRIVACY.md)

## Documentation

- [Documentation index](./docs/README.md)
- [Product vision](./docs/strategy/PRODUCT_VISION.md)
- [Product boundaries](./docs/strategy/PRODUCT_BOUNDARIES.md)
- [System overview](./docs/architecture/SYSTEM_OVERVIEW.md)
- [Architecture map](./docs/architecture/ARCHITECTURE_MAP.md)
- [State architecture](./docs/architecture/STATE_ARCHITECTURE.md)
- [Component model research](./docs/architecture/COMPONENT_MODEL.md)
- [Application framework research](./docs/architecture/APPLICATION_FRAMEWORK.md)
- [Build system research](./docs/architecture/BUILD_SYSTEM.md)
- [Package model](./docs/architecture/PACKAGE_MODEL.md)
- [Roadmap](./ROADMAP.md)
- [RFC index](./rfcs/README.md)

## Evidence rule

Documentation records intent. Support requires implementation, tests, consumer fixtures, packed artifacts, compatibility results, benchmarks, security evidence, and release documentation.

Agent output, plans, and confidence scores are not implementation evidence by themselves.

## Status

Vii is experimental and pre-alpha. Package names, APIs, architecture, security contracts, integration schemas, and timelines may change before the first public release.

## License

The license will be selected before the first public source release.
