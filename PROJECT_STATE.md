# Vii Project State

This document records durable repository state that future maintainers and coding agents should know before changing the project. It is not a changelog and should not duplicate transient task details.

## Current product direction

Vii is a lightweight, observable, AI-ready TypeScript ecosystem developed by Kas Labs. The project follows a small-core strategy and evolves incrementally rather than beginning as a full framework.

Current architectural priorities include:

- framework-agnostic core behavior;
- explicit lifecycle and disposal;
- predictable reactive semantics;
- small bundle and low runtime overhead;
- SSR-safe and tree-shakable packages;
- evidence-backed performance and compatibility claims;
- thin framework adapters;
- first-class diagnostics without hidden telemetry;
- public API stability through RFC/ADR governance;
- ownership of Vii-specific semantics while mature build, test, browser, and package-management engines remain replaceable infrastructure;
- explicit Research tracks for a State/Scope-backed Form module, a Fetch-first HTTP transport separate from Query, native template control-flow semantics, and progressive rendering.

The current implementation includes the State Core surface through P1.9, the initial P2.1 shared
adapter compliance suite, the initial P2.2 React adapter, the initial P2.3 Angular adapter, and the
initial P2.4 Vue adapter: State reads/writes and subscriptions,
re-entrant updates, Computed, Batch, Scope ownership/disposal, bounded opt-in Diagnostics, and a
reproducible local performance baseline suite. These APIs remain experimental.
The Vanilla consumer fixture exercises State, Computed, Batch, and Scope, and the package-validation
script verifies those behaviors after installing the packed Core artifact into a clean temporary
consumer. The baseline suite measures State creation/writes, subscriber fan-out, Computed chains,
batch propagation, subscription disposal, Scope cleanup, and Diagnostics overhead without adding a
runtime dependency or numeric release budget. The adapter suite is private and provisional: it
checks the adapter-facing snapshot, selection, batching, cleanup, disposal, request-isolation,
server-snapshot, and type-inference behaviors against a Core-backed reference adapter while RFC 0005
remains Draft. The private React adapter exposes `useVii` through React's external-store integration,
including selector/equality overloads and server snapshots; it keeps React at the peer boundary and
leaves request-isolated store creation and hydration data to the application. A packed React artifact
is validated in a clean consumer fixture alongside the packed Core artifact.
The private Angular adapter exposes `viiSignal` for injection-context lifecycle ownership and
`createViiSignal` for explicit disposal outside an Angular lifecycle; it preserves Core selection,
equality, and batching semantics and is validated with an Angular 22 clean consumer.
The private Vue adapter exposes `useVii` as a readonly shallow ref tied to the current effect scope
and `createViiRef` for explicit disposal outside a Vue scope; it preserves Core selection, equality,
and batching semantics and is validated with a Vue 3.5 clean consumer.
The private `@vii-labs/cli-core` package now provides read-only root project detection with evidence,
confidence, conflict reporting, package-manager/framework/runtime/workspace/language/rendering
classification, and installed Vii package discovery. Its deterministic mutation operations,
`initProject` and `addState`, use that detector as Analyze and implement the Analyze, Plan, Preview,
Apply, Validate, Report lifecycle. `initProject` can create one root-level `vii.config.ts` with the
detected framework marker; `addState` can create one `src/state.ts` only when `@vii-labs/core` is already
declared and an existing non-symlink `src` directory is present. Both support dry-run, return exact
planned file paths, are idempotent, and block ambiguous detection, local changes, and symlinks.
Neither operation executes configuration, installs dependencies, changes package manifests, reads
secret values, or accesses the network. The terminal `@vii-labs/cli`, package-manager execution, state
generator options, and root-level monorepo selection remain provisional while RFCs 0006 and 0007
are Draft. The read-only `doctorProject` engine operation uses the detector as Analyze and reports
healthy, attention, or blocked findings for detection conflicts, missing Vii Core/framework/Nx
integration, ambiguous rendering, and incomplete safe metadata. It does not execute configuration,
install dependencies, mutate files, or read secrets. The P3.5 engine foundation now wraps `init`,
`add state`, and `doctor` results in a versioned `vii.cli` version-1 envelope; terminal parsing,
streaming, and external schema compatibility remain provisional.
The Core diagnostics collector also exposes an experimental `exportTrace()` snapshot using the
versioned `vii.trace` `0.1` envelope; it preserves the bounded value-free event buffer and dropped
event count without adding file, network, telemetry, or Devtools behavior.
Scope ownership events also preserve optional scope names and parent scope identifiers so exported
traces can inspect the ownership tree without exposing values or granting mutation authority.
Diagnostics collectors may also receive an explicit optional `traceId`, which is copied to events
and trace exports for correlation without automatic async propagation or authorization semantics.
In `production-safe` mode, Core omits that caller-provided correlation identifier and redacts
caller-provided scope names before buffering, sinking, or exporting events; generated identifiers
and structural counts remain available.
The existing private `@vii-labs/cli-core` package now also provides a pure `inspectTrace()` consumer for
in-memory `vii.trace` `0.1` snapshots. It validates the protocol/version and returns only deterministic
event-type counts, total events, dropped-event count, and a structural Scope/resource ownership graph
containing only generated IDs, parent links, lifecycle status, and resource disposal success. Names
and values remain excluded; bounded traces may preserve a disposed node without its creation event.
It does not read files, execute project code, access the network, mutate projects, or make the
terminal `vii inspect` command or diagnostics schema stable.
Structured security diagnostics are accepted as a bounded experimental contract in RFC 0023. The
first implementation slice adds Core's experimental `recordSecurity()` method, a real `addState`
producer for blocked `src` and `src/state.ts` symlink paths, and the existing read-only
`inspectTrace()` consumer. The slice records only `VII-SEC-008` with finite path/blocked metadata;
it adds no enforcement, transport, telemetry, or stable schema. RFC 0004 remains Draft and RFC 0020
remains Proposed. `recordSecurity`, `security.event`, and the `vii.trace` protocol remain
experimental and may change under governance.

