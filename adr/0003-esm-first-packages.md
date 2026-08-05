# ADR 0003: Publish ESM-first packages

- Status: Proposed
- Date: 2026-08-05

## Context

Vii targets modern TypeScript applications across browsers, Node.js, and future Bun and Deno adapters. Package output needs predictable module semantics, tree shaking, explicit exports, and valid declaration files.

Supporting multiple module systems from the beginning would increase build, test, and packaging complexity before consumer evidence justifies it.

## Decision

Develop and publish Vii packages as ESM-first packages.

Initial package requirements:

- `type: module` where applicable;
- explicit `exports` maps;
- generated TypeScript declarations;
- no undocumented deep imports;
- side-effect metadata reviewed per package;
- packed artifacts tested in clean ESM consumers;
- CommonJS support is not promised unless a future compatibility RFC accepts it.

## Consequences

### Positive

- simpler module model;
- stronger alignment with modern runtimes and tooling;
- improved tree-shaking potential;
- fewer duplicate output paths.

### Negative

- some CommonJS consumers may require interop or cannot adopt initial versions;
- test and tooling configuration must use ESM-compatible patterns;
- compatibility claims require real consumer fixtures.

## Alternatives considered

- dual ESM and CommonJS output;
- CommonJS-first packages;
- runtime-specific source distribution only.

## Related records

- `docs/architecture/RUNTIME_COMPATIBILITY.md`
- `docs/quality/COMPATIBILITY_POLICY.md`
- `docs/architecture/MONOREPO_BOOTSTRAP.md`
