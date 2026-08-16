# Core Reference Consumer

This is the first real reference consumer for the experimental `@vii-labs/core` release path. It models
a tiny checkout quantity flow using State, Computed, and Scope-owned subscriptions.

Run it from the repository with:

```bash
pnpm --filter @vii-labs/core-reference test
pnpm --filter @vii-labs/core-reference build
```

`pnpm pack:check` copies this source into a clean temporary project and installs the packed Core
artifact. The example is experimental and does not make the Core API Stable.
