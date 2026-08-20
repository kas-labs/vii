# Vii Schema Benchmark Plan

Status: Research

## Purpose

This document defines how Vii Schema performance claims must be evaluated. It exists to prevent design decisions from being driven by selective microbenchmarks or unsupported claims such as "faster than Zod".

Vii Schema has no accepted performance claim while this track remains Research.

## Principles

- compare equivalent semantics;
- pin exact library and runtime versions;
- publish benchmark source and fixtures;
- separate creation/startup, runtime validation, bundle, allocation, and TypeScript compiler cost;
- benchmark both valid and invalid data;
- include realistic nested application payloads in addition to primitives;
- include a handwritten validator baseline;
- report distributions and environment details rather than one isolated score;
- do not convert local results into universal performance promises.

## Candidate competitors

The first serious comparison should include, where semantically equivalent:

- Zod 4;
- Zod Mini;
- Valibot;
- ArkType;
- TypeBox;
- Ajv for JSON-Schema-oriented compiled validation;
- handwritten TypeScript/JavaScript validation.

Additional validators may be included when they represent an important architecture or consumer need.

## Benchmark groups

### 1. Schema creation and startup

Measure repeated schema construction independently from validation.

Cases:

- primitive schema;
- login form;
- nested user profile;
- discriminated event union;
- API response containing arrays of nested objects.

Record:

- operations per second;
- wall time;
- heap delta where measurement is reliable;
- module initialization/cold-import cost in controlled environments.

### 2. Valid runtime input

Valid data should be treated as the primary hot path.

Measure:

- primitive string/number checks;
- small object;
- login/registration form object;
- nested object;
- arrays of 10, 100, 1,000, and 10,000 records where practical;
- discriminated unions;
- repeated validation with the same schema.

The Vii prototype must distinguish validation-only zero-copy paths from transforms/coercion.

### 3. Invalid runtime input

Error quality has a cost and must be measured separately.

Cases:

- first property invalid;
- last property invalid;
- multiple invalid fields;
- deep nested failure;
- invalid array member near start/end;
- invalid union branch;
- pathological but bounded input.

Measure both fail-fast and collect-all modes only when competitors expose equivalent behavior.

### 4. Allocation and memory

Where tooling is reliable, record:

- bytes/objects allocated per successful validation;
- bytes/objects allocated per failed validation;
- retained memory after repeated runs;
- impact of issue/path construction;
- cloning versus zero-copy behavior.

Allocation claims require reproducible tooling and methodology.

### 5. Bundle size and tree shaking

Use at least Vite/Rolldown and one additional common bundler when justified.

Fixtures:

- string + email only;
- login form;
- nested object + array;
- representative full application schema set.

Report:

- raw JavaScript bytes;
- gzip bytes;
- brotli bytes where useful;
- transformed module count;
- exact imports used.

Do not compare a full flagship entry point against a competitor's mini entry point without labeling the distinction explicitly.

### 6. TypeScript compiler performance

Measure with pinned TypeScript version:

- `tsc --noEmit` wall time;
- declaration generation when relevant;
- memory where reproducible;
- simple inference;
- nested objects;
- large unions;
- schema composition;
- 100/500/1,000 field synthetic stress cases only as stress evidence, not ordinary application claims.

Track editor-oriented complexity through reproducible type fixtures where possible.

### 7. Integration cost

Raw validator speed is not the only product metric.

Measure representative Vii integrations:

- Form field/subtree validation;
- HTTP response validation;
- Query ingestion of validated data;
- JSON Schema export cost outside application hot paths;
- diagnostics-enabled and diagnostics-disabled validation.

Integration benchmarks must not quietly give Vii Schema advantages unavailable to competitors. Existing-library adapters should be implemented honestly for comparison.

## Representative fixtures

### Login

```ts
{
  email: string,
  password: string
}
```

Checks: non-empty, email, minimum password length.

### User profile

```ts
{
  id: string,
  name: string,
  age: number,
  address: {
    street: string,
    city: string,
    postalCode: string
  },
  roles: string[]
}
```

### Task board API

```ts
{
  tasks: Array<{
    id: string,
    title: string,
    completed: boolean,
    priority: "low" | "normal" | "high"
  }>,
  cursor: string | null
}
```

### Event union

Use a discriminant such as `type` with several object variants and unequal payload shapes.

## Zero-copy proof

For validation-only Vii schemas, a zero-copy claim requires tests demonstrating object identity preservation:

```ts
const result = Schema.check(input);
expect(result.ok && result.value === input).toBe(true);
```

Nested references should also remain identical unless the schema explicitly transforms them.

A benchmark must not call this "zero allocation" unless profiler evidence shows that no relevant allocation occurs.

## Compiled-plan research

If Vii Schema introduces an optional compiled validation plan, report it as a separate mode:

```text
Vii direct
Vii compiled
```

Do not compare Vii compiled mode only against interpreter-style competitors when they also expose a compilation mode.

Any `eval`/`new Function` based competitor mode must be labeled because CSP and security characteristics differ.

The preferred Vii research path is CSP-safe precomputation before dynamic source generation is considered.

## Security stress fixtures

Performance suites should include bounded malicious or adversarial cases without turning benchmarks into unsafe denial-of-service tests:

- deeply nested objects near supported depth limits;
- wide arrays/objects;
- unknown keys such as `__proto__`, `constructor`, and `prototype`;
- cyclic objects if cycles are accepted inputs;
- expensive regex inputs for built-in formats;
- unions with many alternatives.

Security correctness outranks benchmark throughput.

## Environment recording

Every published run must include:

- OS and architecture;
- CPU;
- memory;
- Node/Bun/Deno/browser version as applicable;
- package manager version;
- TypeScript version;
- bundler version;
- exact competitor versions;
- warmup policy;
- iteration count;
- command line;
- git commit SHA.

## Result language

Allowed:

> In fixture X, on environment Y, Vii Schema prototype A validated valid nested payloads N times per second and allocated M according to profiler P.

Not allowed:

> Vii Schema is 5x faster than Zod.

unless a reviewed release decision defines the exact supported comparison scope.

## Graduation evidence

Before Schema moves from Research to Planned, benchmarks should answer at minimum:

1. Does Vii provide a real success-path advantage?
2. Is invalid-input error quality still acceptable?
3. Is bundle size competitive for browser/form usage?
4. Is TypeScript inference cost acceptable for real projects?
5. Does a compiled plan improve repeated validation enough to justify complexity?
6. Is the integration benefit over using Zod/Valibot/another adapter meaningful?
7. Which proposed optimizations should be removed because they do not produce measurable value?
