# Vii Documentation

This directory is the primary map for Vii product, architecture, security, governance, quality, implementation, agent, integration, website, and public-documentation guidance.

## Start here

1. [Product Vision](strategy/PRODUCT_VISION.md)
2. [Product Boundaries](strategy/PRODUCT_BOUNDARIES.md)
3. [System Overview](architecture/SYSTEM_OVERVIEW.md)
4. [Architecture Map](architecture/ARCHITECTURE_MAP.md)
5. [Implementation Guide](implementation/IMPLEMENTATION_GUIDE.md)
6. [Phase 0 Execution Playbook](implementation/PHASE_0_EXECUTION_PLAYBOOK.md)
7. [State Alpha Execution Guide](implementation/STATE_ALPHA_EXECUTION.md)
8. [Security Architecture](security/SECURITY_ARCHITECTURE.md)
9. [Intentloom Integration](integrations/INTENTLOOM_INTEGRATION.md)
10. [Agent Governance](agents/AGENT_GOVERNANCE.md)
11. [Public Website and Documentation Lifecycle](website/PUBLIC_WEBSITE_AND_DOCUMENTATION_LIFECYCLE.md)
12. [Implementation Roadmap](roadmap/IMPLEMENTATION_ROADMAP.md)
13. [Foundation Coverage Audit](roadmap/FOUNDATION_COVERAGE_AUDIT.md)
14. [Ecosystem Capability Strategy](strategy/ECOSYSTEM_CAPABILITY_STRATEGY.md)
15. [Schema Architecture](architecture/SCHEMA_ARCHITECTURE.md)
16. [Rendering Strategy](architecture/RENDERING_STRATEGY.md)
17. [Vanilla JavaScript and TypeScript Consumer Compatibility](architecture/VANILLA_CONSUMER_COMPATIBILITY.md)

## Current implementation focus

The committed implementation sequence remains:

```text
repository foundation
→ State
→ Scope and Resources
→ Diagnostics
→ Vanilla fixture
→ framework adapters and CLI foundation
```

Native components, the application framework, SSR, native build orchestration, Nx integration, desktop, and mobile remain Research or Vision until prerequisites and evidence exist.

Schema, Form, HTTP, Flow, native template control flow, progressive rendering, and Vii-specific testing helpers now have explicit Research directions. Those documents define boundaries and graduation criteria; they do not mean the packages, syntax, or rendering modes are implemented or supported.

The future native application framework is CSR-first. Static generation, SSR/hydration, streaming, hybrid rendering, and server functions are opt-in layers that require independent evidence. Vii SSR is presentation infrastructure by default and does not require Vii to own an application's domain backend.

Intentloom integration begins as a documentation, policy, and task-context layer. It must not delay the first Core package or become a runtime dependency.

Public website work follows validated product capability. Website content must not become a substitute for implementation evidence or canonical technical documentation.

## Practical implementation guides

These documents explain how to execute the architecture:

- `implementation/IMPLEMENTATION_GUIDE.md`, overall order and implementation boundaries;
- `implementation/PHASE_0_EXECUTION_PLAYBOOK.md`, repository bootstrap steps;
- `implementation/STATE_ALPHA_EXECUTION.md`, State implementation order and tests;
- `implementation/FIRST_IMPLEMENTATION_BACKLOG.md`, first independently actionable tasks;
- `implementation/REPOSITORY_TARGET_STRUCTURE.md`, incremental repository layout;
- `implementation/AGENT_AND_DEVELOPER_GUIDE.md`, collaboration, public-surface assessment, and validation rules;
- `implementation/TASK_SPEC_TEMPLATE.md`, reusable issue and agent task template.

Developers and agents should read these guides together with the architecture document for the package they are changing.

## Strategy

- `strategy/PRODUCT_VISION.md`
- `strategy/PRODUCT_BOUNDARIES.md`
- `strategy/ECOSYSTEM_CAPABILITY_STRATEGY.md`, how Vii learns from mature ecosystems while owning only Vii-specific semantics and keeping lower-level engines and libraries replaceable.

## Architecture

### Foundations

- `architecture/SYSTEM_OVERVIEW.md`
- `architecture/ARCHITECTURE_MAP.md`
- `architecture/CORE_PRINCIPLES.md`
- `architecture/VANILLA_CONSUMER_COMPATIBILITY.md`, canonical meaning of Vanilla and first-class JavaScript/TypeScript consumer policy for framework-neutral packages.
- `architecture/PACKAGE_MODEL.md`
- `architecture/RUNTIME_COMPATIBILITY.md`
- `architecture/PLATFORM_CAPABILITIES.md`
- `architecture/MONOREPO_BOOTSTRAP.md`

### State, lifecycle, diagnostics, and application modules

- `architecture/STATE_ARCHITECTURE.md`
- `architecture/REACTIVITY_AND_STREAMS.md`
- `architecture/SCOPE_AND_RESOURCES.md`
- `architecture/DIAGNOSTICS_PROTOCOL.md`
- `architecture/FLOW_ARCHITECTURE.md`, Research boundary for temporal/event orchestration separate from State, Task, Query, and platform streams.
- `architecture/FLOW_RESEARCH_BRIEF.md`, bounded correctness comparison and throwaway fixture scope for Flow research.
- `architecture/SCHEMA_ARCHITECTURE.md`, Research direction for a small TypeScript-first runtime data-contract layer with explicit validation/transform semantics and evidence-first performance goals.
- `architecture/FORM_ARCHITECTURE.md`, Research direction for a signal-first, typed, framework-agnostic Form module.
- `architecture/HTTP_CLIENT.md`, Research direction for a small Fetch-first transport layer separate from Query.

### Adapters and tooling

- `architecture/ADAPTER_CONTRACT.md`
- `architecture/CLI_ARCHITECTURE.md`
- `architecture/PROJECT_DETECTION.md`
- `architecture/BUILD_SYSTEM.md`

### Native component and application research

- `architecture/COMPONENT_MODEL.md`
- `architecture/RENDERING_STRATEGY.md`

## Governance and quality

- `roadmap/DEFINITION_OF_DONE.md`, including the Vanilla JavaScript and TypeScript consumer verification requirement for framework-neutral public APIs.

For additional package-specific, security, release, performance, integration, website, and implementation documentation, follow the directories linked from this index. Canonical architecture documents take precedence over examples or aspirational roadmap text when their maturity differs.
