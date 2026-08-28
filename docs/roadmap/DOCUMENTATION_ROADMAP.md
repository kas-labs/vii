# Vii Public Website & Documentation Roadmap

Status: Active
Track: D-series
Canonical domain: `https://viijs.org`
Application: `apps/web`

## 1. Purpose

This roadmap defines the independent public website and user-documentation track for Vii.

It runs in parallel with runtime and ecosystem development. D-series slices do not replace runtime phases and must not block Core, Form, Query, HTTP, Schema, Flow, adapters, CLI, UI, or other product work unless an explicit release gate requires public documentation.

The track exists to keep public product communication, user documentation, API reference, examples, design, SEO, and website delivery coherent without mixing that work into runtime implementation slices.

## 2. Track contract

The D-series owns:

- `viijs.org`;
- future `apps/web` implementation;
- public user documentation;
- public API reference;
- public Learn content;
- examples discovery;
- ecosystem presentation;
- public status;
- public roadmap;
- blog/release surfaces;
- website design system integration;
- search;
- SEO;
- accessibility;
- performance;
- deployment of the public site.

It does not own:

- runtime package implementation;
- package architecture decisions unrelated to public presentation;
- internal agent workflows;
- maintainer research artifacts;
- repository governance outside documentation impact rules.

## 3. Delivery principles

Each D-series slice should be small enough to review independently.

A slice should prefer one clear outcome over a broad website rewrite.

The website must never present design placeholders as product truth.

Static HTML is the default delivery mode. SSR, client hydration, and framework islands are opt-in based on actual requirements.

The public site consumes accepted repository truth but remains a separate product surface.

## 4. D0 — Audit, Truth Model & Information Architecture

Status: Complete

### Outcome

Repository documentation, public-readiness, technology options, status drift, source-of-truth boundaries, design needs, API documentation strategy, search, SEO, deployment, and website scope were audited.

### Key decisions

- public website should be separate from maintainer documentation;
- public site should live in the same monorepo;
- user docs should not mirror the root `docs/` tree;
- Astro + Starlight selected as preferred platform;
- TypeDoc selected as API-generation direction;
- static-first hybrid rendering selected;
- public maturity requires a dedicated status model;
- design system may drive visual language but not product facts.

### Exit gate

Accepted direction sufficient to author D1 architecture contracts.

## 5. D1 — Website & Documentation Architecture Contract

Status: Complete

### Goal

Freeze the architecture before implementation begins.

### Deliverables

- `docs/website/DOCUMENTATION_ARCHITECTURE.md`;
- `docs/website/INFORMATION_ARCHITECTURE.md`;
- `docs/website/PUBLIC_STATUS_MODEL.md`;
- `docs/roadmap/DOCUMENTATION_ROADMAP.md`.

### Required decisions

- canonical domain `viijs.org`;
- application location `apps/web`;
- Astro primary framework;
- Starlight documentation engine;
- TypeScript implementation;
- Markdown/MDX content model;
- TypeDoc API reference direction;
- Cloudflare Workers static-assets deployment direction;
- SSG default;
- SSR opt-in;
- hydration opt-in;
- public vs maintainer documentation boundary;
- public IA;
- status taxonomy;
- source-of-truth model;
- design-system authority and placeholder-data rule;
- D2 acceptance criteria.

### Non-goals

- no `apps/web` yet;
- no dependency installation;
- no DNS or Cloudflare changes;
- no website implementation;
- no final marketing copy;
- no runtime package changes.

### Exit gate

All D1 documents agree with one another and contain no unresolved platform-level contradiction.

## 6. D2 — Platform Skeleton

Status: Complete

### Goal

Create the smallest functioning `apps/web` project that proves the selected platform inside the Vii monorepo.

### Deliverables

- `apps/web` Nx project;
- Astro configuration;
- Starlight integration;
- TypeScript configuration aligned with repository standards;
- minimal global layout;
- minimal docs route;
- minimal homepage placeholder;
- minimal shared styling hook, with brand/token implementation owned by D3;
- build/test/lint integration;
- CI-safe static build;
- no production DNS change yet.

### Acceptance criteria

- project builds from clean repository state;
- existing runtime projects remain unaffected;
- static output is produced;
- `/` and `/docs/` render;
- no unnecessary client framework runtime is globally hydrated;
- no fabricated package/status content is introduced;
- dependency footprint is justified;
- monorepo boundaries remain clean.

## 7. D3 — Brand, Design Contract & Homepage

Status: Complete

