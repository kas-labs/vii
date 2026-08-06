# Mutation and Approval Protocol

Status: Planned mutation baseline

## Purpose

This protocol defines how a developer tool or AI agent proposes and applies changes to a Vii repository.

It extends the CLI lifecycle:

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

No agent integration may skip deterministic repository controls.

## 1. Analyze

The client determines:

- repository identity and revision;
- current roadmap phase;
- relevant project and package boundaries;
- affected files;
- applicable RFCs, ADRs, security rules, and quality gates;
- available tools and permissions;
- whether the task requires a new decision.

Analysis is read-only.

## 2. Plan

The plan is a deterministic, reviewable description of intended work.

Minimum fields:

```text
plan id
base revision
task id
goal
affected paths
operations
expected public impact
dependencies
validation commands
security and privacy impact
compatibility impact
approval requirements
rollback strategy
```

The plan must distinguish certain operations from agent suggestions.

## 3. Preview

Preview shows the effect before mutation.

Depending on the operation, preview may include:

- unified diff;
- files created, modified, moved, or deleted;
- package dependency changes;
- command list;
- network destinations;
- secret access requests;
- generated manifests;
- migration output;
- estimated risk level.

A summary without inspectable changes is insufficient for a high-impact mutation.

## 4. Approve

Approval is bound to:

- plan id;
- base revision;
- exact operation set;
- granted capabilities;
- expiration or task session;
- approving actor.

Approval becomes invalid if:

- the base revision changes materially;
- the plan changes;
- affected paths change;
- a new privileged operation is added;
- required context becomes stale;
- a security gate fails.

Silence is not approval.

## 5. Apply

Application rules:

- write only inside approved roots;
- use atomic or recoverable operations where practical;
- do not follow untrusted symlinks outside the root;
- preserve file permissions intentionally;
- do not execute generated content implicitly;
- record every operation and result;
- stop on unexpected state rather than guessing.

The operation should be idempotent where feasible.

## 6. Validate

Validation is selected by change type.

Examples:

### Documentation

- links and indexes;
- file existence;
- status terminology;
- RFC and ADR references;
- formatting;
- contradiction checks where available.

### Runtime or package

- lint;
- typecheck;
- unit and lifecycle tests;
- build;
- packed artifact validation;
- clean consumer fixture;
- performance or security checks when affected.

### CLI or generator

- dry-run;
- deterministic plan;
- root confinement;
- idempotency;
- changed-file snapshot;
- JSON output;
- malicious path and input fixtures.

A failed required check blocks a claim of completion.

## 7. Report

The final report includes:

```text
base and final revision
files changed
commands run
validation outcomes
external network use
secret access
approvals used
warnings
skipped checks
remaining risks
rollback instructions
```

The report separates observed facts from conclusions.

## 8. Rollback

Rollback is required when:

- application partially fails;
- validation reveals an unsafe state;
- approval is revoked before completion;
- the applied plan differs from preview;
- protected data or credentials may have been exposed.

Rollback options include:

- restore original file snapshots;
- revert a commit;
- remove generated artifacts;
- invalidate credentials;
- close or revert a pull request;
- halt release publication.

A rollback must not destroy unrelated user work.

## Mutation classes

### Class A: read-only

Examples: analysis, search, diagnostics inspection.

No write approval required beyond task access.

### Class B: low-risk reversible

Examples: documentation edits in approved paths.

Requires preview and task-scoped approval.

### Class C: code and dependency mutation

Examples: runtime code, package manifests, generated files.

Requires full validation and maintainer review.

### Class D: security, infrastructure, and repository controls

Examples: workflows, permissions, branch rules, security defaults.

Requires explicit human approval and specialized review.

### Class E: irreversible or externally visible

Examples: package publication, release signing, secret rotation, destructive data operations.

Requires separate release authority and cannot be bundled into ordinary implementation approval.

## Approval separation

The actor that produces a plan may apply it when permitted, but it cannot be the sole approver for Class D or E actions.

A model-generated confidence score is never an approval.

## Command execution

Approved command execution defines:

- executable and arguments;
- working directory;
- environment variables;
- timeout;
- network policy;
- output redaction;
- expected files modified.

Shell interpolation from untrusted text is prohibited.

## Network operations

Network access is denied unless explicitly required.

A network plan records:

- destination host;
- method and purpose;
- data categories sent;
- authentication used;
- expected response;
- caching or retention implications.

Network output remains untrusted input.

## Secret handling

Secrets are never placed in prompts, diffs, logs, reports, or diagnostic payloads.

Secret access should use opaque handles where possible.

An agent may know that a credential exists without reading its value.

## Pull request workflow

The preferred mutation result is a reviewable branch and pull request.

The PR should contain:

- task and plan reference;
- scope and non-goals;
- architecture references;
- validation evidence;
- security, privacy, and compatibility impact;
- remaining decisions.

Creating a PR does not authorize merging it.

## Release workflow

Release preparation and release publication are separate operations.

Preparation may create:

- version proposal;
- changelog;
- package inspection report;
- provenance and SBOM artifacts;
- release notes;
- migration notes.

Publication requires explicit release authority after validation of the final artifact.

## Concurrency

Before apply, the client verifies that the base revision and affected files still match the approved plan.

If another task changes the same boundary, the plan is invalidated and must be regenerated.

## Success criteria

The protocol succeeds when:

- every meaningful mutation can be previewed;
- reviewers can connect the result to an approved plan;
- permissions cannot expand implicitly;
- failed validation blocks completion claims;
- rollback is practical;
- protected actions remain human-controlled.
