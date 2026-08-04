# RFC 0006: CLI Command Model

- Status: Draft
- Authors: Kas Labs
- Target: CLI Foundation

## Summary

Define a deterministic, safe command architecture for `create-vii` and `@kas-labs/vii-cli`.

## Motivation

Vii CLI will eventually coordinate package installation, framework integration, code generation, migrations, registries, diagnostics, and platform setup. Without a shared mutation model, commands may become inconsistent and unsafe.

## Proposal

All mutating commands follow:

```text
Analyze → Plan → Preview → Apply → Validate → Report
```

The CLI must expose both human-readable and machine-readable output.

Initial commands:

```text
vii create
vii init
vii add
vii remove
vii generate
vii doctor
vii info
```

Planned commands:

```text
vii check
vii inspect
vii update
vii migrate
```

Future namespaces such as `ui`, `server`, and `platform` require separate accepted RFCs.

## Safety requirements

Mutating commands must:

- show planned file and dependency changes;
- support dry-run where applicable;
- avoid overwriting local modifications silently;
- use structured source transformations instead of regex for semantic edits;
- validate after applying;
- return stable error codes;
- avoid arbitrary code execution from registry content.

## Package manager support

Initial support targets npm, pnpm, Yarn, and Bun. Runtime selection is modeled separately.

## Machine-readable protocol

Core commands support JSON output. The output schema must be versioned before external tooling relies on it.

## Configuration

Basic State use must not require configuration. `vii.config.ts` is introduced only when project-level paths, diagnostics, presets, or integrations require it.

## Generators

Generated source belongs to the application. Generators must produce small, readable, testable output and must report every change.

## Migrations

Migrations must be ordered, deterministic, fixture-tested, and idempotent where possible. A clean working tree is required unless explicitly overridden.

## Telemetry

Telemetry is disabled by default. Source code and application state are never uploaded implicitly.

## Rejected alternatives

### Global installation as the primary path

Rejected. `npm create`, `npx`, `pnpm dlx`, and local dev dependencies are preferred.

### CLI as a new bundler or package manager

Rejected. Vii integrates with existing tools.

### AI-required commands

Rejected. Core CLI workflows remain deterministic and offline-capable except where package or registry access is explicitly needed.

## Unresolved questions

- command parsing library;
- terminal UI library;
- configuration loading strategy;
- rollback guarantees;
- plugin isolation model;
- Windows shell behavior;
- exact Node.js support window.

## Acceptance criteria

- `create-vii` can scaffold a minimal project prototype;
- `vii init` can analyze an existing fixture without mutation in dry-run mode;
- `vii add state` produces an explicit plan;
- `vii doctor --json` returns structured results;
- package manager operations are abstracted and fixture-tested.
