# Phase 6: Vii UI Foundation Roadmap and Delivery Plan

Status: Active Plan  
Primary architecture: `docs/architecture/UI_ARCHITECTURE.md`  
Governance proposals: `rfcs/0008-vii-ui-distribution-model.md`, `rfcs/0009-design-token-system.md`, `rfcs/0010-registry-and-lockfile.md`

---

## Goal

Design, validate, and deliver an open, accessible, cross-framework UI foundation across **source distribution**, **maintained package**, and **Custom Elements** modes without vendor lock-in.

Vii UI components are owned by the application author by default, work across React, Angular, Vue, Web Components, and Vanilla projects, and adhere to the Vii small-core and value-safe architecture.

---

## Non-Goals

Vii UI is not:

- a mandatory dependency of Vii State, Query, Form, or Server;
- a Tailwind-only component library;
- exclusively a Web Components library;
- a universal native platform renderer;
- an unvalidated copy of external component libraries.

---

## Slices Breakdown

### P6.0 — UI Architecture, Boundaries & Roadmap (This Slice)

Deliverables:

- formal Phase 6 roadmap and slice breakdown;
- core boundaries across contracts, behaviors, primitives, targets, tokens, registry, and CLI;
- alignment with RFCs 0008, 0009, and 0010;
- non-goals, security guidelines, and acceptance gates.

Exit criteria:

- delivery plan is structured into independent, verifiable slices;
- architectural boundaries between source mode, package mode, and elements mode are explicit.

---

### P6.1 — Design Token System & DTCG Compiler Prototype

Research & Deliverables:

- canonical platform-neutral design token definitions (DTCG standard format);
- three-layer token hierarchy: primitive, semantic, and component tokens;
- initial brand and theme profiles: light, dark, and high-contrast;
- token compiler producing CSS Custom Properties (`:root` / `.dark`), TypeScript constants, and JSON manifests;
- automated token validation: missing references, reference cycles, and color contrast accessibility audits.

Exit criteria:

- deterministic code generation across CSS and TypeScript;
- zero cyclic or unresolved token references;
- WCAG AA contrast compliance verified for default semantic color pairs.

---

### P6.2 — Renderless Accessibility Behaviors

Research & Deliverables:

- framework-neutral, stateful interaction models for accessible components:
  - **Disclosure / Accordion** (expanded state, keyboard toggle, aria-expanded);
  - **Tabs** (active tab selection, keyboard navigation: Arrow keys, Home, End, roving tabindex, aria-selected);
  - **Dialog / Modal** (open/close state, focus trap, Escape key dismissal, scroll lock, aria-modal);
  - **Popover / Tooltip** (trigger focus/hover, dismiss on blur/Escape, accessible description).
- strictly decoupled from UI renderers (returns ARIA props, state snapshots, and event handlers).

Exit criteria:

- behaviors run headlessly in pure Node/browser environments without framework dependencies;
- WAI-ARIA authoring practices compliance verified with unit tests.

---

### P6.3 — UI Registry Schema, Item Manifests & Lockfile

Research & Deliverables:

- declarative registry schema (`schema.json`) defining component metadata, files, dependencies, registry origin, and integrity hashes;
- `vii.lock` lockfile schema and serialization recording installed items, version, provenance, and original file hashes;
- detachment mechanism enabling clean removal of registry tracking while preserving local source files.

Exit criteria:

- registry manifests are strictly declarative (zero executable installation scripts);
- lockfile guarantees deterministic verification of installed components.

---

### P6.4 — Source Distribution Mutation Lifecycle (`vii ui add`)

Research & Deliverables:

- implementation of `addUi` mutation in `packages/cli-core/`;
- standard mutation pipeline:
  ```text
  Resolve -> Validate -> Analyze -> Plan -> Preview (dry-run) -> Apply -> Lock state
  ```
- conflict detection: blocks destructive overwrites when local modifications exist unless explicit `--force` is provided;
- three-way comparison and diff generation.

Exit criteria:

- dry-run preview is non-mutating and machine-readable;
- local changes are preserved and never silently overwritten.

---

### P6.5 — Cross-Framework Component Targets

Research & Deliverables:

- reference accessible component implementations generated for:
  - **React** (pure functional components with hooks and ARIA props);
  - **Angular** (standalone components with signals and accessibility directives);
  - **Vue** (Composition API components with shallow refs);
  - **Web Components / Elements** (Custom Elements with light/shadow DOM policies).
- unified design token styling integration.

Exit criteria:

- identical visual behavior and accessibility contract across all 4 targets;
- native framework idioms and lifecycles preserved.

---

### P6.6 — Security, Sandbox & Template Policy Review

Research & Deliverables:

- threat model review for source distribution:
  - registry provenance and signature verification;
  - prototype pollution and property injection protections;
  - malicious template and path traversal prevention (`../../` escaping destination);
  - Content Security Policy (CSP) compliance (no `eval`, `Function`, or inline script injection).

Exit criteria:

- security review gate passed;
- all path traversal, prototype pollution, and script injection fixtures pass.

---

### P6.7 — UI Performance, Accessibility Audits & Build Gate

Research & Deliverables:

- bundle size and tree-shaking verification:
  - source components add zero extraneous framework wrapper overhead;
  - renderless behaviors < 1.5 KB minified per component.
- automated accessibility audits (axe-core / DevTools a11y checks);
- Phase 6 graduation decision gate.

Exit criteria:

- 100% automated a11y audit pass rate across all components;
- tree-shaking and side-effect markers verified in package builds.

---

## Phase Completion Criteria

Phase 6 is complete only when:

- Design token system compiles deterministically to CSS, TS, and JSON;
- Renderless behaviors cover core interactive primitives with 100% WAI-ARIA compliance;
- UI Registry and `vii.lock` support safe, non-destructive source installation;
- Cross-framework targets (React, Angular, Vue, Elements) pass shared behavioral tests;
- Security review confirms safe registry content and path containment;
- Full repository validation (`pnpm validate`) passes.
