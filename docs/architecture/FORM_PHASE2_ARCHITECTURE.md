# Vii Form Phase 2 Architecture and Roadmap

This document establishes the official architecture, scope, and roadmap for `@vii-labs/form` Phase 2.

## 1. Current Phase 1 Baseline

Vii Form has successfully completed Phase 1 product development.

- **Current Status:** Preview Candidate
- **Version:** `0.1.0-experimental.1`
- **Publication:** Deferred (Private)
- **Architecture Base:** Headless state engine, strictly separating domain values from raw presentation, with framework adapters.
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
- Schema-driven UI generation in Form core.
- Plugin/extensibility model without concrete evidence.
- Package publication.

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
| **G2** | Automatic focus-first-invalid | SHOULD | High UX value, but must not hijack expected keyboard navigation. **Owned by Adapters/Vanilla**. |
| **G3** | Scroll-to-invalid behavior | SHOULD | Natural pairing with G2. **Owned by Adapters/Vanilla**. |
| **G4** | External state synchronization | REJECT | Causes two sources of truth. App layer should observe unidirectionally. |
| **G5** | Async parser pipeline | REJECT | Validation handles async. True async parsing is synchronous; enrichment is side-effect logic. |
| **G6** | Advanced parser/formatter codecs | DEFER | Wait for Vii Schema invertible codecs. Built-ins suffice for now. |
| **G7** | Angular ControlValueAccessor | SHOULD | CVA remains important for compatibility with Angular's established forms/custom control ecosystem and Angular versions below Signal Forms availability. **Owned by Angular Adapter**. |
| **G8** | Angular Directives | SHOULD | Useful ergonomic bridge (`[viiField]`). Do not conflate with Signal Forms interoperability. **Owned by Angular Adapter**. |
| **G9** | Vue directives/composables | SHOULD | Improves Vue DX. **Owned by Vue Adapter**. |
| **G10** | React convenience abstractions | SHOULD | Controller/Context hooks reduce boilerplate. **Owned by React Adapter**. |
| **G11** | Dynamic conditional fields | MUST | Schema mutability (creation/removal) is a complex routing/wizard necessity. **Owned by Core**. |
| **G12** | Lazy field registration | MUST | Enables forms that cannot mount the entire tree upfront. **Owned by Core**. |
| **G13** | Form wizard / multi-step semantics | DEFER | UI routing concern, not a form state concern. Form provides scoping primitives. |
| **G14** | Cross-field validation ergonomics | SHOULD | High friction currently. **Owned by Core**. |
| **G15** | Dependent validation | SHOULD | Optimization over global validation. **Owned by Core**. |
| **G16** | Validation orchestration for large forms | MAY | Relates to lazy registration. **Owned by Core**. |
| **G17** | Array item-level validation | SHOULD | Syntax/DX improvement. **Owned by Core**. |
| **G18** | Server issue reconciliation | DEFER | Existing array snapshot mapping is sufficient for now. |
| **G19** | Optimistic submission/retry | REJECT | Application/Network layer concern. |
| **G20** | Persistence integration boundaries | REJECT | Core remains purely in-memory state. |
| **G21** | Devtools/diagnostics integration | MAY | Useful but not blocking for production adoption. |
| **G22** | Schema-driven form generation | REJECT | Beyond headless scope; belongs in an independent package. |
| **G23** | SSR/hydration integration | SHOULD | Next.js/Nuxt hydration is highly requested. (Import-safety proved in P1h). **Owned by Adapters**. |
| **G24** | React Server Components boundary | MAY | Form adapter sits below client boundary ("use client"). Purely documentation/packaging. |
| **G25** | Accessibility enhancements | SHOULD | Aria-describedby, fieldset grouping. **Owned by Vanilla Adapter**. |
| **G26** | Browser matrix expansion | SHOULD | Safari/Firefox coverage. **Owned by Test Infrastructure**. |
| **G27** | Native/mobile adapter implications | DEFER | React Native adapter can follow web maturation. |
| **G28** | Future Vii-native UI integration | DEFER | Wait for Vii UI project. |
| **G29** | Plugin/extensibility model | REJECT | Core composition is preferred over rigid plugin APIs. |
| **G30** | Testing utilities for consumers | DEFER | Standard DOM testing should suffice. |

## 6. External Primary-Source Research

