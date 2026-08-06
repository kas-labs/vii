# Phase 0 Execution Playbook

Status: Committed implementation guidance

## Objective

Create a repository that is reproducible, testable, packable, and ready for the first State implementation.

Phase 0 is complete only when a clean consumer can install a packed Vii artifact and use it without workspace-only shortcuts.

## Recommended order

### 1. Root workspace

Create:

```text
package.json
pnpm-workspace.yaml
nx.json
tsconfig.base.json
.gitignore
.editorconfig
```

Root `package.json` should declare:

- private workspace;
- package manager version;
- supported Node version;
- root validation scripts;
- no unnecessary lifecycle scripts.

Target commands:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack:check
pnpm validate
```

`pnpm validate` must call the same underlying tasks as CI.

### 2. TypeScript baseline

Use strict TypeScript and ESM-first package output.

Required decisions:

- `strict: true`;
- declaration generation for public packages;
- explicit package exports;
- no Core dependency on DOM or Node types;
- separate test and build configurations when needed.

Example package layout:

```text
packages/core/
├── src/index.ts
├── test/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

### 3. Linting, formatting, and tests

Configure:

- ESLint for correctness and architecture rules;
- Prettier for deterministic formatting;
- Vitest for runtime tests;
- type-test mechanism for public API inference;
- documentation link checking when stable enough.

Avoid rules that create constant noise without finding defects.

### 4. Nx orchestration

Nx coordinates tasks and affected execution inside the Vii repository.

It should provide:

```text
project discovery
task dependencies
local and CI caching
affected execution
consistent root commands
```

Nx must not leak into Vii runtime packages or become mandatory for Vii consumers.

### 5. First package

Create one real package before additional package shells.

The first package must:

- build;
- emit declarations;
- use explicit `exports`;
- declare `sideEffects` intentionally;
- contain only allowed files;
- create a package tarball;
- install in a clean fixture.

Example `exports` direction:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

The exact build tool may change, but the package contract must remain tool-independent.

### 6. Package validation

`pack:check` should verify:

- expected files only;
- valid `package.json` metadata;
- declaration files exist;
- public exports resolve;
- source maps follow policy;
- no undeclared runtime dependency;
- no workspace-only import reaches the artifact.

### 7. Vanilla fixture

Recommended structure:

```text
fixtures/vanilla/
├── package.json
├── src/main.ts
├── tsconfig.json
└── build configuration
```

Fixture workflow:

```text
build package
→ pack package
→ create clean temporary install
→ install tarball
→ typecheck
→ build
→ execute smoke test
```

The fixture must not import from `packages/**/src`.

### 8. CI baseline

Create one clear validation workflow.

Minimum jobs or steps:

```text
install
format check
lint
typecheck
test
build
package validation
Vanilla fixture validation
```

CI should use frozen dependency installation and the same commands documented for local development.

## Proposed initial workspace

```text
apps/
  playground/

packages/
  core/

fixtures/
  vanilla/

scripts/
  package-validation/

docs/
rfcs/
adr/
```

Do not create Query, Router, UI, Server, Nx, or native compiler packages during Phase 0 unless an accepted implementation task requires them immediately.

## Phase 0 PR sequence

A practical sequence is:

```text
P0.1 root pnpm workspace
P0.2 TypeScript and ESM baseline
P0.3 lint, format, and Vitest
P0.4 Nx task orchestration
P0.5 first buildable package
P0.6 package pack validation
P0.7 Vanilla packed consumer
P0.8 GitHub Actions validation
P0.9 contributor setup and Phase 1 backlog
```

Each PR should leave the repository in a valid state.

## Exit evidence

Phase 0 is complete when:

- fresh clone installation succeeds;
- `pnpm validate` passes;
- CI runs equivalent tasks;
- one package builds and packs;
- public exports and declarations resolve;
- the Vanilla fixture installs the tarball;
- no fixture uses source aliases;
- contributor setup is documented;
- Phase 1 tasks are independently actionable.

## Common mistakes

Do not:

- create many empty packages;
- implement State before package validation works;
- make CI use different commands from local development;
- import source directly from fixtures;
- add framework dependencies to Core;
- optimize caching before correctness is established;
- add release automation before a package can be packed reliably.
