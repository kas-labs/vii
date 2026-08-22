# Vii Native Style Guide

Status: Draft / Research

This guide defines the recommended project and source conventions for a future Vii Native application profile. It is intentionally stricter about architecture than about syntax.

The core rule is:

> Organize by ownership and feature, keep runtime semantics explicit, and make the simple path the default path.

This document does not freeze `.vii` syntax, TSX syntax, template control-flow tokens, generator output, or a public application-framework API.

## 1. Consistency before preference

When working in an existing codebase, prefer local consistency unless the existing convention violates a Vii architecture, security, lifecycle, or accessibility invariant.

Do not mix multiple naming or folder conventions inside one feature without a concrete reason.

## 2. Project structure

Prefer this conceptual shape:

```text
src/
  main.ts
  app/
  features/
  shared/
  platform/
```

### `main.ts`

Keep bootstrap small. It should assemble the application and start the runtime, not contain feature logic.

### `app/`

Use for application composition:

- root application component/shell;
- routes;
- top-level providers/capabilities;
- application-wide configuration;
- app-level error boundaries where applicable.

Do not turn `app/` into a second `shared/` folder.

### `features/`

Organize application behavior by product/domain feature.

Good:

```text
features/
  orders/
  account/
  search/
```

Avoid top-level type buckets as the primary architecture:

```text
components/
services/
hooks/
utils/
models/
```

Feature folders may contain type-oriented subfolders once the feature is large enough to justify them.

### `shared/`

Use only for code with multiple real owners/consumers.

Avoid premature promotion into `shared`.

A useful rule:

> Duplicate a tiny local concept once before creating a speculative global abstraction.

### `platform/`

Keep runtime-specific integrations here or behind equally explicit platform seams.

Examples:

- browser storage;
- server request context;
- Web APIs with fallbacks;
- Node/Bun/Deno-specific integration;
- desktop/mobile host capabilities.

Portable domain and feature model code should not import platform globals directly when a capability boundary is required.

## 3. Feature boundaries

A feature should expose a small public boundary.

Conceptual example:

```text
features/account/
  index.ts
  account.page.*
  account.state.ts
  account.query.ts
  account.api.ts
  account.spec.ts
  components/
  model/
```

Other features import from `features/account`, not from deep private files such as:

```text
features/account/components/internal/account-avatar-state.ts
```

Do not create a barrel that blindly exports every private implementation file.

## 4. Naming

Prefer names that describe product intent or responsibility.

Good:

- `checkout-state.ts`
- `order-history.query.ts`
- `account.api.ts`
- `payment-form.*`

Avoid vague names:

- `utils.ts`
- `helpers.ts`
- `common.ts`
- `manager.ts`
- `service.ts`
- `data.ts`

File naming should remain consistent inside a project. Kebab-case is the recommended default for generated Vii Native source because it is portable across operating systems and familiar across Angular/Vue ecosystems.

## 5. One concept per file, with pragmatic exceptions

Prefer one cohesive concept per file.

Small types or functions that exist only to support that concept may stay colocated.

Split files when:

- responsibilities change for different reasons;
- the file becomes hard to navigate;
- tests require unrelated fixtures;
- lifecycle/security boundaries become unclear;
- a reusable concern gets a real second consumer.

Do not split files only to satisfy an arbitrary line count.

## 6. Colocation

Keep tests, styles, templates, and small supporting logic close to the owner when tooling supports it.

Conceptual split-component form:

```text
profile-card/
  profile-card.ts
  profile-card.html
  profile-card.css
  profile-card.spec.ts
```

Conceptual single-file form:

```text
profile-card.vii
profile-card.spec.ts
```

Both remain research candidates. The architecture values ownership and colocation, not one extension.

## 7. Component responsibilities

Components should primarily own presentation, interaction wiring, local UI state, lifecycle, and composition.

Move reusable domain/application logic out of components when it can exist independently of the UI.

Avoid components that simultaneously own:

