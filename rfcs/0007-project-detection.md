# RFC 0007: Project Detection

- Status: Draft
- Authors: Kas Labs
- Target: CLI Foundation

## Summary

Define a read-only, evidence-based project detection model used by Vii CLI before any integration or mutation.

## Motivation

Vii must integrate with existing React, Angular, Vue, Vanilla, SSR, and monorepo projects. Guessing from one lockfile or dependency is unsafe, especially in mixed-framework workspaces.

## Proposal

Detection returns a structured result containing:

- workspace type;
- target projects;
- framework;
- runtime;
- package manager;
- language;
- rendering mode;
- installed Vii modules;
- evidence;
- confidence;
- conflicts.

Detection is read-only and must retain the evidence behind each conclusion.

## Evidence

Potential evidence sources include:

- package manifests;
- lockfiles;
- framework configuration;
- workspace configuration;
- TypeScript configuration;
- source imports;
- build scripts;
- established directory conventions;
- existing Vii configuration.

## Conflict policy

Material conflicts are never resolved silently.

The user or caller must select a project, provide an explicit flag, update configuration, or abort.

## Monorepos

Commands must support explicit workspace targets:

```bash
vii init --project storefront
vii add state --project admin
```

Nx is the initial first-class monorepo fixture, but Vii integrations do not require Nx.

## Security

Detection must not:

- install packages;
- execute arbitrary scripts;
- mutate files;
- connect to external services;
- expose environment secret values.

## Machine-readable output

Detection output is available through a versioned JSON form for CI, IDEs, InLoom, and other integrations.

## Rejected alternatives

### Detect only from lockfile

Rejected because runtime, package manager, and workspace intent may differ.

### Execute framework configuration directly

Rejected as a default because configuration can contain arbitrary code.

### Treat monorepo root as one application

Rejected because framework and runtime decisions may differ per project.

## Unresolved questions

- safe loading of executable configuration;
- confidence scoring;
- mixed JavaScript and TypeScript classification;
- non-Nx monorepo adapters;
- treatment of multiple lockfiles;
- caching and invalidation of detection results.

## Acceptance criteria

Fixture tests cover React, Angular, Vue, Vanilla, Nx mixed-framework workspaces, SSR, supported package managers, conflicts, malformed projects, and existing Vii installations.
