# RFC 0021: Intentloom Integration and Agent Governance

- Status: Proposed
- Authors: Kas Labs
- Target: Development tooling and repository governance
- Related: RFC 0006, RFC 0015, RFC 0016, RFC 0017, RFC 0020

## Summary

Define Intentloom as an optional development-time control plane for Vii engineering context, agent permissions, task specifications, safe mutations, validation evidence, and release restrictions.

Define an agent-governance model in which AI agents remain bounded tools. They cannot become hidden runtime dependencies, override accepted decisions, weaken deterministic validation, or perform privileged actions without explicit authority.

## Motivation

Vii is designed for understandable execution, explicit ownership, structured diagnostics, secure defaults, and machine-readable tooling.

These properties make Vii suitable for AI-assisted engineering, but they do not by themselves answer:

- which context is authoritative;
- how context freshness and provenance are tracked;
- what an agent is allowed to read or change;
- when human approval is required;
- how plans, previews, mutations, validation, and rollback are connected;
- how multiple clients share the same engineering intent;
- how AI remains optional and provider-neutral.

Without an explicit model, each editor or agent could invent different rules and silently drift from repository architecture.

## Goals

- define the product boundary between Vii, Intentloom, and InLoom;
- keep Intentloom outside the Vii production runtime;
- define canonical context precedence and provenance;
- define least-privilege agent capabilities;
- extend CLI mutation semantics with approval and rollback;
- define non-delegable human decisions;
- support local-first and provider-neutral operation;
- preserve deterministic validation as the source of completion evidence;
- support auditable task handoffs across clients.

## Non-goals

This RFC does not:

- require Intentloom to build or run Vii applications;
- define the final Intentloom file format;
- choose an AI provider;
- authorize autonomous code implementation or releases;
- create a production agent runtime inside Vii;
- make InLoom mandatory;
- define cloud synchronization or billing;
- claim that documentation alone provides a sandbox.

## Product boundary

```text
Intentloom governs engineering work.
InLoom executes and assists.
Vii runs application behavior.
```

Vii exposes deterministic and machine-readable surfaces. Intentloom consumes those surfaces to assemble context and evaluate policy. InLoom or another client may present plans and execute approved operations.

## Dependency direction

```text
Intentloom and agent clients
          ↓
Vii CLI, diagnostics, metadata, RFC/ADR indexes
          ↓
Vii modules and Core
```

Vii Core cannot depend on Intentloom, InLoom, AI providers, or agent SDKs.

## Context model

Each context item includes:

```text
source
revision
classification
trust level
scope
freshness
retention rule
provenance
```

Default precedence:

```text
security and legal constraints
→ accepted RFCs and ADRs
→ current contracts and tests
→ current roadmap and package status
→ approved task specification
→ observational evidence
→ external references
→ ephemeral model memory
```

Conflicts are surfaced. Lower-precedence content cannot silently override higher-precedence content.

## Agent capability model

Capabilities are explicit and task-scoped.

Example capability vocabulary:

```text
repository.read
repository.search
repository.write
command.run
network.read
network.write
secret.read
pull_request.create
release.prepare
release.publish
```

Capabilities may be constrained by paths, commands, hosts, duration, approval checkpoints, and mutation budgets.

The host platform must enforce capabilities.

## Operating modes

- Read-only analysis
- Planning
- Bounded mutation
- Validation
- Privileged operation

Privileged operations require explicit human approval and should normally be separated from implementation work.

## Mutation lifecycle

The canonical lifecycle is:

```text
Analyze
→ Plan
→ Preview
→ Approve
→ Apply
→ Validate
→ Report
→ Roll back when required
```

Approval is bound to a plan, revision, operation set, capabilities, and approving actor.

A changed plan or stale base revision invalidates approval.

## Non-delegable decisions

An agent cannot independently:

- accept or supersede an RFC or ADR;
- declare a roadmap phase complete;
- mark a package Stable;
- change license terms;
- weaken a security default;
- grant itself permissions;
- merge protected branches;
- publish a package or release;
- infer approval from silence.

## Task and handoff contracts

A task specification should include:

```text
task id
goal
in scope
out of scope
affected packages and paths
relevant decisions
allowed capabilities
approval checkpoints
acceptance criteria
validation commands
security, privacy, and compatibility impact
rollback strategy
```

A handoff includes:

```text
base revision
completed work
remaining work
validation state
failed or skipped checks
open decisions
context changes
```

## Security and privacy

- repository files and external content are untrusted agent context;
- secrets are excluded from prompts, logs, diffs, and diagnostics;
- remote provider transfer requires visible configuration and purpose;
- source upload and telemetry remain off by default;
- model output cannot bypass deterministic policy or validation;
- commands cannot be constructed through unsafe interpolation;
- network access is denied unless explicitly granted;
- audit records avoid unnecessary personal data.

## Compatibility

The integration schema is versioned independently from Vii runtime APIs.

Consumers must define:

- supported schema versions;
- unknown-field behavior;
- downgrade behavior;
- producer and consumer compatibility;
- stale-context behavior.

Vii remains fully functional when the integration is disabled or absent.

## Diagnostics and observability

Agent and Intentloom workflows may emit structured development events such as:

```text
context.loaded
context.stale
policy.allowed
policy.denied
plan.created
plan.approved
mutation.applied
validation.passed
validation.failed
handoff.created
```

Events must be redacted and must not include source, secrets, prompts, or model responses by default.

## Alternatives considered

### Put agent behavior inside Vii Core

Rejected because it would violate deterministic runtime and provider-neutrality goals.

### Let each editor define its own rules

Rejected because context, permissions, and approvals would drift across clients.

### Depend entirely on repository prose

Insufficient because machine-readable task, capability, plan, and evidence contracts are needed for safe automation.

### Fully autonomous agents

Rejected as an initial model because release, security, architecture, and governance authority must remain explicit and reviewable.

## Risks

### Policy complexity

Mitigation: begin with a small repository profile and a few capability classes.

### False sense of sandboxing

Mitigation: document that enforcement belongs to the host platform and repository controls.

### Stale context

Mitigation: bind context and approval to repository revisions and freshness rules.

### Provider lock-in

Mitigation: open schemas, local operation, and provider adapters.

### Governance bottleneck

Mitigation: allow low-risk bounded mutations while reserving human approval for consequential decisions.

### Audit data becoming sensitive

Mitigation: redaction, retention limits, and data minimization.

## Migration and adoption

Initial adoption sequence:

1. publish the documentation baseline;
2. define a Vii repository profile in the Intentloom project;
3. validate read-only documentation analysis;
4. validate one documentation-only preview and PR workflow;
5. add deterministic context and link validation;
6. evaluate code tasks only after Phase 0 tooling exists;
7. keep release publication outside agent authority.

## Validation plan

- run the same documentation audit from two supported clients using the same context profile;
- verify that conflicting instructions are reported;
- verify that stale revision invalidates a plan;
- verify that denied capabilities cannot be used;
- verify that a documentation mutation produces a deterministic preview and report;
- verify that no AI or Intentloom dependency appears in packed Vii runtime artifacts;
- review provider transfer and redaction behavior;
- test malicious prompt instructions embedded in repository and external content.

## Unresolved questions

- final schema and file names;
- first Intentloom adapter repository;
- organization-level policy inheritance;
- signing and trust for shared policy bundles;
- audit retention and export format;
- task lease and multi-agent conflict protocol;
- integration with future Vii Devtools and release infrastructure.
