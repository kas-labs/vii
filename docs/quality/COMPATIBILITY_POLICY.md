# Vii Compatibility Policy

## Purpose

Compatibility must be explicit, tested, and tied to release status. A platform is not considered supported only because a simple example happens to run.

## Support tiers

### Tier 1

Officially supported, continuously tested, documented, and included in release gates.

### Tier 2

Official research or preview support with dedicated fixtures, but without the same stability guarantee as Tier 1.

### Tier 3

Expected to work through standards compatibility or community evidence. Not included in all release gates.

### Experimental

API or environment may change without normal compatibility guarantees.

### Unsupported

Known to be incompatible or outside the product scope.

## Initial environment direction

- Browser: Tier 1 for Core and web integrations.
- Node.js: Tier 1 reference server and tooling runtime.
- Bun: Tier 2 until dedicated fixtures and compatibility results are stable.
- Deno: Tier 2 until permissions, package loading, and compatibility fixtures are stable.
- Edge runtimes: Research or Tier 3 per adapter.
- Tauri: Research target.
- Capacitor and Tauri Mobile: Research targets.
- React Native and other native renderers: Vision or experimental research only.

## Framework adapters

React, Angular, Vue, and Vanilla adapters must publish:

- supported framework majors
- peer dependency ranges
- SSR support status
- hydration support status
- known limitations
- compliance-suite status

Framework adapters support Core semantics rather than inventing framework-specific behavior.

## TypeScript policy

Each release must publish its supported TypeScript range. Public declaration files are tested against the declared range.

Support should favor actively maintained TypeScript versions while avoiding unnecessary churn for users. Exact version windows will be defined with the first implementation release.

## Runtime policy

Runtime versions are selected according to active maintenance and practical ecosystem support. Node.js support should prioritize active LTS releases. Bun and Deno support follows their stable releases once they reach an official support tier.

## Browser policy

The browser matrix will be defined from required Web Platform capabilities and real consumer needs. Transpilation and polyfill responsibilities must be documented per package.

## Package-manager policy

npm is the initial publication registry. Installation and fixture testing should cover npm and pnpm first, then Yarn and Bun package manager as support is validated. Deno may consume npm packages through its supported npm compatibility path.

Runtime and package manager are always reported separately.

## Deprecation and removal

A supported integration cannot be removed without:

1. a documented reason
2. migration guidance
3. an announced deprecation window appropriate to its stability level
4. release notes
5. an updated compatibility matrix

## Compatibility evidence

The project should publish machine-readable compatibility results generated from fixture tests. Documentation must distinguish verified support from expected compatibility.