The repository is licensed under Apache-2.0. The accepted first public release target is a
Core-only `@vii-labs/core@0.1.0-experimental.2` npm `next` candidate; `@vii` is owned by an
unrelated npm user, while `@vii-labs` is owned by `vitalii.kas`. The candidate remains preparation-only until
the reference consumer, changeset, package metadata, release-security, and explicit publication
approval gates in `docs/governance/EXPERIMENTAL_CORE_RELEASE.md` are satisfied. All packages remain
unpublished until that separate release approval; Core alone is public-configured while adapters and CLI
Core remain private.
The `examples/core-reference` checkout flow is the first real packed-Core reference consumer: it
uses only public State, Computed, and Scope APIs and is copied into a clean temporary project by
package validation, where it installs the packed Core artifact without a workspace alias.
The repository uses Changesets for future public package versioning. The configuration has no publish
script; version application and publication remain separately approved release actions.
The packed Core artifact also carries its Apache-2.0 license, repository and issue links, discovery
keywords, and future public `next` publish configuration; Core is public-configured but remains unpublished.
The pending Core changeset records the `minor` base for `0.1.0-experimental.2`; it must be applied only
through the approved experimental prerelease release process, never as a Stable `0.1.0` publication.
Release-security preparation records the current production dependency audit, a protected
`npm-publish` Environment, and the external npm Trusted Publisher prerequisites. The Environment has one
permitted self-approving maintainer because no independent reviewer is available. Its former exact-tag
bootstrap run for `@vii/core` failed before publication because that scope is not owned by the project;
its token secret was removed. The `.1` direct bootstrap for `@vii-labs/core` also failed before
publication because npm required interactive 2FA. The `.2` staged bootstrap failed because npm does not
allow staging a brand-new package, so the maintainer published `.2` once locally with interactive 2FA.
`@vii-labs/core@0.1.0-experimental.2` now exists on npm with `next` and an accidental `latest` tag.
The npm registry rejected removal of `latest` with E400 after 2FA; because this is the only published
version, no placeholder stable version or unpublish workaround is allowed. Users must install the
experimental channel explicitly with `@next`. The GitHub bootstrap secret and npm bootstrap token are
deleted. OIDC Trusted Publisher is configured for stage-only publishing; future candidates must use it
and must not intentionally update `latest`.

The durable ecosystem research direction now separates capability ownership from tool ownership.
Form research targets a small headless module that reuses Vii State, Scope, diagnostics, and thin
framework adapters. HTTP research targets a small Fetch-first request/response transport and remains
separate from Query cache and server-state semantics. Native template control flow belongs only to
the future compiler/component program: conditionals, keyed repetition, empty states, and switch-like
branches should share one Component IR and lifecycle model, while the exact source syntax remains
unselected until prototypes justify it. Vitest remains the canonical repository test runner while it
meets Vii needs; future Vii testing work should add domain-specific assertions, fixtures, and
compliance utilities instead of recreating a general-purpose runner. Vite/Rolldown remain the first
native build research direction, with Bun and Rspack treated as optional adapters or compatibility
targets rather than Core dependencies.

The durable rendering direction is progressive and CSR-first. A future native Vii application may
remain fully client-rendered without adopting hydration, request-server lifecycle, streaming, edge,
or server-function concepts. Static generation, SSR/hydration, streaming, hybrid route rendering,
and server functions are opt-in layers that require independent evidence. Client, server, shared,
build, and optional edge environments should be explicit and compiler-checkable. Vii SSR is
presentation infrastructure by default and must not require Vii to own an application's domain
backend, database, transactions, queues, or business logic. Rendering complexity should advance only
when measured benefit justifies the additional lifecycle, serialization, testing, memory, and security
cost.

## Repository operating model

