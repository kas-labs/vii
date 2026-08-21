# Vii RFCs

Requests for Comments record proposals that affect public APIs, package boundaries, protocols, compatibility promises, governance, security policy, agent authority, or long-term ecosystem direction.

## RFC states

- Draft
- Proposed
- Accepted
- Rejected
- Withdrawn
- Superseded

## Current index

### Foundation

- `0001-vii-core-direction.md`
- `0002-vii-state-model.md`
- `0003-scope-and-resource-ownership.md`
- `0004-diagnostics-protocol.md`

### Adapters and CLI

- `0005-framework-adapter-contract.md`
- `0006-cli-command-lifecycle.md`
- `0007-project-detection.md`

### UI and Registry

- `0008-vii-ui-distribution-model.md`
- `0009-design-token-system.md`
- `0010-registry-and-lockfile.md`

### Runtime, platform, and server

- `0011-runtime-compatibility.md`
- `0012-platform-capabilities.md`
- `0013-server-foundation.md`

### Quality, governance, and execution

- `0014-quality-gates.md`
- `0015-security-privacy-release.md`
- `0016-governance-and-repository-operating-model.md`
- `0017-implementation-roadmap-and-phase-gates.md`

### Future native framework direction

- `0018-native-component-and-reactivity-model.md` — Proposed
- `0019-application-framework-and-build-system.md` — Proposed
- `0020-security-architecture-and-threat-model.md` — Proposed

### Engineering context and agents

- `0021-intentloom-integration-and-agent-governance.md` — Proposed

### Public website and documentation lifecycle

- `0022-public-website-and-documentation-lifecycle.md` — Proposed

### Diagnostics security

- `0023-security-diagnostics-event-contract.md` — Accepted

### Query direction

- `0024-query-architecture.md` — Proposed

RFCs 0018 through 0022 document Research, Vision, development-governance, or publication-process direction. They do not change the committed first implementation sequence unless accepted decisions explicitly revise it.

RFC 0023 records an accepted experimental security-diagnostics direction. RFC 0024 proposes the Phase 5 Query architecture and does not create a package, stable API, or support promise.

## When an RFC is required

Use an RFC for changes such as:

- a new official package;
- a public API or protocol;
- framework or runtime support commitments;
- diagnostics schema changes;
- CLI command contracts;
- registry or lockfile formats;
- native component or application framework semantics;
- build engine contracts;
- Intentloom integration contracts;
- agent capability, approval, or mutation policy;
- public website/documentation lifecycle requirements;
- stability and release policy;
- governance changes;
- security or privacy defaults.

Local implementation details normally belong in pull requests. Internal architectural choices normally belong in ADRs.

Agent plans, prompts, and repository memory cannot silently replace an RFC or ADR.

## Required RFC sections

- Summary
- Motivation
- Goals
- Non-goals
- Detailed design
- Public API or contract impact
- Compatibility
- Diagnostics and observability
- Security and privacy
- Authority and approval boundaries where applicable
- Alternatives
- Risks
- Migration
- Validation plan
- Unresolved questions

Accepted RFCs describe intended direction. Support claims still require implementation, tests, fixtures, packaging evidence, security evidence, and release documentation.

See `docs/governance/RFC_PROCESS.md` for the complete process.
