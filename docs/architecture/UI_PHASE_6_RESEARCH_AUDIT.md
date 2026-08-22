# Phase 6 UI Foundation Research Audit

Status: Research review

Date: 2026-08-22

## Purpose

This audit reviews the first Phase 6 roadmap proposal against the repository's current Draft UI RFCs, architecture boundaries, evidence-first policy, and current external standards before implementation begins.

It does not accept RFC 0008, 0009, or 0010 and does not create a package, runtime API, registry service, or CLI mutation.

## Repository baseline

Phase 5 Query research is complete after P5.8 and its build-vs-buy evaluation. Phase 6 may therefore begin as the next planned research program.

The existing UI direction is distributed across:

- `docs/architecture/UI_ARCHITECTURE.md`;
- `docs/architecture/DESIGN_TOKENS.md`;
- `docs/architecture/REGISTRY_ARCHITECTURE.md`;
- RFC 0008, UI distribution model, Draft;
- RFC 0009, design token system, Draft;
- RFC 0010, registry and lockfile, Draft.

Because the RFCs remain Draft, Phase 6 must preserve prototype/research language and cannot present exact package names, schemas, protocols, generators, or compatibility promises as accepted contracts.

## External standards revalidation

### Design Tokens Community Group

The first stable DTCG specification is the published 2025.10 report.

Primary references:

- https://www.designtokens.org/tr/2025.10/format/
- https://www.designtokens.org/technical-reports/
- https://www.designtokens.org/faq/

Important boundary:

DTCG is a W3C Community Group and its reports are not W3C Standards Track Recommendations. The 2025.10 format is stable enough to target as the Phase 6 prototype baseline, but Vii should keep the format/version seam explicit.

The old Vii documentation example represented a DTCG `color` token as an arbitrary HSL string. The 2025.10 format defines typed structured color values, so Phase 6 must update its prototype fixtures before implementing a compiler.

### WAI-ARIA Authoring Practices

Primary pattern references:

- Dialog: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Tabs: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- Disclosure: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/

APG provides useful pattern, keyboard, role, state, and property guidance. Its examples explicitly warn that production accessibility requires testing across browser and assistive-technology combinations.

Therefore Phase 6 must not use `100% WAI-ARIA compliance` as a unit-test result or treat an automated axe pass as accessibility certification.

## Findings in the first Phase 6 proposal

### 1. P6.1 over-selected a custom compiler

The initial roadmap named a `DTCG Compiler` before evaluating whether Vii needs to own a compiler at all.

Correction:

P6.1 is a token format and transformation prototype with a build-vs-reuse gate. A mature DTCG-capable tool behind a small Vii validation/configuration boundary is a valid outcome.

### 2. DTCG version and color representation were underspecified

The existing token RFC asked which DTCG version should be targeted and used an old CSS-string color representation.

Correction:

P6.1 targets published DTCG 2025.10 for the prototype, uses spec-compatible typed fixture values, and keeps the version seam replaceable.

### 3. High contrast was treated as a normal theme

A `high contrast theme` alone does not prove Windows/UA forced-colors behavior.

Correction:

Light and dark remain token-theme fixtures. Forced-colors/high-contrast behavior is validated separately at rendered component/browser boundaries.

### 4. Accessibility behavior mixed pure state and DOM ownership

The first roadmap described Dialog focus trap, scroll lock, and browser behavior as part of a framework-neutral headless behavior that should run in pure Node.

Correction:

Shared behaviors own deterministic state and interaction intent. DOM capabilities own focus traversal/restoration, inertness, scroll lock, portals, geometry, and browser event wiring.

Disclosure and Tabs are the first bounded behavior patterns. Dialog follows after the DOM seam is explicit.

### 5. Shared behavior risked becoming React-shaped

Returning generic `ARIA props and event handlers` from the core behavior layer can silently encode one framework's public shape.

Correction:

