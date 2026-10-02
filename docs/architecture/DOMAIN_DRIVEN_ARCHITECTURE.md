# Vii Domain-Driven Architecture Guidance

Status: Repository architecture guidance

## Purpose

Vii uses Domain-Driven Design as a modeling discipline where it clarifies real product behavior, ownership, terminology, and boundaries. It does not require every package or module to implement the full tactical pattern catalog from Domain-Driven Design literature.

The goal is to preserve a small, understandable, testable architecture while giving maintainers and coding agents one shared language for business and product concepts.

This guidance complements:

- `SYSTEM_OVERVIEW.md`
- `ARCHITECTURE_MAP.md`
- `CORE_PRINCIPLES.md`
- `docs/governance/CODE_QUALITY_STANDARDS.md`
- package-specific architecture documents and accepted RFCs/ADRs

If this document conflicts with an accepted package-specific RFC or ADR, the narrower accepted decision wins.

## 1. Core rule: model the domain, do not decorate the codebase

Use DDD when it improves one or more of these:

- shared language with product or users;
- ownership of rules and invariants;
- separation between independently evolving capabilities;
- protection of stable core semantics from framework, transport, storage, UI, or provider details;
- testability of meaningful behavior;
- clarity around lifecycle, commands, state transitions, and side effects.

Do not add Aggregates, Entities, Value Objects, Repositories, Domain Services, factories, or Domain Events merely to make a folder look like DDD.

A plain function or small module is preferable when it fully expresses the behavior.

## 2. Ubiquitous language

Names in code, tests, documentation, diagnostics, issues, and public APIs should use the same domain terms whenever they describe the same concept.

Prefer names that express intent and product meaning:

```text
createQueryClient
invalidateQuery
disposeScope
registerResource
submitForm
resetField
createStore
```

Avoid translating a clear domain concept into generic technical vocabulary such as:

```text
processData
handleThing
manager
helper
common
executeOperation
service2
```

When a term has multiple possible meanings, define it in the relevant architecture document before making it part of a public API.

A domain term should have one meaning inside its bounded context. The same English word may mean something different in another context, but the boundary must make that difference explicit.

## 3. Bounded contexts in Vii

A bounded context is a semantic ownership boundary, not automatically a package or directory.

Examples of current or planned Vii contexts include:

- State
- Query
- Form
- Flow
- Scope and Resources
- Diagnostics
- CLI and project mutation
- Component and rendering research

Each context owns its vocabulary, invariants, lifecycle, and public contracts.

A package boundary may represent a bounded context when independent versioning, dependency direction, runtime budget, public API, or consumer needs justify it. Do not create a package solely because a conceptual context exists.

Cross-context communication should happen through deliberate contracts. One context must not reach into another context's private implementation.

## 4. Clean Architecture dependency direction

Domain and core behavior depend on stable language-level or Vii foundation contracts, not on delivery mechanisms.

Preferred direction:

```text
UI / framework / CLI / network / filesystem / provider
                    ↓
          adapters / infrastructure
                    ↓
      application orchestration / use cases
                    ↓
          domain and core contracts
                    ↓
       Vii shared foundations where needed
```

For low-level Vii packages, "application" and "domain" may collapse into one small cohesive module. Do not create empty layers.

Forbidden dependency direction includes:

- core or domain code importing React, Angular, Vue, DOM, Node-specific APIs, Vite, Nx, Tauri, providers, or CLI presentation code;
- domain rules depending on transport DTOs or persistence schemas;
- framework adapters reimplementing canonical business/runtime rules;
- lower-level packages importing higher-level product surfaces.

Infrastructure implements or adapts stable contracts. It does not define domain truth.

## 5. Tactical DDD patterns are conditional

### Entity

Use an Entity when identity matters across state changes.

Examples could include a long-lived query entry, resource registration, task record, or other concept whose identity is meaningful beyond its current values.

Do not create an Entity class for immutable configuration data or short-lived function arguments.

### Value Object

Use a Value Object when a concept is defined by its value and has invariants worth centralizing.

Good candidates may include validated keys, ranges, identifiers, policy values, or normalized configuration concepts.

Prefer immutable values and construction that cannot produce an invalid state where practical.

Do not wrap every primitive in a class.

### Aggregate

Use an Aggregate only when a consistency boundary exists and one root must protect invariants for a cluster of related state.

An Aggregate should be justified by atomic business/runtime rules, not by object containment.

Do not model the whole package as one aggregate.

### Repository

Use a Repository only when the domain needs an abstraction for loading or persisting domain state independently of a concrete storage mechanism.

A Repository is not:

- any class that stores objects;
- a wrapper around every API call;
- a generic data-access folder required in each module.

For many Vii runtime packages, a Repository pattern is unnecessary.

### Domain Service

Use a Domain Service for domain behavior that does not naturally belong to one Entity or Value Object.

Prefer a pure function when stateful service identity is unnecessary.

### Domain Event

Use a Domain Event when a completed domain fact must be observed by another part of the system without coupling that observer into the command path.

Events should use past-tense factual language when practical, for example:

```text
QueryInvalidated
ResourceDisposed
FormSubmitted
ScopeClosed
```

Do not introduce an event bus just to avoid direct function calls. Local deterministic orchestration is often clearer.

## 6. Commands, queries, and state transitions

Names should expose intent.

Commands describe requested actions:

```text
invalidateQuery
disposeResource
submitForm
resetField
```

