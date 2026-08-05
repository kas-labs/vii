# Vii CLI Architecture

Status: Draft

## Purpose

Vii CLI is the safe orchestration layer for creating, integrating, generating, validating, building, migrating, and inspecting Vii projects.

The CLI reduces setup complexity. It does not replace package managers, general-purpose workspace managers, bundlers, native build systems, or deployment platforms.

Vii may use those systems through adapters while preserving one Vii command and planning model.

## Entry points

Recommended user-facing commands:

```bash
npm create vii@latest
npx @vii/cli@latest init
vii add state
vii doctor
```

Candidate packages:

```text
create-vii
@vii/cli
@vii/cli-core
@vii/nx
```

Package names remain subject to namespace and release decisions.

## Command model

The command tree may include:

```text
vii
├── create
├── init
├── add
├── remove
├── integrate
├── generate
├── dev
├── build
├── preview
├── analyze
├── doctor
├── check
├── inspect
├── update
├── migrate
├── config
├── info
└── completion
```

Namespaces may later include:

```text
vii ui
vii server
vii platform
vii runtime
vii security
```

Namespaces remain Planned or Research until their product layers are accepted.

## Safety workflow

Every command that changes a project uses the same lifecycle:

```text
Analyze
-> Plan
-> Preview
-> Apply
-> Validate
-> Report
```

Mutating commands support, where applicable:

- `--dry-run`;
- `--diff`;
- `--force`;
- `--skip-install`;
- `--project`;
- `--package-manager`;
- `--verbose`;
- `--json`;
- `--no-color`.

The CLI must not silently overwrite modified files or write outside the resolved project root.

## Shared CLI engine

Terminal commands, IDE integrations, InLoom agents, and Nx generators must use one underlying deterministic engine.

```text
@vii/cli-core
     ^
     ├── Vii terminal CLI
     ├── @vii/nx
     ├── IDE integrations
     └── InLoom and agent integrations
```

The shared engine owns:

- workspace analysis;
- project detection;
- plans;
- file transformations;
- generators;
- migrations;
- validation;
- structured reports.

Adapters translate filesystem and workspace operations. They do not duplicate generator logic.

## Project analysis

Project detection examines evidence rather than relying on one file.

Signals include:

- `package.json` dependencies and scripts;
- framework configuration files;
- workspace configuration;
- lockfiles;
- source file conventions;
- TypeScript configuration;
- existing Vii configuration;
- SSR framework markers;
- monorepo project boundaries;
- Nx project graph data when available;
- Vii native component and route markers when implemented.

Detected values may include:

```text
framework
runtime
package manager
workspace type
language
module system
SSR mode
installed Vii packages
project roots
component authoring profile
build engine
```

Ambiguous detection is reported and resolved through explicit user selection or flags.

## Package manager abstraction

The CLI should support:

- npm;
- pnpm;
- Yarn;
- Bun.

Deno command execution is a later compatibility target.

The abstraction handles:

- install;
- remove;
- execute package binary;
- workspace targeting;
- lockfile detection;
- version selection;
- non-interactive CI mode.

Runtime, package manager, build engine, and workspace manager are separate concepts.

## Configuration

Candidate configuration:

```ts
import { defineConfig } from '@vii/cli';

export default defineConfig({
  framework: 'react',

  paths: {
    root: './src',
    stores: './src/state',
    queries: './src/queries',
    components: './src/components',
  },

  generators: {
    component: {
      style: 'tsx',
      tests: true,
      styles: 'css',
      colocate: true,
    },
    store: {
      style: 'functional',
      tests: true,
    },
  },

  diagnostics: {
    enabled: true,
    redact: ['auth.token'],
  },
});
```

Configuration remains optional for basic State usage.

## Generator model

Candidate commands:

```bash
vii generate component user-card
vii generate store users
vii generate selector completed-todos
vii generate query products
vii generate mutation update-user
vii generate page dashboard
vii generate route users/[id]
vii generate layout dashboard
vii generate middleware auth
vii generate server-route users
vii generate service auth
vii generate resource products
vii generate test user-card
```

Short form:

```bash
vii g component user-card
vii g store users
vii g page dashboard
```

Generators should:

- create small and readable output;
- use selected framework or Vii-native conventions;
- be idempotent where practical;
- use AST transformations for source edits;
- avoid hidden runtime dependencies;
- include tests according to the project preset;
- report every created or changed file;
- participate in security path and content checks;
- produce application-owned code.

## Component authoring profiles

The generator chooses a source profile, not another runtime.

```bash
vii g component user-card --style=sfc
vii g component user-card --style=split
vii g component user-card --style=tsx
vii g component user-card --style=ts
```

### SFC

```text
user-card.vii
user-card.test.ts
```

### Split

```text
user-card/
├── user-card.component.ts
├── user-card.component.html
├── user-card.component.css
└── user-card.component.test.ts
```

### TSX

```text
UserCard.tsx
UserCard.test.tsx
```

### Programmatic TypeScript

```text
user-card.ts
user-card.test.ts
```

