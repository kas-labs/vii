# Vii Public Website and Documentation Architecture

Status: Accepted for D1
Domain: `https://viijs.org`
Application path: `apps/web`
Track: Public Website & User Documentation

## 1. Purpose

This document defines the architecture contract for the public Vii website and user-facing documentation platform.

This track is intentionally separate from runtime implementation work in `packages/*` and from maintainer-facing engineering documentation under the repository-root `docs/` tree.

The website track may run in parallel with Core, Form, Query, HTTP, Schema, Flow, adapters, CLI, and other runtime work. It must consume accepted repository truth, but it must not become a prerequisite for runtime development.

## 2. Separation of concerns

The repository contains three distinct information surfaces.

### 2.1 Runtime implementation

`packages/*`, runtime tests, fixtures, examples, package metadata, and accepted implementation contracts define the actual product behavior.

### 2.2 Engineering documentation

The root `docs/` tree is maintainer and contributor documentation. It contains architecture, governance, implementation notes, research, security, quality evidence, roadmap material, and website architecture itself.

It answers:

> How is Vii designed, validated, governed, and developed?

### 2.3 Public website and user documentation

The future `apps/web` application is the public Vii product surface served from `viijs.org`.

It answers:

> What is Vii, what is currently usable, and how do I use it correctly?

The public site may project information from repository documentation, but it must not expose the repository documentation tree directly as the user information architecture.

## 3. Canonical application location

The public website SHALL live at:

```text
apps/web/
```

The application is named `web`, not `docs`, because it owns more than documentation. It will contain the marketing homepage, documentation, examples index, learning content, ecosystem pages, product status, public roadmap, releases, blog, and contributor entry points.

Expected high-level shape after D2 and later slices:

```text
apps/web/
  src/
    assets/
    components/
    layouts/
    pages/
    content/
      docs/
      learn/
      blog/
      releases/
    data/
      ecosystem/
      navigation/
      status/
    styles/
  public/
  astro.config.mjs
  package.json
  project.json
```

This structure is architectural intent. D1 does not create `apps/web`.

## 4. Technology decision

The selected platform is:

```text
Astro
+ Starlight
+ TypeScript
+ Markdown / MDX
+ TypeDoc
+ Vii Design System
+ Cloudflare Workers static assets
```

### 4.1 Astro

Astro is the primary website framework.

Rationale:

- content-first architecture;
- HTML-first output;
- static generation by default;
- route-level server rendering when justified;
- framework islands for narrowly scoped interactivity;
- low default client-side JavaScript;
- strong fit for documentation, marketing, release, and blog content;
- framework-neutral architecture consistent with Vii itself.

### 4.2 Starlight

Starlight is the documentation engine inside the Astro application. It is not a separate site and must not define the Vii product brand.

Starlight is responsible for documentation-oriented capabilities such as navigation infrastructure, content collections, documentation layouts, search integration, Markdown/MDX handling, accessibility foundations, and documentation conventions.

The Vii Design System remains the visual source for public brand presentation.

### 4.3 TypeScript

Website application code SHALL use TypeScript under the repository's existing toolchain and governance constraints.

### 4.4 Markdown and MDX

Public documentation, guides, tutorials, release notes, and suitable long-form content SHOULD be authored in Markdown or MDX. Interactive UI is opt-in, not the default authoring model.

### 4.5 Framework islands

React, Vue, or other supported Astro integrations MAY be used for isolated interactive surfaces when an actual interaction requirement exists.

Examples include:

- ecosystem graph;
- command palette extensions;
- playgrounds;
- package/version selectors;
- interactive architecture demonstrations.

A framework runtime MUST NOT be introduced globally merely for convenience.

## 5. Rendering policy

The public website SHALL use a static-first hybrid rendering policy.

### Default

```text
SSG / prerender
```

Pages whose content is known at build time SHALL be emitted as static HTML.

Expected static routes include most or all of:

- `/`;
- `/docs/**`;
- `/learn/**`;
- `/examples/**`;
- `/ecosystem/**`;
- `/status`;
- `/roadmap`;
- `/blog/**`;
- `/releases/**`;
- `/contributing`.

### SSR

Request-time SSR is opt-in only and must have a concrete requirement that cannot be satisfied well by static generation.

Possible future examples include authenticated or personalized tooling, ephemeral playground sessions, or request-time data that is intentionally not build-time material.

### Client hydration

Hydration is opt-in per interactive island.

A content page MUST NOT become a SPA solely because it contains documentation or navigation.

## 6. SEO contract

SEO is a first-class platform requirement.

The implementation plan SHALL support:

- semantic HTML;
- crawlable pre-rendered content;
- canonical URLs on `viijs.org`;
- per-page title and description;
- Open Graph metadata;
- social metadata;
- sitemap;
- robots policy;
- canonical redirects;
- structured data where justified;
- stable heading hierarchy;
- breadcrumbs for documentation content;
- human-readable URLs;
- valid 404 behavior;
- permanent redirects for moved public content.

The canonical public origin is:

```text
https://viijs.org
```

The origin MUST be configuration-driven so local, preview, and future deployment environments do not require source edits.

## 7. Performance contract

The website SHALL prefer:

- static HTML;
- minimal hydration;
- self-hosted or privacy-respecting font delivery;
- optimized images;
- bounded third-party scripts;
- cacheable immutable assets;
- no mandatory analytics dependency for core functionality;
- measured Core Web Vitals before production graduation.

Performance budgets will be defined during the implementation gates, not guessed in D1.

## 8. Accessibility contract

Accessibility is a release requirement, not a cleanup phase.

