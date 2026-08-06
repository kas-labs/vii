# Intentloom Integration Architecture

Status: Planned foundation integration

## Purpose

Intentloom is the engineering-context and agent-governance system used to describe how Vii should be built, changed, validated, and released.

The product boundary is explicit:

```text
Intentloom governs engineering work.
InLoom executes and assists.
Vii runs application behavior.
```

Intentloom is not part of the Vii production runtime. A Vii application must remain usable without Intentloom, an AI provider, InLoom, or a network connection.

## Architectural role

Intentloom provides a control plane for development-time concerns:

- canonical engineering intent;
- architecture and package policies;
- agent instructions and permissions;
- task specifications and handoffs;
- repository memory with provenance;
- validation requirements;
- release restrictions;
- provider-neutral agent context;
- auditable mutation history.

Vii provides deterministic implementation surfaces that Intentloom can consume:

- RFC and ADR indexes;
- package metadata and stability levels;
- machine-readable CLI plans and reports;
- diagnostics schemas;
- compatibility and performance budgets;
- security policy decisions;
- test and package-validation evidence.

## Dependency rule

The dependency direction is one way:

```text
Intentloom adapters and development tools
                  ↓
Vii CLI, diagnostics, schemas, and repository metadata
                  ↓
Vii modules and Core
```

Vii Core must not import Intentloom packages or require Intentloom configuration.

Allowed integration locations include:

- repository configuration;
- development CLI adapters;
- CI policy checks;
- InLoom integrations;
- optional Devtools adapters;
- release orchestration;
- external agent clients.

Forbidden integration locations include:

- hidden production runtime dependencies;
- automatic source upload;
- mandatory model calls;
- implicit network access;
- agent authority embedded inside State, Query, rendering, or server semantics.

## Repository profile

The repository may define an Intentloom profile containing:

```text
project identity
product boundaries
current roadmap phase
package dependency rules
accepted RFC and ADR references
security and privacy rules
quality gates
allowed tools and capabilities
release restrictions
task and handoff schemas
```

The profile references canonical repository documents instead of duplicating their full content wherever practical.

## Context precedence

When instructions conflict, the default precedence is:

1. applicable law, security response requirements, and explicit human stop instructions;
2. repository security policy and protected-branch rules;
3. accepted RFCs and ADRs;
4. current roadmap phase and package stability policy;
5. package documentation, tests, and public contracts;
6. approved task specification;
7. temporary agent or editor instructions.

A lower-precedence source cannot silently override a higher-precedence source.

Conflicts must be reported with provenance and resolved by a human or an accepted decision record.

## Integration surfaces

### 1. Task specification

Intentloom may produce a task specification containing:

```text
task id
goal
in scope
out of scope
affected packages
required documents
allowed capabilities
approval requirements
acceptance criteria
validation commands
security and compatibility impact
```

The task specification is input to an agent or developer. It is not proof that the requested design is accepted.

### 2. Context snapshot

A context snapshot records:

- source path or URI;
- source type;
- revision or commit;
- retrieval time;
- trust classification;
- relevant section or digest;
- expiration or freshness policy.

Snapshots must preserve provenance so that a reviewer can determine why a decision was proposed.

### 3. CLI plan and report

Vii CLI machine-readable output is the preferred mutation interface:

```text
Analyze
→ Plan
→ Preview
→ Approve
→ Apply
→ Validate
→ Report
```

Intentloom may inspect and approve a plan, but it cannot bypass Vii CLI safety checks.

### 4. Diagnostics

Intentloom and InLoom may consume redacted diagnostics for explanation and analysis.

Diagnostics remain observational. Agent consumers cannot alter runtime behavior through the diagnostics channel.

### 5. Decision records

Intentloom may help draft RFCs and ADRs, but acceptance remains a repository governance action.

Model output cannot mark an RFC Accepted, supersede an ADR, change package stability, or authorize a release without the required human and repository process.

### 6. Release controls

Intentloom may evaluate release readiness against:

- required checks;
- package contents;
- provenance;
- compatibility evidence;
- migration notes;
- security review;
- release channel rules.

Publishing remains a privileged action requiring explicit authority.

## Capability model

Agent capabilities are explicit and task-scoped.

Examples:

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

A task receives only the minimum capabilities required.

Capabilities should support constraints such as:

- allowed paths;
- allowed commands;
- allowed hosts;
- maximum execution time;
- read-only versus write access;
- required approval before use.

The host platform must enforce capabilities. Documentation alone is not a sandbox.

## Local-first and provider-neutral operation

Intentloom integration must support:

- local deterministic validation without AI;
- local models;
- multiple remote providers through adapters;
- bring-your-own credentials;
- disabled AI mode;
- exportable open context formats.

No Vii workflow may require one specific model provider.

## Privacy

Default rules:

- source code stays local unless an approved capability explicitly permits transfer;
- secrets are excluded from context;
- diagnostics are redacted by default;
- prompts and responses are not telemetry;
- provider requests require visible configuration;
- task reports identify external data transfer when it occurred.

## Failure behavior

If Intentloom is unavailable:

- Vii builds and runtime behavior continue normally;
- deterministic repository commands remain available;
- developers can follow repository documentation directly;
- no package may fail at runtime because agent context is missing.

If policy evaluation fails or context is stale, privileged mutation stops and reports the unresolved condition.

## Versioning

Integration schemas must be versioned independently from Vii runtime APIs.

A schema change documents:

- compatibility impact;
- migration path;
- supported producer and consumer versions;
- unknown-field behavior;
- downgrade behavior.

## Initial implementation boundary

The first Intentloom integration slice is documentation and repository policy only:

1. define the Vii engineering profile;
2. reference canonical architecture and governance documents;
3. define task, context, capability, plan, and report concepts;
4. define human approval and stop conditions;
5. validate one read-only repository analysis workflow;
6. validate one previewable documentation mutation workflow.

It does not include autonomous implementation, release publication, cloud synchronization, or production runtime integration.

## Success criteria

The integration is useful when:

- the same task produces consistent constraints across supported clients;
- agents can identify the current roadmap phase and non-goals;
- every proposed mutation has provenance and a preview;
- protected actions require explicit approval;
- deterministic validation remains authoritative;
- the repository works normally without Intentloom.

## Unresolved questions

- exact configuration file names and schemas;
- whether the first adapter lives in the Vii repository or Intentloom repository;
- signing and trust model for shared policy bundles;
- cross-repository task handoff format;
- retention rules for audit records;
- organization-level policy inheritance across Kas Labs projects.
