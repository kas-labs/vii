# Vii Authoring Profiles

Status: Draft / Research

## Purpose

Vii should provide one runtime and one semantic model while allowing developers to use an authoring style that feels familiar to their existing framework background.

The governing principle is:

> One Vii runtime. Multiple familiar authoring profiles.

An authoring profile changes source organization, component authoring conventions, naming, composition style, generated project structure, and documentation examples. It must not create a second runtime, duplicate State/Scope/Query/HTTP semantics, or fork compatibility behavior.

This document defines the architectural boundary for a future Vii Native profile plus Angular-style, React-style, and Vue-style familiarity profiles.

No profile name, CLI prompt, component syntax, file extension, generator behavior, or project template is stable while native component and application-framework research remain ungraduated.

## Why profiles

Vii already targets developers coming from different ecosystems. Forcing every developer into one source layout or component style would create migration friction without adding runtime value.

The profile model aims to preserve familiarity where familiarity is useful while keeping Vii semantics coherent.

Profiles may influence:

- project and feature folder layout;
- component file organization;
- template versus TSX preference;
- naming conventions;
- dependency/composition conventions;
- service, composable, or hook-like organization;
- test colocation;
- CLI-generated source shape;
- documentation examples.

Profiles must not change:

- State semantics;
- Computed semantics;
- Batch semantics;
- Scope ownership and disposal;
- Query cache/freshness semantics;
- HTTP transport semantics;
- Diagnostics protocol;
- security/privacy rules;
- accessibility contracts;
- Component IR semantics if native components graduate.

## Product model

```text
                         Vii semantics
                              |
              +---------------+---------------+
              |               |               |
          State/Scope       Query/HTTP      Diagnostics
              |               |               |
              +---------------+---------------+
                              |
                       Component / App IR
                              |
          +-------------------+-------------------+
          |                   |                   |
      Vii Native          Angular-style      React-style
          |                   |                   |
          +-------------------+-------------------+
                              |
                         Vue-style
```

The diagram is conceptual. Profiles are source and tooling surfaces, not runtime layers.

## Profile contract

Every profile must satisfy the same acceptance contract:

1. **Semantic equivalence**: equivalent application behavior must lower to the same Vii runtime semantics.
2. **No profile-only capability**: a runtime feature cannot exist only because one profile has special hidden behavior.
3. **Explicit lifecycle**: Scope ownership and disposal remain visible and testable.
4. **Portable domain code**: domain/application logic should remain movable between profiles without depending on component syntax.
5. **Framework-neutral packages**: Vii Core, Query, HTTP, diagnostics, and portable UI behavior do not import profile-specific code.
6. **Tree-shakable profiles**: consumers do not pay for unused authoring/tooling profiles at runtime.
7. **Consistent security**: no profile may weaken raw-HTML, URL, secret, client/server, or code-execution policies.
8. **Consistent accessibility**: different source syntax must compile to equivalent semantic and focus behavior where the UI is equivalent.
9. **Tooling evidence**: a profile does not graduate from Research based only on attractive syntax. Formatting, source maps, diagnostics, tests, migration ergonomics, and editor support must be demonstrated.

## Recommended Vii Native architecture

Vii Native should be the recommended default profile if native application/component work graduates. It should not imitate one framework wholesale. It should combine the strongest portable ideas from modern Angular, React, and Vue while remaining recognizably Vii.

### What Vii Native adopts

From modern Angular:

- feature-first organization;
- strong application composition boundaries;
- colocated files for one UI concept;
- explicit dependency ownership;
- one concept per file when that improves navigation;
- compiler-visible template semantics rather than runtime directive magic.

From React:

- composition over inheritance;
- ordinary TypeScript/JavaScript for reusable logic;
- local ownership by default;
- colocating code near the feature that owns it;
- explicit data flow rather than framework-global mutable state;
- TSX as a valid advanced authoring profile when it lowers cleanly to Vii semantics.