The platform SHALL preserve or improve:

- keyboard navigation;
- visible focus states;
- semantic landmarks;
- heading structure;
- accessible code controls;
- reduced-motion behavior;
- contrast in light and dark modes;
- screen-reader labels for icon-only controls;
- responsive navigation;
- accessible status communication that does not rely on color alone.

D17 contains the formal production accessibility gate.

## 9. Search architecture

Search SHALL prioritize public user content:

- documentation;
- API reference;
- Learn;
- examples;
- optionally blog and releases as a distinct content category.

Maintainer-only material such as agent instructions, duty-watch notes, raw implementation plans, internal evidence, and research scratch material MUST NOT pollute public search results.

The first implementation SHOULD prefer a static/local index suitable for the site scale. A hosted search service may be introduced later only when justified by corpus size or UX requirements.

## 10. Design system integration

The supplied Vii design system is the visual design source for the website, subject to repository truth and implementation accessibility/performance gates.

The accepted visual direction includes:

- restrained monochrome surfaces;
- cool gray palette;
- violet accent;
- developer-tooling typography;
- code-centric presentation;
- thin borders and low visual noise;
- light and dark themes;
- restrained motion;
- engineering diagrams and architecture visuals.

The website SHALL reuse design tokens and component patterns rather than independently inventing page styles.

Starlight defaults MAY be adapted or replaced where necessary to implement Vii visual language.

The initial design system implementation SHOULD remain local to `apps/web` while it has a single consumer. A shared package such as `packages/web-ui` MUST NOT be introduced until multiple real consumers justify extraction.

## 11. Design-source safety rule

The supplied design system and mockups contain visual examples and placeholder product data created without authoritative repository access.

Therefore:

- tokens, composition, layouts, typography, spacing, component patterns, and visual language are reusable design input;
- package lists, versions, capability names, status claims, benchmark values, release data, and API examples MUST be revalidated against repository truth before publication.

Design artifacts are not runtime evidence.

## 12. Public content source of truth

Public claims MUST derive from current evidence.

For observable current behavior, executable implementation, tests, package metadata, and validated consumer evidence are authoritative.

For intended architecture and maturity decisions, accepted RFCs, ADRs, graduation decisions, and roadmap contracts define the intended state.

Public content must reconcile these two dimensions rather than relying on one universal precedence list.

When intended architecture and current implementation differ, the public site MUST state current behavior honestly and MAY separately describe accepted future direction.

## 13. API reference strategy

The API reference SHALL be generated from actual public TypeScript exports rather than maintained as hand-written API inventory.

Selected direction:

```text
TypeScript public exports
  -> TypeDoc
  -> generated documentation content
  -> apps/web public API reference
```

Rules:

- only public exports are included;
- private packages are not presented as installable public APIs;
- research prototypes are excluded;
- generated files are not manually edited;
- generation must be reproducible in CI;
- guides link to API reference;
- API reference links back to conceptual documentation where useful.

Exact TypeDoc configuration is a D11 implementation concern.

## 14. Deployment architecture

The selected production direction is:

```text
GitHub repository
  -> CI validation
  -> Astro build
  -> Cloudflare Workers static assets
  -> viijs.org
```

Expected deployment capabilities:

- production deployment from an accepted branch policy;
- preview deployments for pull requests when implemented;
- custom domain `viijs.org`;
- HTTPS;
- immutable asset caching;
- canonical redirects;
- no required application server for static content.

D1 does not configure Cloudflare, DNS, CI deployment secrets, or hosting infrastructure.

## 15. Privacy and analytics

Analytics is not required for initial platform construction.

The website SHALL function fully without analytics.

If analytics is introduced later, the project must evaluate:

- data minimization;
- cookie requirements;
- consent requirements;
- retention;
- third-party processing;
- performance cost;
- whether a privacy-friendly aggregate solution satisfies the actual need.

No analytics vendor is selected in D1.

## 16. Versioning policy

Full versioned documentation is deferred.

During experimental development, public pages SHOULD expose metadata such as:

- capability status;
- package availability;
- documented version or line;
- last verified date or source revision where useful.

Historical documentation versions SHOULD be introduced only when Vii has multiple supported release lines and the maintenance burden is justified.

## 17. Parallel-track governance

Website work SHALL use its own D-series slices and pull requests.

Runtime work continues independently.

A website PR MUST NOT modify runtime implementation unless the slice explicitly requires generated evidence and the change has been separately scoped.

A runtime PR SHOULD assess public documentation impact when it changes:

- public exports;
- semantics;
- installability;
- support status;
- compatibility;
- examples;
- maturity;
- deprecations.

The existing `PUBLIC_WEBSITE_AND_DOCUMENTATION_LIFECYCLE.md` policy remains applicable.

## 18. D1 non-goals

D1 MUST NOT:

- create `apps/web`;
- install Astro or Starlight;
- configure Cloudflare;
- connect DNS;
- publish `viijs.org`;
- implement the homepage;
- import the design system into runtime code;
- generate TypeDoc output;
- add analytics;
- change runtime packages;
- rewrite public product copy as final marketing content.

## 19. D2 entry gate

D2 may begin only when the D1 documents agree on:

- `apps/web` as the application location;
- `viijs.org` as canonical public domain;
- Astro + Starlight platform choice;
- static-first hybrid rendering;
- public vs maintainer documentation boundary;
- public information architecture;
- status taxonomy;
- design-system authority and placeholder-data rule;
- API generation direction;
- source-of-truth policy;
- Cloudflare Workers deployment direction;
- documentation roadmap.

D2 then creates the smallest viable website skeleton and no more.
