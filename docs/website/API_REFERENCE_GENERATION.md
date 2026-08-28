# Vii Generated API Reference Contract

Status: Accepted for D11a
Scope: public API reference generation for `viijs.org`

## Purpose

The public API reference is generated from real package exports. It is not a hand-maintained mirror of implementation files and must not expose private or research-only surfaces merely because they exist in the monorepo.

## Initial package scope

D11 starts with `@vii-labs/core` only.

The canonical TypeDoc entry point is:

```text
packages/core/src/index.ts
```

That file is the package public source entry point and therefore the only allowed source root for the first generated reference.

Private adapters, CLI internals, Form internals, research prototypes, tests, fixtures, and architecture documents are excluded from generated public API output.

## Toolchain

Pinned D11b toolchain:

- `typedoc` 0.28.20
- `typedoc-plugin-markdown` 4.12.0
- TypeScript 6.0.2 from the workspace
- Node.js 22+ from repository engines

TypeDoc 0.28.20 supports TypeScript 6.0. The Markdown plugin 4.12.x targets TypeDoc 0.28.x.

## Output ownership

Generated Markdown belongs under the public web application, not root maintainer documentation.

Target output:

```text
apps/web/src/content/docs/api/
```

Generated files are machine-owned. Contributors edit TypeScript source comments and public exports, then regenerate. Generated files must not be manually edited to change API truth.

## Public route

The API reference is exposed under:

```text
/docs/api/
```

Conceptual guides remain hand-authored. Generated reference pages link back to guides where useful, and guides may link to generated symbols.

## Generation rules

1. Generate from package public entrypoints only.
2. Exclude private/internal implementation files unless they are reachable through exported public declarations.
3. Do not generate docs for private packages by default.
4. Do not infer stability from TypeDoc visibility.
5. Package maturity and availability continue to come from the public capability registry.
6. Generated output must be deterministic under the pinned toolchain.
7. CI must fail when committed generated output differs from regeneration.

## Reproducibility gate

D11b adds two commands:

```text
api:generate
api:check
```

`api:generate` recreates the API reference from source.

`api:check` regenerates into a temporary location or regenerates and verifies a clean git diff. CI must use the same pinned versions and workspace lockfile.

## Documentation quality

TypeDoc can only document what source comments and declarations provide. Missing descriptions in generated output should normally be fixed at the public TypeScript declaration/source level, not patched in generated Markdown.

The API reference documents signatures and contracts. It does not replace conceptual documentation for State, Computed, Batch, Scope, lifecycle, or Diagnostics.

## D11a exit

D11a is complete when the source-of-truth boundary, toolchain, output ownership, route, and reproducibility rules are frozen without changing the dependency graph.

D11b then implements the pinned toolchain, lockfile update, generated output, Nx targets, and CI reproducibility check.
