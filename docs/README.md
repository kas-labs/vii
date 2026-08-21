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
- `architecture/TEMPLATE_CONTROL_FLOW.md`, Research semantics for conditional branches, keyed repetition, empty states, and switch-like template control flow.
- `architecture/RENDERING_STRATEGY.md`, CSR-first progressive rendering with explicit opt-in static, SSR, hydration, streaming, hybrid, and server-function layers.
- `architecture/APPLICATION_FRAMEWORK.md`

These documents describe a future direction, not current implementation support.

### UI and registry

- `architecture/UI_ARCHITECTURE.md`
- `architecture/DESIGN_TOKENS.md`
- `architecture/REGISTRY_ARCHITECTURE.md`

### Server and platforms

- `architecture/SERVER_FOUNDATION.md`
- `architecture/DESKTOP_MOBILE_RESEARCH.md`

## Ecosystem capability research

Vii uses an evidence-first capability rule:

```text
own Vii semantics
reuse mature engines and libraries
keep boundaries replaceable
prove value through real consumers
```

Current explicit research tracks are:

- Schema, comparing a possible Vii-native runtime contract against mature validators such as Zod, Valibot, ArkType, TypeBox, and Ajv, with zero-copy validation, allocation, bundle, type-system, JSON Schema, and integration claims requiring reproducible evidence;
- Form, informed by Angular Signal Forms, TanStack Form, React Hook Form, Vue, and VeeValidate while defining its own Vii semantics;
- HTTP, informed by Fetch, Angular HttpClient, Axios, and small Fetch clients while remaining separate from Query and validation providers;
- Flow, comparing direct platform primitives, an RxJS Scope/State adapter, and a throwaway prototype for temporal composition, cancellation, disposal, and stream interoperability;
- native template control flow, comparing block, directive, and TSX/JavaScript authoring while sharing one compiler/runtime semantic model;
- progressive rendering, keeping CSR independently usable and requiring opt-in evidence for SSG, SSR/hydration, streaming, hybrid rendering, and server functions;
- explicit execution environments so client/server mistakes can fail at build time rather than appear as confusing runtime errors;
- Vii-specific testing intelligence over mature test runners rather than a new general-purpose runner;
- Vite/Rolldown as the first native build research direction, with Bun and Rspack as optional adapters or compatibility targets;
- meta-framework research such as Analog for orchestration and DX lessons rather than runtime dependency or API copying.

Research documents do not create packages, syntax guarantees, runtime dependencies, or support promises.

## Intentloom and agent engineering

- `integrations/INTENTLOOM_INTEGRATION.md`, product boundary and development-time integration surfaces;
- `agents/AGENT_GOVERNANCE.md`, roles, capabilities, approvals, authority, and stop conditions;
- `agents/CONTEXT_AND_MEMORY_MODEL.md`, provenance, freshness, trust, memory, and provider-transfer rules;
- `agents/MUTATION_AND_APPROVAL_PROTOCOL.md`, Analyze through rollback lifecycle;
- `implementation/AGENT_AND_DEVELOPER_GUIDE.md`, practical repository collaboration;
- `rfcs/0021-intentloom-integration-and-agent-governance.md`, proposed ecosystem contract.

The controlling formula is:

```text
Intentloom governs engineering work.
InLoom executes and assists.
Vii runs application behavior.
```

Intentloom and agents remain optional development integrations. Vii Core and applications must not require them.

## Public website and documentation

- `website/PUBLIC_WEBSITE_AND_DOCUMENTATION_LIFECYCLE.md`, feature-to-docs-to-website publication lifecycle;
- `implementation/AGENT_AND_DEVELOPER_GUIDE.md`, required `Website and docs impact` assessment;
- `implementation/TASK_SPEC_TEMPLATE.md`, task-level public-surface planning;
- `roadmap/DEFINITION_OF_DONE.md`, completion criteria for public feature work;
- `rfcs/0022-public-website-and-documentation-lifecycle.md`, proposed publication contract.

The website is a presentation and discovery surface. It does not outrank accepted decisions, implementation contracts, tests, compatibility evidence, or canonical repository documentation.

When a feature is validated enough to change what Vii can accurately present to users, agents should proactively identify the affected website page, documentation, example, and release communication rather than waiting for a separate manual reminder.

## Security

- `security/SECURITY_ARCHITECTURE.md`
- `security/THREAT_MODEL.md`
- `quality/SECURITY_AND_PRIVACY.md`
- `agents/AGENT_GOVERNANCE.md`
- `agents/CONTEXT_AND_MEMORY_MODEL.md`
- `agents/MUTATION_AND_APPROVAL_PROTOCOL.md`

