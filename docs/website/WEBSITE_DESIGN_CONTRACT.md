# Vii Website Design Contract

Status: Active
Track: D3 — Brand, Design Contract & Homepage
Canonical surface: `https://viijs.org`

## 1. Purpose

This document translates the supplied Vii design system and UI direction mocks into a bounded implementation contract for the public website.

The visual system is authoritative for visual language. Repository implementation and accepted documentation remain authoritative for product facts.

## 2. Design direction

The website follows the **Quiet Intelligence** direction:

- calm developer-tool aesthetic;
- restrained monochrome surfaces;
- cool neutral grays;
- violet used as a focused accent rather than decoration;
- thin borders and low visual noise;
- code and architecture as primary proof surfaces;
- light and dark themes;
- restrained motion with reduced-motion support;
- no generic AI-gradient or hype-oriented visual language.

The website should feel like an engineering product, not an AI wrapper or a generic SaaS landing page.

## 3. Brand hierarchy

Public product: **Vii**

Organization attribution: **by Kas Labs**

Canonical domain: `viijs.org`

The homepage should lead with Vii. Kas Labs attribution is secondary and must not visually compete with the product name.

## 4. Typography

Preferred family from the supplied design system:

- UI and prose: Geist Sans;
- code and engineering metadata: Geist Mono.

D3 must not add a third-party font request. Until self-hosted font assets are intentionally added, CSS uses the Geist family names with system fallbacks. Self-hosting remains the preferred production direction.

## 5. Color model

Primary accent: `#7676F4`.

Violet is reserved for:

- primary actions;
- active navigation;
- focus states;
- selected code or architecture signals;
- meaningful product emphasis.

It must not become a full-page gradient or decorative wash.

Light and dark themes use semantic tokens rather than component-specific hard-coded colors.

## 6. Core visual primitives

D3 establishes a minimal local website layer, not a reusable public UI package:

- page shell;
- site header/navigation;
- buttons/links;
- status badges;
- proof/code surface;
- capability cards;
- architecture flow;
- responsive section/grid primitives.

These remain local to `apps/web` until multiple real consumers justify extraction.

## 7. Status presentation

Public status labels use the D1 taxonomy:

- Stable;
- Experimental;
- In Development;
- Research Accepted;
- Research;
- Planned;
- Vision;
- Deprecated.

Availability is separate from maturity. A capability may be Experimental while still unpublished or private.

Homepage status previews must not imply installability unless repository truth supports it.

## 8. Homepage composition

D3 homepage order:

1. shared header;
2. proof-first hero;
3. small Core code example;
4. concise explanation of what Vii is;
5. core primitives;
6. lifecycle/Scope differentiator;
7. ecosystem status preview;
8. architecture flow;
9. documentation and GitHub calls to action;
10. Kas Labs attribution.

The hero follows the supplied proof-first direction rather than a marketing-only hero.

## 9. Content truth rules

Mock content is never product truth.

Do not copy placeholder:

- package names;
- versions;
- APIs;
- benchmark numbers;
- release dates;
- maturity claims;
- roadmap dates.

Every concrete claim must be supported by current repository state.

D3 may describe Core as experimental and Form as in development. It may show Query and HTTP as research-accepted only when current accepted repository documentation supports those states. It must not present research capabilities as installable packages.

## 10. Rendering and interaction

D1 rendering policy remains unchanged:

- prerendered static HTML by default;
- SSR only when a later route has a real request-time requirement;
- client hydration only for justified interaction;
- no global SPA framework;
- progressive enhancement preferred.

D3 homepage requires no client framework runtime.

## 11. Accessibility baseline

D3 must provide:

- semantic landmarks;
- visible keyboard focus;
- skip link;
- logical heading hierarchy;
- accessible navigation labeling;
- sufficient contrast;
- reduced-motion handling;
- responsive layout without horizontal page overflow;
- code surfaces that remain readable without color alone.

Target: WCAG 2.2 AA where practical.

## 12. Responsive baseline

The design starts mobile-first.

- content width remains bounded;
- hero stacks before using two columns;
- navigation may wrap rather than requiring JavaScript in D3;
- grids collapse to one column on narrow screens;
- code blocks scroll internally rather than overflowing the page.

## 13. Ownership boundary

D3 does not create `packages/web-ui` or another shared design package.

The website is currently the only proven consumer. Tokens and components stay under `apps/web` until reuse is demonstrated.

## 14. D3 non-goals

D3 does not implement:

- Getting Started;
- final Core documentation;
- API reference generation;
- search;
- playground;
- analytics;
- Cloudflare deployment;
- DNS configuration;
- framework islands;
- a public design-system package.

## 15. Exit gate

D3 is complete when:

- the homepage is a real Vii surface rather than a bootstrap placeholder;
- visual tokens are implemented;
- light/dark themes work through platform preferences;
- shared navigation exists;
- code/status/card primitives are present;
- layout is responsive at baseline;
- product claims are repository-backed;
- no placeholder mock facts are published;
- repository validation passes.
