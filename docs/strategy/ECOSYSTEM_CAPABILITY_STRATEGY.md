# Vii Ecosystem Capability Strategy

Status: Research direction

## Purpose

Vii should learn from strong ideas across Angular, React, Vue, TanStack, Zod, Valibot, ArkType, TypeBox, Ajv, Analog, Vite, Vitest, and other modern ecosystems without becoming a collection of rewritten infrastructure projects.

The guiding rule is:

> Own Vii semantics. Reuse mature engines behind replaceable boundaries.

Vii should create a new capability only when it adds distinct product value, uses the shared Vii State, Scope, lifecycle, diagnostics, compatibility, and security model where appropriate, and has a real consumer or roadmap trigger.

## What Vii should own

Vii should own behavior that defines the developer and runtime model:

- State and dependency semantics;
- Scope, ownership, and disposal;
- structured diagnostics and explainability;
- Query semantics and server-state lifecycle;
- Schema semantics only if the research demonstrates meaningful application-boundary value beyond existing validators;
- Form semantics when the Form module advances;
- HTTP client contracts when the HTTP research advances;
- native component semantics and Component IR if native components graduate;
- framework-specific build orchestration if the application framework graduates;
- Vii-specific testing helpers, fixtures, diagnostics assertions, and compliance suites.

These are areas where consistency across the ecosystem can create compounding value. That consistency is not sufficient reason by itself to build a new package.

## What Vii should not rebuild by default

Vii should not create a new general-purpose implementation merely to control the brand surface.

Default examples:

- do not create a package manager instead of pnpm, npm, Bun, or other existing managers;
- do not create a general-purpose schema validator if Zod, Valibot, ArkType, TypeBox, Ajv, or another mature validator satisfies the validated need without losing important Vii semantics;
- do not create a general-purpose JavaScript bundler before Vii-specific compiler evidence requires it;
- do not create a replacement for Vitest solely to have a Vii test runner;
- do not create a browser automation engine instead of using Playwright or equivalent mature tooling;
- do not create a deployment runtime before application-framework semantics require one;
- do not fork framework semantics into React, Angular, and Vue specific copies.

A future Vii CLI may provide one user-facing command while delegating to mature engines. Engine choice must remain an implementation boundary rather than a Vii runtime semantic.

## Inspiration is not compatibility

Vii may deliberately study and combine ideas from other projects. The source of an idea does not become a runtime dependency and does not imply API compatibility.

Examples:

- Zod informs chainable TypeScript-first schema ergonomics, static inference, error handling, JSON Schema interoperability, and the trade-off between flagship and Mini surfaces;
- Valibot informs modular functional composition, aggressive tree shaking, small browser bundles, and the distinction between startup and runtime performance;
- ArkType, TypeBox, and Ajv inform alternative runtime-validation, type-system, JSON-Schema, and compilation strategies;
- Angular Signal Forms inform signal-first field trees, validation state, and submission lifecycle;
- TanStack Form informs framework-agnostic form state and granular subscriptions;
- React Hook Form informs low-boilerplate native-control integration and render minimization;
- Vue and VeeValidate inform composable field binding, controlled values, and typed validation transforms;
- Angular HttpClient informs functional request middleware, request context, typed response flows, and test seams;
- Axios informs configured client instances, per-request overrides, interceptors, and cancellation ergonomics;
- Ky informs a small modern Fetch-based client surface;
- Angular template control-flow blocks inform compiler-level conditional, loop, empty, and switch semantics;
- Analog informs the value of a cohesive framework experience built by orchestrating mature lower-level tools;
- Vitest informs a Vite-aware test experience that reuses rather than duplicates build transforms.

Vii should copy neither names nor syntax automatically. A Vii API or language feature must be justified by Vii's own ergonomics, performance, compatibility, security, accessibility, and maintenance requirements.

## Capability layers

```text
Vii Core
  State / Scope / Resources / Diagnostics
        |
        +--> application contracts
        |      Schema (research)
        |
        +--> application modules
        |      Query
        |      Form
        |      HTTP (research)
        |      Router (future)
        |
        +--> framework adapters
        |      React
        |      Angular
        |      Vue
        |
        +--> native framework research
        |      Component IR
        |      template control flow
        |      renderer
        |      SSR / hydration
        |
        +--> tooling
               Vii CLI
               Vii-specific testing helpers
               Vite / Rolldown adapters
               optional Bun / Rspack adapters
```

The arrows point outward. Tooling, frameworks, application modules, schema providers, and host runtimes must not become hidden dependencies of Core.

## Toolchain strategy

### Development baseline

Current repository development remains based on the existing pnpm, Nx, TypeScript, Vitest, ESLint, Prettier, and packed-artifact validation setup.

### Testing

Vitest remains the canonical repository unit and contract test runner while it continues to meet Vii requirements.

A future `@vii-labs/testing` tool package may add Vii-specific helpers such as:

- State and subscriber assertions;
- Scope and disposal assertions;
- retained-resource and lifecycle checks;
- diagnostic trace matchers;
- adapter compliance utilities;
- Schema boundary and malicious-input fixtures if Schema graduates;
- Form and Query contract fixtures;
- SSR isolation fixtures.

It should use or integrate with mature test runners rather than duplicate their runner, worker, mocking, snapshot, coverage, and watch-mode infrastructure.

Browser and framework behavior should be proven through real consumer fixtures and browser automation when the relevant layers exist.

### Build

The native framework research continues to prefer Vite as the initial development-server and plugin integration surface, with Rolldown as the production bundling direction documented by `BUILD_SYSTEM.md`.

Bun and Rspack remain optional adapters or compatibility targets. No build engine may change Vii runtime semantics.

