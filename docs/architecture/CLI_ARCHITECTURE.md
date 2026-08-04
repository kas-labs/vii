# Vii CLI Architecture

Status: Draft

## Purpose

Vii CLI is the safe orchestration layer for creating, integrating, generating, validating, migrating, and inspecting Vii projects.

The CLI reduces setup complexity. It does not replace package managers, framework CLIs, bundlers, native build systems, or deployment platforms.

## Entry points

Recommended user-facing commands:

```bash
npm create vii@latest
npx @kas-labs/vii-cli@latest init
vii add state
vii doctor
```

Packages:

```text
create-vii
@kas-labs/vii-cli
@kas-labs/vii-cli-core
```

Framework and platform integrations may be delivered as internal or public plugins.

## Command model

The initial command tree is expected to include:

```text
vii
├── create
├── init
├── add
├── remove
├── integrate
├── generate
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
```

These namespaces remain Planned or Research until their product layers are accepted.

## Safety workflow

Every command that changes a project should use the same internal lifecycle:

```text
Analyze
→ Plan
→ Preview
→ Apply
→ Validate
→ Report
```

Mutating commands must support, where applicable:

- `--dry-run`;
- `--diff`;
- `--force`;
- `--skip-install`;
- `--project`;
- `--package-manager`;
- `--verbose`;
- `--json`;
- `--no-color`.

The CLI must not silently overwrite modified files.

## Project analysis

Project detection should examine evidence rather than rely on one file.

Signals include:

- `package.json` dependencies and scripts;
- framework configuration files;
- workspace configuration;
- lockfiles;
- source file conventions;
- TypeScript configuration;
- existing Vii configuration;
- SSR framework markers;
- monorepo project boundaries.

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
```

Ambiguous detection must be reported and resolved by explicit user selection or flags.

## Package manager abstraction

The CLI should support:

- npm;
- pnpm;
- Yarn;
- Bun.

Deno command execution is a later compatibility target.

The package manager abstraction handles:

- install;
- remove;
- execute package binary;
- workspace targeting;
- lockfile detection;
- version selection;
- non-interactive CI mode.

Runtime and package manager are separate concepts and must not be conflated.

## Configuration

Candidate project configuration:

```ts
import { defineViiConfig } from '@kas-labs/vii-cli';

export default defineViiConfig({
  framework: 'react',
  paths: {
    root: './src',
    stores: './src/state',
    queries: './src/queries',
    components: './src/components',
  },
  diagnostics: {
    enabled: true,
    redact: ['auth.token'],
  },
});
```

Configuration must be optional for basic State usage.

## Generators

Candidate generators:

```bash
vii generate store cart
vii generate selector completed-todos
vii generate query products
vii generate mutation update-user
```

Generators should:

- create small, readable output;
- use framework-native conventions;
- be idempotent where practical;
- use AST transformations for source edits;
- avoid hidden runtime dependencies;
- include tests when requested by the preset;
- report every created or changed file.

Generated code is application-owned.

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
- known SSR safety issue.

`vii check` may perform deeper project validation, including architecture and lifecycle checks, when those capabilities exist.

Both commands must support machine-readable output:

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
- output reporters.

Plugins must not receive unrestricted project mutation rights without participating in the CLI plan and preview lifecycle.

## Registry safety

Future registry integration must treat remote content as untrusted.

The CLI must not automatically execute arbitrary registry scripts.

Registry operations should validate:

- schema;
- integrity;
- expected file paths;
- dependency declarations;
- forbidden traversal;
- conflicts with local files;
- source provenance when available.

## Telemetry and privacy

- no telemetry by default;
- no source-code upload;
- no hidden network requests;
- network access is explicit for package and registry operations;
- AI is never required for deterministic CLI commands.

## Error model

CLI errors should include:

- stable error code;
- concise message;
- cause when safe;
- suggested action;
- documentation link;
- JSON representation.

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

- UI registry;
- backend generation;
- mobile and desktop setup;
- community plugin execution;
- AI-powered commands;
- deployment orchestration.
