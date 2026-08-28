# Vii Web

`apps/web` is the public Vii website application for `https://viijs.org`.

It is separate from the repository's maintainer and engineering documentation under the root `docs/` directory.

## D2 scope

This slice proves the platform only:

- Astro application inside the pnpm/Nx monorepo;
- Starlight integration for public documentation;
- static-first output;
- minimal `/` route;
- minimal `/docs/` route;
- canonical site URL configuration;
- Nx `dev`, `build`, and `preview` targets.

The following are intentionally deferred:

- Vii design-system implementation and final homepage design (D3);
- Getting Started and user-facing product documentation (D4+);
- generated API reference;
- React/Vue/Angular islands unless a later requirement justifies them;
- Cloudflare production configuration and DNS connection;
- analytics.

## Commands

From the repository root:

```sh
pnpm nx run web:dev
pnpm nx run web:build
pnpm nx run web:preview
```

The default delivery model is prerendered static HTML. SSR and client hydration remain opt-in architectural choices.