From Vue:

- approachable single-component authoring;
- clear separation between reusable composable logic and presentation;
- template readability;
- progressive disclosure of complexity;
- source locality for component template, behavior, and styling.

### What Vii Native rejects

Vii Native should avoid:

- type-based top-level folders such as global `components/`, `services/`, `hooks/`, or `utils/` as the default application architecture;
- hidden mutable global application services;
- framework-specific runtime dependency injection as the only composition mechanism;
- hook naming/rules when no Hook runtime is involved;
- decorators merely to imitate Angular;
- directive syntax merely to imitate Vue;
- JSX/TSX as the only authoring route;
- monolithic single-file components that accumulate unrelated responsibilities;
- generic `utils`, `helpers`, or `common` dumping grounds;
- cross-feature imports into private implementation files;
- separate runtime semantics per profile.

## Vii Native project layout

The recommended application architecture is feature-first with a small explicit composition root.

Conceptual layout:

```text
src/
  main.ts
  app/
    app.ts
    app.routes.ts
    app.providers.ts
  features/
    account/
      index.ts
      account.page.*
      account.state.ts
      account.query.ts
      account.api.ts
      components/
      model/
    checkout/
      index.ts
      checkout.page.*
      checkout.state.ts
      checkout.api.ts
      components/
      model/
  shared/
    ui/
    model/
    lib/
  platform/
    browser/
    server/
```

The exact file extensions are deliberately omitted because `.vii`, split template files, TSX, and programmatic TypeScript remain native-component research questions.

### `app/`

Owns application composition rather than business features:

- root bootstrap;
- top-level routes;
- top-level providers/capabilities;
- global shell/layout;
- application-wide error boundaries where applicable.

`app/` should remain small.

### `features/`

The primary unit of application organization.

Each feature owns its UI, state, server-state access, transport adapters, domain model, tests, and feature-private utilities unless a responsibility is genuinely shared.

Cross-feature consumers should import through a feature public boundary such as `features/account/index.ts`, not deep private paths.

### `shared/`

Contains code that is genuinely shared by multiple features and has no feature owner.

Shared code should be promoted only after real reuse exists. Do not create speculative abstractions.

Recommended categories are intentionally narrow:

- `shared/ui` for application-wide presentation primitives/compositions;
- `shared/model` for genuinely shared domain/value contracts;
- `shared/lib` for small framework-neutral utilities with clear ownership.

### `platform/`

Contains browser/server/runtime-specific integration that should not leak into portable domain code.

Examples:

- browser storage adapters;
- server request context adapters;
- platform capability implementations.

This preserves the Vii rule that platform concerns live at explicit edges.

## Colocation rule

Keep source with the feature or component that owns it.

Good:

```text
features/profile/
  profile.page.*
  profile.page.spec.ts
  profile.state.ts
  profile.api.ts
```

Avoid default repository-wide buckets:

```text
src/components/
src/services/
src/hooks/
src/utils/
src/tests/
```

A type-based folder may exist inside a sufficiently large feature when it improves navigation, but feature ownership remains primary.

## Dependency direction

Recommended application dependency direction:

```text
app
  -> features
      -> shared
      -> Vii packages
  -> platform adapters

shared
  -> Vii packages / platform-neutral libraries

platform
  -> host/runtime APIs
```

Feature A must not depend on private internals of Feature B.

Portable model/domain code should not import component authoring syntax, browser globals, Node globals, or framework adapter packages.

## State placement

Prefer the narrowest owner.

1. component-local state for local interaction;
2. feature state for state shared within one feature;
3. Query for retained remote/server state;
4. app-level State only for genuinely application-wide state.

Do not create one global store merely because the application uses Vii State.

## Query and HTTP placement

Keep Query and HTTP separate even when files are colocated inside a feature.

Example:

```text
account.api.ts    -> transport/request composition
account.query.ts  -> Query definitions/cache lifecycle
```