All native Vii formats must eventually lower to the same Component IR.

## Interactive generation

When required information is missing, the CLI may ask:

```text
Component name
Target project
Authoring profile
Style format
Add test
Add local Store
Export from feature index
```

Non-interactive CI and agent use remains available through flags or JSON plans.

## Dry-run example

```bash
vii g component user-card --style=split --dry-run
```

```text
CREATE src/components/user-card/user-card.component.ts
CREATE src/components/user-card/user-card.component.html
CREATE src/components/user-card/user-card.component.css
CREATE src/components/user-card/user-card.component.test.ts
UPDATE src/components/index.ts
```

No file is changed until Apply.

## Build commands

A future native application framework exposes:

```bash
vii dev
vii build
vii preview
vii analyze
```

The user-facing contract remains Vii-owned while `@vii/build-core` delegates general bundling to an engine such as Vite/Rolldown.

```text
Vii CLI
  -> Vii Build Core
  -> engine adapter
  -> Vite/Rolldown initially
```

See `BUILD_SYSTEM.md`.

## Nx integration

Vii is not an Nx replacement and does not require Nx.

An official optional package may provide:

```text
@vii/nx
```

Installation:

```bash
nx add @vii/nx
```

Candidate generators:

```bash
nx g @vii/nx:application apps/web
nx g @vii/nx:component user-card --project=web
nx g @vii/nx:store users --project=web
nx g @vii/nx:page dashboard --project=web
```

Candidate inferred tasks:

```text
dev
build
test
typecheck
lint
preview
```

`@vii/nx` should:

- detect `vii.config.ts`;
- infer Vii tasks;
- expose project graph metadata;
- support affected execution and caching;
- integrate generators and migrations;
- use the shared CLI and build engines;
- avoid separate Vii semantics.

Standalone use remains:

```bash
vii dev
vii build
vii g component user-card
```

Nx workspace use may become:

```bash
nx dev web
nx build web
nx g @vii/nx:component user-card --project=web
```

## Migrations

Migration workflow:

1. identify installed package versions;
2. build an ordered migration plan;
3. require a clean working tree or explicit override;
4. show affected files;
5. apply deterministic transformations;
6. run validation;
7. report unresolved manual work.

Required commands:

```bash
vii migrate --dry-run
vii migrate --plan migration.json
vii update
```

Migrations should be idempotent and fixture-tested.

## Doctor and check

`vii doctor` performs environment and compatibility diagnostics.

Examples:

- incompatible Vii package versions;
- duplicate runtime copies;
- unsupported framework version;
- invalid configuration;
- missing adapter;
- package manager mismatch;
- build-engine mismatch;
- known SSR safety issue;
- unsafe compiler or security configuration;
- missing Nx integration for an explicitly configured Nx target.

`vii check` may perform deeper project validation, including architecture, lifecycle, build, template, and security checks when those capabilities exist.

Both commands support machine-readable output:

```bash
vii doctor --json
vii check --json
```

## CLI plugin model

A plugin architecture is Planned, not part of the first CLI release.

Potential extension points:

- commands;
- project detectors;
- generators;
- migrations;
- checks;
- framework adapters;
- build adapters;
- output reporters.

Plugins must not receive unrestricted project mutation rights without participating in the plan and preview lifecycle.

Plugins are executable code and are distinct from declarative registry components.

## CLI security

Requirements:

- project-root confinement;
- traversal rejection;
- no hidden command execution;
- no shell by default;
- explicit network access;
- command and file plans before sensitive mutations;
- atomic writes where practical;
- secrets redacted from logs and JSON;
- no telemetry or source upload by default;
- generated templates pass static security checks where available.

## Registry safety

Remote content is untrusted.

The CLI must not automatically execute registry scripts.

Registry operations validate:

- schema;
- integrity;
- expected file paths;
- dependency declarations;
- forbidden traversal;
- conflicts with local files;
- source provenance when available;
- requested permissions;
- security policy compatibility.

## Telemetry and privacy

- no telemetry by default;
- no source-code upload;
- no hidden network requests;
- network access is explicit for package and registry operations;
- AI is never required for deterministic commands;
- AI changes still use the deterministic plan and validation pipeline.

## Error model

CLI errors include:

- stable error code;
- concise message;
- cause when safe;
- suggested action;
- documentation link;
- JSON representation.

Security failures use the shared `VII-SEC-*` namespace when applicable.

## First release scope

Committed foundation:

- `create-vii` prototype;
- `vii init`;
- `vii add state`;
- framework detection;
- package manager detection;
- React, Angular, Vue, and Vanilla integration paths;
- `vii doctor` basic checks;
- dry-run for project mutations;
- machine-readable output for core commands.

Not included initially:

- native `.vii` component generation as a supported runtime;
- native application framework build commands;
- UI registry;
- backend generation;
- mobile and desktop setup;
- community plugin execution;
- AI-powered commands;
- deployment orchestration;
- production `@vii/nx` support.

These features remain Planned, Research, or Vision until their underlying layers are accepted.