### Goal

Translate the supplied Vii design system and UI mock directions into an implementation-ready website design contract, then build the first real homepage.

### Inputs

- Vii design system;
- Vii UI mocks/direction board;
- actual repository capability truth;
- D1 IA and status model.

### Deliverables

- website visual contract;
- token implementation;
- typography;
- light/dark themes;
- shared header/navigation;
- buttons/cards/status badges/code presentation;
- responsive baseline;
- homepage hero;
- proof-oriented Core example;
- architecture/ecosystem preview;
- accessible CTA/navigation behavior.

### Rules

Placeholder versions, APIs, packages, benchmarks, and capability labels from mockups must be replaced with verified repository data.

### Exit gate

Homepage is visually coherent, responsive, accessible at baseline, and factually honest.

## 8. D4 — Getting Started

Status: Complete

### Goal

Create the shortest trustworthy first-use path.

### Content sequence

1. installation/acquisition status;
2. first State;
3. read/update;
4. subscription;
5. Computed;
6. Batch;
7. Scope;
8. disposal/lifecycle;
9. integration next steps.

### Rule

If the public package is not actually published, the documentation must not show a registry install command as though it works.

## 9. D5 — Core User Documentation

Status: Complete

### Scope

- State;
- Computed;
- Batch;
- Scope;
- lifecycle semantics;
- public contracts;
- edge cases;
- common mistakes;
- related examples;
- API links.

### Exit gate

A user can understand the current Core model without reading internal architecture documents.

## 10. D6 — Lifecycle & Scope Deep Documentation

Status: Complete

### Goal

Document ownership, cleanup, disposal, resource lifetime, and lifecycle reasoning as a first-class Vii concept.

### Deliverables

- conceptual guide;
- lifecycle examples;
- common leak/cleanup mistakes;
- framework ownership mapping where validated.

## 11. D7 — Diagnostics Documentation

Status: Complete

### Goal

Explain diagnostics as a developer tool and product differentiator without overclaiming capabilities.

### Deliverables

- diagnostics concepts;
- bounded/value-free behavior where applicable;
- trace examples;
- debugging workflows;
- limitations;
- relation to lifecycle and state.

## 12. D8 — Framework Integrations

Status: Complete

### Scope

- Vanilla;
- React;
- Angular;
- Vue.

### Rules

- package availability must be explicit;
- compatibility claims require actual support/test evidence;
- framework-specific examples should remain idiomatic to the host framework;
- no framework is positioned as the preferred Vii host by default.

## 13. D9 — Examples System

Status: Complete

### Goal

Build the examples catalog and normalize the difference between snippets, focused examples, tutorials, and reference applications.

### Initial examples

- State counter;
- Computed counter;
- batched updates;
- Scope lifecycle;
- Diagnostics;
- Vanilla;
- React;
- Angular;
- Vue.

### Exit gate

Each listed example has a clear maturity/compatibility context and source link.

## 14. D10 — Public Status, Compatibility & Roadmap

Status: Complete

### Goal

Implement factual ecosystem visibility.

### Deliverables

- central capability-status registry;
- `/status`;
- `/ecosystem` truth-oriented cards;
- compatibility model/pages;
- `/roadmap` public projection;
- last-verified/evidence traceability where useful;
- homepage and examples consume the central status source instead of maintaining independent maturity facts.

### Rule

Public status drift is treated as a defect.

## 15. D11 — Generated API Reference

Status: Planned

### Goal

Generate public API documentation from actual TypeScript exports.

### Deliverables

- TypeDoc configuration;
- public-export filtering;
- generated content pipeline;
- CI reproducibility check;
- conceptual cross-links;
- generated-content ownership rules.

### Non-goal

No private package or research prototype is exposed as public API merely because TypeDoc can discover it.

## 16. D12 — CLI Documentation

Status: Planned

### Entry condition

CLI user-facing surface and distribution model are mature enough to document honestly.

### Potential scope

- installation/availability;
- commands;
- project detection;
- plan/preview/apply flow;
- diagnostics;
- machine-readable output where public;
- troubleshooting.

## 17. D13 — Form Documentation

Status: Planned

### Entry condition

Production Form slices have reached a suitable public maturity boundary.

### Potential scope

- field model;
- value/raw value;
- dirty/touched;
- reset;
- Scope ownership;
- groups/arrays/validation/parsers/submission as they become real;
- framework integration once validated.

D13 follows runtime truth and must not race ahead of Form implementation.