- transport details;
- remote-state cache policy;
- large validation engines;
- persistence;
- business transactions;
- unrelated child feature state.

## 8. State ownership

Use the narrowest owner that satisfies the requirement.

Recommended order:

1. local component state;
2. feature-owned State;
3. Query for retained remote/server state;
4. app-level State for genuinely app-wide client state.

Avoid a universal global store.

Prefer derived values with `Computed` instead of synchronizing duplicate state manually.

Use `Batch` for intentional atomic propagation, not as a workaround for unclear state ownership.

## 9. Scope and lifecycle

Every resource with a lifecycle must have an owner.

Use Scope semantics for owned subscriptions, async work, observers, event listeners, and other disposable resources where Vii owns the lifecycle.

A component/feature that creates a resource should make disposal predictable.

Do not rely on accidental garbage collection as a lifecycle contract.

Do not let a profile hide Scope behavior behind framework-specific magic when disposal matters to correctness.

## 10. Query

Use Query for retained remote state.

Query owns:

- cache;
- query identity;
- freshness;
- invalidation;
- deduplication;
- server-state lifecycle.

Do not mirror Query data into State without a demonstrated application-owned state requirement.

Keep query definitions close to their feature.

Example:

```text
features/account/account.query.ts
```

## 11. HTTP

HTTP owns transport, not server-state coordination.

Keep transport composition separate from Query definitions even when both are feature-local.

Example:

```text
account.api.ts
account.query.ts
```

Do not assume a TypeScript generic validates network input.

When runtime validation is needed, use a provider-neutral Standard Schema-compatible boundary or another explicitly supported validator contract.

Retries remain policy-driven and disabled by default unless the HTTP research/graduated contract says otherwise.

## 12. Forms

Form architecture should remain provider-neutral and feature-owned.

Keep form UI state separate from domain/server state when their lifecycles differ.

Do not make every field global State.

Schema/validation providers should be adapters, not mandatory runtime dependencies.

## 13. Reusable logic

Vii Native should prefer ordinary TypeScript functions and explicit objects for reusable logic unless a dedicated runtime primitive provides measurable value.

Do not invent React-style Hooks merely for familiarity.

Do not require class-based services merely for Angular familiarity.

Do not require Vue-style composable naming merely for familiarity.

Names such as `createX`, `useX`, `XService`, or `provideX` should communicate real semantics, not profile cosplay.

## 14. Dependency injection and capabilities

Prefer explicit composition and capability injection at boundaries.

A future Vii DI/provider facility may be useful for application/runtime capabilities, but Vii Native should not require a global service container for ordinary business logic.

Constructor/decorator DI is not the default merely because Angular uses it.

Context/provider-style access is not the default merely because React/Vue use similar mechanisms.

Choose the smallest ownership mechanism that keeps dependencies testable and explicit.

## 15. Templates and TSX

Vii may support both template-oriented and TSX/programmatic authoring.

Shared rule:

> Different syntax may express the same component semantics, but runtime behavior must stay equivalent.

Template source should keep expressions readable. Move complex calculations or side effects into TypeScript.

TSX should use ordinary JavaScript/TypeScript control flow rather than pretending to be template syntax.

No profile may use `eval`, `new Function`, runtime code strings, or unsafe inline event-code generation.

## 16. Control flow

Control flow is a compiler/runtime semantic, not a stylistic macro system.

Whichever syntax graduates must preserve:

- deterministic branch ownership;
- child Scope disposal;
- stable keyed-list identity;
- focus preservation;
- type narrowing where safely provable;
- source-mapped diagnostics.

Do not freeze Angular-like `@if`, Vue-like directives, or another token before the native compiler research gate is passed.

## 17. Styling

Use semantic design tokens as the portable style boundary when Vii UI tokens apply.

Vii Native must not require Tailwind.

Valid project styling strategies may include:

- plain CSS;
- CSS Modules;
- Sass;
- Tailwind;
- unstyled/headless primitives.

