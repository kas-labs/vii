# Vii Schema Architecture

Status: Research

## Purpose

Vii Schema is a proposed small, TypeScript-first runtime data-contract layer for validating unknown data at application boundaries.

The goal is not to recreate Zod, Valibot, ArkType, TypeBox, Ajv, Effect Schema, Superstruct, or another general-purpose schema ecosystem under a Vii name. The goal is to determine whether Vii can provide a smaller and more application-oriented contract that composes naturally with Vii Form, HTTP, Query, diagnostics, server boundaries, CLI inputs, configuration, and AI structured data.

No package, API, performance claim, compatibility promise, or release commitment exists until this research graduates through normal Vii governance.

## Product thesis

Runtime validation solves a problem TypeScript alone cannot solve:

```text
network / form / storage / URL / config / AI / plugin input
                         |
                         v
                      unknown
                         |
                         v
                     Schema
                         |
                         v
                 trusted typed data
```

A Vii-specific schema capability is justified only if it can create meaningful ecosystem value beyond importing an existing validator.

The strongest candidate value is one runtime contract shared across application boundaries:

```text
                     Vii Schema
                  /      |       \
                 /       |        \
             Vii Form  Vii HTTP  server boundaries
                 \       |        /
                  \      |       /
                    Vii Query
                        |
                   Diagnostics
```

Schema must remain independently usable. It must not depend on State, Form, HTTP, Query, a UI framework, a build tool, a server runtime, or AI.

## Design goals

Research should optimize for these properties, in this order:

1. Correct runtime validation of unknown data.
2. Strong TypeScript inference without pathological compiler cost.
3. Small and understandable public API.
4. Predictable success-path performance with minimal allocation.
5. Tree-shakable and dependency-free core where practical.
6. Explicit separation between validation, coercion, and transformation.
7. Structured errors suitable for forms and diagnostics.
8. Safe operation in browser, server, edge, worker, and SSR contexts.
9. Optional interoperability with JSON Schema and OpenAPI-oriented tooling.
10. Clean integration boundaries for Form, HTTP, Query, server contracts, and AI structured output.

Performance, bundle-size, and compiler-speed claims must be measured rather than assumed.

## Non-goals

The first research slice should not attempt to:

- mirror every TypeScript type-system construct;
- provide API compatibility with Zod or another schema library;
- become a JSON Schema implementation engine;
- generate executable code from untrusted schemas;
- use `eval` or `new Function` by default;
- make validation automatically reactive;
- couple schemas to Vii State;
- perform network requests, telemetry, persistence, or hidden side effects;
- expose raw invalid values through diagnostics by default;
- replace OpenAPI, JSON Schema, protobuf, or database-schema systems;
- promise the fastest validator before independent reproducible evidence exists.

## Candidate package boundary

If research graduates, the candidate package is:

```text
@vii-labs/schema
```

Potential optional entry points may be evaluated only after measured bundle evidence:

```text
@vii-labs/schema
@vii-labs/schema/mini
@vii-labs/schema/json-schema
```

Multiple entry points must not be created merely for branding. They require meaningful tree-shaking, compatibility, or dependency-boundary value.

## Candidate authoring model

The ergonomic research baseline is a concise chainable authoring style:

```ts
import { schema as v } from "@vii-labs/schema";

const User = v.object({
  id: v.string(),
  name: v.string().min(2),
  age: v.number().int().min(18),
  email: v.email(),
});
```

This is illustrative only. Syntax is not accepted API.

A functional form should also be benchmarked because it may tree-shake better:

```ts
const User = object({
  id: string(),
  name: pipe(string(), minLength(2)),
});
```

Research must compare ergonomics, autocomplete, generated bundle cost, creation cost, and type-check cost before choosing an API style.

## Candidate result model

The primary application-oriented operation should be non-throwing:

```ts
const result = User.check(input);

if (result.ok) {
  result.value;
} else {
  result.issues;
}
```

A throwing convenience API may exist:

```ts
const user = User.parse(input);
```

The research question is whether `check()` should be the conceptual primitive and `parse()` a convenience wrapper.

The result model should support discriminated narrowing without requiring exception control flow.

## Validation, parsing, coercion, and transformation

These behaviors must remain explicit.

### Validation

Validation checks whether an input already satisfies a contract.

```text
unknown -> valid or invalid
```

For schemas that perform validation only, the preferred research target is a zero-copy success path:

```text
result.value === input
```

This avoids cloning valid object graphs when no transformation is required.

### Parsing and transformation

Parsing may create new output when transformations are requested.

