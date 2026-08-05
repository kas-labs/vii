# Vii Documentation

This directory is the primary map for Vii product, architecture, security, governance, quality, and implementation documentation.

## Start here

1. [Product Vision](strategy/PRODUCT_VISION.md)
2. [Product Boundaries](strategy/PRODUCT_BOUNDARIES.md)
3. [System Overview](architecture/SYSTEM_OVERVIEW.md)
4. [Architecture Map](architecture/ARCHITECTURE_MAP.md)
5. [Implementation Guide](implementation/IMPLEMENTATION_GUIDE.md)
6. [Phase 0 Execution Playbook](implementation/PHASE_0_EXECUTION_PLAYBOOK.md)
7. [State Alpha Execution Guide](implementation/STATE_ALPHA_EXECUTION.md)
8. [Security Architecture](security/SECURITY_ARCHITECTURE.md)
9. [Implementation Roadmap](roadmap/IMPLEMENTATION_ROADMAP.md)

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

## Practical implementation guides

These documents explain how to execute the architecture:

- `implementation/IMPLEMENTATION_GUIDE.md`, overall order and implementation boundaries;
- `implementation/PHASE_0_EXECUTION_PLAYBOOK.md`, repository bootstrap steps;
- `implementation/STATE_ALPHA_EXECUTION.md`, State implementation order and tests;
- `implementation/FIRST_IMPLEMENTATION_BACKLOG.md`, first independently actionable tasks;
- `implementation/REPOSITORY_TARGET_STRUCTURE.md`, incremental repository layout;
- `implementation/AGENT_AND_DEVELOPER_GUIDE.md`, collaboration and validation rules;
- `implementation/TASK_SPEC_TEMPLATE.md`, reusable issue and agent task template.

Developers and agents should read these guides together with the architecture document for the package they are changing.

## Strategy

- `strategy/PRODUCT_VISION.md`
- `strategy/PRODUCT_BOUNDARIES.md`

## Architecture

### Foundations

- `architecture/SYSTEM_OVERVIEW.md`
- `architecture/ARCHITECTURE_MAP.md`
- `architecture/CORE_PRINCIPLES.md`
- `architecture/PACKAGE_MODEL.md`
- `architecture/RUNTIME_COMPATIBILITY.md`
- `architecture/PLATFORM_CAPABILITIES.md`
- `architecture/MONOREPO_BOOTSTRAP.md`

### State, lifecycle, and diagnostics

- `architecture/STATE_ARCHITECTURE.md`
- `architecture/REACTIVITY_AND_STREAMS.md`
- `architecture/SCOPE_AND_RESOURCES.md`
- `architecture/DIAGNOSTICS_PROTOCOL.md`

### Adapters and tooling

- `architecture/ADAPTER_CONTRACT.md`
- `architecture/CLI_ARCHITECTURE.md`
- `architecture/PROJECT_DETECTION.md`
- `architecture/BUILD_SYSTEM.md`

### Native component and application research

- `architecture/COMPONENT_MODEL.md`
- `architecture/APPLICATION_FRAMEWORK.md`

These documents describe a future direction, not current implementation support.

### UI and registry

- `architecture/UI_ARCHITECTURE.md`
- `architecture/DESIGN_TOKENS.md`
- `architecture/REGISTRY_ARCHITECTURE.md`

### Server and platforms

- `architecture/SERVER_FOUNDATION.md`
- `architecture/DESKTOP_MOBILE_RESEARCH.md`

## Security

- `security/SECURITY_ARCHITECTURE.md`
- `security/THREAT_MODEL.md`
- `quality/SECURITY_AND_PRIVACY.md`

The Security Architecture defines intended controls. The Threat Model defines protected assets, trust boundaries, attacker capabilities, and abuse cases. The quality document defines release and privacy expectations.

## Roadmap

- `roadmap/IMPLEMENTATION_ROADMAP.md`
- `roadmap/PHASE_0_FOUNDATION.md`
- `roadmap/MILESTONE_MODEL.md`
- `roadmap/ISSUE_BREAKDOWN.md`
- `roadmap/DEFINITION_OF_DONE.md`

The root `/ROADMAP.md` provides the public phase overview.

## Quality

- `quality/TEST_STRATEGY.md`
- `quality/PERFORMANCE_BUDGETS.md`
- `quality/SECURITY_AND_PRIVACY.md`
- `quality/COMPATIBILITY_POLICY.md`

## Governance

- `governance/RFC_PROCESS.md`
- `governance/ADR_PROCESS.md`
- `governance/API_STABILITY.md`
- `governance/RELEASE_POLICY.md`
- `governance/PACKAGE_LIFECYCLE.md`
- `governance/DECISION_MAKING.md`
- `governance/REPOSITORY_OPERATING_MODEL.md`
- `governance/CONTRIBUTOR_ROLES.md`

## Key proposed RFCs for the future framework direction

- RFC 0018: Native Component and Reactivity Model
- RFC 0019: Application Framework and Build System Direction
- RFC 0020: Security Architecture and Threat Model

The proposals remain Proposed. Implementation and support claims require accepted decisions, milestones, tests, fixtures, and releases.

## Decision records

- Public and ecosystem-level proposals live in `/rfcs`.
- Accepted internal architectural decisions live in `/adr`.
- Pull requests document local implementation decisions.

## Status language

Vii uses four roadmap statuses:

- **Committed**: required for the current product direction.
- **Planned**: expected after current commitments are validated.
- **Research**: under investigation, without a support promise.
- **Vision**: possible long-term direction, not a delivery commitment.

Documentation must preserve these distinctions and must not present research or vision work as supported functionality.

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