Facts or events describe what happened:

```text
QueryInvalidated
ResourceDisposed
FormSubmitted
```

Read APIs describe requested information:

```text
getSnapshot
getFieldState
isDisposed
```

Avoid generic `execute`, `run`, `process`, or `handle` when a more precise domain verb exists.

State transitions with important invariants should be explicit and testable rather than spread across UI callbacks, framework hooks, or infrastructure adapters.

## 7. Application orchestration versus domain rules

Application orchestration coordinates work such as:

- calling domain/core behavior;
- invoking ports or adapters;
- coordinating cancellation and lifecycle;
- translating results for an external boundary;
- enforcing a use-case sequence.

Domain/core code owns:

- invariants;
- valid state transitions;
- canonical semantics;
- value validation intrinsic to the concept;
- deterministic calculations and rules.

A React hook, Angular service, CLI command, HTTP handler, or persistence adapter must not become the only place where a canonical Vii rule exists.

## 8. Ports and adapters

Introduce a port when a stable domain or application behavior needs an external capability whose implementation may vary.

Examples:

- clock or scheduler;
- storage boundary;
- transport;
- workspace/filesystem mutation;
- diagnostics sink;
- platform capability.

Ports should be narrow and named after the capability the inside needs, not after a vendor.

Prefer:

```text
WorkspaceReader
DiagnosticSink
Clock
Transport
```

over:

```text
NodeFsService
AxiosRepository
VendorManager
```

Adapters translate external semantics into the port contract and contain provider/platform-specific behavior.

## 9. Boundary translation

External shapes are not automatically domain models.

At boundaries, translate and validate as appropriate:

```text
external input / DTO / framework event
              ↓
       validation / mapping
              ↓
       domain or core model
              ↓
       canonical behavior
```

Do not leak unstable provider, HTTP, DOM, framework, persistence, or CLI-specific types into stable public core contracts unless that dependency is intentionally part of the contract.

Validation should happen at the earliest trustworthy boundary. Domain invariants must still remain protected inside the domain/core model.

## 10. Folder structure

Organize primarily by cohesive capability and ownership, not by a mandatory global layer template.

For a sufficiently complex product capability, this may be appropriate:

```text
feature/
├── domain/
├── application/
├── infrastructure/
├── adapters/
└── tests/
```

For a small Vii package, this may be better:

```text
feature/
├── model.ts
├── operations.ts
├── adapter.ts
└── feature.test.ts
```

Both can satisfy DDD and Clean Architecture if terminology, ownership, invariants, and dependency direction are clear.

Never create empty `domain/`, `application/`, or `infrastructure/` directories in anticipation of future complexity.

## 11. Security and safety

Architecture boundaries are also trust boundaries.

For each external boundary, identify:

- whether input is trusted;
- validation and normalization requirements;
- authorization or capability checks where applicable;
- secret or sensitive data handling;
- failure and cancellation semantics;
- logging and diagnostics redaction;
- resource ownership and disposal;
- rollback or recovery behavior for mutations.

Domain/core logic should not rely on UI validation or caller discipline to preserve critical invariants.

Infrastructure failures must not silently corrupt domain state.

## 12. Testing by boundary

Tests should follow meaningful contracts.

Domain/core tests cover:

- invariants;
- state transitions;
- value semantics;
- deterministic behavior;
- error cases.

Application tests cover:

- orchestration;
- cancellation;
- coordination between ports and domain behavior;
- command/use-case outcomes.

Adapter and infrastructure tests cover:

- translation;
- framework lifecycle;
- provider/platform behavior;
- integration failures;
- cleanup and resource ownership.

End-to-end tests prove critical flows across boundaries but do not replace focused domain tests.

## 13. Agent preflight for architecture changes

Before adding or changing a non-trivial capability, maintainers and coding agents must answer:

1. What bounded context owns this concept?
2. What exact domain terms describe it?
3. What invariants or lifecycle rules exist?
4. Is this domain/core behavior, application orchestration, or infrastructure?
5. Which direction should dependencies flow?
6. Does an existing Vii contract already solve the boundary?
7. Is a DDD tactical pattern actually required, or would a function/module be clearer?
8. What external input is untrusted and where is it validated?
9. What focused tests prove the invariants and boundary behavior?
10. Does the change alter public architecture enough to require an RFC or ADR?

If these questions cannot be answered, stop and refine the model before introducing new abstractions.

## 14. Architecture review smell list

Review a change carefully when it introduces:

- generic services or managers with broad responsibility;
- domain rules inside framework components or adapters;
- infrastructure types exported as canonical domain types;
- direct reverse dependencies into UI, framework, transport, filesystem, or provider layers;
- repositories with no persistence abstraction need;
- events with no independent consumer;
- aggregates with no consistency boundary;
- one interface per class without a substitution boundary;
- duplicated vocabulary for the same concept;
- vague vocabulary that hides business or product intent;
- shared modules with no clear owner;
- abstractions created before a real consumer exists.

## 15. Practical standard for Vii

A Vii change follows this guidance when:

- its concepts use precise shared terminology;
- domain or core rules have a clear owner;
- dependencies point inward toward stable contracts;
- framework and platform details stay at explicit edges;
- external data is translated at boundaries;
- important invariants and lifecycle rules are directly testable;
- tactical DDD patterns appear only where they solve a concrete problem;
- the resulting code is simpler to reason about than the alternative.

DDD in Vii is a tool for clarity, not a ceremony.