`account.query.ts` may call `account.api.ts`.

HTTP must not become the feature cache. Query must not own transport serialization.

## Component authoring profiles

Native component research may support multiple source forms that lower to one Component IR.

Candidate forms include:

- `.vii` single-file component;
- split TypeScript/template/style files;
- TSX;
- programmatic TypeScript.

Vii Native should eventually recommend one beginner/default form only after compiler, formatter, source-map, accessibility, performance, migration, and editor evidence exists.

Until then, architecture must not make `.vii` or a particular control-flow token mandatory.

## Familiarity profiles

### Angular-style

Purpose: minimize migration friction for Angular-oriented teams.

May prefer:

- split TypeScript/template/style files;
- feature-first folders;
- explicit provider/configuration files;
- input/output terminology where mapped cleanly;
- strongly structured project generation.

Must not require Angular runtime decorators, Angular DI, Zone.js, or Angular template semantics.

### React-style

Purpose: minimize migration friction for React-oriented teams.

May prefer:

- TSX;
- function-first components;
- co-located tests/styles;
- composable TypeScript functions;
- explicit props/events and local composition.

Must not invent Vii Hooks solely to imitate React or adopt React reconciliation/runtime semantics.

### Vue-style

Purpose: minimize migration friction for Vue-oriented teams.

May prefer:

- single-file authoring where native compiler evidence supports it;
- template-first presentation;
- composable TypeScript logic;
- colocated styling;
- concise event/input conventions.

Must not require Vue runtime, Vue reactivity, or copy Vue directive syntax as a compatibility promise.

## CLI direction

A future application generator may offer an authoring-profile selection only after the native framework/application generator itself is approved.

Conceptual research UX:

```text
Choose an authoring profile:

  Vii Native   Recommended
  Angular      Familiar to Angular teams
  React        Familiar to React teams
  Vue          Familiar to Vue teams
```

The choice should influence source templates and documentation, not install Angular/React/Vue unless the user is explicitly creating an adapter-based application using those frameworks.

Profile choice should be recorded in explicit project metadata if generators later need deterministic behavior. It must not be inferred repeatedly from arbitrary source heuristics after project creation.

## Migration between profiles

Profiles should keep domain and runtime semantics portable enough that migration is mostly a source-authoring concern.

A future migration tool may transform supported component surfaces, but Vii must not promise automatic whole-project migration before Component IR and source-map tooling are proven.

The first migration target should be documentation and generated examples, not automatic rewriting.

## Style guide relationship

`docs/style-guide/VII_NATIVE.md` defines the recommended Vii Native source and project conventions.

Framework familiarity guides may later extend the shared rules with profile-specific conventions. They should reference this architecture rather than redefining runtime behavior.

## Research and graduation gates

Authoring profiles remain Research until evidence demonstrates:

- one shared runtime semantic model;
- Component IR or equivalent accepted direction;
- at least two source profiles lowering to equivalent behavior;
- lifecycle/disposal parity;
- accessibility parity for equivalent UI;
- security policy parity;
- formatter/editor/source-map feasibility;
- generated project usability;
- migration ergonomics;
- no unacceptable bundle/runtime cost for unused profiles;
- real consumer feedback showing that profile familiarity reduces adoption friction.

A valid outcome is to retain only Vii Native plus existing React/Angular/Vue framework adapters and not build additional native familiarity syntaxes if tooling cost exceeds user benefit.

## External design references

The research direction takes lessons from current official framework guidance without treating any framework as a compatibility contract:

- Angular recommends feature-area organization, colocation of related files, and consistency.
- React emphasizes composition, function components, declarative rendering, and ordinary JavaScript/TypeScript composition.
- Vue emphasizes consistent component conventions and allows mindful deviations from its style guide.

These references inform ergonomics only. Vii owns its runtime semantics and must validate its own architecture through prototypes and consumers.