| Library | Version / Date | Primary Source | Observed Behavior / Implication | Decision Influenced |
| :--- | :--- | :--- | :--- | :--- |
| **React Hook Form** | `v7.x` (Sep 2026) | https://react-hook-form.com/ | Focuses heavily on `register`/`unregister` lifecycle. Unmounting an input unregisters it unless `shouldUnregister: false`. Core-integrated focus management via refs. | Influenced explicitly avoiding framework lifecycles in Core and keeping focus management explicitly in adapters. |
| **TanStack Form** | `v1.x` / `v2.x alpha` (Sep 2026) | https://tanstack.com/form | v1 is stable, v2 alpha announced Aug 2026. Supports React, Vue, Angular, Solid, Svelte, Lit. Features deeply typed values, granular subscriptions. Meta-framework adapters exist. | Reinforces headless core value and strongly typed granular subscriptions. |
| **Angular Signal Forms** | `v18+` (Sep 2026) | [Overview](https://angular.dev/guide/forms/signal-forms), [form API](https://angular.dev/api/forms/form), [Comparison](https://angular.dev/guide/forms/comparison) | Signal Forms require Angular v21+. Stable APIs (`form()`, `Schema`, `FormOptions`) since Angular v22.0. The official comparison states Signal Forms as: Stable (v22+). | Angular adapter P2f must manage version-specific compatibility safely. |
| **VeeValidate** | `v4.x` (Sep 2026) | https://vee-validate.logaretm.com/ | Built around Composition API (`useField`, `useForm`). Provides dynamic field paths and flexible unmount behavior. | Vue adapter needs `useField` composable DX parity, rejecting global stores. |
| **Standard Schema** | `v1.0` (Sep 2026) | https://standardschema.dev/ | Unified interface, `issues` array fail-closed pattern. | Standard schema is the provider-neutral boundary. Native Vii rules remain first-class. |

## 7. Angular Version Matrix

The architecture formally distinguishes:
- **Angular 17.3.12:** Accepted Vii minimum compatibility point. There is no assumption that Signal Forms APIs exist. The current Vii Angular adapter must continue to work.
- **Angular 21:** Signal Forms available as transitional/new API generation.
- **Angular 22+:** Signal Forms stable according to current Angular documentation.

**Constraint:** Not all Angular >=17 consumers can import Signal Forms APIs. Signal Forms integration must not silently break the accepted Angular 17.3.12 consumer. Future P2f must not unconditionally import `@angular/forms/signals` if doing so breaks Angular 17 consumers. Future compatibility options include: feature detection, a separate Angular Signal Forms subpath, an optional integration module, an API design that does not statically require Signal Forms for the baseline adapter, or raising the minimum Angular version in a future breaking change. Implementation choice is deferred.

## 8. Competitor Comparison Matrix

| Area | Vii Form (Phase 2 Target) | React Hook Form | TanStack Form | Angular Signal Forms | VeeValidate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Architecture** | Headless, UI-agnostic Core | React-coupled | Headless Core | Angular-coupled | Vue Composition |
| **Validation** | Native Rules & Standard Schema | Resolver plugins | Standard Schema / Zod | Schema-based | Zod / Yup / Custom |
| **Identity / Array**| Explicit Key tracking | Positional + Internal IDs | Granular subscriptions | Typed FieldTree | Composition API paths |
| **Focus Mgmt** | Adapter-owned (SHOULD) | Core-integrated (refs) | Adapter/App-owned | App-owned | App-owned |
| **Conditional Reg**| Explicit Logical Unregister | `shouldUnregister` config | Dynamic components | Dynamic schema | `keep-values` config |
| **Cross-field Val**| Explicit Deps (Planned) | Schema-level or triggers | Form-level validation | Form-level/Schema | Cross-field rules |

## 9. Core Lifecycle Operations

The architecture defines exactly three conceptually separate operations:

1. **UI ADAPTER MOUNT / UNMOUNT**
   - Presentation lifecycle only.
   - Canonical Core node survives.
   - Value/raw/dirty/touched/issues survive.
   - Does NOT alter Form tree.
   - Does NOT alter submission participation.
2. **LOGICAL REGISTRATION**
   - Canonical node becomes part of Group/Array/Form structure.
   - Participates in aggregation/validation/submission according to current tree contract.
3. **LOGICAL UNREGISTRATION / REMOVAL**
   - Canonical structural membership ends.
   - Node is removed from aggregate values/submission.
   - Owned Scope/resources are disposed according to selected P2b semantics.
   - Retained state is destroyed unless a future explicitly different primitive is designed.

*No fourth Core lifecycle state (e.g., active/inactive) is permitted.*

## 10. Architectural Decision Records (ADRs)

### ADR P2-1: Dynamic Tree & Node Existence
**Decision:** Do not conflate UI mounting with Form node existence. A node is explicitly logically registered in Core and survives UI unmounts by default. To remove a node from the submit snapshot and validation, it must be explicitly logically unregistered from the parent group/array.
**Rationale:** Large forms need conditional sections. If UI conditionally hides a field, its state should typically be retained (Scenario A) unless it is structurally removed from the schema (Scenario C). The chosen minimal primitive is explicit structural logical unregister, not a public `active` boolean flag, and not a public undefined `attach`/`detach` primitive.

### ADR P2-2: FieldArray Re-registration & Identity
**Decision:**
- **UI unmount:** item remains in array.
- **Reorder while UI-unmounted:** same `FieldArrayItem.id`, same canonical item node, same Scope.
- **Logical remove:** item leaves array, node disposed, Scope disposed, identity no longer exists.
- **Subsequent new item:** receives a new logical identity unless explicit supported key semantics map it according to existing key contract.
- **UI remount:** called "adapter rebind / UI remount" (NOT "re-registration").
**Rationale:** Reorder operations while without UI binding operate on the logical nodes in Core. Re-mounting with the same ID reconnects the adapter to the existing node. `dirty`, `touched`, and `issues` are preserved. The structural registration mechanism must reject any duplicate logical key that would violate FieldArray stable identity.

### ADR P2-3: Focus Management Ownership
**Decision:** Core remains entirely ignorant of focus. Focus orchestration (`focus-first-invalid`, `scroll-to-invalid`) is explicitly owned by the Vanilla adapter and framework adapters.
**Rationale:** Focus is a DOM/presentation concern. Mixing them violates the headless boundary and inflates the core bundle with DOM interfaces.

### ADR P2-4: Framework-Native Integration Strategy
**Decision:** Expand adapter surfaces to match framework idiomatic usage without bleeding framework semantics into Core. Keep Angular directive integration (`[viiField]`) separate from Signal Forms interoperability; do not conflate them as they solve different integration problems.
**Rationale:** Idiomatic DX reduces application boilerplate. RSC boundaries simply require "use client" directives at the adapter export level, maintaining the client-side nature of Form state.

### ADR P2-5: Select-Multiple Ownership
**Decision:** Rejected from Core explicit abstraction; DEFERRED indefinitely.
**Rationale:** The DOM implementation of `<select multiple>` is specific and often replaced by custom UI components. Application developers should own the array transformation.

### ADR P2-6: Async Parser Pipeline & External State Sync
**Decision:** Both explicitly REJECTED.
**Rationale:** Validation handles async requirements. True async parsing is an enrichment side-effect. External state sync (Redux/URL) introduces lifecycle ambiguity; consumers must implement unidirectional observers from the Form.

## 11. Compatibility Policy (Preview Phase)

`@vii-labs/form` is a **Preview Candidate** (`0.1.0-experimental.1`).
- **API Compatibility Rule:** Additive changes are allowed via minor/patch bumps. Preview breaking changes remain possible, but deprecation should be preferred where practical and support cost is reasonable.
- **API Snapshot Governance:** Every public API change REQUIRES an update to `packages/form/api-surface.json` and its boundary tests. No accidental exports.
- **Version/Release Separation:** Package remains private and unpublished. Internal slices do not automatically mandate package version bumps until a release gate is executed.

## 12. Performance, Security, and Accessibility Continuity

- **Performance Budget Continuity Rule:** All Phase 2 slices must preserve P1l budgets unless explicitly re-baselined with evidence.
- **Bundle Impact Governance Rule:** Root impact vs adapter-only impact must be isolated.
- **Security/Privacy Continuity Rule:** Value-free privacy remains enforced. New features cannot log domain or raw values. Any vanilla adapter extensions must continue to strictly use `textContent`.
- **Accessibility Continuity Rule:** Accessibility behavior must be non-destructive. Focus management must not hijack native keyboard navigation. `aria-errormessage` is a Phase 2 MAY candidate, not an existing invariant. ARIA updates must happen strictly inline with validation generation completions.

## 13. Phase 2 Slice Roadmap

The Phase 2 roadmap follows a strictly sequential recommended execution order to eliminate dependency ambiguity.

### **P2b — Core: Dynamic Tree Registration Semantics** (FIRST RUNTIME SLICE)
- **Objective:** Prove contract-first semantics for dynamic logical registration/unregistration while preserving the rule that UI adapter mount/unmount does not affect canonical Form node existence.
- **Owner:** Core Form Domain.
- **Dependencies:** None.
- **Candidate Public API Impact:** Minimal new unregister primitives. P2a does NOT authorize any public `active` signal unless P2b contract-first evidence later proves them necessary. Explicit structural registration/unregistration semantics using the smallest possible extension to existing Group/Array APIs.
- **Acceptance Matrix:**
  - [ ] UI unmount does not unregister.
  - [ ] logical unregister excludes node from aggregate values.
  - [ ] logical unregister excludes node from validation.
  - [ ] logical unregister excludes node from submission snapshot.
  - [ ] logical unregister disposes owned resources.
  - [ ] pending validation becomes non-authoritative/cancelled.
  - [ ] UI remount of still-registered node preserves state.
  - [ ] FieldArray UI unmount preserves stable identity.
  - [ ] FieldArray reorder without UI binding preserves stable identity.
  - [ ] FieldArray logical remove disposes identity/node resources.
  - [ ] reset behavior defined.
  - [ ] reinitialize behavior defined.
  - [ ] server issue behavior defined.
  - [ ] 1,000 logical registration/unregistration stress cycles.
  - [ ] P1l budgets remain green.
  - [ ] No undefined attach/detach semantics.
- **Performance Gate:** Before/after construction cost measurements.
- **Memory/Resource Gate:**
  - **CORE STRUCTURAL STRESS:** 1,000 cycles of: register logical node, exercise representative state, unregister logical node, verify disposal (Assert: 0 residual subscriptions, 0 residual owned Scopes, 0 stale validation commits, 0 outstanding owned timers/controllers where relevant).
  - **UI LIFECYCLE REGRESSION:** Use existing adapter lifecycle tests to prove: mount adapter, unmount adapter, canonical node survives.
- **Stop Condition:** 0 unresolved blocking architecture questions. Contract tests pass.

### **P2c — Core: Cross-Field Validation & Dependencies**
- **Objective:** Ergonomic APIs for `confirm password`, dependent date ranges, and field dependency tracking.
- **Owner:** Core Form Domain.
- **Dependencies:** P2b.
- **Public API Impact:** Low/Moderate (Validation configuration).
- **Tests Required:** Async dependency races, cyclic detection.
- **Stop Condition:** Cyclic dependencies throw descriptively; dependent fields evaluate correctly.

### **P2d — Adapters: DOM Focus & Accessibility Orchestration**
- **Objective:** Vanilla adapter implementation of `focus-first-invalid`, `scroll-to-invalid`, and enhanced ARIA coordination.
- **Owner:** Vanilla Adapter.
- **Dependencies:** P2c.
- **Public API Impact:** Low (Vanilla adapter config).
- **Tests Required:** Playwright browser focus and screen reader semantics.
- **Stop Condition:** Standard submit failures can optionally focus the first invalid DOM node.

### **P2e — Frameworks: Idiomatic React & Vue Integrations**
- **Objective:** React `Controller` / `FormProvider` and Vue `useField` composition enhancements.
- **Owner:** React & Vue Adapters.
- **Dependencies:** P2d.
- **Public API Impact:** High within `/react` and `/vue` subpaths.
- **Tests Required:** SSR import safety, strict-mode.
- **Stop Condition:** Controller correctly bridges generic components without parent renders.

### **P2f — Frameworks: Angular Ecosystem Integration**
- **Objective:** Angular Signal Forms interoperability, `ControlValueAccessor` bridge.
- **Owner:** Angular Adapter.
- **Dependencies:** P2e.
- **Public API Impact:** High within `/angular` subpath.
- **Tests Required:** Angular 17.3.12 and latest modern Angular template compatibility.
- **Stop Condition:** Form successfully maps to Angular Signals without memory leaks.

### **P2g — Cross-Browser Infrastructure Expansion**
- **Objective:** Add WebKit and Firefox to Playwright test matrix.
- **Owner:** Test Infrastructure.
- **Dependencies:** P2f.
- **Public API Impact:** Zero.
- **Tests Required:** Browser matrix CI runs.
- **Stop Condition:** Firefox/WebKit tests pass consistently in CI.

### **P2h — Phase 2 Graduation Review**
- **Objective:** Final API review, documentation sync, performance audit.
- **Owner:** Repository Maintainers.
- **Dependencies:** P2g.
- **Public API Impact:** Zero.
- **Tests Required:** Full validation suite.
- **Stop Condition:** Documentation synchronized, Preview readiness confirmed.

## 14. Graduation Criteria for Phase 2

Phase 2 concludes when:
1. Dynamic conditional trees function without memory leaks via explicit `unregister`.
2. Angular, React, and Vue adapters support native idiomatic patterns (Signal Forms, Context/Controller).
3. Focus management orchestrates flawlessly upon submission failure (opt-in).
4. P1l performance and bundle budgets are met or explicitly justified via ADR.
5. Scope is strictly defined by the accepted Phase 2 roadmap slices.

## 15. Open Questions

1. **Angular Signal Forms vs CVA Priority:** (Non-blocking) Should Signal Forms interoperability entirely replace the need for CVA in v19+?
2. **React 19 Form Actions:** (Non-blocking) How deeply should the React adapter integrate with native `useActionState` and `<form action={...}>`? Deferred to P2e investigation.