```text
string -> trim -> lowercase -> branded output
```

A schema with transforms must not pretend to be zero-copy.

### Coercion

Coercion changes representation and should be opt-in and visible:

```text
"42" -> 42
```

Implicit coercion should not occur merely because the output type is numeric.

## Initial research surface

The first prototype should remain intentionally small.

### Primitives

- string;
- number;
- boolean;
- bigint if runtime compatibility remains clean;
- literal;
- null;
- undefined;
- unknown;
- never where useful for composition.

### Structures

- object;
- array;
- tuple;
- record;
- union;
- discriminated union if it produces a clear performance and DX benefit.

### Modifiers

- optional;
- nullable;
- default only if its transform semantics remain explicit.

### Common checks

- length, minLength, maxLength;
- min, max, integer, finite;
- regex;
- email;
- URL;
- custom predicate/refinement.

### Deferred until evidence

- intersection;
- recursive/lazy schemas;
- Map and Set;
- Date-specific semantics;
- branded/opaque types;
- codecs;
- asynchronous validation;
- metadata registries;
- extensive format catalogues;
- bidirectional JSON Schema import;
- compiler-generated validator code.

Deferring a feature is preferred to expanding the public surface without a real consumer.

## Performance architecture

### Success-path priority

Valid input is expected to be the common hot path. The implementation should investigate a fast path that avoids allocating:

- issue arrays;
- path arrays;
- validation context objects;
- intermediate wrappers;
- cloned object graphs;
- formatted error strings.

Error detail may be materialized only after a failure occurs.

### Lazy issue paths

Nested paths such as:

```text
users[25].address.street
```

should not require constructing a new array/string at every successful field check.

Research should compare parent-linked compact path nodes, stack-local traversal state, and direct materialization strategies.

### Schema representation

The prototype should test whether schemas can be represented as a compact immutable instruction tree or validation IR.

Possible internal flow:

```text
authoring API
     |
     v
 Schema IR
     |
     +--> direct interpreter
     |
     +--> optional optimized validation plan
```

The public schema contract must not expose internal IR prematurely.

### Compiled validation plan

An optional `compile()` concept may be researched for repeated validation of hot schemas:

```ts
const validateUser = User.compile();
```

The first compiled-plan research should remain CSP-safe and avoid dynamic source generation. A specialized interpreter or precomputed instruction plan should be evaluated before any code-generation mechanism.

If code generation is ever researched, it requires a separate security decision and must never compile untrusted runtime schema input.

## Type-system performance

Runtime speed is insufficient if common schema composition causes slow editor feedback or excessive TypeScript instantiation.

Research must measure:

- declaration-generation cost;
- `tsc --noEmit` wall time;
- editor-relevant deep generic composition cases;
- inferred input/output types;
- unions and nested objects;
- extend/pick/omit-style composition if those APIs are introduced.

Type-level implementation should prefer simple compositional inference over clever but expensive conditional-type machinery.

## Error model

Errors should be structured first and formatted second.

Candidate issue shape:

```ts
interface SchemaIssue {
  readonly code: string;
  readonly path: readonly (string | number)[];
  readonly expected?: string;
  readonly message?: string;
}
```

The final shape remains Research.

The core error contract should enable:

- Form field error mapping;
- HTTP response-contract failure reporting;
- machine-readable diagnostics;
- localization outside the validation hot path;
- deterministic tests.

Raw received values should not be included by default.

## Diagnostics integration

Schema must work without Vii Diagnostics.

When diagnostics are explicitly provided by a host integration, failures may emit structured metadata such as:

```text
schema.validation.failed
surface: http-response
path: users[].age
code: type.number
```

Production-safe diagnostics must avoid recording request/response bodies, form values, credentials, tokens, secrets, or arbitrary user content.

Diagnostics must remain observational. They cannot change validation outcomes.

## Vii Form integration

Vii Form should continue to support schema adapters rather than requiring Vii Schema.

If Vii Schema graduates, it may become the first-party optimized adapter:

```ts
createForm({ schema: RegistrationSchema });
```

Potential integration value includes:

- inferred field value types;
- structured field issues;
- partial field/subtree validation;
- explicit parsing/coercion at form boundaries;
- shared client/server contract reuse.

Reactive validation belongs to Form/State integration, not the standalone Schema core.

## Vii HTTP integration

Vii HTTP generics must not pretend to validate network data.

A first-party schema contract could provide:

```ts
http.get("/users/42", {
  response: UserSchema,
});
```

Conceptual flow:

```text
HTTP bytes
  -> decoded unknown JSON
  -> Schema check/parse
  -> typed response
  -> Query/application
```

Response validation should be opt-in, cancellable at the HTTP layer where appropriate, and produce a stable transport/schema failure boundary.

## Vii Query integration

Query should not own schema semantics.

It may consume validated values produced by HTTP or a user query function. Direct schema support is optional convenience only if it does not duplicate HTTP behavior.

## Server and shared-contract integration

Vii Schema should be usable in server runtimes without depending on Vii Server.

Potential uses include:

- route parameters;
- query parameters;
- request bodies;
- environment/config boundaries;
- worker messages;
- plugin contracts;
- server-function input/output when those layers exist.

Authorization remains separate from validation. A valid input is not automatically authorized input.

## JSON Schema and OpenAPI interoperability

JSON Schema is a valuable interchange format, but Vii Schema should not force its runtime representation to be JSON Schema.

Research should prioritize one-way export for the compatible subset:

```ts
User.toJSONSchema();
```

or an optional adapter package/function.

Unsupported semantics such as arbitrary transforms must fail explicitly or be represented as non-portable metadata, never silently weakened.

Bidirectional JSON Schema import is deferred until a real consumer demonstrates value.

## AI structured-data integration

Schema can be useful for AI tool arguments and structured model output because model-generated data is untrusted runtime input.

Potential flow:

```text
model output
   -> unknown
   -> Schema
   -> trusted application data
```

AI support must remain an integration, not a Schema dependency. Schema must not call providers, send data, or require AI.

JSON Schema export may be reused by provider adapters where supported.

## Security requirements

Schema processes attacker-controlled input by design. Security review is mandatory before graduation.

Research and implementation must consider:

- prototype pollution and unsafe object-key handling;
- getters/proxies and side effects during property access;
- catastrophic or user-supplied regular expressions;
- recursion depth and stack exhaustion;
- extremely deep or wide objects;
- cyclic data structures where supported;
- denial-of-service through unions and pathological schemas;
- unsafe transforms/refinements;
- error messages that leak secret values;
- dynamic code generation and CSP if compilation is researched;
- deserializing or executing schema definitions from untrusted data.

The default core must never execute strings as code.

## Compatibility targets

No runtime tier is promised yet.

Research should test at least:

- current supported Node baseline;
- modern browsers;
- worker/edge-compatible environment;
- Bun and Deno only when Vii's compatibility policy claims them.

The core should avoid Node-only APIs.

## Benchmark competitors

The benchmark plan should include current representative approaches rather than a single Zod comparison:

- Zod 4;
- Zod Mini;
- Valibot;
- ArkType;
- TypeBox with its supported validation path;
- Ajv for JSON-Schema-oriented compiled validation where the comparison is semantically fair;
- at least one simple handwritten validator baseline.

Effect Schema or other libraries may be added when they represent a relevant use case.

Competitors must be pinned to exact versions and run in the same environment.

See `../quality/SCHEMA_BENCHMARK_PLAN.md`.

## Graduation criteria

Vii Schema may move from Research to Planned only when all of the following are true:

1. At least one real Vii consumer needs runtime schemas.
2. Existing validators have been tested as integration alternatives.
3. A prototype demonstrates a materially simpler Vii integration or measurable technical advantage.
4. Public API remains small enough to explain without a large compatibility burden.
5. Runtime, bundle, memory/allocation, and TypeScript performance are reproducibly measured.
6. Invalid-input quality and error ergonomics are demonstrated, not optimized away.
7. Security review and malicious fixtures cover the supported input model.
8. JSON Schema interoperability boundaries are documented.
9. Form and HTTP integration remain optional and do not create circular dependencies.
10. There is a clear stop rule if Vii-specific value is insufficient.

## Stop rule

Vii should not build or ship `@vii-labs/schema` if mature existing libraries satisfy Vii Form, HTTP, Query, server, and AI integration requirements without losing meaningful Vii semantics or measured performance.

An official adapter to an existing schema library is a valid outcome of this research.

## Research references

Primary project references to revalidate before implementation include:

- Zod: https://zod.dev/
- Zod Mini: https://zod.dev/packages/mini
- Valibot: https://valibot.dev/
- ArkType: https://arktype.io/
- TypeBox: https://github.com/sinclairzx81/typebox
- Ajv: https://ajv.js.org/
- JSON Schema: https://json-schema.org/
- OpenAPI: https://spec.openapis.org/oas/latest.html

These are research inputs. They are not Vii dependencies, compatibility promises, or copied API contracts.
