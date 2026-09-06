# Vii Form Phase 2 Architecture and Roadmap

This document establishes the official architecture, scope, and roadmap for `@vii-labs/form` Phase 2.

## 1. Current Phase 1 Baseline

Vii Form has successfully completed Phase 1 product development.

- **Current Status:** Preview Candidate
- **Version:** `0.1.0-experimental.1`
- **Publication:** Deferred (Private)
- **Architecture Base:** Headless state engine, strictly separating domain values from raw presentation, with framework adapters for React, Vanilla DOM, Angular (signals), and Vue (shallowRef).
- **Validation:** Standard Schema native, fully async-capable, independent generation tracking.
- **Identity:** Stable key extraction for FieldArrays.

Phase 1 established a high-performance, strictly isolated core. Phase 2 extends consumer ergonomics without compromising this foundation.

## 2. Phase 2 Mission

The mission of Phase 2 is to **address proven consumer friction points and enable complex real-world application architectures**, without introducing bloat to the core engine or violating the headless design philosophy. Every Phase 2 feature must be justified by concrete consumer need, not mere competitive parity.

## 3. Non-Goals

Phase 2 explicitly rejects the following:
- Transforming the Form engine into a component library, layout framework, or schema DSL.
- Expanding the root bundle size for framework-specific or narrow-use-case conveniences.
- Mutating the Phase 1 public API snapshot arbitrarily (Preview compatibility rules apply).
- Adding automatic HTTP clients, generic state management sync, or external persistence layers to the Core.
- Arbitrary "parity" feature creep without a demonstrated Vii ecosystem need.

## 4. Phase 2 Design Principles

1. **Consumer evidence before API expansion:** Features require proven friction.
2. **Preserve one canonical Form state tree:** Avoid duplicated state or synchronized bridges.
3. **Keep Core DOM/framework-neutral:** The core knows nothing of HTML elements or React lifecycles.
4. **Prefer adapter composition over Core feature creep:** If an adapter or application can solve it elegantly, Core should stay out of it.
5. **Add no API without explicit lifecycle semantics:** Cleanup, unregistration, and cancellation must be clear.
6. **Raw/Value semantics remain first-class:** Parsers must remain pure; presentation state is not domain state.
7. **Stable identity is non-negotiable:** Arrays and dynamic fields must not lose focus or state across swaps.
8. **Cancellation remains distinct from failure:** Aborted async actions are not errors.
9. **Accessibility behavior must be non-destructive:** Enhancements cannot trap focus or disrupt native ARIA.
10. **Performance budgets remain enforced:** Features must not silently degrade P1l baselines.

## 5. Consumer Gap Inventory & Classification

