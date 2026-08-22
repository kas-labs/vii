# Phase 6: Vii UI Foundation

Status: Research / Planned

Primary architecture:

- `docs/architecture/UI_ARCHITECTURE.md`
- `docs/architecture/DESIGN_TOKENS.md`
- `docs/architecture/REGISTRY_ARCHITECTURE.md`

Governance inputs:

- RFC 0008, UI distribution model, Draft
- RFC 0009, design token system, Draft
- RFC 0010, registry and lockfile, Draft

Phase 6 begins as bounded research. It does not create a supported UI package, registry service, component compiler, CLI command, package-mode contract, or cross-framework compatibility promise until the relevant RFC and evidence gates are satisfied.

## Goal

Prove that Vii can provide a small, accessible, portable UI foundation with application ownership as the default, while keeping framework integrations, package distribution, Custom Elements, styling engines, registry transport, and tooling replaceable.

The intended ownership model is:

```text
UI contracts        = component semantics and accessibility requirements
UI behaviors        = framework-neutral state transitions and interaction intent
DOM capabilities    = focus, inertness, scrolling, portals/layers, measurement
framework targets   = native lifecycle and rendering integration
Design Tokens       = portable visual decisions
Registry            = declarative metadata plus files
CLI                 = explicit, reviewable mutation lifecycle
Application         = owns source-mode files after installation
```

## Phase-wide rules

1. Source ownership is the default research direction, not a requirement for every component.
2. React, Angular, Vue, Vanilla, and Custom Elements are targets, not separate semantic implementations.
3. Shared contracts do not require identical DOM or identical public framework APIs.
4. UI behaviors do not require Vii State, Query, Form, Flow, or HTTP.
5. DOM-specific work such as focus containment, inertness, scroll locking, portals, geometry, and browser events stays behind explicit platform capabilities.
6. Tailwind, Stencil, a token transform library, axe-core, and other tooling are replaceable implementation choices, not Vii architecture contracts.
7. Accessibility is specified and tested per component from the first prototype. Automated audits complement, but do not replace, keyboard, browser, and assistive-technology validation.
8. Security is shift-left. Registry parsing, paths, integrity, generated content, dependency plans, and CLI writes are threat-modeled before mutation code is allowed to rely on them.
9. No numeric bundle, runtime, or memory release budget is adopted before a reproducible baseline exists.
10. Draft RFCs authorize research and discussion only. Stable package/API/protocol commitments require the normal acceptance and evidence gates.

## P6.0: Architecture and evidence map

Purpose: establish the bounded delivery sequence and correct existing assumptions before code prototypes expand.

Deliverables:

- this Phase 6 roadmap;
- architecture review against RFCs 0008, 0009, and 0010;
- current external-standard baseline for DTCG and WAI-ARIA/APG;
- explicit split between framework-neutral behavior and DOM capabilities;
- security-before-mutation ordering;
- evidence and graduation criteria.

Exit criteria:

- no research item is presented as supported production functionality;
- Draft RFC status is preserved;
- no package, runtime API, registry service, or CLI mutation is created by P6.0;
- P6.1 can run as a throwaway prototype without locking future package boundaries.

## P6.1: Design Token format and compiler prototype

Purpose: prove a portable token source and deterministic outputs before components depend on it.

Baseline:

- target the published DTCG 2025.10 format for the prototype;
- keep a compatibility seam because DTCG continues to evolve;
- treat DTCG as a Community Group specification, not a W3C Recommendation.

Research deliverables:

- primitive, semantic, and narrowly justified component token layers;
- light and dark theme fixtures;
- high-contrast / forced-colors research kept distinct from ordinary theme switching;
- DTCG 2025.10 fixtures using spec-compatible typed values and aliases;
- deterministic CSS Custom Properties output;
- deterministic TypeScript output;
- deterministic JSON/tooling output;
- validation for unsupported token types, unresolved aliases, alias cycles, duplicate output names, invalid theme coverage, malformed values, excessive nesting, and non-deterministic generation;
- accessibility checks for explicitly declared foreground/background and non-text contrast relationships.

