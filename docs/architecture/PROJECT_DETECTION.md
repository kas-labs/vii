# Project Detection Model

Status: Draft

## Goal

Vii CLI must integrate with existing applications without guessing destructively.

Project detection produces a structured, explainable result that can be reviewed by users, tests, CI, InLoom, or other tools.

The initial private implementation lives in `packages/cli-core` and exposes the asynchronous,
read-only `detectProject(root)` function. It reports root-level evidence for package manager,
framework, runtime, workspace, language, rendering, installed Vii packages, confidence, and
conflicts. It deliberately does not enumerate or select nested monorepo projects yet; mixed roots
remain explicit conflicts for a later CLI selection surface.

## Detection output

```ts
interface DetectedProject {
  root: string;
  workspace: 'single' | 'nx' | 'other-monorepo' | 'unknown';
  framework: 'react' | 'angular' | 'vue' | 'vanilla' | 'mixed' | 'unknown';
  runtime: 'browser' | 'node' | 'bun' | 'deno' | 'unknown';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
  language: 'typescript' | 'javascript' | 'mixed';
  rendering: 'client' | 'ssr' | 'static' | 'mixed' | 'unknown';
  projects: DetectedWorkspaceProject[];
  evidence: DetectionEvidence[];
  confidence: 'high' | 'medium' | 'low';
  conflicts: DetectionConflict[];
}
```

The exact public shape is not yet accepted.

## Evidence sources

Detection may inspect:

- package manifests;
- lockfiles;
- workspace manifests;
- framework configuration;
- TypeScript and JavaScript configuration;
- source imports;
- build scripts;
- framework-specific directory conventions;
- existing Vii files;
- environment configuration names, without reading secret values.

Every conclusion must retain its evidence.

Example:

```text
Framework: Angular
Confidence: high
Evidence:
- dependency `@angular/core`
- file `angular.json`
- TypeScript application target
```

## Conflict handling

Examples of conflicts:

- both `pnpm-lock.yaml` and `bun.lock` exist;
- React and Angular applications share one monorepo;
- package dependencies suggest one framework while project config suggests another;
- SSR tooling is present but not active for the selected project.

The CLI must not resolve material conflicts silently.

Resolution options:

- select a workspace project;
- pass an explicit flag;
- update `vii.config.ts`;
- abort without mutation.

## Monorepos

Project detection must support selecting a target project instead of treating a workspace as one application.

Example:

```bash
vii init --project storefront
vii add state --project backoffice
```

The detector should distinguish:

- workspace root dependencies;
- project-local dependencies;
- shared libraries;
- build targets;
- application and library projects.

Nx is the initial first-class monorepo target because Vii plans to use Nx internally, but Core integrations must not require Nx.

## Detection purity

Detection is read-only.

It must not:

- install packages;
- run arbitrary project scripts;
- modify files;
- connect to external services;
- evaluate untrusted configuration code without an explicit safe strategy.

## Machine-readable result

```bash
vii info --json
```

The JSON format should be versioned so IDEs and CI can depend on it.

## Testing

Detection requires fixture coverage for:

- React with Vite;
- Angular workspace;
- Vue with Vite;
- Vanilla TypeScript;
- Nx mixed-framework monorepo;
- npm, pnpm, Yarn, and Bun lockfiles;
- conflicting lockfiles;
- SSR applications;
- partial or malformed projects;
- projects already using Vii.

## Privacy

Detection reports file names, configuration metadata, and dependency names. It must not include secret values or source contents in telemetry. Telemetry remains disabled by default.