| ID | Feature Candidate | Classification | Rationale & Ownership |
| :--- | :--- | :--- | :--- |
| **G1** | `select[multiple]` support | DEFER | High adapter complexity, low value over explicit Array checkboxes. Can be application-owned. |
| **G2** | Automatic focus-first-invalid | MUST | Universal a11y & UX requirement. **Owned by Adapters/Vanilla**. |
| **G3** | Scroll-to-invalid behavior | SHOULD | Natural pairing with G2. **Owned by Adapters/Vanilla**. |
| **G4** | External state synchronization | REJECT | Causes two sources of truth. Sync should be unidirectional via app layer. |
| **G5** | Async parser pipeline | DEFER | Validation handles async. True async parsing is rare; often conflated with enrichment. |
| **G6** | Advanced parser/formatter codecs | DEFER | Wait for Vii Schema invertible codecs. Built-ins suffice for now. |
| **G7** | Angular ControlValueAccessor | SHOULD | Essential for legacy component integration. **Owned by Angular Adapter**. |
| **G8** | Angular Directives | MUST | Ergonomic requirement for template-driven forms. **Owned by Angular Adapter**. |
| **G9** | Vue directives/composables | SHOULD | Improves Vue DX. **Owned by Vue Adapter**. |
| **G10** | React convenience abstractions | SHOULD | Controller/Context hooks reduce boilerplate. **Owned by React Adapter**. |
| **G11** | Dynamic conditional fields | MUST | Complex routing/wizard necessity. **Owned by Core**. |
| **G12** | Lazy field registration | MUST | Core to large app performance. **Owned by Core**. |
| **G13** | Form wizard / multi-step semantics | DEFER | UI routing concern, not state concern. Form provides the scoping primitives. |
| **G14** | Cross-field validation ergonomics | SHOULD | High friction currently. **Owned by Core**. |
| **G15** | Dependent validation | SHOULD | Optimization over global validation. **Owned by Core**. |
| **G16** | Validation orchestration for large forms | MAY | Relates to lazy registration. **Owned by Core**. |
| **G17** | Array item-level validation | SHOULD | Syntax/DX improvement. **Owned by Core**. |
| **G18** | Server issue reconciliation | DEFER | Existing array snapshot mapping is sufficient for now. |
| **G19** | Optimistic submission/retry | REJECT | Application/Network layer concern. |
| **G20** | Persistence integration boundaries | REJECT | Core remains purely in-memory state. |
| **G21** | Devtools/diagnostics integration | MAY | Useful but not blocking for production adoption. |
| **G22** | Schema-driven form generation | REJECT | Beyond headless scope; belongs in an independent package. |
| **G23** | SSR/hydration integration | MUST | Next.js/Nuxt compatibility is non-negotiable. **Owned by Adapters**. |
| **G24** | React Server Components boundary | MUST | React 19 compliance. **Owned by React Adapter**. |
| **G25** | Accessibility enhancements | SHOULD | Aria-describedby, fieldset grouping. **Owned by Vanilla Adapter**. |
| **G26** | Browser matrix expansion | SHOULD | Safari/Firefox coverage. **Owned by Test Infrastructure**. |
| **G27** | Native/mobile adapter implications | DEFER | React Native adapter can follow web maturation. |
| **G28** | Future Vii-native UI integration | DEFER | Wait for Vii UI project. |
| **G29** | Plugin/extensibility model | REJECT | Core composition is preferred over rigid plugin APIs. |
| **G30** | Testing utilities for consumers | DEFER | Standard DOM testing should suffice. |

## 6. External Primary-Source Research

| Library | Version / Date | Primary Source | Observed Behavior / Implication | Decision Influenced |
| :--- | :--- | :--- | :--- | :--- |
| **React Hook Form** | `v7.50+` (Sep 2026) | Official Docs/Repo | Heavy reliance on Controller & internal refs; complex focus management. | Keep focus management in adapters, out of core. Controller abstraction needed in React adapter. |
| **TanStack Form** | `v0.20+` (Sep 2026) | Official Docs/Repo | Framework-agnostic core, heavily leverages context providers. Strict typings. | Reinforces headless core value. Validate React Context usage carefully against bundle. |
| **Angular Forms** | `v18+` (Sep 2026) | Angular Docs | Signals integration ongoing; legacy reactive forms still dominant. | Directives & CVA are mandatory for Angular adapter ecosystem fit. |
| **VeeValidate** | `v4.10+` (Sep 2026) | Vue Docs/Repo | Component-heavy (`<Field>`) and composable APIs. | Vue adapter needs composable (`useField`) DX parity, but strictly avoid global store. |
| **Standard Schema** | `v1.0` (Sep 2026) | spec repo | Unified interface, `issues` array fail-closed pattern. | Affirm standard schema as the sole supported validation interface. |

## 7. Competitor Comparison Matrix

| Area | Vii Form (Phase 2 Target) | React Hook Form | TanStack Form | Angular Reactive Forms | VeeValidate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture** | Headless, UI-agnostic Core | React-coupled | Headless Core | Angular-coupled | Vue-coupled |
| **Validation** | Standard Schema Native | Resolver plugins | Standard Schema / Zod | Custom Validators | Zod / Yup / Custom |
| **Identity / Array**| Explicit Key tracking | Positional + Internal IDs | Internal IDs | Positional Index | Internal IDs |
| **Focus Mgmt** | Adapter-owned | Core-integrated (refs) | Adapter/App-owned | App-owned | App-owned |
| **Conditional Reg**| Dynamic (lazy mount) | `shouldUnregister` config | Dynamic components | Explicit add/remove | `keep-values` config |
| **Cross-field Val**| Explicit Deps (Planned) | Schema-level or triggers | Form-level validation | Form-group validators | Cross-field rules |

## 8. Ownership Matrix & Core vs Adapter

A firm boundary is maintained. The Core state engine remains unaware of DOM and frameworks.