## 18. D14 — Research-Accepted & Emerging Ecosystem

Status: Planned

### Scope

- Query;
- HTTP;
- Schema;
- Flow;
- other accepted/emerging capability areas as justified.

### Goal

Explain ecosystem direction without presenting research as shipped product.

### Rules

- Research Accepted must be visibly distinct from available implementation;
- accepted architectural direction can be documented;
- install/API sections appear only when implementation exists;
- roadmap language must not become release promises.

## 19. D15 — Learn

Status: Planned

### Goal

Add task-oriented educational content distinct from reference documentation.

### Candidate learning paths

- reactive state fundamentals;
- lifecycle ownership;
- diagnostics-driven debugging;
- integrating Vii into an existing application;
- framework-specific patterns;
- architecture patterns after they are validated.

## 20. D16 — Blog & Releases

Status: Planned

### Goal

Create sustainable communication surfaces.

### Deliverables

- blog content type;
- release-note content type;
- RSS if justified;
- author/date metadata;
- clear canonical-vs-editorial boundary.

### Rule

Blog content never overrides current technical truth.

## 21. D17 — Search, SEO, Accessibility & Performance Gate

Status: Planned

### Goal

Run a dedicated production-quality hardening slice before launch graduation.

### Search

- public index only;
- content-type clarity;
- keyboard access;
- useful empty/error states.

### SEO

- canonical origin;
- metadata;
- sitemap;
- robots;
- Open Graph/social cards;
- structured data where justified;
- redirect policy;
- valid status codes.

### Accessibility

- keyboard audit;
- focus audit;
- screen-reader semantics;
- contrast;
- reduced motion;
- responsive navigation;
- code-control accessibility.

### Performance

- Core Web Vitals measurement;
- JavaScript/hydration audit;
- font/image delivery;
- third-party script audit;
- cache behavior;
- build-size review.

## 22. D18 — Production Graduation

Status: Planned

### Goal

Graduate the public website to the canonical production domain.

### Deliverables

- production Cloudflare deployment;
- `viijs.org` domain connection;
- HTTPS/canonical redirects;
- deployment workflow;
- preview workflow as accepted;
- launch checklist;
- rollback procedure;
- operational ownership;
- documentation freshness ownership.

### Graduation criteria

- required D-series content slices accepted;
- no known misleading maturity/install claims;
- SEO gate passes;
- accessibility gate passes;
- performance gate passes;
- production deployment is reproducible;
- domain and canonical metadata agree;
- public status reflects current repository state.

## 23. D19 — Playground Research

Status: Deferred / Research

A playground is not required for initial website launch.

Research only after there is a concrete learning/debugging use case that cannot be solved well with static examples.

Questions include:

- sandbox isolation;
- bundling cost;
- execution security;
- framework support;
- shareable state;
- server requirements;
- maintenance burden.

## 24. D20 — Documentation Versioning

Status: Deferred

Do not introduce full historical docs versioning while Vii is still primarily experimental unless a concrete release-support requirement appears.

Revisit when multiple supported release lines exist.

## 25. D21 — Analytics Evaluation

Status: Deferred

Analytics is optional.

Only evaluate after the site has a real product question that analytics can answer.

Any chosen approach must pass privacy, consent, performance, and data-minimization review.

## 26. Parallel development model

The intended operating model is:

```text
Runtime / Ecosystem track         Website / Documentation track

Core, Form, Query, ...            D1, D2, D3, ...
         |                                  |
implementation + tests                     |
         |                                  |
accepted product truth -------------------->|
                                            |
                                  public projection
```

Runtime teams are not required to stop while website work proceeds.

Website agents are not allowed to invent runtime truth to fill missing content.

## 27. Slice dependency summary

```text
D0 -> D1 -> D2 -> D3
                |
                +-> D4 -> D5 -> D6 -> D7 -> D8 -> D9
                |
                +-> D10 -> D11
                |
                +-> D12/D13/D14 as runtime maturity allows
                |
                +-> D15 -> D16
                |
                +-> D17 -> D18

D19/D20/D21 are optional/deferred follow-up tracks.
```

Some content slices may proceed in parallel after D2/D3 when their required runtime truth is stable enough, but D18 remains the production graduation gate.

## 28. Current next slice

D0 through D10 are complete. The next implementation slice is:

> D11 — Generated API Reference

D11 must generate public API documentation from actual TypeScript exports, preserve public/private package boundaries, and make the generation pipeline reproducible in CI without treating internal or research-only surfaces as public API.
