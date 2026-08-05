# Runtime Compatibility

## Purpose

Vii should run across multiple JavaScript and TypeScript runtimes without duplicating the application model for each environment.

The architecture separates runtime-neutral contracts from runtime-specific adapters.

```text
Vii runtime-neutral packages
├── ECMAScript
├── Web Platform APIs
└── Vii contracts

Runtime adapters
├── Browser
├── Node.js
├── Bun
├── Deno
└── Edge runtimes
```

## Runtime and package manager are different

A runtime executes code. A package manager installs dependencies.

Examples:

- Node.js with pnpm
- Node.js with Bun as package manager
- Bun with npm packages
- Deno with npm packages

Vii tooling must detect and report these dimensions separately.

## Runtime-neutral rules

Packages classified as runtime-neutral must not directly depend on:

- `node:*` modules
- `process`
- `Bun.*`
- `Deno.*`
- `window`
- `document`
- persistent filesystem assumptions

They may depend on:

- standard ECMAScript
- `Request`, `Response`, `Headers`, and `URL`
- `fetch`
- `AbortSignal`
- Web Streams
- Web Crypto where available
- explicit Vii capability contracts

## Compatibility tiers

### Tier 1: officially supported

Continuously tested in CI. Release blockers apply.

Initial targets:

- modern browsers
- Node.js reference runtime

### Tier 2: supported with compatibility limits

Covered by dedicated fixtures and regular tests, but not every ecosystem package is guaranteed.

Initial research targets:

- Bun
- Deno

### Experimental

APIs may change and production support is not promised.

Possible targets:

- Cloudflare Workers
- Deno Deploy
- Vercel Edge
- other Fetch-compatible environments

### Unsupported

An environment may appear to work but is not part of the compatibility contract.

## Reference runtime

Node.js is the first server reference runtime because it provides the broadest compatibility surface and mature production ecosystem.

Node-specific behavior must remain inside an adapter.

## Runtime adapters

Possible packages:

```text
@kas-labs/vii-runtime-web
@kas-labs/vii-runtime-node
@kas-labs/vii-runtime-bun
@kas-labs/vii-runtime-deno
@kas-labs/vii-runtime-edge
```

Separate packages are preferred when they isolate dependencies, capabilities, tests, and release risk.

## Capability reporting

A runtime adapter reports supported capabilities rather than pretending all runtimes are identical.

```ts
interface ViiRuntimeCapabilities {
  fetch: boolean;
  filesystem: boolean;
  subprocess: boolean;
  workers: boolean;
  webSocket: boolean;
  persistentProcess: boolean;
  secureStorage: boolean;
}
```

The exact interface remains subject to RFC validation.

## Compatibility testing

Each supported runtime requires:

- clean installation fixture
- package import test
- type-check test
- state and diagnostics compliance tests
- server adapter tests where applicable
- shutdown and cancellation tests
- package export validation

## Distribution

npm is the primary registry during the initial releases.

Runtime-neutral packages may be evaluated for additional publication channels after the npm release process is stable.

## Non-goals

This document does not commit Vii to:

- identical capabilities in every runtime
- automatic polyfilling of all Node APIs
- hiding runtime constraints
- maintaining adapters without automated compatibility tests