- **CORE FORM DOMAIN:** Dynamic/lazy registration, cross-field validation relationships, group state tracking.
- **REACT ADAPTER:** `Controller` equivalent, Form Context provider, RSC/hydration boundaries.
- **VANILLA ADAPTER:** Focus-first-invalid orchestration, `aria-describedby` wiring, element registry mapping.
- **ANGULAR ADAPTER:** `ControlValueAccessor` bridge, `[viiField]` directive, template integration.
- **VUE ADAPTER:** Composition API enhancements, template ref binding helpers.
- **APPLICATION-OWNED:** Multi-step wizard routing, optimistic submissions, persistence sync, `select[multiple]` serialization.

## 9. Architectural Decision Records (ADRs)

### ADR P2-1: Dynamic Registration & Conditional Fields
**Decision:** Implement lazy registration and explicit active/inactive node status in Core.
**Rationale:** Large forms (wizards, complex routing) cannot afford to mount the entire tree upfront. When fields unmount, they must optionally retain their state (`keepValues` equivalent) without participating in aggregate validation/dirty checks until remounted.
**Impact:** Core `Node` architecture requires an `active` status toggle and lifecycle events for mount/unmount.

### ADR P2-2: Focus Management Ownership
**Decision:** Core remains entirely ignorant of focus. Focus orchestration (`focus-first-invalid`) is explicitly owned by the Vanilla adapter and framework adapters.
**Rationale:** The Core manages data. Focus is a DOM/presentation concern. Mixing them violates the headless boundary and inflates the core bundle with DOM interfaces.

### ADR P2-3: Framework-Native Integration Strategy (Angular/React/Vue)
**Decision:** Expand adapter surfaces to match framework idiomatic usage (Angular Directives/CVA, React Context/Controller) strictly without bleeding framework semantics into Core.
**Rationale:** The Phase 1 raw hooks proved the engine works, but consumers demand idiomatic DX (e.g., binding to a 3rd party Angular component requires CVA). This does not bloat Core because it resides in subpaths.

### ADR P2-4: Select-Multiple Ownership
**Decision:** Rejected from Core/Adapter explicit abstraction; DEFERRED indefinitely.
**Rationale:** The DOM implementation of `<select multiple>` requires reading `selectedOptions` or handling arrays versus sets. It is highly specific and often replaced by custom UI components (checkbox groups, comboboxes). Application developers or custom component wrappers should own the array transformation.

### ADR P2-5: Async Parser Pipeline
**Decision:** Rejected/Deferred.
**Rationale:** True async *parsing* (turning string "1,000" into number `1000`) is synchronous. Async *enrichment* (looking up a zip code) is validation or side-effect logic. Adding async parsing drastically complicates the update loop for edge cases.

### ADR P2-6: External State Synchronization
**Decision:** Explicitly Rejected.
**Rationale:** Form is the single source of truth for in-flight user input. Syncing it bidirectionally to Redux, URL, or local storage introduces lifecycle ambiguity, infinite loops, and race conditions. Consumers who need this must implement unidirectional observers.

## 10. Compatibility Policy (Preview Phase)

`@vii-labs/form` is a **Preview Candidate** (`0.1.0-experimental.1`).
- **Additive Changes:** Allowed via minor/patch bumps. Must update `api-surface.json`.
- **Breaking Changes:** Strictly minimized, but permitted during Preview if research dictates. Requires explicit migration notes in the PR and a minor version bump (or major if graduated).
- **Deprecations:** Prefer immediate breaking change during Preview rather than maintaining deprecation layers.
- **API Snapshot Governance:** Every public API change REQUIRES an update to `packages/form/api-surface.json` and its boundary tests. No accidental exports.

## 11. Performance and Bundle Continuity

All Phase 2 slices MUST execute the P1l performance gate.
- **Performance Budget Continuity Rule:** All Phase 2 slices must preserve P1l budgets unless explicitly re-baselined with evidence.
- **Bundle Impact Governance Rule:** Root impact vs adapter-only impact must be isolated. Features isolated to subpaths when framework-specific must not enter root.
- **Memory:** Dynamic unregistration must rigorously verify zero memory leaks via the established 1,000-cycle Playwright tests.

## 12. Security and Privacy Constraints

- **Security/Privacy Continuity Rule:** Value-free privacy remains enforced. New features cannot log domain or raw values.
- **DOM Sinks:** Any vanilla adapter extensions (e.g., error rendering) must continue to strictly use `textContent` to prevent DOM XSS.

## 13. Accessibility Constraints