Accessibility evidence must distinguish WCAG criteria and context. A single generic `AA contrast` boolean is not sufficient.

Exit criteria:

- the same canonical fixture produces byte-stable outputs across repeated runs;
- invalid and cyclic inputs fail deterministically;
- token input is not mutated;
- generated CSS names are collision-safe;
- representative contrast relationships are measured and documented with their exact criterion;
- no Tailwind, Sass, Figma, React Native, package publication, or public compiler API is required for graduation from this slice.

Stop condition:

If the stable DTCG format plus a mature transform tool already satisfies Vii's needs without losing important semantics, prefer a thin Vii validation/configuration layer over a custom general-purpose token compiler.

## P6.2: Accessibility behavior contracts and DOM capability boundary

Purpose: prove that interaction semantics can be shared without pretending browser focus and layout behavior are pure state machines.

Start with two bounded patterns:

1. Disclosure
2. Tabs

Then add Dialog only after the DOM capability seam is explicit.

Framework-neutral behavior may own:

- controlled/uncontrolled state transitions;
- active/selected/expanded state;
- orientation and navigation intent;
- generated structural IDs when ownership is explicit;
- keyboard intent mapping that is independent of a specific framework event object.

DOM integration owns:

- focus movement and restoration;
- tabbable discovery;
- focus containment;
- inert background behavior;
- scroll locking;
- portals/layers;
- pointer and browser event wiring;
- document/window access.

Do not define the shared contract as React-style `props` or framework event handlers.

Evidence:

- deterministic behavior tests;
- browser integration fixtures for DOM-specific semantics;
- WAI-ARIA APG pattern review;
- keyboard testing;
- accessible-name/state assertions;
- at least one manual screen-reader smoke path before claiming a pattern validated.

The APG is implementation guidance and examples, not a substitute for production assistive-technology testing.

Exit criteria:

- Disclosure and Tabs semantics are reusable without framework dependencies;
- Dialog does not fake focus trapping in pure Node;
- disposal removes DOM listeners/resources owned by the integration;
- automated accessibility tooling reports no violations in the bounded fixtures;
- no claim of `100% WAI-ARIA compliance` is made from unit tests alone.

## P6.3: Registry contract and threat-model prototype

Purpose: prove the declarative source-distribution contract before adding a write command.

Research deliverables:

- local fixture manifests only at first;
- explicit manifest version;
- item type, target, mode, file plan, dependencies, token requirements, provenance, and integrity metadata;
- provisional lock-state representation;
- deterministic serialization;
- exact path-containment rules;
- duplicate destination detection;
- prototype-pollution-safe parsing;
- integrity mismatch handling;
- item-size, file-count, and nesting limits for hostile input research;
- explicit trust classification as metadata only, not an authorization bypass.

RFC 0010 remains Draft. The exact final schema, lockfile serialization, remote registry addressing, signatures, and public compatibility guarantee remain open until research evidence supports acceptance.

Exit criteria:

- manifests contain no executable lifecycle hooks;
- untrusted fields cannot mutate object prototypes;
- `..`, absolute paths, symlink escapes, duplicate targets, and root escapes fail closed;
- lock-state serialization is deterministic;
- source detachment semantics are defined without deleting application-owned files.

## P6.4: Source distribution mutation lifecycle

Purpose: prove one local source-install path through the existing CLI Core safety model.

Initial scope:

```text
Resolve local fixture
-> Validate
-> Analyze project
-> Plan
-> Preview / dry-run
-> Apply
-> Validate result
-> Record lock state
-> Report
```

Rules:

- start with local/fixture registry input before remote registry transport;
- dry-run must be byte-for-byte non-mutating;
- all destinations must be root-confined and no-follow/symlink-safe according to repository CLI policy;
- existing local files are never silently overwritten;
- do not add `--force` in the first mutation slice;
- three-way update/merge behavior is a separate follow-up from first-time `add` unless a real fixture requires it;
- dependency installation or lifecycle-script execution is not implicitly authorized by `vii ui add`.

