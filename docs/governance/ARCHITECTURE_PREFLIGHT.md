# Architecture Preflight Contract

Status: Mandatory repository governance

## Purpose

This contract prevents implementation from being designed from a prompt, memory, generic best practice, or agent preference when Vii already has authoritative architecture and engineering guidance.

Before designing, implementing, refactoring, or materially editing a non-trivial feature, package, adapter, runtime primitive, application surface, CLI behavior, or public API, the agent must restore repository truth and derive the proposed change from the repository's canonical documentation.

This is an enforcement layer over existing documentation. It does not replace or duplicate architecture documents.

## 1. Mandatory source hierarchy

For every non-trivial development task, read the sources that apply before implementation begins:

1. `AGENTS.md` as the repository instruction entrypoint.
2. Current product state and scope: `ROADMAP.md`, `PROJECT_STATE.md`, latest `DUTY_WATCH.md`, and `docs/strategy/PRODUCT_BOUNDARIES.md`.
3. Repository architecture: `docs/architecture/SYSTEM_OVERVIEW.md`, `docs/architecture/ARCHITECTURE_MAP.md`, `docs/architecture/CORE_PRINCIPLES.md`, and `docs/architecture/DOMAIN_DRIVEN_ARCHITECTURE.md`.
4. Engineering constraints: `docs/governance/CODE_QUALITY_STANDARDS.md`, `docs/governance/FEATURE_ACCEPTANCE_GATE.md`, `docs/governance/API_STABILITY.md`, and applicable security/privacy guidance.
5. The architecture document for the affected capability, package, adapter, framework, CLI, build surface, or platform when one exists.
6. Accepted RFCs and ADRs governing the affected behavior or boundary.
7. Existing public APIs, types, tests, fixtures, benchmarks, package metadata, and consumer examples needed to verify repository reality.

Do not mechanically read unrelated documents. The requirement is to identify and read every authoritative source that can constrain the task.

When two sources conflict, do not silently choose one. Apply the repository's documented precedence rules. A narrower accepted RFC or ADR normally overrides general guidance for its scope. If precedence is unclear or the conflict changes architecture, stop and surface the conflict before implementation.

## 2. No invented architecture

Agents must not invent a new architecture, layer, naming convention, domain term, abstraction, package boundary, persistence pattern, event model, framework convention, or file organization when an authoritative repository document already defines the decision.

Generic industry practice is secondary to accepted Vii repository decisions.

Do not introduce a new `service`, `manager`, `helper`, `repository`, `factory`, `aggregate`, `event`, `adapter`, `port`, or similar abstraction because a pattern commonly recommends it. It needs a concrete responsibility, consumer, invariant, boundary, or accepted architectural reason.

When repository guidance does not answer a material design question, mark it as an unresolved decision. Use the required discovery/RFC/ADR workflow rather than silently filling the gap from model preference.

## 3. Ubiquitous language and naming

Use the terminology owned by the affected bounded context and defined by existing code, public APIs, architecture documents, RFCs, ADRs, and domain guidance.

The same concept must use the same term across implementation, types, tests, documentation, diagnostics, issues, and public APIs unless an explicit boundary translation requires another representation.

Before creating a new public or durable domain term:

- search the repository for the concept and synonyms;
- identify the bounded context that owns it;
- reuse the canonical term when one exists;
- document a genuinely new term in the relevant durable architecture/domain source when it affects shared language;
- avoid generic names such as `manager`, `helper`, `common`, `processData`, or `handleThing` when a domain verb or noun is available.

## 4. Architecture Preflight output

Before implementation, every non-trivial task must record a concise Architecture Preflight in the task plan, working notes, or agent response. It must contain enough evidence for a reviewer to see where the design came from.

Use this structure, omitting only fields that are genuinely not applicable:

```text
Architecture Preflight

Task: <short description>
Bounded context / owner: <context or package>
Canonical architecture sources:
- <path>
- <path>
Relevant RFC / ADR: <path, none, or required>
Ubiquitous language: <canonical terms used by the change>
Dependency direction: <source -> target boundaries>
Public API impact: <none / compatible / breaking / unresolved>
Security / trust boundary: <inputs, capabilities, secrets, external effects, or none>
Lifecycle concerns: <allocation, cancellation, disposal, concurrency, or none>
File-size budget: <=250 preferred; review >300; >400 requires approved exception
Function-size budget: <=40 preferred; >80 requires approved exception
Required verification: <tests, fixtures, benchmarks, package checks, CI>
Unresolved architecture decisions: <none or explicit list>
```

A preflight is not evidence merely because fields were filled in. Every claim must agree with current repository sources.

## 5. Design and implementation gate

Implementation may start only when:

- the bounded context or owning capability is identified;
- canonical terminology is known;
- dependency direction is understood;
- relevant package/framework/platform architecture has been checked;
- public API and compatibility impact has been classified;
- security/trust and lifecycle boundaries have been considered where applicable;
- code-size constraints and decomposition needs are known;
- required verification is defined;
- any architecture-changing uncertainty has either been resolved through accepted governance or explicitly stops implementation.

If these conditions cannot be satisfied, the correct action is to stop and resolve the missing architecture decision, not to guess.

## 6. Code size and decomposition

The canonical limits remain in `docs/governance/CODE_QUALITY_STANDARDS.md` and `AGENTS.md`. The preflight must apply them before code is written:

- prefer hand-written production files at or below 250 formatted lines;
- begin refactoring review above 300 lines;
- do not create or substantially expand a production file beyond 400 lines without a documented approved exception;
- prefer functions at or below 40 lines;
- do not exceed 80 lines for a function without an approved exception.

Do not satisfy these limits by compressing code or moving unrelated behavior into generic utility modules. Decomposition must follow cohesive responsibilities and architectural ownership.

## 7. Frontend, backend, adapters, and platform edges

Do not assume a universal frontend/backend split. Vii is an ecosystem with core runtime packages, product modules, framework adapters, CLI/build tooling, platform integrations, applications, and research surfaces.

For every affected edge:

- stable domain/core semantics stay independent of framework, transport, filesystem, network, storage, provider, and UI details unless the package explicitly exists to own that edge;
- adapters translate lifecycle and integration semantics rather than duplicating canonical rules;
- external data is validated and translated at trust boundaries;
- lower-level packages do not import higher-level product or framework surfaces;
- React, Angular, Vue, Vanilla JS/TS, CLI, Node, browser, build-tool, provider, or persistence-specific decisions follow their relevant architecture documents when present.

## 8. Change discipline

When implementation reveals that canonical documentation is wrong or incomplete, do not work around it silently.

Classify the finding:

- documentation drift: update the authoritative document together with the implementation;
- local design detail: document it near the owning capability when durable;
- architecture decision: use the RFC/ADR process before depending on it;
- new ubiquitous-language term: define it in the owning domain/architecture source;
- conflicting rule: stop and resolve precedence explicitly.

Do not create duplicate governance documents merely to restate existing rules. Prefer one authoritative source and references to it.

## 9. Review gate

Before commit or pull request, compare the complete diff against the Architecture Preflight and answer:

- Does the implementation still use the canonical terminology?
- Did dependency direction remain valid?
- Did a framework/platform/storage/provider concern leak into core semantics?
- Was any abstraction introduced without a concrete need?
- Did files or functions cross the documented size thresholds?
- Did the implementation create a new architecture decision that was not captured?
- Are public API, compatibility, security, lifecycle, and verification claims supported by evidence?
- Were affected durable docs updated if repository truth changed?

If the answer exposes a violation, fix it or stop the PR rather than describing the violation as future cleanup.

## 10. Definition of compliance

A task complies with this contract when a reviewer can trace important design choices from repository authority to the preflight and then to the implementation and verification.

The objective is not more documentation. The objective is that agents and maintainers do not design Vii from memory or from generic patterns when Vii has already made the decision.