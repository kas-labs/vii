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

Form research track F0–F10 is complete and accepted via PR #166. Production Form Phase 1 baseline
architecture and package contract were accepted in Slice P1a (PR #167). Slice P1b established the
production `@vii-labs/form` package skeleton (`packages/form/`), multi-adapter subpath distribution
(`@vii-labs/form`, `/react`, `/vanilla`, `/angular`, `/vue`), TypeScript build configuration, linting,
package-boundary tests, tarball validation, and clean consumer validation. Slice P1c implements the
first production runtime primitive: unparsed `createField<TValue>`, providing fine-grained reactive
`value`, `rawValue` (enforcing invariant `Raw === Value === TValue`), baseline-relative `dirty`
tracking, independent `touched` state, batched `reset()`, and deterministic `@vii-labs/core` `Scope`
lifecycle integration. The package remains private (`private: true`). Tree/groups, arrays,
validation, parsers, submission, server issue routing, and framework adapters are deferred to
subsequent slices P1d–P1j. `@vii-labs/form` declares `@vii-labs/core` as a required runtime peer
(`>=0.1.0-experimental.2`), `@standard-schema/spec` as a type-consumed dependency, and `react`,
`@angular/core`, and `vue` as optional peer dependencies. It has zero runtime dependency on
`research/form/` and makes zero modifications to `@vii-labs/core`.

The repository is licensed under Apache-2.0. The accepted first public release target is a
Core-only `@vii-labs/core@0.1.0-experimental.2` npm `next` candidate; `@vii` is owned by an
unrelated npm user, while `@vii-labs` is owned by `vitalii.kas`. The candidate remains preparation-only until
the reference consumer, changeset, package metadata, release-security, and explicit publication
approval gates in `docs/governance/EXPERIMENTAL_CORE_RELEASE.md` are satisfied. All packages remain
unpublished until that separate release approval; Core alone is public-configured while adapters, CLI
Core, and Form remain private.
The `examples/core-reference` checkout flow is the first real packed-Core reference consumer: it
uses only public State, Computed, and Scope APIs and is copied into a clean temporary project by
package validation, where it installs the packed Core artifact without a workspace alias.
An external Vite React reference consumer has now provided the first Phase 4 dogfood evidence for
the packed Core and React artifacts. Its store is isolated in a dedicated module and its Vitest
contract covers Computed filtering, atomic Batch notifications, and Scope disposal; the consumer
also passes the TypeScript/Vite production build. This is validation evidence rather than a
repository fixture, so the broader Phase 4 work remains open for additional applications, lifecycle,
bundle/type-check budgets, deployment threat-model review, and other real-world checks.
That React consumer has now also been validated from a clean disposable copy with registry
`@vii-labs/core@next` resolved to `0.1.0-experimental.2` and the packed experimental
`@vii-labs/react@0.0.0` adapter. Its three board contract tests, TypeScript check, lint, production
build, and browser task-board smoke all passed: filter changes, task creation, completion toggling,
Computed counters, and Batch-backed Clear completed behaved as expected with zero browser-console
errors. The local build measured 197.19 kB raw JavaScript / 62.41 kB gzip and is consumer evidence,
not a universal React or bundle budget claim.
That packed React consumer has also passed a bounded threat-model review: a static boundary scan found
no raw HTML sinks, dynamic code execution, network, storage, cookie, or telemetry APIs; a production
dependency audit reported no known vulnerabilities; and a malicious task title rendered as text with
zero image nodes, no XSS marker execution, zero console errors, and no non-local browser requests.
The reference deployment does not configure CSP or Trusted Types headers, so this remains consumer
evidence with an explicit deployment-hardening follow-up, not a penetration test or security
certification.
The clean packed React and Vanilla consumer copies now have a same-environment application baseline
using Node `v26.3.1`, pnpm `10.12.4`, Vite `8.2.1`, and `/usr/bin/time -p`. React typecheck wall time
was 1.34 s and build wall time 4.21 s; Vanilla typecheck was 3.35 s and build wall time 3.90 s.
React emitted 28 modules with 197.19 kB raw / 62.41 kB gzip JavaScript and 1.78 kB raw / 0.81 kB
gzip CSS; Vanilla emitted 19 modules with 11.76 kB raw / 4.42 kB gzip JavaScript and 3.32 kB raw /
1.23 kB gzip CSS. These are per-consumer reproducibility baselines, not equivalent cross-framework
performance comparisons, numeric release budgets, or production memory claims.
The current Phase 4 gate audit marks the two packed real consumers, lifecycle cleanup evidence,
reproducible bundle/type-check baselines, bounded privacy/security fixtures, browser heap/post-disposal
retention baseline, browser CSP and Trusted Types enforcement baseline, numeric release budgets,
and documentation-backed compatibility checks as evidenced for their stated scopes. Internal Phase 4
dogfood is therefore complete for this bounded evidence set; it is not an external alpha, support
commitment, or universal compatibility/performance/security claim. External alpha testing remains a
separate open gate. These gaps do not block the framework-agnostic Core or require speculative API
expansion; each needs a separately approved validation or release decision.
The second external Phase 4 consumer is a Vii-native Vanilla DOM onboarding application named
`vii-reference-vanilla-onboarding`. It uses only the packed Core artifact at the application boundary,
keeps form domain data separate from UI state, and exercises Computed validation, Batch step changes,
Scope-preserving reset, and teardown disposal. Its store has five passing Vitest tests, and the user
confirmed the integrated Vanilla DOM browser smoke check is functional. This is still external dogfood
evidence rather than a native Vii renderer or application-framework implementation.
The same Vanilla consumer now has an application-level baseline: six Vitest tests pass, including
100 repeated form-instance Scope disposal checks; the reported `tsc --noEmit` wall time is 0.98 s and
the reported production build wall time is 1.23 s. The Vite 8.2.1 output reports 16 transformed
modules, 11,184 raw JavaScript bytes and 4,005 gzip bytes for the JavaScript asset, plus 1.59 kB raw
and 0.77 kB gzip for the CSS asset. These are local reproducibility measurements, not release budgets
or universal performance claims.
The Vanilla consumer's DOM boundary has also passed a bounded security and accessibility review:
the shared HTML escaping helper has two passing malicious-input tests, and the consumer build reports
17 transformed modules with 11.64 kB raw JavaScript/4.19 kB gzip and 1.74 kB raw CSS/0.81 kB gzip.
The user confirmed keyboard navigation, accessible error associations, escaped payload rendering, no
script/image execution, and no reported browser-console errors. This is a bounded consumer review,
not a penetration test or a universal accessibility certification.
The same consumer now exposes a development-only `mountOnboarding(root)` lifecycle seam backed by an
idempotent dispose function. A browser probe repeatedly mounted and disposed the onboarding UI in one
process, verified an empty host after each cycle, and completed a 1,000-cycle run without reported
errors. The probe is development-only and is not a native Vii renderer or a production memory budget.
The external onboarding consumer's form API was then simplified so its application boundary exposes
form state, visible errors, user actions, and idempotent disposal without leaking the internal Scope,
touched map, or unused validation Computed values. The simplified consumer passed eight Vitest tests,
the TypeScript check, the Vite production build, the dev server smoke check, and the 100-cycle browser
lifecycle probe. This is consumer evidence and does not change Vii's public Core API.
The same external Vanilla consumer now mounts a Vii-native Diagnostics playground as its active demo.
The playground uses development diagnostics with maxEvents: 100 and traceId:
"diagnostics-playground", and exposes one explicit demo Scope around a counter and doubled Computed
value, Increment, Batch +2, Scope disposal/recreation, a live event timeline, bounded event counters,
Clear, and vii.trace JSON preview/download. Its public model seam has four passing Vitest tests
covering state/Computed observation, Batch trace recording, Scope disposal and recreation, and
bounded trace export/clear; together with the existing onboarding and DOM tests the consumer reports
12 passing tests across three files. pnpm exec tsc --noEmit and the Vite 8.2.1 production build pass;
the build reports 19 transformed modules, 11.76 kB raw JavaScript/4.42 kB gzip, and 3.32 kB raw CSS/
1.23 kB gzip. A local Vite page fetch and the user's manual browser verification of timeline, Scope
lifecycle, Clear, JSON preview, and vii-trace.json download all succeed for this diagnostics revision.
The Diagnostics playground consumer now also carries a validation surface for Phase 4 lifecycle and
artifact budgets. Its model tests cover 1000 repeated playground instances and the bounded
maxEvents: 100 buffer; the Vite build remains 19 transformed modules, and the reproducible
report:bundle command measured 15,089 raw bytes and 5,645 gzip bytes across the emitted CSS and
JavaScript assets. The dev-only browser probe now exercises Create Scope, Increment, Batch +2,
Dispose Scope, idempotent mount disposal, and an empty host over a default 1000-cycle run; the
user-confirmed browser execution returned iterations 1000, activeScopeCycles 1000, remainingChildren
0, and hostConnected true.
The packed Vanilla consumer also has a bounded Diagnostics privacy review. Two tests verify that
production-safe traces omit caller trace IDs, Scope names, security field/route metadata, and raw
state values while retaining structured security codes; development traces retain the configured
correlation ID but still exclude state values. A static consumer-boundary scan found no fetch,
XMLHttpRequest, sendBeacon, telemetry, or analytics path. This confirms the documented
value-free/production-safe boundary for this consumer; it is not a penetration test or a claim about
unreviewed host applications.
The packed Vanilla consumer's development-only lifecycle probe has now also passed in the clean
internal dogfood copy using `@vii-labs/core@next`: a headless Chrome run completed 1,000 mount,
Scope, update, disposal, and idempotent-disposal cycles with `iterations: 1000`,
`activeScopeCycles: 1000`, `remainingChildren: 0`, `hostConnected: true`, and zero console errors.
This is reproducible packed-artifact lifecycle evidence, not a universal production memory budget.
A bounded browser retention baseline has also measured post-disposal lifecycle, stale-emission cutoff,
and memory behavior in headless Google Chrome via CDP on the clean Vanilla reference consumer: 1,000 full
interactive and programmatic cycles completed with zero console errors, zero listener accumulation
(remained 2), zero DOM node accumulation (node delta 0 after 1,000 cycles + GC), and bounded post-GC
heap growth (+53.9 kB). Stale emission checks verified that mutating source State after Scope disposal
produces zero notifications to disposed Computed subscribers. The methodology and limitations are
documented in `docs/quality/VANILLA_BROWSER_RETENTION_BASELINE.md`; this is empirical consumer evidence,
not an external alpha, universal leak-free claim, or release budget.
A bounded browser Content Security Policy (CSP) and Trusted Types baseline has verified deployment
security compliance on the clean Vanilla reference consumer: under strict headers (`default-src 'none'`,
`script-src 'self'`, and `require-trusted-types-for 'script'`), interactive DOM UI and programmatic Core
Scope lifecycles executed with zero `securitypolicyviolation` events and zero console errors. Active policy
enforcement was confirmed via negative probes (`eval()` execution blocked by Chromium CSP with `EvalError`).
The methodology and limitations are documented in `docs/quality/VANILLA_BROWSER_CSP_BASELINE.md`; this is
reproducible client hardening evidence, not a penetration test, compliance certification, or external alpha.
Official Numeric Release Budgets for Core Alpha are now formalized in `docs/quality/PERFORMANCE_BUDGETS.md`,
establishing binding thresholds based on the empirical baselines: Core ESM artifact $\le$ 15.0 kB raw /
$\le$ 5.0 kB gzip; zero retained DOM nodes and event listeners post-disposal across 1,000 cycles; post-GC heap
growth $\le$ 100.0 kB; State throughput $\ge$ 8M ops/s and Computed $\ge$ 4M ops/s; diagnostics `off` overhead
$\le$ 20%; zero CSP violations under strict policies; and zero dynamic code evaluation sinks.
The internal dogfood process is now documented in docs/alpha/INTERNAL_DOGFOOD_PROTOCOL.md with a
clean-install gate for packed @vii-labs/core@next, required test/typecheck/build/dev checks, and a
Vanilla browser smoke checklist. The Markdown issue template at
.github/ISSUE_TEMPLATE/internal-dogfood.md captures artifact, environment, command, browser,
sanitization, findings, and follow-up evidence through a required structured checklist. The process
is explicitly internal and does not create an external alpha or a support commitment.
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
Form research (F0–F10) is complete and accepted via PR #166, concluding with real consumer validation (Consumer A Vanilla Onboarding, Consumer B React 19 Task Board), direct competitor comparisons (TanStack Form v1.33.5, React Hook Form 7.86.0, Angular 22 Signal Forms), and a formal Build-vs-Buy graduation gate (`research/form/F10_CONSUMER_VALIDATION.md`).
Production Form Phase 1 is initiated: Slice P1a defines the authoritative production architecture contract, single-package subpath distribution model (`@vii-labs/form`, `/react`, `/vanilla`, `/angular`, `/vue`), modular source graph adhering to $\le 250$-line budgets, minimal public API candidates, push-pull reactive semantics, raw presentation retention, Standard Schema v1 fail-closed boundary with clean type resolution, FieldArray stable identity across in-flight reorders, Model A submission status, prototype pollution defenses (Data vs Sink principle), framework adapter contracts, WCAG 2.2 AA / real browser acceptance gates, performance investigation targets, and a 13-slice roadmap (P1a–P1m) in `docs/architecture/FORM_ARCHITECTURE.md` (proposed on Draft PR #167). No production runtime code is implemented in P1a, and `@vii-labs/form` remains unpublished until the final P1m graduation gate. Next slice is P1b (Package Skeleton & Governance).
HTTP research targets a small Fetch-first request/response transport and remains
separate from Query cache and server-state semantics. Native template control flow belongs only to
the future compiler/component program: conditionals, keyed repetition, empty states, and switch-like
branches should share one Component IR and lifecycle model, while the exact source syntax remains
unselected until prototypes justify it. Vitest remains the canonical repository test runner while it
meets Vii needs; future Vii testing work should add domain-specific assertions, fixtures, and
compliance utilities instead of recreating a general-purpose runner. Vite/Rolldown remain the first
native build research direction, with Bun and Rspack treated as optional adapters or compatibility
targets rather than Core dependencies.
Flow research now has a bounded brief at `docs/architecture/FLOW_RESEARCH_BRIEF.md` and throwaway
fixtures under `research/flow/`. The fixtures compare direct `Promise` plus `AbortController`, an
explicit RxJS `7.8.2` adapter, and functional/fluent prototype forms across deterministic typeahead,
re-entrant ordering, explicit hot/factory source semantics, multi-subscriber ownership, complete/error/
cancel/dispose outcomes, Scope disposal, AsyncIterable, ReadableStream cancellation, subscriber
callback isolation, error recovery, value-safe diagnostics, real-clock behavior, timer-storm bounds,
and cancellation-rejection isolation cases. The ownership slice adds per-subscription AsyncIterable
identity, composed-source disposal isolation, and Scope-owned hot-source isolation. The robustness
slice adds producer-failure, fast/unbounded AsyncIterable, and AsyncIterable/ReadableStream
cancellation-race coverage. The cancellation-rejection baseline records first-party native cleanup
contracts and a structural observer candidate without selecting a public API. RxJS is a root dev-only
research dependency; no Flow package, public API, Core dependency, support promise, or real consumer
claim was added. The focused research suite now has thirty-four passing tests across nine files, and
its strict research TypeScript check plus the repository `pnpm validate` pass. A bounded hot-sharing
fixture now compares direct code, raw RxJS `share()`, and a local throwaway Flow helper over one
controlled AsyncIterable: concurrent subscribers share one active upstream, late subscribers do not
receive replay, ref-count zero disconnects and a later subscriber receives a fresh upstream identity.
Direct code and the prototype initiate AsyncIterable `return()` on last disposal; raw RxJS
`from(asyncIterable)` did not in this fixture, which remains adapter-friction evidence rather than a
selected Vii semantic. A bounded synchronous
comparison harness now records
raw per-sample runtime data and an optional GC retention probe for direct callbacks, RxJS, and the
throwaway prototype; one fixture is not treated as a global performance or memory claim. Async
cancellation rejection surfacing remains an explicit research question; Core synchronous
`ViiResource.dispose(): void` is unchanged.
The primary-source/version constraints for the next comparison slice are recorded in
`docs/quality/FLOW_PRIMARY_SOURCE_REVALIDATION.md`: plain RxJS Observables remain per-subscription,
Subjects are explicit multicast sources, unsubscription is distinct from completion, and native
AbortSignal, AsyncIterator, and ReadableStream cleanup remain asynchronous platform boundaries.
The first comparison record is in `docs/quality/FLOW_COMPARISON_BASELINE.md`; a separate bounded
TypeScript/complexity record now captures cold and incremental `tsc --extendedDiagnostics` output and
the transitive type surfaces of the three baselines. The deterministic temporal/async record is in
`docs/quality/FLOW_ASYNC_COMPARISON_BASELINE.md`; it captures latest-result correctness, stale
suppression, AbortSignal initiation, fresh disposal cutoff, timer-boundary observations, and
1,000-cycle lifecycle samples. It also exposes a prototype distinction where completed inner
ownership is released before later disposal; this is evidence for design review, not a public
semantic decision. Bundle/tree-shaking, allocation, broader memory, real-clock throughput,
platform-stream runtime, further multicast retention-policy research, malformed-shape/hostile-
subscriber robustness, unbounded ReadableStream behavior, and a public asynchronous cancellation
rejection contract remain deferred. Flow remains Research-only and Core synchronous `ViiResource.dispose(): void` is unchanged.

Phase 5 Query server-state architecture is established in `docs/architecture/QUERY_ARCHITECTURE.md`,
`rfcs/0024-query-architecture.md`, and `docs/strategy/QUERY_BUILD_VS_BUY_EVALUATION.md`. All eight research
slices (`P5.1` - `P5.8`) in `research/query/` validate deterministic QueryKey identity, canonicalization,
32-bit FNV-1a hash bucket indexing, exact matching, structural family/prefix matching along array boundaries,
a minimal cache prototype, explicit `ResearchQueryClient` ownership, `QueryRecord` independent state separation
(`empty`, `success`, `error` vs `idle`, `fetching`), concurrent same-key request deduplication, execution generation
tracking with stale late completion rejection, framework-neutral `QueryObserver` lifecycle with zero retention leaks,
native `AbortSignal` fetch cancellation preserving valid cached data (`abort != error`), superseding cancellation,
freshness calculations via `staleTime`, structural `invalidateQueries()` (`invalidate != remove`, `stale != missing`),
inactive retention and GC eviction via `gcTime` with active query protection, Vii Core `Scope.use(resource)` integration
for observers, mutations, and clients, `MutationRecord` execution lifecycle (`idle -> pending -> success / error`),
explicit optimistic updates, generation-protected rollback ensuring overlapping concurrent mutations cannot clobber
newer accepted server state, SSR Request Scope isolation proving zero cross-request data sharing, server prefetching,
safe dehydration producing a versioned wire envelope (`protocol: "vii.query"`, `version: 1`), hardened client hydration
validating against prototype pollution, malformed keys, invalid/future timestamps, and oversized payloads, preservation
of original `dataUpdatedAt` timestamps across the hydration boundary, value-safe structural diagnostics across all
query/mutation/hydration lifecycles, complete privacy enforcement (zero leakage of query values, response bodies, request
variables, tokens, credentials, or hydration payloads), fault-isolated sink execution preventing diagnostic errors from
disrupting query semantics, thin reactive framework adapter bridges for React (`useSyncExternalStore`), Angular (`Signal`

- `DestroyRef`), and Vue (`ShallowRef` + scope disposal), and a shared Query Compliance Suite verifying exact behavioral
  parity and proving that Query Core is fully decoupled from framework adapters. Comparative benchmarks and Build-vs-Buy
  evaluation (`docs/strategy/QUERY_BUILD_VS_BUY_EVALUATION.md`) establish a ~3.8 KB minified footprint (3.5x smaller than
  TanStack Query Core), zero external runtime dependencies, and native Vii Scope disposal, formally accepting Phase 5
  completion and authorizing Option A: Graduation to `@vii-labs/query` when product milestone scheduling begins.
  Query remains throwaway research until formal graduation packaging: no public package, Core dependency, or framework adapter is committed.

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
- Schema research roadmap and architecture: `docs/roadmap/SCHEMA_RESEARCH.md`, `docs/architecture/SCHEMA_ARCHITECTURE.md`, `docs/quality/SCHEMA_BENCHMARK_PLAN.md`, `research/schema/README.md`;
- Form research: `docs/roadmap/FORM_RESEARCH.md`, `docs/architecture/FORM_ARCHITECTURE.md`;
- HTTP transport research and graduation decision: `docs/roadmap/HTTP_CLIENT_RESEARCH.md`, `docs/architecture/HTTP_CLIENT.md`, `docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`, `docs/quality/HTTP_RUNTIME_COMPATIBILITY.md`, `docs/quality/HTTP_BUILD_VS_BUY_EVIDENCE.md`, `research/http/README.md`;
- native template control-flow research: `docs/architecture/TEMPLATE_CONTROL_FLOW.md`;
- rendering strategy research: `docs/architecture/RENDERING_STRATEGY.md`;
- UI Foundation roadmap and architecture: `docs/roadmap/PHASE_6_UI.md`, `docs/architecture/UI_ARCHITECTURE.md`;
- Design Tokens architecture and build-vs-buy evaluation: `docs/architecture/DESIGN_TOKENS.md`, `docs/strategy/DESIGN_TOKENS_BUILD_VS_BUY_EVALUATION.md`;
- UI Behaviors & DOM capabilities research: `research/ui-behaviors/README.md`;
- Registry & Lockfile architecture research: `docs/architecture/REGISTRY_ARCHITECTURE.md`, `research/registry/README.md`;
- Source Distribution mutation research: `research/source-distribution/README.md`;
- Cross-Framework UI compliance research: `research/cross-framework-ui/README.md`;
- UI Distribution Modes and Security Hardening research & strategy: `docs/strategy/UI_DISTRIBUTION_MODES_AND_SECURITY_HARDENING.md`, `research/security-hardening/README.md`;
- Phase 6 UI Graduation Evaluation & Benchmarks: `docs/strategy/PHASE_6_UI_GRADUATION_EVALUATION.md`, `research/benchmarks-graduation/README.md`;
- API compatibility: `docs/governance/API_STABILITY.md`;
- RFC process: `docs/governance/RFC_PROCESS.md`;
- ADR process: `docs/governance/ADR_PROCESS.md`;
- package lifecycle: `docs/governance/PACKAGE_LIFECYCLE.md`;
- release policy: `docs/governance/RELEASE_POLICY.md`;
- testing: `docs/quality/TEST_STRATEGY.md`.

## Update rule

Update this file only when a change remains important after the current task is forgotten. Put transient status, exact commands, partial work, next steps, and recovery notes in `DUTY_WATCH.md` instead.
