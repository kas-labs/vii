# Vii Codec and Serialization

Status: Research direction

## Purpose

Vii Codec is a candidate typed conversion layer between trusted application values and external representations such as JSON, URL strings, storage records, worker messages, hydration payloads, and protocol fields.

Schema answers whether unknown data satisfies a runtime contract. Codec answers how a typed value crosses a representation boundary in both directions.

```text
unknown external data
        |
      decode
        v
   application value
        |
      encode
        v
external representation
```

## Scope

Research includes:

- explicit `encode` and `decode` directions;
- optional Schema validation around decoded input;
- built-in candidates for primitives, dates, URL/query values, JSON-safe records, binary metadata, and nullable/optional values;
- composition for objects, arrays, tuples, records, and unions where semantics remain predictable;
- deterministic failure categories;
- no hidden lossy coercion;
- SSR/hydration and storage interoperability;
- compatibility with HTTP, Router, Storage, Query hydration, workers, CLI config, and server contracts;
- JSON-safe and structured-clone-safe subsets where relevant;
- bounded diagnostics that avoid leaking raw values by default.

## Candidate API shape

The exact API is not accepted. A research shape might look like:

```ts
const DateCodec = codec({
  decode(input) {
    // validate and return Date
  },
  encode(value) {
    return value.toISOString();
  },
});
```

The important semantic is bidirectional explicitness, not this syntax.

## Relationship to Schema

Schema and Codec must remain separate:

```text
Schema = is this unknown value valid?
Codec  = how is this value represented across a boundary?
```

A Codec may use Vii Schema or another validator, but Vii Schema must not be mandatory.

## Relationship to other capabilities

- Router may use codecs for path and search params.
- HTTP may use codecs for request/response representations.
- Query may use codecs for hydration/dehydration only when the application opts in.
- Storage may use codecs for persistence formats and migrations.
- Contracts may reference codecs and schemas for boundary definitions.

## Security requirements

Research must cover:

- prototype pollution and unsafe object keys;
- untrusted structured data and recursive depth;
- oversized inputs;
- date/number coercion ambiguity;
- binary and text decoding limits;
- getter/proxy side effects;
- hydration injection boundaries;
- secret leakage in diagnostic errors;
- deterministic behavior across supported runtimes.

## Anti-goals

Vii Codec should not:

- become a general binary serialization format;
- invent a proprietary network protocol;
- silently mutate application values;
- perform network or storage access;
- imply validation when none occurred;
- require State, Query, Form, Router, HTTP, Storage, or UI frameworks.

## Evidence required before graduation

- at least one real consumer crossing two different representation boundaries;
- comparison with direct JSON/URL/platform APIs and mature codec libraries where relevant;
- allocation, runtime, bundle, and TypeScript cost measurements;
- round-trip tests for lossless cases;
- explicit tests for intentionally lossy transformations;
- malicious and pathological input fixtures;
- server/browser/worker compatibility evidence for any claimed tier.