- **Accessibility Continuity Rule:** Accessibility behavior must be non-destructive.
- **Enhancements:** Focus management (G2) must not hijack expected keyboard navigation.
- **Validation:** ARIA attributes (`aria-invalid`, `aria-errormessage`) driven by adapters must update strictly inline with validation generation completions.

## 14. Phase 2 Slice Roadmap

The following slices are strictly ordered to unblock subsequent architectural layers.

### **P2b — Core: Dynamic Tree & Lazy Registration** (FIRST RUNTIME SLICE)
- **Objective:** Support mount/unmount retention, conditional active status, and lazy node creation in the Core.
- **Owner:** Core Form Domain.
- **Dependencies:** None (Base requirement for React/Angular conditional rendering).
- **Public API Impact:** Moderate (Core `Node` lifecycle extensions).
- **Tests Required:** Unit, Memory Leak (1000 cycle), SSR.
- **Stop Condition:** `keepValues` semantics are proven, memory is leak-free, and API snapshot updated.

### **P2c — Core: Cross-Field Validation & Dependencies**
- **Objective:** Ergonomic APIs for `confirm password`, dependent date ranges, and field dependency tracking.
- **Owner:** Core Form Domain.
- **Dependencies:** P2b.
- **Public API Impact:** Low/Moderate (Validation configuration).
- **Tests Required:** Async dependency races, cyclic detection.
- **Stop Condition:** Cyclic dependencies throw descriptively; dependent fields evaluate correctly.

### **P2d — Adapters: DOM Focus & Accessibility Orchestration**
- **Objective:** Vanilla adapter implementation of `focus-first-invalid` and enhanced ARIA coordination.
- **Owner:** Vanilla Adapter.
- **Dependencies:** None.
- **Public API Impact:** Low (Vanilla adapter config).
- **Tests Required:** Playwright browser focus and screen reader semantics.
- **Stop Condition:** Standard submit failures naturally focus the first invalid DOM node.

### **P2e — Frameworks: Idiomatic React & Vue Integrations**
- **Objective:** React `Controller` / `FormProvider` and Vue composable enhancements.
- **Owner:** React & Vue Adapters.
- **Dependencies:** P2b (for conditional rendering contexts).
- **Public API Impact:** High within `/react` and `/vue` subpaths.
- **Tests Required:** SSR, RSC boundaries, strict-mode.
- **Stop Condition:** Controller correctly bridges generic components without parent renders.

### **P2f — Frameworks: Angular Ecosystem Integration**
- **Objective:** Angular `ControlValueAccessor` bridge and `[viiField]` directives.
- **Owner:** Angular Adapter.
- **Dependencies:** P2b.
- **Public API Impact:** High within `/angular` subpath.
- **Tests Required:** Angular v17/18 template compatibility.
- **Stop Condition:** Directive properly maps state to CVA outputs without memory leaks.

### **P2g — Cross-Browser Infrastructure Expansion**
- **Objective:** Add WebKit and Firefox to Playwright test matrix.
- **Owner:** Test Infrastructure.
- **Dependencies:** P2d.
- **Public API Impact:** Zero.
- **Tests Required:** Browser matrix CI runs.
- **Stop Condition:** Firefox/WebKit tests pass consistently in CI.

### **P2h — Phase 2 Graduation Review**
- **Objective:** Final API review, documentation sync, performance audit.
- **Owner:** Repository Maintainers.
- **Dependencies:** All prior slices.
- **Public API Impact:** Zero.
- **Tests Required:** Full validation suite.
- **Stop Condition:** Documentation synchronized, Preview readiness confirmed.

## 15. Graduation Criteria for Phase 2

Phase 2 concludes when:
1. Dynamic conditional trees function without memory leaks.
2. Angular, React, and Vue adapters support native idiomatic patterns (CVA, Context/Controller).
3. Focus management orchestrates flawlessly upon submission failure.
4. P1l performance and bundle budgets are met or explicitly justified via ADR.

## 16. Open Questions

1. **Angular Signals Forms Horizon:** (Non-blocking) Is the official Angular team replacing CVA entirely in v19+? We must build CVA for current adoption, but monitor official signals strictly.
2. **React 19 Form Actions:** (Non-blocking) How deeply should the React adapter integrate with native `useActionState` and `<form action={...}>`? Deferred to P2e investigation.
3. **Array Item Re-registration:** (Blocking for P2b) When a dynamic array item unmounts and remounts, does it retain its stable identity key implicitly or must it be re-provided? Resolution required in P2b specification.