Shared contracts describe state, transitions, IDs/relationships, keyboard intent, and accessibility requirements. React/Angular/Vue/DOM targets translate those semantics into native framework APIs.

### 6. Registry security was sequenced too late

The first roadmap placed path traversal, prototype pollution, CSP, and provenance primarily in P6.6, after P6.4 had already implemented source mutation.

Correction:

Manifest validation, path containment, symlink/root escape, prototype pollution, integrity, duplicate target, and malicious input fixtures are P6.3 prerequisites for P6.4 mutation.

P6.6 becomes a consolidation security/distribution review, not the first security gate.

### 7. `--force` was premature

A generic `--force` destructive overwrite path conflicts with Vii's current fail-closed CLI posture and is not needed to prove first-time source installation.

Correction:

P6.4 has no generic `--force`. Existing local ownership blocks mutation. Three-way update/merge semantics are a later update problem.

### 8. Remote registry and dependency installation were conflated with source add

Network resolution and package-manager execution expand security and authority boundaries significantly.

Correction:

P6.3/P6.4 start with local registry fixtures. Remote registry transport, package-manager execution, lifecycle scripts, and automatic dependency installation require separate evidence and policy.

### 9. P6.5 was too broad

Generating a full accessible target set for React, Angular, Vue, and Custom Elements before proving one vertical semantic slice creates unnecessary implementation breadth.

Correction:

P6.5 starts with the smallest useful vertical examples, then applies one shared compliance model across the relevant targets. Target-specific DOM/public API is allowed.

### 10. Numeric bundle budget was invented before a baseline

The initial roadmap proposed `< 1.5 KB minified per behavior` without a Phase 6 measurement baseline.

Correction:

P6.7 first measures representative prototypes. Numeric release budgets may be formalized only after reproducible baseline evidence, environment, methodology, and product value exist.

### 11. `100% automated a11y pass` was too weak and too strong at once

It is too weak because automated tools do not prove focus, keyboard, screen-reader, forced-colors, or real AT behavior. It is too strong because `100%` implies certification beyond the tested ruleset.

Correction:

Accessibility graduation combines automated checks, keyboard tests, focus lifecycle tests, forced-colors/reduced-motion/RTL evidence where relevant, browser coverage, and manual assistive-technology smoke checks before support claims.

### 12. Exact future package names should remain unselected

Existing architecture examples referenced package names that do not match the project's current `@vii-labs` namespace and could be mistaken for approved public package contracts.

Correction:

Phase 6 architecture avoids selecting exact maintained UI package names until package boundaries and distribution evidence justify a governed naming decision.

## Revised slice order

```text
P6.0 architecture and evidence map
P6.1 token format / transformation prototype
P6.2 behavior contracts + DOM capability seam
P6.3 registry contract + threat-model prototype
P6.4 local source mutation lifecycle
P6.5 bounded cross-framework compliance
P6.6 distribution modes + security consolidation
P6.7 performance / accessibility / graduation gate
```

Security fixtures are continuous, especially before P6.4.

## Recommended first implementation task

After this architecture review is accepted, the next bounded task is P6.1 only.

P6.1 should:

1. capture exact DTCG 2025.10 primary-source semantics;
2. create throwaway token fixtures outside public packages;
3. prove alias/type/cycle validation and deterministic CSS/TS/JSON outputs;
4. record accessibility contrast relationships with explicit criteria;
5. compare direct transformation, mature DTCG tooling, and any Vii prototype;
6. stop before creating a stable token package or compiler API.

Do not automatically begin P6.2 in the same task.

## Graduation principle

Vii UI should own only the semantics where Vii adds differentiated value.

Valid Phase 6 outcomes include:

- a bounded native Vii UI foundation;
- tokens plus registry/CLI with mature accessibility primitives underneath;
- shared behaviors with reduced distribution scope;
- thin adapters around mature libraries;
- stopping the Vii-owned UI implementation when complexity and maintenance exceed the measured benefit.