### Analog-style lesson

The lesson to take from meta-frameworks such as Analog is not to recreate every lower-level tool. The useful pattern is one coherent developer workflow over replaceable engines.

A future application framework may expose:

```bash
vii dev
vii build
vii test
vii check
```

while internally delegating build, test, and browser execution to the selected engines. Users should not need to understand the engine boundary for ordinary work, but advanced users must be able to inspect and configure it.

## Schema direction

Vii Schema is a Research capability for runtime contracts at trust boundaries. It is justified only if Vii can demonstrate meaningful value beyond adopting an existing validator.

The candidate product direction is intentionally narrower than "another Zod":

- small TypeScript-first schema surface;
- non-throwing application-oriented validation result as a baseline;
- explicit validation, coercion, and transformation semantics;
- zero-copy success-path research for validation-only schemas;
- minimal allocation on valid data and lazy error-path materialization;
- structured errors without raw values by default;
- optional compact Schema IR and CSP-safe optimized validation plan;
- one contract reusable across Form, HTTP, Query, server boundaries, config, workers, and AI structured output;
- JSON Schema export for the portable subset;
- reproducible bundle, runtime, allocation, and TypeScript compiler benchmarks.

Schema must remain standalone. It must not depend on State, Form, HTTP, Query, UI frameworks, a server runtime, build tools, or AI.

The research must compare building Vii Schema against first-party adapters for mature validators. If integration provides the same practical value with lower maintenance cost, Vii should integrate rather than build.

See `../architecture/SCHEMA_ARCHITECTURE.md` and `../quality/SCHEMA_BENCHMARK_PLAN.md`.

## Form direction

Vii Form is a strong ecosystem candidate because it can reuse State, Scope, diagnostics, framework adapters, and future Devtools directly.

The target is a small, headless, framework-agnostic form engine with:

- typed field trees;
- granular field state;
- explicit dirty, touched, pending, valid, and error state;
- sync and async validation;
- cancellation of stale async work;
- schema adapters without a mandatory schema dependency;
- optional first-party Vii Schema integration only if Schema graduates;
- nested objects and arrays;
- controlled parsing and output transforms;
- submission lifecycle;
- server-field errors;
- accessible framework bindings;
- diagnostics and performance evidence.

See `../architecture/FORM_ARCHITECTURE.md`.

## HTTP direction

Vii HTTP is a Research capability, not a replacement for Vii Query or a validator.

The separation is:

```text
Vii Query
  cache / freshness / invalidation / dedupe / optimistic state
        |
        v
Vii HTTP
  request / response / middleware / timeout / cancellation / decoding
        |
        +--> optional Schema/user validator at trust boundaries
        |
        v
Fetch-compatible transport
```

Vii HTTP should be Fetch-first, small, runtime-portable, and explicit about retries and side effects. Query must be able to use Vii HTTP, native Fetch, or a user-provided transport. Runtime validation must remain optional and provider-neutral even if Vii Schema later graduates.

See `../architecture/HTTP_CLIENT.md`.

## Native template control flow

A future Vii template compiler should support first-class control-flow semantics for conditional rendering, repetition, empty states, and branch selection.

The compiler should own the semantic IR, dependency tracking, keyed list identity, Scope ownership, and diagnostics. The exact source syntax remains Research and requires comparison prototypes before an RFC freezes it.

See `../architecture/COMPONENT_MODEL.md`.

## Adoption criteria for a new Vii capability

Before a new module moves from Research to Planned, it must answer:

1. What repeated developer problem does this solve?
2. Why does integration with Vii State, Scope, diagnostics, application boundaries, or adapters create a meaningful advantage?
3. Is there a real application or package consumer?
4. Can an existing mature library solve the need without losing important Vii semantics?
5. What is the smallest public contract?
6. What is the bundle, memory, execution, and type-check budget?
7. What lifecycle and cancellation behavior is required?
8. What compatibility matrix is promised?
9. What security, privacy, and accessibility boundaries apply?
10. What test and benchmark evidence is required?
11. What maintenance burden does Vii accept?
12. Can the capability remain optional and tree-shakable?

If the answers are weak, keep the work in Research or use an integration instead.

## Stop rules

Stop or defer a capability when:

- it duplicates a mature engine or library without distinct Vii value;
- implementation would delay committed Core and adapter milestones;
- there is no real consumer;
- the public API cannot remain small and explainable;
- security, accessibility, performance, compatibility, or type-system evidence is insufficient;
- the maintenance surface is larger than the validated user benefit;
- the capability forces Vii Core to depend on framework, build, package-manager, network, schema-provider, or UI-specific code.

## Primary references

The research direction should be revalidated against current primary documentation before an API is proposed or accepted:

- Zod: https://zod.dev/
- Zod Mini: https://zod.dev/packages/mini
- Valibot: https://valibot.dev/
- ArkType: https://arktype.io/
- TypeBox: https://github.com/sinclairzx81/typebox
- Ajv: https://ajv.js.org/
- JSON Schema: https://json-schema.org/
- Angular template control flow: https://angular.dev/guide/templates/control-flow
- Angular Signal Forms: https://angular.dev/guide/forms/signals/overview
- Angular HttpClient interceptors: https://angular.dev/guide/http/interceptors
- TanStack Form: https://tanstack.com/form/latest
- React Hook Form: https://react-hook-form.com/
- VeeValidate: https://vee-validate.logaretm.com/
- Axios: https://axios-http.com/docs/intro
- Ky: https://github.com/sindresorhus/ky
- Analog: https://analogjs.org/
- Vite: https://vite.dev/
- Vitest: https://vitest.dev/

These references are research inputs, not Vii dependencies or compatibility promises.