Exit criteria:

- the plan is machine-readable and reviewable;
- repeated apply is deterministic/idempotent where the same original state still exists;
- local modification conflicts fail closed;
- malicious path/integrity fixtures fail before writes;
- packed CLI Core validation proves the mutation from a clean consumer if the command graduates beyond throwaway research.

## P6.5: Cross-framework compliance slice

Purpose: prove one semantic contract across framework-native targets without generating an entire component suite.

Start with the smallest useful vertical examples, such as Button plus one interactive behavior validated in P6.2.

Targets may include:

- React;
- Angular;
- Vue;
- Vanilla;
- Custom Elements when the component is a good Elements candidate.

Rules:

- each target keeps native lifecycle, inputs/props, events, forms, slots/content projection, and typing;
- tests share behavioral/accessibility assertions where semantics overlap;
- target-specific DOM is allowed;
- Custom Elements do not become the universal implementation source;
- generated wrappers are evaluated, not assumed superior to dedicated adapters.

Exit criteria:

- the chosen vertical slice behaves equivalently at the semantic level across the tested targets;
- lifecycle cleanup and SSR/non-browser import safety are tested where applicable;
- framework adapters do not reimplement shared domain behavior unnecessarily;
- no universal cross-framework compiler is introduced.

## P6.6: Distribution modes and security hardening

Purpose: evaluate the remaining source/package/elements trade-offs after real component evidence exists.

Research areas:

- source mode ownership and detachment;
- package-mode package boundaries, tree shaking, peer dependencies, and upgrade behavior;
- Custom Element Shadow DOM vs Light DOM decision per component;
- ElementInternals/form-associated behavior where useful;
- CSP and Trusted Types compatibility;
- styling/cascade behavior and token override boundaries;
- provenance/integrity of registry content;
- dependency-plan safety;
- content and template injection boundaries.

Security is not deferred to this slice. P6.6 is the consolidation review after security fixtures have already gated P6.3 and P6.4.

Exit criteria:

- each retained distribution mode has a demonstrated consumer need;
- no mode is retained solely to fill a compatibility matrix;
- source ownership and exit/detach path remain explicit;
- security findings are resolved or explicitly block graduation.

## P6.7: Performance, accessibility, and graduation gate

Purpose: decide whether Phase 6 research should graduate, reduce scope, reuse mature libraries, or stop.

Measure only after representative prototypes exist:

- per-behavior and per-component bundle impact;
- tree shaking and side-effect behavior;
- framework-wrapper overhead;
- creation/update/disposal lifecycle cost where relevant;
- TypeScript compiler impact;
- source-mode generated output size;
- Custom Element registration/runtime cost where retained.

Accessibility evidence should include:

- automated axe/accessibility-tree checks;
- keyboard contract tests;
- focus lifecycle tests;
- high-contrast / forced-colors checks;
- reduced-motion checks where animation exists;
- RTL checks for directional interactions;
- browser matrix evidence;
- manual assistive-technology smoke tests for interactive primitives before public support claims.

Numeric release budgets are set only after baselines exist and must include methodology and environment.

Graduation options:

A. graduate a bounded Vii UI foundation;
B. graduate tokens/registry/CLI only and reuse mature behavior primitives;
C. graduate behaviors only and defer distribution tooling;
D. use thin adapters around mature libraries;
E. stop the Vii-owned UI implementation if maintenance cost exceeds differentiated value.

## Phase 6 completion criteria

Phase 6 research is complete when the evidence can answer, without marketing assumptions:

- whether Vii should own token transformation or only token validation/configuration;
- which interaction semantics are genuinely reusable across frameworks;
- which DOM behaviors require platform-specific integration;
- whether a declarative registry plus safe CLI mutation provides enough source-ownership value;
- which distribution modes have real consumer evidence;
- whether accessibility can be maintained across the claimed target matrix;
- whether bundle, type, lifecycle, security, and maintenance costs justify a Vii-owned UI layer.

Completion of research does not itself publish packages or stabilize RFCs.
