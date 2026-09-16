# Vanilla JavaScript and TypeScript Consumer Compatibility

## Status

This document defines the canonical Vii meaning of **Vanilla** and the compatibility policy for framework-neutral public packages.

## Definition

In Vii, **Vanilla means using Vii without a UI or application framework**. It does not mean TypeScript-only.

For a framework-neutral browser/runtime package, Vanilla consumers are:

- **Vanilla JavaScript**: ordinary ECMAScript consumer code with no TypeScript requirement;
- **Vanilla TypeScript**: the same runtime API with declarations, inference, static checking, and editor tooling.

JavaScript and TypeScript must consume the same Vii runtime implementation. TypeScript must not unlock a separate implementation or a different semantic contract.

```text
Canonical Vii runtime behavior
        |
        +-- Vanilla
        |    +-- JavaScript
        |    +-- TypeScript
        |
        +-- React adapter, where provided
        +-- Angular adapter, where provided
        +-- Vue adapter, where provided
        +-- other explicit adapters
```

Separate language packages such as `@vii-labs/<module>/javascript` and `@vii-labs/<module>/typescript` are not the default architecture. A package should expose one runtime contract and appropriate TypeScript declarations unless evidence requires another boundary.

## Architectural rule

Framework-neutral Vii capabilities should be designed in this direction:

```text
canonical core/runtime
        -> Vanilla JavaScript / Vanilla TypeScript
        -> optional framework adapters
```

They should not begin as framework-owned domain implementations that are later extracted into a core.

Framework adapters translate canonical Vii contracts into framework-native ergonomics. They must not redefine canonical domain behavior.

This policy applies where technically meaningful to framework-neutral capabilities such as State, Scope, Form, Query, HTTP, Flow, and reusable browser/runtime behavior primitives. It does not require a Vanilla API for packages whose purpose is inherently framework-specific.

## Compatibility levels

Documentation and release claims must distinguish these states:

- **implemented**: a runtime/API path exists;
- **verified**: an appropriate consumer fixture or compatibility gate exercises it;
- **documented**: supported usage is described using current public APIs;
- **planned**: the capability is intended but is not yet implementation evidence.

TypeScript compilation alone is not evidence that an ordinary JavaScript consumer works.

## Consumer verification

Where a framework-neutral package claims first-class Vanilla support, verification should include, where practical:

### JavaScript consumer

- real `.js` application source;
- no TypeScript syntax in consumer source;
- imports through public package exports;
- runtime execution or a representative production build;
- no reliance on private/internal paths;
- no accidental runtime dependency on type-only modules.

### TypeScript consumer

- real `.ts` application source;
- strict type checking where compatible with package policy;
- imports through public package exports;
- inference and exported declarations exercised;
- no reliance on private/internal paths.

Package verification should also consider ESM resolution, declarations, browser/runtime compatibility, packed artifacts, and package export maps.

## Vii Form

Vii Form is a framework-agnostic headless capability. Its canonical form semantics belong to Form Core. React, Angular, Vue, and Vanilla DOM integrations adapt those semantics rather than own them.

The intended consumer model is:

```text
Vii Form Core
    +-- Vanilla JavaScript
    +-- Vanilla TypeScript
    +-- Vanilla DOM integration
    +-- React adapter
    +-- Angular adapter
    +-- Vue adapter
```

The existing Form research explicitly includes `React / Angular / Vue / Vanilla / Vii Native` at the application/UI boundary and treats framework adapters as thin translations over Form behavior. This document clarifies that the Vanilla branch itself includes both JavaScript and TypeScript consumers.

Form behavior such as field identity, parsing, validation, issue lifecycle, cancellation, submission, reset/reinitialization, and canonical state belongs to Form Core. A framework adapter must not create an alternative version of those semantics.

### JavaScript usage

JavaScript consumers should use the actual public Form exports without TypeScript syntax. Exact executable examples must be maintained against the current public package surface and packed artifacts. Documentation must not invent an API merely to demonstrate JavaScript compatibility.

### TypeScript usage

TypeScript consumers use the same runtime exports and gain declarations, inference, strict checking, and editor tooling. Examples should prefer inference when the public API can infer the value type rather than adding unnecessary explicit generics.

## Future package checklist

Before claiming Vanilla support for a new framework-neutral public package, answer:

1. Can an ordinary JavaScript consumer import and execute the public runtime API?
2. Can a strict TypeScript consumer import the same runtime API and use its declarations/inference?
3. Are both consumers using public exports rather than repository internals?
4. Are runtime semantics identical across JS and TS?
5. Are framework adapters thin translations over the canonical behavior?
6. Is support implemented, verified, documented, or only planned?
7. If Vanilla support is not meaningful for this package, is that exception explicit?

## Non-goals

This policy does not:

- require separate JavaScript and TypeScript runtimes;
- require separate language packages;
- require every framework-specific adapter to have a Vanilla equivalent;
- introduce RxJS or Vii Flow into unrelated packages;
- authorize new public packages or release changes;
- replace package-specific compatibility evidence.

## Relationship to future work

New framework-neutral Vii development must consider Vanilla JavaScript and Vanilla TypeScript at design time rather than treating JavaScript compatibility as an afterthought. Package-specific roadmaps may require stronger gates, but they should not weaken this baseline without a documented architecture decision.
