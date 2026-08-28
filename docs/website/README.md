# Vii Website & Public Documentation Track

This directory is the architecture and governance entry point for the independent Vii public website and user-documentation track.

Canonical public domain: `https://viijs.org`

Future website application: `apps/web`

## Purpose

Website and public-documentation work runs in parallel with runtime and ecosystem development.

The separation is intentional:

```text
packages/*               runtime and ecosystem implementation
root docs/*              maintainer / contributor engineering documentation
apps/web                 future public website and user documentation
```

The root `docs/` tree explains how Vii is built and governed. The future public site explains what Vii is, what is currently usable, and how users use it.

## Start here

1. [Documentation Architecture](DOCUMENTATION_ARCHITECTURE.md)
2. [Information Architecture](INFORMATION_ARCHITECTURE.md)
3. [Public Status Model](PUBLIC_STATUS_MODEL.md)
4. [Public Website and Documentation Lifecycle](PUBLIC_WEBSITE_AND_DOCUMENTATION_LIFECYCLE.md)
5. [Website & Documentation Roadmap](../roadmap/DOCUMENTATION_ROADMAP.md)

## Current phase

```text
D0  Audit, Truth Model & IA               Complete
D1  Architecture Contract                 Active
D2  Platform Skeleton                     Next after D1 acceptance
```

D1 is documentation-only.

It does not create `apps/web`, install Astro/Starlight, configure Cloudflare, connect `viijs.org`, implement the homepage, or modify runtime packages.

## Frozen D1 direction

Unless superseded by a later accepted decision, the D1 architecture is:

```text
Domain             viijs.org
Application        apps/web
Framework          Astro
Docs engine        Starlight
Language           TypeScript
Content            Markdown / MDX
Rendering          static-first hybrid
Default rendering  SSG / prerender
SSR                opt-in
Hydration           opt-in islands
API reference       TypeDoc-generated
Visual language     Vii Design System
Hosting direction   Cloudflare Workers static assets
```

## Public information surfaces

The planned public top-level structure is:

```text
/
/docs/
/learn/
/examples/
/ecosystem/
/status/
/roadmap/
/blog/
/releases/
/contributing/
```

This public structure does not mirror repository-root engineering documentation.

## Design system rule

The supplied Vii design system and UI mockups are valid input for:

- tokens;
- typography;
- spacing;
- composition;
- navigation patterns;
- code presentation;
- status badges;
- cards;
- diagrams;
- themes;
- interaction language.

They are not authoritative for package inventory, versions, API names, maturity, benchmark values, release data, or roadmap claims. Those facts must be revalidated against current repository evidence before publication.

## Parallel development rule

Runtime agents may continue Core, Form, Query, HTTP, Schema, Flow, CLI, adapters, and other ecosystem work without waiting for the website track.

Website agents may work on D-series slices without changing runtime packages unless a separately accepted task explicitly requires it.

Runtime changes that affect public behavior, installability, support, maturity, compatibility, public API, examples, or deprecations should trigger a public-docs impact assessment.

## Next implementation slice

After D1 acceptance:

> D2 — Platform Skeleton

D2 creates the smallest valid `apps/web` Astro + Starlight project inside the existing monorepo. It proves build integration and basic routing only. Homepage design, full user documentation, API generation, production deployment, and DNS remain later slices.
