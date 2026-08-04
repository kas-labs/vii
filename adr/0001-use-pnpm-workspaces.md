# ADR 0001: Use pnpm workspaces

- Status: Proposed
- Date: 2026-08-05

## Context

Vii is planned as a multi-package TypeScript repository. The repository needs deterministic installs, workspace linking, efficient dependency storage, package filtering, and reliable packed-artifact validation.

Package manager choice is separate from runtime support. Choosing pnpm for repository development does not make pnpm a runtime dependency and does not prevent consumers from using npm, Yarn, or compatible tooling.

## Decision

Use pnpm as the primary package manager for the Vii monorepo and define workspace boundaries through `pnpm-workspace.yaml`.

The repository will:

- pin the package manager version through the root `packageManager` field;
- commit the pnpm lockfile;
- use workspace protocols only for internal development dependencies where appropriate;
- validate published package manifests so workspace-only references cannot leak into public artifacts;
- test clean consumer installation from packed artifacts.

## Consequences

### Positive

- deterministic dependency graph;
- efficient local storage;
- strong workspace filtering;
- explicit handling of undeclared dependencies;
- suitable foundation for package-level CI commands.

### Negative

- contributors need pnpm or Corepack enabled;
- repository scripts must avoid relying on undocumented pnpm behavior;
- consumer compatibility still requires separate npm installation tests.

## Alternatives considered

- npm workspaces;
- Yarn workspaces;
- runtime-specific package managers such as Bun.

## Related records

- `docs/architecture/MONOREPO_BOOTSTRAP.md`
- `docs/roadmap/PHASE_0_FOUNDATION.md`