- Default branch: `main`.
- Development happens on focused branches using `<type>/<short-kebab-description>`.
- The `dogfood` branch type is reserved for validated repository self-use or integration cycles.
- Conventional Commit subjects are required by project policy.
- Tool/AI attribution such as `Co-Authored-By` and generated-by footers is forbidden in commit and PR text.
- Every non-trivial task begins with the canonical triage preflight in
  `docs/governance/AGENT_TASK_TRIAGE_POLICY.md`, which reports scope, ambiguity, risk, verification,
  unknowns, harness/model role, delegation, skills, approval, context, budget, and stop condition.
- Meaningful tasks must update `DUTY_WATCH.md` with an accurate handoff.
- Durable architecture, package maturity, validation-surface, or roadmap changes must update this document.
- Public API, package, protocol, compatibility, privacy, security, or migration changes follow the RFC/ADR governance rules.

## Quality baseline

The canonical quality baseline is `docs/governance/CODE_QUALITY_STANDARDS.md`.

Key defaults:

- production files target <= 250 formatted lines;
- refactoring review begins above 300 lines;
- new/substantially expanded production files require an exception above 400 lines;
- functions target <= 40 lines and require review/exception above 80 lines;
- behavior changes require tests;
- bug fixes require regression tests when safely expressible;
- core must not depend on framework adapters;
- framework/platform concerns belong at explicit edges;
- bundle, memory lifecycle, SSR safety, tree-shaking, package artifacts, and diagnostics are product-level concerns.

## Validation baseline

The repository root validation command is:

```bash
pnpm validate
```

It currently covers formatting, linting, type checking, tests, builds, and packed-artifact validation.
The focused Core performance command is `pnpm benchmark:core`; it records raw results under
`benchmarks/results/` with methodology in `docs/quality/CORE_PERFORMANCE_BASELINE.md`.
The focused adapter command is `pnpm --filter @vii-labs/adapter-testing test`; the full suite is included
in `pnpm validate`. React adapter checks also include `pnpm --filter @vii-labs/react test` and the packed
React clean-consumer fixture. Angular adapter checks include `pnpm --filter @vii-labs/angular test` and
the packed Angular clean-consumer fixture. Vue adapter checks include `pnpm --filter @vii-labs/vue test`
and the packed Vue clean-consumer fixture. CLI foundation checks include
`pnpm --filter @vii-labs/cli-core test` and the packed CLI Core detection/init/add-state clean-consumer
fixture, which installs packed `@vii-labs/core` and `@vii-labs/cli-core` artifacts together and exercises
read-only doctor reporting, the versioned machine-output envelope, and dry-run, applied, idempotent
unchanged, and blocked local-change mutation paths.

Repository governance CI additionally checks branch naming and forbidden authorship/tool-attribution metadata for pull requests and their commits.
The public repository also runs CodeQL analysis for JavaScript/TypeScript and GitHub Actions workflows,
plus Dependency Review on pull requests. Third-party review apps remain optional external integrations
and are not part of the Vii runtime or repository-required toolchain. GitHub vulnerability alerts are
enabled so the dependency graph can power Dependency Review. Development-only transitive resolutions
pin `axios` to 1.18.0 and `brace-expansion` to 5.0.9 through pnpm overrides; runtime package
dependencies and public Vii APIs are unaffected.

## Source-of-truth documents

Use the following ownership model rather than duplicating rules:

- product direction and entry point: `README.md`, `ROADMAP.md`;
- repository agent/maintainer workflow: `AGENTS.md`;
- contribution/delivery workflow: `CONTRIBUTING.md`;
- durable repository state: `PROJECT_STATE.md`;
- per-task handoff: `DUTY_WATCH.md`;
- code quality and architecture baseline: `docs/governance/CODE_QUALITY_STANDARDS.md`;
- agent task triage and routing preflight: `docs/governance/AGENT_TASK_TRIAGE_POLICY.md`;
- product boundaries: `docs/strategy/PRODUCT_BOUNDARIES.md`;
- ecosystem capability ownership and reuse rule: `docs/strategy/ECOSYSTEM_CAPABILITY_STRATEGY.md`;
- Form research: `docs/architecture/FORM_ARCHITECTURE.md`;
- HTTP transport research: `docs/architecture/HTTP_CLIENT.md`;
- native template control-flow research: `docs/architecture/TEMPLATE_CONTROL_FLOW.md`;
- rendering strategy research: `docs/architecture/RENDERING_STRATEGY.md`;
- API compatibility: `docs/governance/API_STABILITY.md`;
- RFC process: `docs/governance/RFC_PROCESS.md`;
- ADR process: `docs/governance/ADR_PROCESS.md`;
- package lifecycle: `docs/governance/PACKAGE_LIFECYCLE.md`;
- release policy: `docs/governance/RELEASE_POLICY.md`;
- testing: `docs/quality/TEST_STRATEGY.md`.

## Update rule

Update this file only when a change remains important after the current task is forgotten. Put transient status, exact commands, partial work, next steps, and recovery notes in `DUTY_WATCH.md` instead.