Prefer component/feature-local styles for local presentation and reserve global styles for genuine application-wide concerns such as reset, typography, theme variables, and layout foundations.

## 18. Accessibility

Accessibility is part of component correctness.

Prefer semantic HTML first.

Interactive components should define:

- accessible name;
- keyboard behavior;
- focus lifecycle;
- disabled/readonly behavior;
- ARIA only where native semantics are insufficient;
- reduced-motion behavior where motion exists;
- high-contrast/forced-colors considerations where applicable.

Do not treat an automated axe pass as complete accessibility proof.

## 19. Security

Treat all external data as untrusted at the relevant boundary.

Do not:

- inject arbitrary HTML by default;
- execute strings as code;
- expose secrets through diagnostics;
- log raw authorization/cookie values;
- trust parsed JSON because parsing succeeded;
- forward server credentials across origins implicitly;
- mix server-only secrets into shared/client modules.

Profile ergonomics cannot weaken Vii security policy.

## 20. Diagnostics

Diagnostics are observational.

They must not become required for application correctness and must not mutate runtime behavior.

Prefer structural metadata over raw application values.

Keep production-safe redaction enabled where the diagnostics contract requires it.

## 21. Tests

Colocate unit/contract tests with the owning feature or component unless a broader integration fixture has a clearer home.

Every behavior change should include proportionate evidence under `FEATURE_ACCEPTANCE_GATE.md`.

For UI/application features, consider:

- deterministic unit/contract tests;
- lifecycle/disposal tests;
- integration tests;
- browser tests;
- accessibility tests;
- hostile-input/security tests;
- SSR/runtime compatibility tests where claimed.

Do not create one global `tests/` bucket for unrelated unit tests as the default project style.

## 22. Imports

Prefer imports through stable feature/package boundaries.

Avoid deep cross-feature imports.

Avoid cycles between features.

Keep framework/profile-specific imports at the authoring edge.

Portable application logic should not import React, Angular, Vue, browser globals, or server globals merely because one profile uses them nearby.

## 23. Public versus private source

Not every file needs an exported public boundary.

Keep implementation private by default.

Expose only what another feature, application layer, or package actually needs.

Avoid giant index files that erase ownership boundaries.

## 24. Generated code

Future Vii generators should generate small, readable source that a developer can own.

Generated projects/components must follow the selected authoring profile consistently.

Generators should not add speculative folders, layers, providers, base classes, registries, or abstractions before the application needs them.

Generated source should remain understandable without the generator.

## 25. Recommended Vii Native defaults

Subject to future native-framework graduation evidence, the recommended architecture defaults are:

- feature-first project organization;
- colocated component/test/style source;
- explicit small `app/` composition root;
- platform-specific code at explicit edges;
- local state before feature/app-global state;
- Query for remote state;
- HTTP for transport;
- Scope for owned lifecycle;
- ordinary TypeScript for reusable logic;
- composition over inheritance;
- semantic HTML and accessible primitives;
- no hidden global mutable services;
- no mandatory CSS framework;
- no mandatory schema provider;
- no mandatory SSR;
- no mandatory native component syntax until the compiler research graduates.

## 26. Familiarity profiles

Angular-style, React-style, and Vue-style authoring guides may later adapt naming, file shape, and component syntax while inheriting the architectural rules above.

They must not redefine State, Query, HTTP, Scope, Diagnostics, security, or accessibility behavior.

If a familiarity convention conflicts with a Vii invariant, the Vii invariant wins.

## 27. Review checklist

Before accepting a new Vii Native project convention, ask:

- Does this make ownership clearer?
- Does it reduce migration/adoption friction?
- Does it preserve one runtime semantic model?
- Does it avoid a framework-specific hidden dependency?
- Can it be generated and maintained predictably?
- Does it scale from a small application without forcing enterprise ceremony?
- Does it keep features portable and testable?
- Does it preserve lifecycle, security, accessibility, and SSR boundaries?
- Is there consumer evidence for the convention?

If the answer is no, the convention should remain optional or Research.