The Security Architecture defines intended controls. The Threat Model defines protected assets, trust boundaries, attacker capabilities, and abuse cases. The quality document defines release and privacy expectations. The agent documents define context-poisoning, capability, approval, mutation, and audit boundaries.

## Roadmap

- `roadmap/IMPLEMENTATION_ROADMAP.md`
- `roadmap/PHASE_0_FOUNDATION.md`
- `roadmap/MILESTONE_MODEL.md`
- `roadmap/ISSUE_BREAKDOWN.md`
- `roadmap/DEFINITION_OF_DONE.md`
- `roadmap/FOUNDATION_COVERAGE_AUDIT.md`

The root `/ROADMAP.md` provides the public phase overview. Cross-phase capability research is intentionally separated from committed implementation milestones.

## Quality

- `quality/TEST_STRATEGY.md`
- `quality/PERFORMANCE_BUDGETS.md`
- `quality/SCHEMA_BENCHMARK_PLAN.md`, research benchmark methodology for runtime, allocation, bundle, and TypeScript compiler comparisons before any Vii Schema performance claim.
- `quality/FLOW_BENCHMARK_PLAN.md`, research benchmark methodology for semantically fair Flow comparisons.
- `quality/FLOW_PRIMARY_SOURCE_REVALIDATION.md`, current primary-source constraints and version boundary for Flow comparison work.
- `quality/FLOW_COMPARISON_BASELINE.md`, bounded synchronous correctness, runtime, and optional retention evidence for the three Flow research baselines.
- `quality/FLOW_TYPESCRIPT_COMPLEXITY_BASELINE.md`, bounded cold/incremental TypeScript diagnostics and transitive type-surface evidence for the three Flow research baselines.
- `quality/FLOW_ASYNC_COMPARISON_BASELINE.md`, bounded deterministic temporal, async-switching, and lifecycle evidence for the four Flow research runners.
- `quality/FLOW_OWNERSHIP_BASELINE.md`, bounded subscription identity, per-subscription upstream ownership, and Scope disposal-isolation evidence.
- `quality/SECURITY_AND_PRIVACY.md`
- `quality/COMPATIBILITY_POLICY.md`

## Governance

- `governance/RFC_PROCESS.md`
- `governance/ADR_PROCESS.md`
- `governance/API_STABILITY.md`
- `governance/RELEASE_POLICY.md`
- `governance/EXPERIMENTAL_CORE_RELEASE.md`, accepted Core-only experimental release decision.
- `governance/CORE_EXPERIMENTAL_RELEASE_SECURITY.md`, release evidence and protected publishing prerequisites; it does not authorize publication.
- `governance/PACKAGE_LIFECYCLE.md`
- `governance/DECISION_MAKING.md`
- `governance/REPOSITORY_OPERATING_MODEL.md`
- `governance/CONTRIBUTOR_ROLES.md`

## Key proposed RFCs

### Future native framework direction

- RFC 0018: Native Component and Reactivity Model
- RFC 0019: Application Framework and Build System Direction
- RFC 0020: Security Architecture and Threat Model

### Agent and engineering-context direction

- RFC 0021: Intentloom Integration and Agent Governance

### Public website and documentation direction

- RFC 0022: Public Website and Documentation Lifecycle

The Schema, Form, HTTP, testing, template-control-flow, and rendering-strategy documents are Research inputs. They are intentionally not presented as accepted RFCs.

These proposals remain Proposed. Implementation and support claims require accepted decisions, milestones, tests, fixtures, and releases.

## Decision records

- Public and ecosystem-level proposals live in `/rfcs`.
- Accepted internal architectural decisions live in `/adr`.
- Pull requests document local implementation decisions.
- Agent plans and memory cannot silently replace decision records.

## Status language

Vii uses four roadmap statuses:

- **Committed**: required for the current product direction.
- **Planned**: expected after current commitments are validated.
- **Research**: under investigation, without a support promise.
- **Vision**: possible long-term direction, not a delivery commitment.

Documentation and website copy must preserve these distinctions and must not present research or vision work as supported functionality.

## Evidence rule

Documentation records intent.

Support claims require evidence such as:

- implementation;
- executable tests;
- consumer fixtures;
- packed artifacts;
- compatibility results;
- benchmarks;
- malicious security fixtures;
- real application use;
- accepted RFCs and ADRs.

Agent output is a proposal or execution report. It is not authoritative evidence unless backed by deterministic validation and reviewable artifacts.
