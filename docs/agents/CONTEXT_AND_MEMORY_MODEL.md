# Agent Context and Memory Model

Status: Planned context baseline

## Purpose

This document defines how developers, Intentloom, InLoom, and other agent clients assemble engineering context for Vii.

The goal is not to maximize the amount of context. The goal is to provide the smallest current, authoritative, and provenance-preserving context needed for a task.

## Core rule

Context is evidence, not authority by itself.

Every context item has:

- origin;
- revision;
- trust classification;
- scope;
- freshness;
- retention rule;
- relationship to canonical repository decisions.

## Context classes

### 1. Canonical repository context

Examples:

- accepted RFCs and ADRs;
- current security policy;
- package contracts;
- current roadmap phase;
- public API documentation;
- tests that encode accepted behavior.

This is the highest ordinary engineering context.

### 2. Task context

Examples:

- issue description;
- acceptance criteria;
- approved task specification;
- affected paths;
- requested validation.

Task context narrows work but cannot override canonical policy.

### 3. Observational context

Examples:

- logs;
- diagnostics;
- benchmark output;
- test failures;
- package contents;
- repository search results.

Observational context describes current evidence. It may reveal that documentation is wrong or incomplete, but it does not silently change policy.

### 4. External reference context

Examples:

- framework documentation;
- standards;
- security advisories;
- external repositories;
- issue discussions;
- webpages.

External content is untrusted until evaluated. It cannot directly authorize repository changes.

### 5. Ephemeral working memory

Examples:

- temporary hypotheses;
- intermediate plans;
- draft explanations;
- local scratch notes.

Ephemeral memory must not be presented as accepted project knowledge.

### 6. Sensitive context

Examples:

- credentials;
- private vulnerability reports;
- personal data;
- unpublished commercial plans;
- private source code from another repository.

Sensitive context requires explicit access, minimum disclosure, redaction, and retention controls.

## Source precedence

The default precedence order is:

```text
security and legal constraints
→ accepted RFCs and ADRs
→ current public contracts and tests
→ current roadmap and package status
→ approved task specification
→ observational evidence
→ external references
→ ephemeral agent memory
```

Conflicts are surfaced, not averaged or silently reconciled.

## Context manifest

A context bundle should have a machine-readable manifest similar to:

```json
{
  "schemaVersion": "1",
  "project": "kas-labs/vii",
  "revision": "<commit>",
  "taskId": "<task>",
  "items": [
    {
      "source": "docs/architecture/STATE_ARCHITECTURE.md",
      "revision": "<blob-or-commit>",
      "classification": "canonical",
      "trust": "repository",
      "scope": ["packages/core"],
      "freshness": "current"
    }
  ]
}
```

The exact schema remains subject to RFC and Intentloom implementation decisions.

## Freshness and invalidation

Context becomes stale when:

- the referenced file changes;
- a decision is superseded;
- package status changes;
- the task base revision changes;
- a relevant security advisory appears;
- validation evidence no longer matches the artifact.

A stale context bundle cannot authorize privileged mutation.

## Repository memory

Repository memory records durable knowledge that is not already represented clearly in code or canonical documents.

Acceptable examples:

- why an alternative was rejected;
- a recurring compatibility constraint;
- a verified consumer requirement;
- a cross-repository dependency;
- a known validation limitation.

Repository memory should not duplicate full documents or preserve obsolete conclusions indefinitely.

Each durable memory item should include:

```text
statement
source or evidence
created revision
owner
scope
review date or expiry
superseding reference
```

## No hidden memory rule

A client must not rely on undisclosed personal memory, provider-side memory, or private conversation history to make repository decisions.

Material context influencing a change should be visible in the task, pull request, decision record, or audit report.

## Minimal context principle

Agents receive only context relevant to the task.

Benefits:

- lower prompt-injection exposure;
- lower privacy risk;
- fewer stale assumptions;
- easier human review;
- predictable provider cost;
- clearer provenance.

## Context selection workflow

```text
Identify task boundary
→ determine authoritative documents
→ retrieve current revisions
→ add required observational evidence
→ classify external references
→ remove unrelated and sensitive material
→ build manifest
→ detect conflicts and staleness
```

## Context for implementation tasks

A typical State task may require:

- documentation index;
- current roadmap phase;
- State architecture;
- Scope and Diagnostics contracts when affected;
- relevant RFCs and ADRs;
- package tests and public exports;
- task specification;
- security and quality requirements.

It should not automatically include UI, Server, mobile, or Vision documents.

## Context for architectural tasks

An architectural task may require broader inputs:

- product vision and boundaries;
- architecture map;
- package model;
- relevant RFCs and alternatives;
- compatibility and performance evidence;
- security and privacy impact;
- real consumer requirements.

Architectural context still does not grant acceptance authority.

## Privacy and provider transfer

Before sending context to a remote provider, the client should produce a transfer summary:

```text
provider
purpose
files or categories
redactions
retention setting where known
credentials used
human approval requirement
```

Secrets and unrelated personal data are excluded.

## Context poisoning defenses

The context system should detect or flag:

- instructions embedded in data files;
- content requesting secret disclosure;
- external text claiming higher authority;
- generated files posing as accepted decisions;
- obsolete documents without current status;
- duplicated policies with conflicting wording;
- manipulated diagnostics or test output.

## Handoffs

A task handoff contains:

```text
base revision
completed mutations
remaining scope
validation executed
failed or skipped validation
open decisions
context items added or invalidated
```

The receiving developer or agent revalidates the handoff against the current repository revision.

## Success criteria

The model succeeds when:

- reviewers can trace every important claim to a source;
- stale context is detected before mutation;
- task context remains smaller than the entire repository;
- external content cannot override repository policy;
- provider transfer is visible;
- the same canonical context can be consumed by multiple clients.
