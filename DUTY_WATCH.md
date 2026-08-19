# Vii Duty Watch

Duty Watch is the append-only operational handoff log for meaningful repository tasks.

Each meaningful task must finish with a truthful handoff. Do not rewrite older entries to make history look cleaner. Correct mistakes with a newer entry when necessary.

Use this template:

```markdown
## YYYY-MM-DD HH:MM TZ | <short task name>

Status: completed | partial | blocked
Branch: <branch>
PR: <number or not opened>

### Scope

- What the task was intended to change.

### Changes

- What actually changed.

### Validation

- Exact checks run and their outcomes.
- State `not run` explicitly for checks that were not run.

### Architecture / compatibility

- Package or dependency-direction impact.
- Public API, compatibility, bundle, memory, SSR, security, privacy, or migration impact.

### Remaining / recovery

- Exact remaining work, or `None`.
- If partial or blocked, include the safest recovery point and next command/action.
```

## 2026-08-18 18:57 CEST | Validate external React consumer State slice

Status: completed
Branch: `dogfood/phase4-react-reference-validation`
PR: not opened

### Scope

- Validate the packed Vii Core and React artifacts in a separately created Vite React consumer as
  the first bounded Phase 4 real-application dogfood slice.

### Changes

- The external consumer now keeps its Vii board store in a dedicated module.
- Added Vitest coverage for Computed filtering, atomic Batch writes, and Scope disposal.
- No Vii repository runtime, package, public API, dependency, or fixture code changed.

### Validation

- External consumer `pnpm test`: passed; Vitest v4.1.11, 1 file and 3 tests passed.
- External consumer `pnpm build`: passed; TypeScript build and Vite v8.2.1 production build passed,
  transforming 28 modules.
- Earlier consumer smoke validation also confirmed the Vite dev server and browser interaction for
  the initial State/Computed/Batch/Scope task-board slice.

### Architecture / compatibility

- Evidence confirms the existing packed Core and React boundaries work in a real Vite React consumer;
  no repository API or package-boundary change was required.
- The broader Phase 4 remains open: more real applications, lifecycle/memory checks, bundle and
  type-check budgets, deployment threat-model review, and additional adapter/runtime coverage.

### Remaining / recovery

- Re-run the consumer `pnpm dev` smoke check after the final module extraction if browser evidence is
  required for this exact revision. Continue Phase 4 with the next bounded consumer or lifecycle
  validation slice.

## 2026-08-18 19:02 CEST | Publish React consumer validation handoff

Status: completed
Branch: `dogfood/phase4-react-reference-validation`
PR: [#79](https://github.com/kas-labs/vii/pull/79) draft

### Scope

- Publish the completed Phase 4 consumer-validation documentation slice for review.

### Changes

- Pushed commit `c211e1f` to `origin/dogfood/phase4-react-reference-validation`.
- Opened draft PR #79 targeting `main`.

### Validation

- Local `git diff --check`: passed before publication.
- GitHub Actions checks are running on PR #79: repository validation, governance, dependency review,
  and CodeQL analysis.

### Architecture / compatibility

- Documentation and handoff only; no runtime, package, public API, dependency, bundle, memory, SSR,
  security, privacy, or release behavior changed.

### Remaining / recovery

- Review PR #79 and wait for its required checks. Keep the PR as draft until human review confirms
  the evidence and the next Phase 4 slice is selected.

## 2026-08-19 00:31 CEST | Record React validation pull request merge

Status: completed
Branch: `docs/record-pr79-merge-status`
PR: [#79](https://github.com/kas-labs/vii/pull/79) merged

### Scope

- Reconcile the Phase 4 React consumer handoff after the published documentation change was merged.

### Changes

- Recorded that PR #79 merged into `main` at commit `8a8b13f`.
- Confirmed the local `main` branch is synchronized with `origin/main`.

### Validation

- PR #79 repository validation, governance, dependency review, and CodeQL checks: passed.
- Local working tree before this documentation correction: clean.

### Architecture / compatibility

- Documentation-only reconciliation; no runtime, package, public API, dependency, bundle, memory,
  SSR, security, privacy, or release behavior changed.

### Remaining / recovery

- Continue with the manual post-extraction smoke check in the external Vite React consumer, then
  select the next bounded Phase 4 consumer or lifecycle slice.

## 2026-08-19 00:36 CEST | Complete React consumer smoke validation

Status: completed
Branch: `docs/record-pr79-merge-status`
PR: not opened

### Scope

- Complete the post-extraction manual smoke check for the external Vite React consumer.

### Changes

- Confirmed the user-tested React consumer remains functional after moving the Vii board store into
  its dedicated module.
- Confirmed the interactive task-board flow: filtering, task creation, completion toggling, and
  clearing completed tasks.

### Validation

- User-confirmed `pnpm test`: passed with 3 Vitest tests.
- User-confirmed `pnpm build`: passed.
- User-confirmed `pnpm dev` browser smoke check: passed with no reported console errors.

### Architecture / compatibility

- Real-consumer evidence now covers Core State, Computed, Batch, Scope disposal, React integration,
  TypeScript/Vite production build, and basic browser interaction.
- No Vii runtime, package, public API, dependency, bundle, memory, SSR, security, privacy, or release
  behavior changed.

### Remaining / recovery

- Start the next bounded Phase 4 consumer validation with a Vue 3 reference application.

## 2026-08-19 01:04 CEST | Validate Vii-native Vanilla onboarding consumer

Status: completed
Branch: `dogfood/phase4-vanilla-onboarding-validation`
PR: not opened

### Scope

- Validate a second Phase 4 real-application consumer using Vii Core with Vanilla DOM, without
  conflating Vii with an unrelated framework.

### Changes

- Created the external `vii-reference-vanilla-onboarding` consumer manually from the Vite
  `vanilla-ts` template.
- Added an app-level two-step onboarding form using one Vii `FormData` state, separate UI state,
  Computed validation, atomic Batch transitions, Scope-preserving reset, and teardown disposal.
- Corrected the next-step direction from the stale Vue suggestion to Vii-native/reference work.
- No Vii runtime, package, public API, dependency, or fixture code changed.

### Validation

- External consumer `pnpm test`: passed; Vitest v4.1.11, 1 file and 5 tests passed.
- External consumer `pnpm exec tsc --noEmit`: passed during the store validation checkpoint.
- External consumer `pnpm build`: passed during the store validation checkpoint with Vite v8.2.1.
- User-confirmed Vanilla DOM browser smoke check: passed for field validation, step transition,
  back, submit summary, reset, and absence of reported console errors.
- Exact post-DOM command output was not captured separately; the browser result was user-confirmed.

### Architecture / compatibility

- This validates Vii Core as a framework-independent application state/lifecycle foundation while
  keeping DOM behavior at the application edge.
- It does not introduce a native Vii renderer or application framework; those remain Research/Vision.

### Remaining / recovery

- Continue Phase 4 with measured bundle/type-check/lifecycle evidence or another Vii-owned consumer
  scenario. Do not introduce Vue or another unrelated framework as a substitute for Vii.

## 2026-08-19 01:12 CEST | Record Vanilla consumer baseline

Status: completed
Branch: `dogfood/phase4-vanilla-onboarding-validation`
PR: not opened

### Scope

- Capture reproducible application-level lifecycle, type-check, build-time, and bundle evidence for
  the Vii-native Vanilla onboarding consumer.

### Changes

- Added a repeated lifecycle test covering 100 form instances and Scope disposal without callbacks.
- Recorded the external consumer baseline in project state without introducing hard release budgets.
- No Vii runtime, package, public API, dependency, or fixture code changed.

### Validation

- External consumer `pnpm test`: passed; Vitest v4.1.11, 1 file and 6 tests passed.
- Repeated lifecycle test: 100 create/subscribe/dispose iterations passed.
- External consumer `pnpm exec tsc --noEmit`: user-reported wall time 0.98 s.
- External consumer `pnpm build`: user-reported wall time 1.23 s; Vite v8.2.1 transformed 16 modules.
- Production JavaScript asset: 11,184 bytes raw, 4,005 bytes gzip.
- Production CSS asset: Vite-reported 1.59 kB raw, 0.77 kB gzip.

### Architecture / compatibility

- The baseline covers the current Vii Core consumer boundary and repeated Scope cleanup; it does not
  claim absence of all browser memory retention or establish a release threshold.
- No native renderer, framework, runtime, package, or public API was introduced.

### Remaining / recovery

- Repeat the same measurements on future consumer revisions, document methodology changes, and choose
  the next Vii-owned Phase 4 scenario or deeper browser memory investigation.

## 2026-08-19 02:02 CEST | Complete Vanilla DOM boundary review

Status: completed
Branch: `dogfood/phase4-vanilla-onboarding-validation`
PR: not opened

### Scope

- Complete the bounded security and accessibility review of the Vii-native Vanilla onboarding
  consumer's DOM boundary.

### Changes

- Centralized HTML escaping and added two malicious-input regression tests.
- Added accessible form labels, error associations, `aria-invalid`, `role="alert"`, and notification
  field grouping.
- No Vii runtime, package, public API, dependency, or fixture code changed.

### Validation

- External consumer `pnpm test`: passed; 2 test files and 8 tests passed.
- External consumer `pnpm exec tsc --noEmit`: passed.
- External consumer `pnpm build`: passed; Vite v8.2.1 transformed 17 modules.
- Production JavaScript asset: 11.64 kB raw, 4.19 kB gzip.
- Production CSS asset: 1.74 kB raw, 0.81 kB gzip.
- User-confirmed browser review: keyboard navigation, accessible errors, escaped malicious payload,
  no script/image execution, and no reported console errors.

### Architecture / compatibility

- User input remains at the DOM edge and is escaped before HTML interpolation; Vii Core remains
  framework-agnostic and unchanged.
- This is bounded consumer security/accessibility evidence, not a penetration test or certification.

### Remaining / recovery

- Repeat the boundary tests when rendering or input handling changes. Continue with the next Vii-owned
  Phase 4 scenario or a deeper browser memory investigation.

## 2026-08-19 14:29 CEST | Validate Vanilla mount disposal lifecycle

Status: completed
Branch: `dogfood/phase4-vanilla-onboarding-validation`
PR: not opened

### Scope

- Validate repeated application-level mount and dispose behavior for the Vii-native Vanilla consumer
  in one browser process.

### Changes

- Extracted the UI lifecycle into `mountOnboarding(root)` with an idempotent `dispose()` result.
- Added AbortController-backed DOM listener cleanup and a development-only lifecycle probe.
- No Vii runtime, package, public API, dependency, or fixture code changed.

### Validation

- User-confirmed external consumer tests, TypeScript check, and production build remained green after
  the mount boundary extraction.
- Browser lifecycle probe completed 100 and 1,000 mount/dispose cycles without reported errors.
- Each cycle left zero children in the probe host; repeated `dispose()` was safe.

### Architecture / compatibility

- The consumer now has an explicit application-edge lifecycle seam; Vii Core Scope remains the owner
  of form Computed resources and subscriptions.
- The probe is development-only evidence. It does not establish a universal browser heap budget or
  prove absence of all retained memory in every browser.

### Remaining / recovery

- Remove or keep the development-only probe according to the consumer's test-fixture policy, repeat it
  after lifecycle changes, and choose the next Vii-owned Phase 4 scenario.

## 2026-08-19 15:37 CEST | Complete Vanilla consumer API simplification

Status: completed
Branch: `dogfood/phase4-vanilla-onboarding-validation`
PR: not opened

### Scope

- Review and simplify the external Vii-native onboarding form API without changing user-visible
  behavior or the Vii Core public contract.

### Changes

- Removed internal Scope, touched-state, and unused validation Computed values from the form store's
  returned application surface.
- Moved subscription cleanup ownership to `mountOnboarding()` while retaining idempotent form disposal.
- No Vii runtime, package, public API, dependency, or fixture code changed.

### Validation

- External consumer `pnpm test`: passed; 2 test files and 8 tests passed.
- External consumer `pnpm exec tsc --noEmit`: passed.
- External consumer `pnpm build`: passed; Vite v8.2.1 transformed 19 modules.
- External consumer `pnpm dev`: user-confirmed server ready and browser flow functional.
- User-confirmed browser regression: onboarding, validation, Back, Submit, Reset, and lifecycle probe
  remained functional after the API simplification.
- User-confirmed `runViiLifecycleProbe(100)`: passed with an empty host and safe repeated disposal.

### Architecture / compatibility

- The application edge now owns DOM subscriptions; the form store keeps Core Scope private while
  preserving explicit disposal.
- This is an external consumer refactor and does not promote the form API or change Vii Core.

### Remaining / recovery

- Current Vanilla Phase 4 slice is complete. Reuse the recorded consumer baseline for future changes;
  select the next Vii-owned scenario only after a new scoped decision.

## 2026-08-18 23:50 CEST | Adopt Applye-style task triage preflight

Status: completed
Branch: `docs/activate-grilling-routing`
PR: #78

### Scope

- Inspect the user's public `applye` repository for its agent preflight workflow and adapt the
  useful triage contract to Vii alongside the existing grilling routing.

### Changes

- Added the canonical `docs/governance/AGENT_TASK_TRIAGE_POLICY.md` with five-axis scoring
  (`blast radius`, `ambiguity`, `risk`, `verification`, `unknowns`), role/effort routing, and the
  required `Triage`, `Harness`, `Model`, `Delegation`, `Grilling`, `Skills`, `Context/load code`,
  `Approval`, `Budget`, and `Stop when` fields.
- Made the triage verdict mandatory before non-trivial implementation or substantive next-step
  recommendations in `AGENTS.md`.
- Recorded the external workflow provenance and the Vii-owned adaptation in
  `docs/agents/EXTERNAL_SKILLS.md`; aligned the required task contract and durable project state.
- Reviewed `applye` at commit `f1398e225ca475778ddffcfd947b9486d8eb27d1`; the source repository is
  public and MIT-licensed. No executable code, hooks, dependencies, credentials, or external
  delegation behavior were imported.

### Validation

- `git diff --check`: passed.
- `pnpm validate`: formatting, lint, typecheck, tests, and builds passed; the sandboxed packed
  consumer step initially hit npm registry DNS `ENOTFOUND` while installing existing React fixture
  dependencies and was stopped rather than waiting through retries.
- `pnpm pack:check` with network-enabled execution: passed; packed Core, reference, React, Angular,
  Vue, and CLI Core consumers validated.

### Architecture / compatibility

- Documentation and agent-governance only; no runtime, package, public API, dependency, bundle,
  memory, SSR, security, privacy, or release behavior changed.
- Delegation remains opt-in and read-only by default; project-owned approval, RFC/ADR, validation,
  and publication rules remain authoritative.

### Remaining / recovery

- None for this slice. The existing PR #78 branch is ready for review with the triage addition.

## 2026-08-18 02:28 CEST | Extend packed CLI mutation validation

Status: completed
Branch: `dogfood/intentloom-second-development-loop`
PR: not opened

### Scope

- Extend the second Intentloom dogfood cycle with packed `@vii-labs/cli-core` validation for
  mutation lifecycle and machine-output results without changing Core or the CLI protocol.

### Changes

- Added source-level machine-output coverage for `initProject` applied/unchanged results and a
  blocked `addState` result, including JSON round-trips and local-file preservation.
- Extended the packed CLI consumer with applied, unchanged, and blocked mutation scenarios in
  addition to the existing dry-run coverage.
- Updated packed validation assertions, fixture documentation, and durable project-state records.

### Validation

- `pnpm --filter @vii-labs/cli-core test`: passed, 43 tests.
- `pnpm --filter @vii-labs/cli-core typecheck`: passed.
- `pnpm --filter @vii-labs/cli-core lint`: passed.
- `pnpm format:check`: passed.
- `pnpm pack:check`: passed; packed Core, reference, React, Angular, Vue, and CLI Core consumers
  validated, including the new mutation assertions.
- `pnpm validate`: passed; formatting, lint, typecheck, tests, builds, and packed consumers passed.
- `git diff --check`: passed.
- The first sandboxed `pnpm pack:check` attempt failed only on registry DNS resolution while
  installing existing React fixture dependencies; the network-enabled rerun passed.

### Architecture / compatibility

- No Core, framework adapter, dependency, public API, machine-output protocol, release, network,
  or package-boundary behavior changed.
- The CLI Core package remains private and experimental; validation now covers dry-run, applied,
  idempotent unchanged, and blocked local-change mutation paths from its packed artifact.

### Remaining / recovery

- None for this slice. Review the diff before any commit, push, or pull request.

## 2026-08-18 CEST | Allow validated dogfood delivery branches

Status: completed
Branch: `dogfood/intentloom-first-development-loop`
PR: #76

### Scope

- Fix the `delivery-policy` check for the repository's validated Intentloom dogfood cycle.

### Changes

- Added `dogfood` as a documented branch type for validated repository self-use or integration cycles.
- Aligned the governance workflow, agent guidance, contributor guidance, and durable project state.

### Validation

- Confirmed the failing job rejected only `dogfood/intentloom-first-development-loop`; PR title and commit checks were not reached.
- Local policy regex check: passed for `dogfood/intentloom-first-development-loop`.
- `git diff --check`: passed.
- `pnpm validate`: passed with network-enabled registry access; format, lint, typecheck, tests,
  builds, and packed Core, React, Angular, Vue, and CLI consumers passed.
- GitHub Actions Governance run `32080107089`: passed; `delivery-policy` job `95541304092` passed
  branch, PR title, attribution, and commit-subject validation.

### Architecture / compatibility

- No runtime, package, public API, dependency, bundle, memory, SSR, security, or privacy behavior changed.
- The policy remains strict about the `<type>/<short-kebab-description>` shape and reserves `dogfood` for repository self-use or integration evidence.

### Remaining / recovery

- None for the delivery-policy fix. Independent Validate and CodeQL runs were still in progress at
  the last status read.

## 2026-08-17 15:25 CEST | Fix Core reference consumer Computed ownership

Status: completed
Branch: `dogfood/intentloom-first-development-loop`
PR: not opened

### Scope

- Correct the packed Core reference consumer so its checkout Computed value is owned by the
  checkout Scope and evaluated before Scope disposal.

### Changes

- Created the checkout Computed inside `scope.run`.
- Captured the final computed total before disposing the Scope.
- Updated the reference-consumer test description and README to document Scope ownership for both
  the Computed value and subscription.

### Validation

- `pnpm --filter @vii-labs/core-reference test`: passed, 1 test.
- `pnpm --filter @vii-labs/core-reference build`: passed.
- `pnpm pack:check`: passed with network-enabled registry access; packed Core, reference, React,
  Angular, Vue, and CLI Core consumers validated.
- `pnpm validate`: passed with network-enabled registry access; formatting, lint, typecheck, tests,
  builds, and packed-consumer validation passed.
- `git diff --check`: passed.
- Initial sandboxed `pack:check` and `validate` attempts reached the packed-consumer stage but failed
  only because `registry.npmjs.org` DNS resolution returned `ENOTFOUND`; no repository dependency or
  configuration was changed.

### Architecture / compatibility

- Only the Core reference consumer example, its test, and its README changed.
- Core runtime behavior, public APIs, package boundaries, dependencies, release state, and packed
  package contents were unchanged.
- The consumer now follows the existing Scope ownership and deterministic disposal contract.

### Remaining / recovery

- None. Do not commit or push until human review.

## 2026-08-12 02:56 Europe/Berlin | Implement P3.1 project detection

Status: completed
Branch: `feat/project-detection`
PR: #32

### Scope

- Implement the first read-only project and package-manager detection slice for the planned CLI
  foundation.

### Changes

- Added private `@vii/cli-core` with `detectProject(root)` and typed evidence, confidence, conflicts,
  framework/runtime/workspace/language/rendering, and installed Vii package results.
- Detects npm, pnpm, Yarn, and Bun lockfiles/package-manager metadata without executing project config,
  installing packages, reading secrets, mutating files, or accessing the network.
- Added React/SSR, Angular, Vue, Vanilla, Nx mixed-workspace, conflicting-lockfile, malformed-manifest,
  invalid-root, and read-only behavior tests.
- Added a packed CLI Core clean consumer and wired it into `pnpm pack:check`; documented the provisional
  root-level boundary and deferred monorepo project selection.

### Validation

- CLI Core lint, typecheck, tests (8), and build: passed.
- `pnpm pack:check`: passed for Core, React, Angular, Vue, and CLI Core clean consumers.
- `pnpm validate`: passed; 10 Nx projects and 14 test/build dependency tasks.
- `git diff --check`: passed.

### Architecture / compatibility

- CLI Core is a private experimental Node tool package; Core remains free of CLI/filesystem imports.
- Detection is read-only and evidence-based. No shell, process execution, network, telemetry, config
  evaluation, package installation, or mutation was added.
- RFCs 0006/0007 remain Draft. Nested monorepo project enumeration/selection and terminal command
  parsing are intentionally deferred to later CLI slices.

### Remaining / recovery

- None for the P3.1 detector slice. Open a review PR after the final local audit.

## 2026-08-12 02:58 Europe/Berlin | Record P3.1 pull request

Status: completed
Branch: `feat/project-detection`
PR: #32

### Scope

- Correct the P3.1 handoff after publishing the completed branch for review.

### Changes

- Opened [PR #32](https://github.com/kas-labs/vii/pull/32) for the read-only project detection
  implementation.
- GitHub reports the PR as mergeable with `main`; required checks are in progress.

### Validation

- `git diff --check`: passed after the handoff update.
- PR checks: in progress at handoff time; local `pnpm validate` had already passed.

### Architecture / compatibility

- No runtime or package behavior changes; this entry only records the review handoff.

### Remaining / recovery

- Review and merge PR #32 after GitHub checks complete.

## 2026-08-12 02:42 Europe/Berlin | Implement P2.4 Vue adapter

Status: completed
Branch: `feat/vue-adapter`
PR: not opened

### Scope

- Add the planned private Vue Composition API adapter on top of the Core readable-state contract.

### Changes

- Added `@vii/vue` with `useVii` for Vue effect-scope lifecycle ownership and `createViiRef` for
  explicit disposal outside a Vue scope.
- Exposed readonly shallow refs with selector and equality support while preserving Core snapshots,
  batching, and subscription semantics.
- Added a Vue packed-consumer fixture and extended package validation to cover Core, React, Angular,
  and Vue artifacts in clean consumers.
- Recorded the provisional Vue compatibility and SSR/hydration boundaries in adapter docs and
  project state.

### Validation

- Vue lint, typecheck, tests (8), and build: passed.
- Vue fixture lint, typecheck, test, and build: passed.
- `pnpm pack:check`: passed for Core, React, Angular, and Vue packed artifacts with clean consumers.
- `pnpm validate`: passed.
- `git diff --check`: passed.

### Architecture / compatibility

- Core has no Vue dependency; Vue remains an adapter-edge peer dependency and the adapter is
  private/experimental while RFC 0005 is Draft.
- Vue effect-scope disposal owns composable cleanup; explicit handles own cleanup for SSR or other
  external lifecycles. No deep proxy wrapping, global singleton, runtime network, or telemetry was
  added.
- Packed consumer proof currently targets Vue 3.5.41. Hydration-specific behavior is not yet part of
  the provisional adapter contract.

### Remaining / recovery

- None for P2.4. Open a review PR after the final local audit.

## 2026-08-12 02:43 Europe/Berlin | Record P2.4 pull request

Status: completed
Branch: `feat/vue-adapter`
PR: #31

### Scope

- Correct the P2.4 handoff after publishing the completed branch for review.

### Changes

- Opened [PR #31](https://github.com/kas-labs/vii/pull/31) for the Vue adapter implementation.
- GitHub reports the PR as mergeable with `main`; required checks are in progress.

### Validation

- `git diff --check`: passed after the handoff update.
- PR checks: in progress at handoff time; local `pnpm validate` had already passed.

### Architecture / compatibility

- No runtime or package changes; this entry only records the review handoff.

### Remaining / recovery

- Review and merge PR #31 after GitHub checks complete.

## 2026-08-12 02:25 Europe/Berlin | Implement P2.3 Angular adapter

Status: completed
Branch: `feat/angular-adapter`
PR: not opened

### Scope

- Add the planned private Angular Signals adapter on top of the Core readable-state contract.

### Changes

- Added `@vii/angular` with `viiSignal` for injection-context usage and `createViiSignal` for explicit
  lifecycle ownership outside an injection context.
- Bound adapter subscriptions to `DestroyRef`, while preserving Core snapshot, selector, equality, and
  batching semantics.
- Added Angular fixture and extended packed-consumer validation to cover Core, React, and Angular
  artifacts in clean consumers.
- Recorded the provisional Angular compatibility and SSR/hydration boundaries in adapter docs and
  project state.

### Validation

- Angular lint, typecheck, tests (7), and build: passed.
- Angular fixture lint, typecheck, test, and build: passed.
- `pnpm pack:check`: passed for Core, React, and Angular packed artifacts with clean consumers.
- `pnpm validate`: passed.
- `git diff --check`: passed.

### Architecture / compatibility

- Core has no Angular dependency; Angular remains an adapter-edge peer dependency and the adapter is
  private/experimental while RFC 0005 is Draft.
- `DestroyRef` owns injection-context cleanup; explicit handles own cleanup for SSR or other external
  lifecycles. No runtime network, telemetry, or automatic installation was added.
- Packed consumer proof currently targets Angular 22.1.1. Hydration-specific behavior is not yet part
  of the provisional adapter contract.

### Remaining / recovery

- None for P2.3. Continue with the next planned backlog item after review.

## 2026-08-12 02:30 Europe/Berlin | Record P2.3 pull request

Status: completed
Branch: `feat/angular-adapter`
PR: #30

### Scope

- Correct the P2.3 handoff after publishing the completed branch for review.

### Changes

- Opened [PR #30](https://github.com/kas-labs/vii/pull/30) for the Angular adapter implementation.
- GitHub reports the PR as mergeable with `main`; required checks are queued.

### Validation

- `git diff --check`: passed after the handoff update.
- PR checks: queued at handoff time; local `pnpm validate` had already passed.

### Architecture / compatibility

- No runtime or package changes; this entry only records the review handoff.

### Remaining / recovery

- Review and merge PR #30 after GitHub checks complete.

## 2026-08-12 02:00 Europe/Berlin | Add public-repository security workflows

Status: completed
Branch: `ci/code-quality-pipelines`
PR: #29

### Scope

- Add free GitHub-native code quality and dependency security checks now that the repository is public.

### Changes

- Added `.github/workflows/codeql.yml` for weekly and main/PR CodeQL analysis of JavaScript/TypeScript
  and GitHub Actions workflow code using the extended security query suite.
- Added `.github/workflows/dependency-review.yml` to block pull requests that introduce high- or
  critical-severity dependency vulnerabilities.
- Recorded the public-repository security validation surface in `PROJECT_STATE.md`.

### Validation

- `pnpm exec prettier --check .github/workflows/codeql.yml .github/workflows/dependency-review.yml`:
  passed.
- `pnpm validate`: passed; 46 Core tests, 5 Vanilla tests, builds, and packed Core consumer
  validation.
- `git diff --check`: passed after conflict resolution.
- GitHub PR checks: passed — Validate, Governance, CodeQL (Actions), CodeQL (JavaScript/TypeScript),
  and Dependency Review.

### Architecture / compatibility

- No runtime, package, public API, dependency, SSR, or migration changes.
- CodeQL and Dependency Review run only in GitHub Actions and do not add production dependencies or
  network behavior to Vii packages.
- CodeRabbit-style third-party review remains an optional GitHub App installation; it is not enabled by
  repository files alone and is intentionally not represented as a required check here.

### Remaining / recovery

- None for CI workflow setup. Continue with P2.3 Angular adapter work after review/merge.

## 2026-08-12 01:42 Europe/Berlin | Implement P2.2 React adapter

Status: completed
Branch: `perf/state-core-baselines`
PR: not opened

### Scope

- Implement the first private React adapter on top of the P2.1 external-store contract.
- Verify React lifecycle, selector/equality, batching, SSR, types, and packed-consumer behavior.

### Changes

- Added private `packages/react` with the `useVii` hook backed by React's external-store integration.
- Added selector and custom equality support while keeping Core responsible for snapshots, batching,
  and subscription cleanup.
- Added Strict Mode cleanup, selector equality, batch propagation, SSR server-snapshot, and type
  inference tests.
- Added `fixtures/react` and extended package validation to install packed Core and React artifacts in
  clean Vanilla and React consumers.
- Documented the experimental/private status, peer dependency boundary, SSR responsibility, and next
  adapter direction.

### Validation

- `pnpm --filter @vii/react lint`: passed.
- `pnpm --filter @vii/react typecheck`: passed.
- `pnpm --filter @vii/react test`: passed; 6 tests.
- `npx -y react-doctor@latest . --verbose`: passed; 100/100, no issues found.
- `pnpm validate`: passed; formatting, lint, typecheck, Core 46 tests, adapter-testing 9 tests, React
  6 tests, React fixture 1 test, Vanilla 5 tests, builds, and packed Core/React clean-consumer
  validation.
- `git diff --check`: passed.

### Architecture / compatibility

- Core has no React dependency; React stays at the adapter peer boundary and React DOM/test renderer
  remain development-only dependencies.
- The package is private and experimental; no stable public API or finalized RFC 0005 naming contract
  was introduced.
- The adapter uses Core snapshots and subscriptions, provides React's server snapshot, and leaves
  request-isolated store creation and hydration data to the application.
- Packed artifact inspection confirms the React package contains adapter output only and does not bundle
  React or introduce network, telemetry, or other runtime side effects.

### Remaining / recovery

- None for P2.2. The next planned backlog item is P2.3, the Angular adapter.

## 2026-08-12 00:49 Europe/Berlin | Establish P1.9 Core performance baselines

Status: completed
Branch: `perf/state-core-baselines`
PR: not opened

### Scope

- Establish the P1.9 baseline suite for the existing experimental Core runtime.

### Changes

- Added `scripts/benchmarks/core-state-baseline.mjs` and the `pnpm benchmark:core` command.
- Added baseline coverage for State creation/writes, subscriber fan-out, Computed chains, batch
  propagation, subscription disposal, Scope cleanup, and Diagnostics `off`, `development`, and
  `production-safe` modes.
- Added the reproducibility/methodology document and committed raw JSON output under
  `benchmarks/results/`.
- Updated Prettier ignores for generated benchmark data and the existing pnpm-owned lockfile without
  changing the lockfile contents.

### Validation

- `pnpm benchmark:core`: passed; 10 scenarios, 10,000 operations, two warm-up rounds, five timed
  repetitions, median samples recorded on Node 22.17.0 / Apple M4.
- `pnpm validate`: passed; formatting, lint, typecheck, 46 Core tests, 5 Vanilla tests, build, and
  packed Core artifact/clean Vanilla consumer validation.
- `git diff --check`: passed.

### Architecture / compatibility

- No Core runtime, public API, dependency, framework-boundary, SSR, security, privacy, or migration
  changes.
- Benchmarks import the built Core ESM artifact and remain outside the production package. Results
  are local baselines, not cross-runtime claims or numeric release budgets.

### Remaining / recovery

- None for P1.9. The next planned backlog item is P2.1, the shared adapter compliance suite.

## 2026-08-12 01:22 Europe/Berlin | Establish P2.1 adapter compliance suite

Status: completed
Branch: `perf/state-core-baselines`
PR: not opened

### Scope

- Create the shared adapter compliance suite required before implementing React, Angular, or Vue
  adapters.

### Changes

- Added private `packages/adapter-testing` with a reusable generic compliance runner and a Core-backed
  reference adapter test.
- Added checks for current snapshot reads, update delivery, selected-value equality, nested batching,
  explicit unsubscribe, disposal cleanup, parallel factory/request isolation, optional server
  snapshots, and concrete TypeScript inference.
- Added the package to Nx validation and the workspace lockfile as a local `@vii/core` devDependency.
- Documented the provisional/private status in the adapter contract; public package naming and final
  selector overloads remain governed by Draft RFC 0005.

### Validation

- `pnpm --filter @vii/adapter-testing lint`: passed.
- `pnpm --filter @vii/adapter-testing typecheck`: passed.
- `pnpm --filter @vii/adapter-testing test`: passed; 9 tests.
- `pnpm validate`: passed; 3 Nx projects, 46 Core tests, 9 adapter compliance tests, 5 Vanilla
  tests, build, and packed Core/clean Vanilla consumer validation.
- `git diff --check`: passed.

### Architecture / compatibility

- Core remains dependency-free from adapter-testing; dependency direction is adapter-testing/tests →
  Core, never Core → adapter-testing.
- No runtime dependency, Core public API, framework package, SSR protocol, security/privacy default,
  or migration contract was added. The suite is private until RFC 0005 resolves public naming and
  selector semantics.

### Remaining / recovery

- None for P2.1. The next planned backlog item is P2.2, the React adapter.

## 2026-08-11 22:45 Europe/Berlin | Align engineering governance with Intentloom baseline

Status: completed
Branch: `docs/align-engineering-governance`
PR: not opened

### Scope

- Align Vii's general development governance with the proven repository discipline used by Intentloom while preserving Vii-specific runtime/library boundaries.
- Standardize branch names and commit/PR attribution rules.
- Add Clean Architecture and maintainability guardrails.
- Introduce durable project state and Duty Watch handoffs.

### Changes

- Added repository-wide `AGENTS.md` guidance.
- Added `docs/governance/CODE_QUALITY_STANDARDS.md` with architecture, file/function budgets, testing, TypeScript, adapter, performance, bundle, memory, dependency, and exception rules.
- Added `PROJECT_STATE.md` as the durable repository-state handoff.
- Added this Duty Watch log.

### Validation

- Repository content was compared against `vitala89/Intentloom` governance documents and current Vii governance/contribution files through the GitHub API.
- `pnpm validate`: not run yet for this documentation/governance branch.
- Governance CI checks: not added yet at this point in the handoff.

### Architecture / compatibility

- No runtime or public API changes.
- Governance is adapted rather than copied mechanically: provider/Tauri/Desktop-specific Intentloom rules are not imported into Vii.
- Vii-specific requirements emphasize framework-agnostic core, thin adapters, lifecycle/disposal, bundle size, memory, SSR, tree-shaking, packed artifacts, and evidence-backed performance.

### Remaining / recovery

- Update `CONTRIBUTING.md` and pull-request template with the standardized delivery/attribution rules.
- Add CI governance checks for branch names and forbidden attribution metadata.
- Run/inspect repository validation and open the pull request.

## 2026-08-11 22:51 Europe/Berlin | Governance alignment handoff

Status: completed
Branch: `docs/align-engineering-governance`
PR: #23

### Scope

- Finish the governance alignment and make the delivery conventions enforceable in pull requests.

### Changes

- Updated `CONTRIBUTING.md` with branch naming, atomic Conventional Commits, attribution policy, Clean Architecture direction, size budgets, testing requirements, runtime/library review points, and Duty Watch/Project State requirements.
- Updated `.github/PULL_REQUEST_TEMPLATE.md` with architecture/decomposition evidence, file/function budgets, bundle/memory/SSR/package impact, durable-state checks, and attribution/delivery checks.
- Added `.github/workflows/governance.yml` to validate branch names, Conventional Commit-style PR titles, commit subjects, and forbidden `Co-Authored-By` / generated-by / made-with attribution.
- Opened PR #23: `docs(governance): align engineering delivery rules`.

### Validation

- Compared current Vii governance and contribution surfaces with Intentloom's `AGENTS.md`, `CONTRIBUTING.md`, and `docs/governance/CODE_QUALITY_STANDARDS.md` through the GitHub API.
- Confirmed the branch itself follows the new naming convention: `docs/align-engineering-governance`.
- Confirmed created commit subjects use allowed Conventional Commit forms.
- `pnpm validate`: not run locally because this task was performed through repository API mutations rather than a local checkout.
- GitHub Actions workflow/status results were queried immediately after PR creation; no run/status had been reported yet at that point.

### Architecture / compatibility

- No runtime implementation, public API, package export, bundle, memory, SSR, or migration behavior changed.
- Shared governance is aligned with Intentloom, but Intentloom-specific provider, Tauri, Desktop, MCP, and catalog constraints remain intentionally excluded.
- Vii-specific governance now treats lifecycle/disposal, framework isolation, bundle size, memory behavior, SSR safety, tree-shaking, packed artifacts, diagnostics overhead, and benchmark evidence as first-class review concerns.

### Remaining / recovery

- Review GitHub Actions results on PR #23 when available before merge.
- No additional repository changes are required for the requested governance alignment unless CI reveals a workflow syntax or policy-regex issue.

## 2026-08-12 00:04 Europe/Berlin | Merge Core State stack into main

Status: completed
Branch: `main` (source branch `codex/diagnostics` deleted after merge)
PR: #24 (merged)

### Scope

- Merge the completed stacked Core implementation through P1.7 into `main` and remove the current
  feature branch.

### Changes

- Retargeted PR #24 from `codex/scope` to `main` and merged it as `9f11415`.
- The merge brings the State, Computed, Batch, Scope, and bounded Diagnostics implementation into
  `main`.
- Deleted remote and local `codex/diagnostics` after the merge.
- Confirmed the repository branch convention from `AGENTS.md`: future branches use
  `<type>/<short-kebab-description>` and never actor/tool prefixes.

### Validation

- `pnpm validate`: passed on the P1.7 implementation branch before merge.
- Evidence included 46 Core tests, 2 Vanilla fixture tests, build, packed artifact validation, and
  clean packed-consumer verification.
- Local `main` was fast-forwarded to `9f11415` and is clean.

### Architecture / compatibility

- No new runtime changes were made by this handoff task; it records the already merged experimental
  Core surface.
- Core remains framework-neutral, ESM, dependency-free at runtime, value-free by default for
  diagnostics, and validated through the packed artifact.

### Remaining / recovery

- None for the merge task.
- Older historical stacked `codex/*` branches remain on the remote because only the merged current
  feature branch was in scope for deletion.

## 2026-08-12 00:12 Europe/Berlin | Expand packed Vanilla fixture

Status: completed
Branch: `feat/expand-vanilla-fixture`
PR: not opened

### Scope

- Complete P1.8 by expanding the Vanilla consumer fixture across the current experimental Core
  primitives and validating the packed artifact in a clean consumer.

### Changes

- Added executable Vanilla coverage for Computed, Batch, and Scope alongside State.
- Added five fixture assertions and expanded packed-consumer assertions in `pack:check`.
- Added a fixture README whose example matches the executable source and linked it from the root
  README.
- Updated `PROJECT_STATE.md` to record the P1.8 validation surface.

### Validation

- `pnpm validate`: passed; 46 Core tests and 5 Vanilla tests passed.
- `pnpm pack:check`: passed with tarball installation, TypeScript compilation, and clean consumer
  runtime assertions.
- `git diff --check`: passed.

### Architecture / compatibility

- No runtime dependencies or public API changes; the fixture consumes the existing experimental
  Core exports and remains framework-neutral.
- Packed-artifact coverage now explicitly checks State, Computed, Batch, and Scope behavior without
  source-alias resolution.

### Remaining / recovery

- Open the draft PR, merge it into `main`, delete the feature branch, and append a completed
  post-merge handoff with the final PR number and main revision.

## 2026-08-12 00:17 Europe/Berlin | Open P1.8 fixture PR

Status: completed
Branch: `feat/expand-vanilla-fixture`
PR: #26 (draft)

### Scope

- Publish the completed P1.8 fixture work for review against `main`.

### Changes

- Opened PR #26 with the implementation, packed-consumer validation, documentation, and durable
  state handoff.

### Validation

- `pnpm validate`: passed before push.
- `pnpm pack:check`: passed before push.
- Two-axis review found no hard standards violations or spec gaps; the lifecycle judgement call
  was addressed by explicitly releasing the batch subscription.

### Architecture / compatibility

- No runtime dependency, public API, or framework-boundary changes.

### Remaining / recovery

- Merge PR #26 into `main`, delete the feature branch, and append the completed post-merge handoff
  with the resulting main revision.

## 2026-08-12 00:20 Europe/Berlin | Complete P1.8 packed Vanilla fixture

Status: completed
Branch: `main` (source branch `feat/expand-vanilla-fixture` deleted after merge)
PR: #26 (merged)

### Scope

- Finish P1.8 and record the post-merge repository state for the next task.

### Changes

- Merged PR #26 into `main` as `2fe80fc`.
- Confirmed the Vanilla fixture now exercises State, Computed, Batch, and Scope through the packed
  Core artifact and the clean-consumer package validation path.
- Deleted local and remote `feat/expand-vanilla-fixture` after merge.
- Confirmed future work remains on `<type>/<short-kebab-description>` branches; no `codex/*`
  branch was used for this task.

### Validation

- `pnpm validate`: passed before merge; 46 Core tests and 5 Vanilla tests passed.
- `pnpm pack:check`: passed before merge with tarball installation, compilation, and runtime
  assertions in a clean consumer.
- `git diff --check`: passed before merge.
- Local `main` fast-forwarded to `2fe80fc` and matched `origin/main` after merge.

### Architecture / compatibility

- No runtime dependency, public API, framework-boundary, SSR, telemetry, or migration changes.
- Core remains experimental, framework-neutral, ESM, and dependency-free at runtime; the fixture
  explicitly releases its subscriptions and Scope-owned resources.

### Remaining / recovery

- None for P1.8. The next planned backlog item is P1.9 performance baselines.

## 2026-08-12 12:03 CEST | Implement P3.2 vii init

Status: completed
Branch: `feat/cli-init`
PR: not opened

### Scope

- Implement the minimal deterministic `vii init` engine slice on the shared CLI Core detection
  boundary without starting the terminal `@vii/cli` package or P3.5 output protocol.

### Changes

- Added `initProject(root, { dryRun })` with the Analyze, Plan, Preview, Apply, Validate, Report
  lifecycle and typed plan/report/validation results.
- Init creates at most one root-level `vii.config.ts` with the detected framework marker, returns
  the exact changed-file list, supports dry-run, and is idempotent.
- Apply is blocked for ambiguous detection, changed local config, and config symlinks; no project
  configuration is executed, no dependency is installed, and no network or secret access was added.
- Added TDD coverage for dry-run, apply/idempotency, local-change protection, mixed-framework
  ambiguity, config non-execution, and project-root symlink confinement.
- Added a packed `fixtures/cli-init` consumer and updated CLI architecture, project detection,
  package README, and durable project state documentation.

### Validation

- `pnpm --filter @vii/cli-core test`: passed, 13 tests.
- Focused CLI Core lint, typecheck, and build: passed.
- `pnpm pack:check`: passed, including packed CLI Core init consumer.
- `pnpm validate`: passed with network-enabled clean-consumer installs.
- `git diff --check`: passed.

### Architecture / compatibility

- The private experimental `@vii/cli-core` API is extended; RFCs 0006 and 0007 remain Draft and
  the terminal CLI, package-manager execution, monorepo selection, and versioned JSON protocol are
  deferred.
- Filesystem writes are root-confined to the fixed config target and use create-only semantics;
  dry-run has no writes. No Core runtime, framework adapter, dependency, telemetry, or package
  installation behavior changed.

### Remaining / recovery

- Open the review PR after the final diff audit. No implementation work remains for this slice.

## 2026-08-12 12:05 CEST | Record P3.2 pull request

Status: completed
Branch: `feat/cli-init`
PR: #33

### Scope

- Record the completed P3.2 review handoff after publishing the implementation branch.

### Changes

- Opened [PR #33](https://github.com/kas-labs/vii/pull/33) with the deterministic CLI Core init engine,
  tests, packed fixture, and security/filesystem/documentation impact.
- The PR was created after local focused checks, `pnpm pack:check`, `pnpm validate`, and
  `git diff --check` passed.

### Validation

- GitHub PR created successfully; checks are pending their initial evaluation.
- No additional source validation was needed after the documentation-only handoff.

### Architecture / compatibility

- No runtime or package behavior changes beyond the completed P3.2 implementation; this entry only
  records the review handoff.

### Remaining / recovery

- Review and merge PR #33 after GitHub checks complete.

## 2026-08-12 13:04 CEST | Fix P3.2 CodeQL filesystem race

Status: completed
Branch: `feat/cli-init`
PR: #33

### Scope

- Resolve the CodeQL high-severity potential filesystem race reported on PR #33.

### Changes

- Replaced the `lstat` → `readFile` path check with one `open`/file-handle read using
  `O_NOFOLLOW`, so inspection and content read operate on the same filesystem object.
- Reused the safe inspection path during post-apply validation and preserved create-only `wx`
  application semantics.
- Kept explicit symlink blocking through `ELOOP` and added an assertion that applied config
  validation succeeds.

### Validation

- `pnpm --filter @vii/cli-core test`: passed, 13 tests.
- Focused CLI Core lint, typecheck, and build: passed.
- `git diff --check`: passed.
- `pnpm pack:check`: passed with packed Core, React, Angular, Vue, and CLI init consumers.
- `pnpm validate`: passed with format, lint, typecheck, tests, builds, and pack checks.

### Architecture / compatibility

- No package boundary, dependency, runtime Core, or public support-tier change.
- Filesystem reads now use descriptor-bound, no-follow semantics on the supported Node filesystem
  path; no project configuration execution or dependency installation was added.

### Remaining / recovery

- None. The fix is pushed and PR #33 CodeQL, Validate, Governance, and Dependency Review checks
  are green.

## 2026-08-12 15:57 CEST | Implement P3.3 vii add state

Status: completed
Branch: `feat/cli-add-state`
PR: #34

### Scope

- Implement the minimal deterministic `vii add state` engine slice on the shared CLI Core detection
  boundary without starting the terminal `@vii/cli`, dependency installation, or P3.5 output protocol.

### Changes

- Added `addState(root, { dryRun })` with the Analyze, Plan, Preview, Apply, Validate, Report
  lifecycle and typed plan/report/validation results.
- The operation plans or creates exactly `src/state.ts` when `@vii/core` is already declared and
  an existing non-symlink `src` directory is present. It is deterministic and idempotent, supports
  dry-run without writes, reports exact file paths, and blocks ambiguous detection, missing Core,
  missing/non-directory/symlink `src`, changed local state, and state symlinks.
- Reused descriptor-bound `O_NOFOLLOW` file inspection for init and add-state validation; no project
  config execution, dependency installation, package-manifest mutation, network access, or secret
  reads were added.
- Extended TDD/fixture coverage to 20 CLI Core tests and updated the packed clean consumer to install
  packed Core and CLI Core artifacts and verify both init and add-state dry-run plans.
- Updated CLI architecture, project detection, package README, package metadata, and durable project
  state documentation. Dependabot alerts, terminal CLI, create-vii, doctor, and P3.5 remain out of
  scope.

### Validation

- `pnpm --filter @vii/cli-core test`: passed, 20 tests.
- Focused CLI Core lint, typecheck, and build: passed.
- `pnpm pack:check`: passed with network-enabled clean consumers for Core, React, Angular, Vue, and
  CLI Core.
- `pnpm validate`: passed with format, lint, typecheck, tests, builds, and pack checks.
- `git diff --check`: passed.

### Architecture / compatibility

- The private experimental `@vii/cli-core` API is extended with `addState`; RFCs 0006 and 0007
  remain Draft, so the result shape and terminal command surface are not stable support promises.
- Filesystem writes are restricted to the fixed `src/state.ts` target, use create-only semantics,
  and require an existing source directory. Dry-run does not write. Local ownership and symlink
  escapes are explicit conflicts; no package, runtime Core, adapter, or dependency behavior changed.

### Remaining / recovery

- PR #34 is open with security, compatibility, filesystem, dry-run, and documentation impact
  recorded. Review the GitHub checks and merge only with explicit approval.

## 2026-08-12 16:42 CEST | Implement P3.4 vii doctor

Status: completed
Branch: `feat/cli-doctor`
PR: #35

### Scope

- Implement the minimal read-only `vii doctor` engine slice on the shared CLI Core detection
  boundary without starting the terminal CLI or P3.5 versioned JSON protocol.

### Changes

- Added `doctorProject(root)` with the Analyze → Validate → Report lifecycle and typed
  healthy/attention/blocked reports.
- Added explainable findings for detection conflicts, unknown framework/package manager/language,
  missing `@vii/core`, missing React/Angular/Vue adapters, missing Nx integration, and ambiguous
  client/SSR markers.
- Kept diagnostics read-only: no project configuration execution, dependency installation, network,
  secret reads, package-manifest mutation, or automatic repair behavior.
- Added TDD coverage for healthy projects, blocking conflicts, missing adapters/Core, non-executed
  configuration, Nx integration review, and packed clean-consumer behavior. CLI Core now has 26 tests.
- Updated CLI architecture, project detection guidance, package README, project state, and packed
  fixture validation. P3.5 machine-readable output, terminal parser, Dependabot alerts, and repair
  commands remain out of scope.

### Validation

- `pnpm --filter @vii/cli-core test`: passed, 26 tests.
- Focused CLI Core lint, typecheck, and build: passed.
- Packed CLI Core clean consumer: passed with network-enabled installation.
- `pnpm pack:check`: passed with network-enabled clean consumers for Core, React, Angular, Vue, and
  CLI Core.
- `pnpm validate`: passed with format, lint, typecheck, tests, builds, and pack checks.
- `git diff --check`: passed.

### Architecture / compatibility

- The private experimental `@vii/cli-core` API is extended with `doctorProject`; RFCs 0006 and 0007
  remain Draft and no stable CLI or JSON protocol is claimed.
- Doctor consumes the existing read-only detector and does not add a runtime dependency or a new
  filesystem mutation boundary. Findings contain metadata, messages, and sources, not source or
  secret values.

### Remaining / recovery

- PR #35 is open with security, compatibility, filesystem, privacy, and documentation impact
  recorded. Review the GitHub checks and merge only with explicit approval.

## 2026-08-12 17:01 CEST | Implement P3.5 machine-readable CLI output

Status: completed
Branch: `feat/cli-machine-output`
PR: [#36](https://github.com/kas-labs/vii/pull/36) open

### Scope

- Implement the minimal versioned machine-readable output foundation for existing CLI Core engine
  operations without starting the terminal `@vii/cli`, streaming protocol, or schema publication.

### Changes

- Added `createMachineOutput` and `stringifyMachineOutput` with the `vii.cli` protocol envelope at
  version `1` for `init`, `add state`, and `doctor`.
- Mutation outputs preserve exact planned file paths, actions, generated content, conflicts, report
  status, lifecycle phases, and validation results. Doctor output preserves findings, sources,
  report status, lifecycle phases, and validation results.
- Kept output JSON-safe and metadata-only at the detection boundary; no source uploads, secrets,
  network calls, dependency installation, terminal parsing, or additional project mutation was added.
- Split machine-output tests into a focused file and extended the packed clean consumer to verify
  protocol/version values and JSON round-trip behavior from the packed CLI Core artifact.
- Updated CLI architecture, project detection guidance, package README, project state, and fixture
  documentation. Full external protocol compatibility remains provisional while RFCs 0006 and 0007
  are Draft.

### Validation

- `pnpm --filter @vii/cli-core test`: passed, 29 tests across 2 files.
- Focused CLI Core lint, typecheck, and build: passed.
- Packed CLI Core clean consumer: passed with network-enabled installation.
- `pnpm pack:check`: passed with network-enabled clean consumers for Core, React, Angular, Vue, and
  CLI Core.
- `pnpm validate`: passed, including format, lint, typecheck, tests, build, and pack checks.
- `git diff --check`: passed after the final validation run.

### Architecture / compatibility

- The private experimental `@vii/cli-core` API now exposes a versioned engine envelope, but this is
  not a stable CLI contract, terminal `--json` parser, streaming format, or published schema.
- Output includes generated plan content for existing mutation plans and detection metadata/findings;
  it does not execute code or broaden filesystem/network boundaries.

### Remaining / recovery

- PR #36 is open; monitor review and required checks. Do not merge without explicit approval.

## 2026-08-12 17:26 CEST | Implement P3.6 diagnostic trace export

Status: completed
Branch: `feat/diagnostic-trace-export`
PR: [#37](https://github.com/kas-labs/vii/pull/37) open

### Scope

- Add the minimal Core export foundation for the versioned diagnostic trace format described by
  `docs/architecture/DIAGNOSTICS_PROTOCOL.md`.
- Record that P3.5 PR #36 merged successfully and that local `main` was synchronized before this
  focused branch was created.

### Changes

- Added `Diagnostics.exportTrace()` and the experimental `DiagnosticTrace` type with the
  `vii.trace` version `0.1` envelope, JSON-safe event snapshots, and dropped-event count.
- Preserved the existing bounded ring buffer and value-free diagnostic boundary; trace timestamp
  failures fall back safely without affecting runtime behavior.
- Added public Core tests, Vanilla fixture coverage, packed clean-consumer assertions, and updated
  the diagnostics protocol, Core README, and durable project state.
- Kept file/network/telemetry/Devtools transports, custom redaction policies, and external schema
  compatibility out of scope.

### Validation

- Core focused tests: passed, 48 tests across 7 files.
- Core and Vanilla fixture lint, typecheck, build, and tests: passed.
- `pnpm pack:check`: passed with Core, React, Angular, Vue, and CLI Core clean consumers.
- `pnpm validate`: passed, including format, lint, typecheck, tests, build, and pack checks.
- `git diff --check`: passed before commit.

### Architecture / compatibility

- Core remains framework-agnostic and has no new runtime dependency or transport boundary.
- `vii.trace` remains Draft/experimental; no stable external schema, file export, network sink, or
  Devtools contract is claimed.
- The trace contains existing redacted diagnostic metadata and bounded events, not State values,
  secrets, source code, or network payloads.

### Remaining / recovery

- PR #37 is open; monitor review and required checks. Do not merge without explicit approval.

## 2026-08-12 17:38 CEST | Implement diagnostic scope ownership metadata

Status: completed
Branch: `feat/diagnostics-scope-ownership`
PR: [#38](https://github.com/kas-labs/vii/pull/38) open

### Scope

- Extend the experimental diagnostics foundation with safe scope ownership metadata for trace
  inspection after P3.6.
- Record that PR #37 merged and local `main` was synchronized before this focused branch was created.

### Changes

- `scope.created` events now preserve optional scope `name` and `parentScopeId` alongside the
  generated `scopeId`.
- Added public Core coverage, Vanilla fixture coverage, packed clean-consumer assertions, and
  ownership documentation.
- Kept the change observational: no application values, secrets, new mutation authority, runtime
  dependency, transport, network, telemetry, or Devtools behavior was added.

### Validation

- Core tests: passed, 49 tests across 8 files.
- Core and Vanilla fixture lint, typecheck, build, and tests: passed.
- `pnpm pack:check`: passed with Core, React, Angular, Vue, and CLI Core clean consumers.
- `pnpm validate`: passed, including format, lint, typecheck, tests, build, and pack checks.
- `git diff --check`: passed before commit.

### Architecture / compatibility

- Ownership edges remain experimental diagnostics metadata and inherit the value-free privacy
  boundary; no stable external trace schema is claimed.
- Core remains framework-agnostic, and scope disposal semantics remain unchanged and synchronous.

### Remaining / recovery

- PR #38 is open; monitor review and required checks. Do not merge without explicit approval.

## 2026-08-12 18:05 CEST | Implement diagnostic trace correlation metadata

Status: completed
Branch: `feat/diagnostics-trace-context`
PR: [#39](https://github.com/kas-labs/vii/pull/39) open

### Scope

- Add the minimal explicit trace correlation metadata required by the Draft diagnostics protocol
  after the merged scope ownership slice.
- Record that PR #38 merged and local `main` was synchronized before this focused branch was created.

### Changes

- Added optional `traceId` to `DiagnosticsOptions`, diagnostic events, and the `vii.trace` export
  envelope.
- Preserved backward compatibility by omitting trace metadata when no `traceId` is supplied; no
  automatic async propagation or authorization semantics were introduced.
- Added Core tests, Vanilla fixture coverage, packed clean-consumer assertions, README/protocol
  documentation, and durable project state updates.

### Validation

- Core tests: passed, 51 tests across 9 files.
- Core and Vanilla fixture lint, typecheck, build, and tests: passed. The final fixture check ran
  sequentially after Core build to avoid a local stale-dist race from parallel focused commands.
- `pnpm pack:check`: passed with Core, React, Angular, Vue, and CLI Core clean consumers.
- `pnpm validate`: passed, including format, lint, typecheck, tests, build, and pack checks.
- `git diff --check`: passed before commit.

### Architecture / compatibility

- Trace correlation is explicit observational metadata; Core remains framework-agnostic and does not
  add context propagation, transport, network, telemetry, or Devtools dependencies.
- The value-free privacy boundary remains unchanged. The optional identifier is not an auth token.
- `vii.trace` and correlation fields remain experimental while the diagnostics protocol is Draft.

### Remaining / recovery

- PR #39 is open; monitor review and required checks. Do not merge without explicit approval.

## 2026-08-12 18:32 CEST | Harden production-safe diagnostics redaction

Status: completed locally
Branch: `feat/diagnostics-production-safe`
PR: [#40](https://github.com/kas-labs/vii/pull/40) open

### Scope

- Implement the next narrow Phase 3 diagnostics slice: make the existing `production-safe` mode
  redact caller-provided identifiers before any diagnostic observer can receive them.
- Record that PR #39 merged and local `main` was synchronized before this focused branch was created.

### Changes

- Omit the optional caller-provided `traceId` in production-safe events and trace envelopes.
- Omit caller-provided scope names from `scope.created` payloads in production-safe mode while
  preserving generated IDs, parent ownership, and structural counts.
- Added Core public behavior coverage, Vanilla fixture coverage, packed clean-consumer assertions,
  and updated the diagnostics protocol, Core README, and durable project state.

### Validation

- Core focused lint, typecheck, build, and tests passed: 52 tests across 9 files.
- Vanilla fixture focused lint, typecheck, and tests passed: 7 tests.
- `pnpm pack:check` passed with Core, React, Angular, Vue, and CLI Core clean consumers.
- `pnpm validate` passed, including format, lint, typecheck, tests, builds, and packed validation.
- `git diff --check` passed before commit.

### Architecture / security / compatibility

- Redaction happens before the in-memory buffer, diagnostic sink, and trace export; sink behavior
  remains observational and cannot affect runtime state.
- Core remains framework-agnostic with no new dependency, transport, network, telemetry, or Devtools
  behavior. State values and secrets remain outside the default event payload boundary.
- The experimental `vii.trace` protocol remains Draft; no stable schema or automatic context
  propagation is introduced.

### Remaining / recovery

- PR #40 is open; monitor review and required checks. Do not merge without explicit approval.

## 2026-08-12 18:45 CEST | Propose structured security diagnostics contract

Status: completed locally
Branch: `docs/security-diagnostics-contract`
PR: [#41](https://github.com/kas-labs/vii/pull/41) open

### Scope

- Continue Phase 3 with the governance-required design slice for structured security diagnostics.
- Record that PR #40 merged and local `main` was synchronized before this focused branch was created.

### Changes

- Added proposed RFC 0023 defining a finite `security.event` payload, fifteen candidate security
  codes, bounded development metadata, production-safe omission, and the no-raw-payload boundary.
- Linked the proposal from the diagnostics architecture and durable project state.
- Kept the change documentation-only: no public API, runtime behavior, security enforcement,
  terminal CLI, transport, telemetry, or dependency changes were made.

### Validation

- Documentation links and terminology reviewed against RFC 0004, RFC 0020, API stability policy,
  diagnostics protocol, and current Core behavior.
- `git diff --check` passed before commit.
- No code tests were required because this slice proposes an API and intentionally adds no code.

### Architecture / security / compatibility

- RFC 0023 remains Proposed and experimental; it does not stabilize RFC 0020 or the diagnostics
  protocol. Implementation must wait for an accepted decision and a real producer.
- The proposed contract excludes raw input, credentials, complete malicious payloads, and mutation
  authority; production-safe redaction is defense in depth.

### Remaining / recovery

- PR #41 is open; monitor review and required checks. Do not implement or merge the API without an
  accepted RFC decision and explicit review.

## 2026-08-13 00:53 CEST | Reconcile PR #41 merge and next-slice boundary

Status: completed
Branch: `docs/record-pr41-merge-status`
PR: [#43](https://github.com/kas-labs/vii/pull/43) open

### Scope

- Verify the actual GitHub and local repository state after the RFC 0023 proposal and determine
  whether a safe Phase 3 implementation slice is justified.

### Changes

- Recorded that PR #41 merged as `80ca537` with all six GitHub checks passing and no reviews or
  comments; PR #42 subsequently merged as `4aae8b7` with all six checks passing.
- Recorded that local `main` was clean, synchronized with `origin/main`, and that no runtime/API
  implementation was started because RFC 0023 remains Proposed, RFC 0004 remains Draft, and no
  security producer or consumer validates the proposed contract.
- Confirmed that terminal CLI, Devtools, OpenTelemetry, network transport, telemetry, and new
  packages remain outside this focused task.

### Validation

- Read-only `git status`, branch, log, merge metadata, and GitHub PR #41 checks/reviews/comments:
  passed; PR #41 checks: CodeQL actions, CodeQL JavaScript/TypeScript, CodeQL, dependency review,
  delivery policy, and validate all passed.
- `git pull --ff-only origin main`: passed; already up to date.
- `git diff --check`: passed.
- `pnpm format:check`: passed.
- `pnpm validate`: passed with lint, typecheck, tests, builds, and `pnpm pack:check`; clean packed
  consumers for Core, React, Angular, Vue, and CLI Core passed. The first sandboxed attempt was
  interrupted after repeated npm-registry DNS failures; the unchanged command passed with approved
  network access.

### Architecture / compatibility

- No source, package, dependency, public API, protocol, filesystem, network, telemetry, security
  enforcement, privacy boundary, bundle, memory, SSR, or compatibility behavior changed.
- RFC 0023 remains Proposed; RFC 0004 remains Draft; RFC 0020 remains Proposed.

### Remaining / recovery

- A future implementation slice requires an accepted RFC decision plus a real security producer and
  consumer, or another explicitly approved Phase 3 contract with a demonstrated consumer.
- Do not implement `recordSecurity` or merge a security diagnostics API before those governance and
  consumer prerequisites exist.
- PR #43 checks are pending/in progress; do not merge without the separate explicit decision.

## 2026-08-13 01:15 CEST | Implement P3.7 read-only trace inspection consumer

Status: completed
Branch: `feat/cli-trace-inspection`
PR: [#44](https://github.com/kas-labs/vii/pull/44) open

### Scope

- Add the smallest Phase 3 CLI inspection engine slice over the existing experimental Core
  `vii.trace` `0.1` producer after PR #43 merged.

### Changes

- Added pure `@vii/cli-core` `inspectTrace(trace)` with protocol/version validation and a metadata-only
  summary of total events, dropped events, and deterministic first-seen event-type counts.
- Added public behavior coverage for aggregation, payload exclusion, unsupported protocol/version,
  invalid event types, and invalid dropped-event counts.
- Added the packed CLI Core consumer path: a clean fixture creates a Core trace, inspects it through
  packed CLI Core, and validates the resulting summary and package contents.
- Updated CLI, diagnostics, Core state, and CLI Core documentation. RFC 0004 remains Draft; RFC 0023
  remains Proposed; no `recordSecurity` or security enforcement API was added.

### Validation

- Focused CLI Core lint, typecheck, test, and build: passed; 34 tests across 3 files.
- `pnpm pack:check`: passed; Core, React, Angular, Vue, and CLI Core packed clean consumers passed,
  including the new Core trace → CLI Core inspection path.
- `pnpm validate`: passed, including format, lint, typecheck, tests, builds, and pack validation.
- `git diff --check`: passed before staging the final review changes.

### Architecture / compatibility

- CLI Core remains an existing private experimental package with no new runtime dependency; the
  structural trace input keeps the CLI inspection seam independent from Core implementation modules.
- Inspection is synchronous, read-only, value-free in its output, and performs no file, network,
  telemetry, configuration execution, arbitrary code execution, or project mutation.
- The terminal `vii inspect` command, external trace schema compatibility, custom redaction policy,
  and security diagnostics API remain out of scope.

### Remaining / recovery

- PR #44 checks are pending/in progress; do not merge without separate explicit approval.

## 2026-08-13 02:05 CEST | Patch transitive development dependency alerts

Status: completed
Branch: `security/update-transitive-alerts`
PR: [#45](https://github.com/kas-labs/vii/pull/45) open

### Scope

- Patch the six open Dependabot alerts for development-only transitive `axios` and
  `brace-expansion` resolutions without changing runtime dependencies or Vii APIs.

### Changes

- Added root pnpm overrides for `axios@1.18.0` and `brace-expansion@5.0.9`. The latter is newer
  than the first patched version reported for alert #4 and also addresses two newer high-severity
  `brace-expansion` advisories found by the current npm audit database.
- Regenerated `pnpm-lock.yaml`; all affected Nx, ESLint, and TypeScript ESLint paths now resolve
  to the patched versions.
- Recorded the durable development dependency posture in `PROJECT_STATE.md`.

### Validation

- `pnpm install --frozen-lockfile`: passed with patched resolutions installed locally.
- `pnpm why axios --recursive` and `pnpm why brace-expansion --recursive`: passed; only
  `axios@1.18.0` and `brace-expansion@5.0.9` remain in the dependency graph.
- `pnpm audit --audit-level=high`: passed; no known high-severity vulnerabilities remain.
- Focused `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`: passed.
- `pnpm pack:check`: passed with clean Core, React, Angular, Vue, and CLI Core consumers.
- `pnpm validate`: passed; `git diff --check`: passed.

### Security / compatibility

- The alerts are development-scope transitive dependencies; no Vii runtime package, public API,
  diagnostics contract, filesystem behavior, network behavior, or telemetry behavior changed.
- No RFC status or security diagnostics API changed. PR must not be merged without separate explicit
  approval.

### Remaining / recovery

- The atomic commit is `cb468d0`; the branch is pushed and PR #45 is open. Do not merge without
  separate explicit approval.

## 2026-08-13 13:20 CEST | Inspect Scope ownership graph from traces

Status: completed
Branch: `feat/cli-scope-graph-inspection`
PR: [#46](https://github.com/kas-labs/vii/pull/46) open

### Scope

- Extend the existing private `@vii/cli-core` read-only `inspectTrace()` consumer with the narrow
  Phase 3 Scope/resource ownership graph slice supported by Core's existing diagnostics events.

### Changes

- Added deterministic `scopeGraph` output containing only Scope IDs, optional parent Scope IDs,
  resource IDs, and their owning Scope IDs.
- Added validation for malformed `scope.created` and `resource.attached` metadata while preserving
  existing protocol, version, event-type, dropped-count, and payload-exclusion behavior.
- Added a real Core Scope/resource trace to the packed CLI Core consumer fixture and asserted that
  private Scope names do not cross the inspection output boundary.
- Exported the focused inspection types and updated CLI, diagnostics, and durable project-state
  documentation. RFC 0004 remains Draft; RFC 0020 and RFC 0023 remain Proposed.
- Confirmed PR #45 merged as `2b542aa` with all six checks passing; Dependabot alerts #2, #4, #5,
  #6, #9, and #11 are fixed.

### Validation

- One failing public-behavior test followed by minimal implementation: passed.
- Focused CLI Core lint, typecheck, test, and build: passed; 36 tests across 3 files.
- `pnpm pack:check`: passed with clean Core, React, Angular, Vue, and CLI Core consumers.
- `pnpm validate`: passed with format, lint, typecheck, tests, builds, and pack validation.
- `git diff --check`: passed.

### Security / compatibility

- Inspection is synchronous, read-only, in-memory, and metadata-only. Names, values, files, network,
  telemetry, project mutation, arbitrary code execution, and terminal CLI behavior remain out of
  scope.
- No new package, runtime dependency, RFC status, security diagnostics API, or external trace schema
  guarantee was added.

### Remaining / recovery

- The atomic commit was amended to `90fe460`; the branch was pushed and PR #46 merged as `ab6dc1a`
  with all six checks passing. Do not infer merge permission for future PRs.

## 2026-08-13 17:40 CEST | Inspect ownership lifecycle from bounded traces

Status: completed
Branch: `feat/cli-ownership-lifecycle-inspection`
PR: [#47](https://github.com/kas-labs/vii/pull/47) merged as `7c07c874`

### Scope

- Extend the existing private `@vii/cli-core` `inspectTrace()` ownership graph with lifecycle state
  already emitted by Core's `scope.disposed` and `resource.disposed` events.

### Changes

- Added `active`/`disposed` Scope status and `attached`/`disposed` resource status to the structural
  graph; disposed resources also expose the existing boolean disposal-success result.
- Preserved parent links and resource ownership IDs while excluding names, values, and all other
  payload fields.
- Preserved disposal evidence when bounded traces have dropped the corresponding creation/attach
  events, without reading files or inventing payload data.
- Added TDD coverage, packed Core → CLI Core fixture assertions, and updated CLI/diagnostics/project
  state documentation. RFC 0004 remains Draft; RFC 0020 and RFC 0023 remain Proposed.

### Validation

- One failing public-behavior test followed by minimal implementation: passed.
- Focused CLI Core lint, typecheck, test, and build: passed; 38 tests across 3 files.
- `pnpm pack:check`: passed with clean Core, React, Angular, Vue, and CLI Core consumers.
- `pnpm validate`: passed with format, lint, typecheck, tests, builds, and pack validation.
- `git diff --check`: passed.

### Security / compatibility

- Inspection remains synchronous, read-only, in-memory, metadata-only, and framework-agnostic.
- No new package, runtime dependency, Core producer event, public security API, RFC status, terminal
  CLI command, filesystem behavior, network, telemetry, or arbitrary code execution was added.

### Remaining / recovery

- The atomic commit was `b815dfc`; the branch was pushed and PR #47 merged as `7c07c874` after all
  four GitHub workflow checks passed. Do not infer merge permission for future PRs.

## 2026-08-14 00:00 CEST | Audit PR #47 and bound the next Phase 3 slice

Status: completed
Branch: `docs/phase3-next-slice-boundaries`
PR: [#48](https://github.com/kas-labs/vii/pull/48) merged as `2e2279d5`

### Scope

- Verify the merged PR #47 state, all GitHub checks, comments, reviews, main synchronization, and
  remote refs before selecting the next Phase 3 implementation slice.

### Findings

- PR #47 merged as `7c07c874`; Dependency Review, Governance/delivery-policy, CodeQL actions and
  JavaScript/TypeScript analysis, and Validate all completed successfully.
- PR #47 has no issue comments, review submissions, or inline review threads.
- `main` is synchronized with `origin/main`; no implementation changes are justified by the current
  accepted producer/consumer boundaries.
- Security diagnostics remain blocked by RFC 0023 Proposed status, RFC 0004 Draft status, RFC 0020
  Proposed status, and the absence of an accepted real security producer/consumer. Terminal CLI,
  Devtools, OpenTelemetry, network transport, telemetry, and broader trace-contract work remain out
  of scope.

### Validation

- Local `git status`, branch, history, main fast-forward, and remote-ref state checked.
- GitHub PR metadata, workflow runs/jobs, comments, reviews, and review threads checked.
- Focused CLI Core lint, typecheck, test (38 tests), and build: passed.
- `pnpm pack:check`: passed with clean Core, React, Angular, Vue, and CLI Core consumers.
- `pnpm validate`: passed; `git diff --check`: passed before commit.

### Remaining / recovery

- Do not implement `recordSecurity`, `security.event`, or another security diagnostics API without an
  accepted governance decision and a real producer/consumer.
- Resume implementation only when an approved Phase 3 contract has a demonstrated consumer that
  does not require expanding `inspectTrace()` speculatively.

## 2026-08-14 01:00 CEST | Record PR #48 merge and re-evaluate Phase 3 boundaries

Status: completed
Branch: `docs/record-pr48-merge-status`
PR: [#49](https://github.com/kas-labs/vii/pull/49) draft

### Scope

- Reconcile the durable handoff after PR #48 merged and re-check whether a safe Phase 3 implementation
  slice is now justified by an accepted contract and existing producer/consumer code.

### Findings

- PR #48 merged as `2e2279d5`; Governance, Dependency Review, Validate, and CodeQL all completed
  successfully. The duplicate Governance runs both passed.
- PR #48 has no issue comments, review submissions, or inline review threads; `main` is synchronized
  with `origin/main`.
- No safe code slice is currently justified: dependency-graph inspection would require new Core
  dependency evidence and a trace-contract expansion, while security diagnostics remain blocked by
  RFC 0004 Draft, RFC 0020 Proposed, RFC 0023 Proposed, and no real security producer/consumer.

### Validation

- PR metadata, workflow runs/jobs, comments, reviews, and review threads checked through GitHub.
- Local `main` fast-forward and working-tree state checked.
- Documentation-only validation remains required before publishing this handoff.

### Remaining / recovery

- Do not implement `recordSecurity`, `security.event`, dependency-graph trace fields, terminal CLI,
  Devtools, OpenTelemetry, network transport, or telemetry without the required governance and
  demonstrated consumer/producer decisions.
- The next implementation branch should begin only after an approved Phase 3 contract identifies a
  concrete consumer that can be served without speculative trace expansion.

## 2026-08-14 01:13 CEST | Reconfirm Phase 3 implementation boundary after PR #47 merge

Status: completed
Branch: `docs/phase3-next-slice-decision`

### Scope

- Re-check the actual PR #47 state, its checks, discussion, reviews, `main`, and remote tracking
  refs before starting another Phase 3 implementation slice.

### Findings

- PR #47 is merged as `7c07c874`; Dependency Review, Governance, CodeQL, and Validate all completed
  successfully. Issue comments, review submissions, and inline review threads are empty.
- `main` was fast-forwarded with `git pull --ff-only origin main` to `3ac34f8`; the working tree was
  clean before creating this focused branch.
- The existing packed CLI Core fixture remains the only demonstrated consumer for `inspectTrace()`.
  No accepted producer/consumer contract justifies dependency-graph fields, security diagnostics,
  terminal CLI, Devtools, OpenTelemetry, network transport, telemetry, or a broader trace redesign.

### Validation / recovery

- No runtime or public API implementation was started; RFC 0004 remains Draft and RFCs 0020 and
  0023 remain Proposed.
- Resume implementation only after a separate governance decision or a concrete producer/consumer
  demonstrates a bounded Phase 3 contract that does not require speculative trace expansion.

## 2026-08-14 01:47 CEST | Audit architecture stages and add React/TypeScript guardrails

Status: completed
Branch: `docs/desktop-engineering-guardrails`

### Scope

- Compare the proposed monolith-to-microfrontend evolution with Vii's actual repository structure.
- Audit duplicate tracked files and current React/TypeScript guidance.

### Findings and changes

- Vii is a small pnpm/Nx monorepo of Core, framework-adapter, CLI Core, and clean-consumer fixture
  packages. It is not an application monolith or microfrontend host.
- Identical TypeScript configs are intentional local entry points for independently invoked Nx/package
  typecheck and build targets. No tracked file was deleted because no duplicate was proven unused.
- Added mandatory React/TypeScript clean-architecture guardrails to
  `CODE_QUALITY_STANDARDS.md`, and linked them from `AGENTS.md`. The rules preserve Core and
  framework-adapter dependency direction.

### Validation / recovery

- `pnpm validate`: passed, including lint, typecheck, tests, builds, and packed Core, React, Angular,
  Vue, and CLI Core clean consumers.
- `git diff --check`: passed before commit.
- Keep future architecture work focused on real package consumers and approved roadmap slices; do not
  introduce applications or microfrontend infrastructure without that evidence.

## 2026-08-15 01:09 CEST | Record PR #51 merge and reconfirm Phase 3 boundary

Status: completed
Branch: `docs/record-pr51-merge-status`

### Scope

- Verify the merged React/TypeScript guardrail documentation change and the available Phase 3
  producer/consumer evidence before starting another implementation slice.

### Findings

- PR #51 merged as `3b5abed`; its Validate, Dependency Review, Governance, and CodeQL checks all
  completed successfully. It has no issue comments, review submissions, or inline review comments.
- Local `main` was fast-forwarded to `3b5abed` and matches `origin/main`.
- The packed CLI Core fixture remains the only demonstrated `inspectTrace()` consumer. It already
  validates deterministic event counts and the read-only Scope/resource ownership graph. No
  producer or accepted contract justifies trace expansion, a terminal CLI, Devtools, OpenTelemetry,
  network transport, telemetry, or a security diagnostics API.

### Validation / recovery

- Repository status, branch history, remote `main`, PR metadata, all checks, reviews, and comments
  were checked through GitHub and local Git.
- RFC 0004 remains Draft; RFCs 0020 and 0023 remain Proposed. Do not implement `recordSecurity`,
  `security.event`, or another security diagnostics API without acceptance and a real producer and
  consumer.
- Start the next implementation branch only after a separate governance decision or demonstrated
  bounded consumer identifies a Phase 3 behavior that needs no speculative protocol expansion.

## 2026-08-15 01:30 CEST | Accept RFC 0023 security diagnostics contract

Status: completed
Branch: `docs/accept-security-diagnostics-rfc`
PR: [#53](https://github.com/kas-labs/vii/pull/53) draft

### Scope

- Record the explicit governance decision requested for the bounded security diagnostics contract.
- Keep the change documentation-only until a real security producer and consumer validate the boundary.

### Findings and changes

- RFC 0023 is now `Accepted` as an experimental, bounded, value-free, production-safe, read-only
  contract direction.
- RFC 0004 remains `Draft` and RFC 0020 remains `Proposed`; accepting RFC 0023 does not stabilize the
  diagnostics protocol or accept the broader security architecture.
- No `recordSecurity`, `security.event`, security enforcement, new package, runtime dependency,
  transport, telemetry, or terminal CLI implementation was added.
- Updated `PROJECT_STATE.md` to record the accepted direction and its producer/consumer gate.

### Validation / recovery

- Documentation-only change; no code tests were required.
- Run `git diff --check` before commit and `pnpm validate` before publishing the PR.
- The next implementation slice requires a real producer and consumer plus the RFC 0023 test and
  security evidence; do not treat acceptance as permission to expose a stable API.

## 2026-08-15 01:24 CEST | Align diagnostics architecture with accepted RFC 0023

Status: completed
Branch: `docs/align-accepted-security-diagnostics`
PR: [#54](https://github.com/kas-labs/vii/pull/54) draft

### Scope

- Remove the stale `Proposed` wording from the diagnostics architecture after RFC 0023 was accepted.

### Findings and changes

- `docs/architecture/DIAGNOSTICS_PROTOCOL.md` now describes RFC 0023 as accepted experimental
  direction while preserving the real producer/consumer and implementation gate.
- Core still exposes no security-event recording API; no runtime, public API, package, dependency,
  transport, telemetry, or enforcement behavior changed.

### Validation / recovery

- Documentation-only change; run `git diff --check` and `pnpm validate` before publishing.

## 2026-08-15 01:37 CEST | Implement first security diagnostics producer/consumer slice

Status: completed
Branch: `feat/security-diagnostics-producer`
PR: draft PR link will be reported after publication; no merge approved

### Scope

- Implement the first narrow Phase 3 vertical slice enabled by accepted RFC 0023.
- Use the existing `addState` symlink safety guard as the real producer and the existing read-only
  `inspectTrace()` operation as the consumer.

### Findings and changes

- Added the experimental Core `Diagnostics.recordSecurity()` contract using finite code, surface,
  and reason fields, the existing bounded event buffer, and production-safe redaction.
- Added `VII-SEC-008` events for blocked `src` and `src/state.ts` symlinks when an explicit
  diagnostics collector is supplied; safe dry-runs emit no security event.
- Added Core, CLI Core, and packed artifact coverage. No new package, enforcement, transport,
  telemetry, terminal CLI, or trace-schema redesign was introduced.
- RFC 0023 remains Accepted, RFC 0004 remains Draft, and RFC 0020 remains Proposed.

### Validation / recovery

- Focused Core and CLI Core lint, typecheck, test, and build checks passed.
- `pnpm format:check`, `pnpm validate`, `pnpm pack:check`, and `git diff --check` passed. The first
  sandboxed `pnpm validate` attempt could not resolve registry hosts during clean-consumer setup;
  the required validation was rerun successfully with network access.
- The implementation is ready for one atomic Conventional Commit, push, and a draft PR. Do not
  merge without separate explicit permission.

## 2026-08-16 CEST | Record PR #55 merge and reconfirm security diagnostics boundary

Status: completed
Branch: `docs/record-pr55-merge-status`
PR: [#56](https://github.com/kas-labs/vii/pull/56) merged as `62384bc`

### Scope

- Verify the final state of the first security diagnostics producer/consumer slice after explicit
  merge approval and record the safe next-step boundary.

### Findings

- PR #55 merged as `9436a25`; local `main` was fast-forwarded to the merge commit and matches
  `origin/main`.
- PR #56 merged as `62384bc` after all Validate, Dependency Review, CodeQL, and Governance checks
  passed; its issue comments, review submissions, and inline review comments are empty.
- The merged head is `bf34854`. Its Validate, Dependency Review, CodeQL, and Governance checks
  completed successfully (including the later repeat Governance run). Issue comments, review
  submissions, and inline review comments are empty.
- The merged slice remains the only demonstrated security diagnostics producer/consumer: Core's
  experimental `recordSecurity`, the `addState` symlink guard for `src` and `src/state.ts`, and
  the existing read-only `inspectTrace` count consumer with packed CLI Core validation.
- RFC 0023 remains Accepted and experimental. RFC 0004 remains Draft and RFC 0020 remains
  Proposed. No further security producer, trace-consumer expansion, terminal CLI, Devtools,
  transport, telemetry, or machine-readable protocol redesign is justified without a real
  consumer and the required governance/security evidence.

### Validation

- Rechecked PR #55 mergeability, all GitHub checks, comments, reviews, and merge metadata before
  merging.
- `git pull --ff-only origin main` completed successfully; the resulting working tree was clean.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check` passed.

### Remaining / recovery

- Start a new implementation branch only when an approved, bounded consumer/producer contract
  justifies a behavior change; use TDD for that change.

## 2026-08-16 CEST | Prove security diagnostics discard malicious runtime payload fields

Status: completed
Branch: `test/security-diagnostics-payload-corpus`
PR: [#58](https://github.com/kas-labs/vii/pull/58) merged as `00af2e0`

### Scope

- Close the existing RFC 0023 malicious-input corpus test gate without adding a security producer,
  expanding `inspectTrace`, or changing the experimental Core contract.

### Changes

- Added a public Core boundary test that invokes `recordSecurity` with runtime-only body, cookie,
  authorization, State-value, and stack fields and proves the resulting event and exported trace
  contain only the finite security payload.
- The test covers defense in depth at the runtime boundary while retaining TypeScript's narrow
  `SecurityDiagnosticInput` contract. No production code, package, API, event schema, filesystem,
  network, telemetry, transport, CLI, or dry-run behavior changed.
- PR #57 had merged as `9442cc4` with all checks passing and no comments or reviews before this
  focused branch was created.

### Validation

- Focused Core test passed: 58 tests across 9 files.
- Focused Core lint, typecheck, and build passed.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check` passed.

### Remaining / recovery

- Further security producers or inspection fields remain blocked pending a real bounded consumer
  and the applicable security/governance evidence.

## 2026-08-16 CEST | Choose Apache-2.0 and prepare Core experimental release

Status: completed
Branch: `release/apache-license-core-experimental`

### Scope

- Record the explicit Apache-2.0 licensing decision and the first release-preparation target:
  Core-only `@vii/core@0.1.0-experimental.0` on npm's `next` channel.

### Changes

- Added the canonical Apache-2.0 license and SPDX metadata to the repository and workspace package
  manifests.
- Replaced stale license wording, resolved the open governance question, and documented release
  preconditions and non-goals in `EXPERIMENTAL_CORE_RELEASE.md`.
- No package was published, no `private` field was removed, and no runtime, public API, diagnostics,
  filesystem, network, telemetry, CLI, or transport behavior changed.

### Validation

- SPDX metadata was checked across all affected manifests.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check` passed after
  package-content validation was updated to require the automatically included `LICENSE` file.

### Remaining / recovery

- Before publication: add a real packed-Core reference consumer, adopt changesets, complete public
  package metadata and release security, and obtain explicit release approval.

## 2026-08-16 CEST | Add packed Core reference consumer

Status: partial
Branch: `feat/core-reference-consumer`

### Progress

- Added a minimal checkout reference consumer using public Core State, Computed, and Scope APIs.
- TDD tracer test was red before `src/main.ts` existed, then green after the minimal implementation.
- Extended pack validation to copy the reference source to a clean temporary project and install the
  packed Core tarball; focused reference checks and `pnpm pack:check` passed.

### Validation

- Focused reference test, lint, typecheck, build, and `pnpm pack:check` passed.
- `pnpm format:check`, `pnpm validate`, and `git diff --check` passed.

### Remaining / recovery

- Publish this focused reference-consumer change as a draft PR. Do not publish or merge without
  separate explicit approval.
- Before Core publication, adopt changesets, complete public package metadata and release security,
  and obtain explicit release approval.

## 2026-08-16 CEST | Add changesets release foundation

Status: completed
Branch: `release/changesets-foundation`
PR: not yet created

### Changes

- Added `@changesets/cli`, the repository configuration, and guarded scripts for creating and
  applying changesets. No publish script exists.
- Configured public package access and `main` as the release base while keeping every package
  private and version `0.0.0` until the separately approved Core candidate release.
- Updated the experimental Core release decision and durable project state.

### Validation

- `pnpm changeset status` passed and reported no pending bumps.
- `pnpm format:check`, `pnpm validate`, and `git diff --check` passed.

### Remaining / recovery

- Publish this changesets foundation as a draft PR; do not merge or publish without separate
  explicit approval.
- Before Core publication: add its release changeset, complete public package metadata and trusted
  publishing/provenance, then obtain explicit release approval.

## 2026-08-16 CEST | Prove security diagnostics isolate sink and clock failures

Status: completed
Branch: `test/security-diagnostics-failure-isolation`
PR: [#60](https://github.com/kas-labs/vii/pull/60) merged as `a899da4`

### Scope

- Close the existing RFC 0023 sink and clock failure-isolation evidence gate directly on the
  experimental `recordSecurity()` path without changing runtime behavior.

### Changes

- Added a public Core test proving a failing diagnostic clock and sink cannot throw through
  `recordSecurity`; the recorded finite security event uses the existing fallback timestamp.
- No production code, package, API, event schema, producer, inspection field, filesystem, network,
  telemetry, transport, CLI, or dry-run behavior changed.
- PR #59 had merged as `0286d4a` with all checks passing and no comments or reviews before this
  focused branch was created.

### Validation

- Focused Core test passed: 60 tests across 9 files.
- Focused Core lint, typecheck, and build passed.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check` passed.

### Remaining / recovery

- The explicit RFC 0023 test gates are now covered. Further security producers or inspection
  fields remain blocked pending a real bounded consumer and the applicable security/governance
  evidence.

## 2026-08-16 CEST | Prove bounded security trace export round-trip

Status: completed
Branch: `test/security-diagnostics-trace-export`
PR: [#59](https://github.com/kas-labs/vii/pull/59) merged as `0286d4a`

### Scope

- Close the existing RFC 0023 trace export JSON round-trip and bounded-buffer evidence gate for
  the experimental `security.event` path without changing runtime behavior.

### Changes

- Added a public Core test proving two security events use the existing bounded buffer, retain the
  correct dropped-event count, preserve only the remaining finite event, and survive a JSON
  round-trip through `exportTrace()`.
- No production code, package, API, event schema, producer, inspection field, filesystem, network,
  telemetry, transport, CLI, or dry-run behavior changed.
- PR #58 had merged as `00af2e0` with all checks passing and no comments or reviews before this
  focused branch was created.

### Validation

- Focused Core test passed: 59 tests across 9 files.
- Focused Core lint, typecheck, and build passed.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check` passed.

### Remaining / recovery

- Further security producers or inspection fields remain blocked pending a real bounded consumer
  and the applicable security/governance evidence.

## 2026-08-16 CEST | Prepare Core public package metadata

Status: completed
Branch: `release/core-public-metadata`
PR: not opened

### Scope

- Complete the public metadata and consumer-facing release-status documentation for the future
  experimental Core-only candidate without versioning, publishing, or removing `private`.

### Changes

- Added Core package description, discovery keywords, repository/homepage/issue links, and a future
  public `next` publish configuration.
- Documented that `@vii/core` is still unpublished, supplied a packed-tarball installation path, and
  preserved the experimental API, diagnostics, support, privacy, and no-telemetry boundaries.
- Extended packed-artifact validation to read the Core tarball manifest and assert the Apache-2.0
  license plus release metadata.

### Validation

- `pnpm pack:check`: passed, including the new packed-manifest assertion and clean consumers.
- `pnpm format:check`, `pnpm validate`, and `git diff --check`: passed.

### Architecture / compatibility

- No runtime or public API behavior changed. Core remains framework-agnostic, value-free in
  diagnostics, private, version `0.0.0`, and unpublished.
- `publishConfig` records the approved future `next` destination only; it does not publish a package,
  enable telemetry, change filesystem behavior, or grant external authority.

### Remaining / recovery

- Open a draft PR for review. Before publication, prepare an approved Core changeset/changelog and
  release-security evidence, configure trusted publishing/provenance, then obtain explicit approval
  for release commit, tag, and npm publication.

## 2026-08-16 CEST | Record Core public metadata pull request

Status: completed
Branch: `release/core-public-metadata`
PR: [#65](https://github.com/kas-labs/vii/pull/65)

### Scope

- Publish the verified Core metadata preparation branch as a draft review request.

### Changes

- Opened draft PR #65 from `release/core-public-metadata` to `main` at `681c44d`.

### Validation

- The preceding commit passed `pnpm pack:check`, `pnpm format:check`, `pnpm validate`, and
  `git diff --check`.

### Remaining / recovery

- Wait for PR #65 checks and review. Do not merge, version, remove `private`, tag, or publish without
  separate explicit approval.

## 2026-08-16 CEST | Prepare Core experimental release changeset

Status: completed
Branch: `release/core-experimental-changeset`
PR: not opened

### Scope

- Prepare the versioning intent, release-note source, known limitations, and support statement for the
  Core-only experimental candidate without applying a version or publishing a package.

### Changes

- Added the pending `@vii/core` minor changeset that supplies the base for the approved
  `0.1.0-experimental.0` candidate.
- Documented the required experimental prerelease application path and explicit boundary against a
  Stable `0.1.0` release.
- Added Core consumer documentation for supported surface, limitations, issue reporting, and private
  vulnerability reporting.

### Validation

- `pnpm changeset status --output=/tmp/vii-changeset-status.json`: passed and recognized the pending
  Core minor changeset; no release is calculated while Core remains private.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check`: passed.

### Architecture / compatibility

- No runtime, public API, diagnostics, filesystem, CLI, dry-run, network, telemetry, package version,
  or publication behavior changed.
- The changeset is only release intent. Application, generated changelog/version updates, removal of
  `private`, tag creation, and npm publication still require explicit release approval.

### Remaining / recovery

- Publish this focused preparation as a draft PR. After review and merge, release security/trusted
  publishing evidence remains before an explicit release decision.

## 2026-08-16 CEST | Record Core experimental changeset pull request

Status: completed
Branch: `release/core-experimental-changeset`
PR: [#66](https://github.com/kas-labs/vii/pull/66)

### Scope

- Publish the verified Core changeset preparation branch as a draft review request.

### Changes

- Opened draft PR #66 from `release/core-experimental-changeset` to `main` at `15aac3a`.

### Validation

- The preceding commit passed `pnpm changeset status --output=/tmp/vii-changeset-status.json`,
  `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check`.

### Remaining / recovery

- Wait for PR #66 checks and review. Do not apply the changeset, version, remove `private`, tag, or
  publish without separate explicit approval.

## 2026-08-16 CEST | Record Core release security readiness

Status: completed
Branch: `release/core-security-readiness`
PR: not opened

### Scope

- Create a reviewable evidence record and maintainer runbook for protected trusted
  publishing/provenance before any release workflow, versioning, or npm publication is authorized.

### Changes

- Added the Core experimental release security readiness record with current repository evidence,
  external GitHub Environment/npm Trusted Publisher prerequisites, future manual workflow contract,
  and approval order.
- Recorded the current production dependency audit: `pnpm audit --prod --json` reported no known
  findings across 44 production dependencies.
- Linked the release decision, documentation index, and durable state to the readiness record.

### Validation

- `pnpm audit --prod --json`: passed with 0 findings at every severity.
- `pnpm format:check`, `pnpm pack:check`, `pnpm validate`, and `git diff --check`: passed.

### Architecture / compatibility

- No runtime, public API, package, version, release tag, filesystem, CLI, dry-run, network, telemetry,
  GitHub Environment, npm Trusted Publisher, or publishing workflow behavior changed.
- The record requires future publishing to be manual, protected, OIDC-based, provenance-producing, and
  limited to Core on `next`; no credentials are stored in the repository.

### Remaining / recovery

- Publish this readiness record as a draft PR. After review/merge, the remaining protected actions
  require maintainer-owned npm/GitHub configuration and explicit authorization for the separate
  versioning and publication change.

## 2026-08-16 CEST | Record Core release security readiness pull request

Status: completed
Branch: `release/core-security-readiness`
PR: [#67](https://github.com/kas-labs/vii/pull/67)

### Scope

- Publish the verified Core release-security readiness record as a draft review request.

### Changes

- Opened draft PR #67 from `release/core-security-readiness` to `main` at `93568c6`.

### Validation

- The preceding commit passed `pnpm audit --prod --json`, `pnpm format:check`, `pnpm pack:check`,
  `pnpm validate`, and `git diff --check`.

### Remaining / recovery

- Wait for PR #67 checks and review. Do not create external npm/GitHub release configuration, apply
  versions, remove `private`, tag, or publish without separate explicit approval.

## 2026-08-16 CEST | Record Core registry and publisher preflight

Status: completed
Branch: `release/core-registry-preflight`
PR: not opened

### Scope

- Verify read-only registry availability and local trusted-publisher toolchain readiness without
  authenticating to npm, reserving a scope, or publishing a package.

### Changes

- Recorded that the public npm registry returned `E404` for `@vii/core` on 2026-08-16; this is an
  availability observation, not a scope-ownership or publication-rights claim.
- Recorded that local Node.js 22.17.0 meets the trusted-publishing baseline while npm 10.9.2 does not
  meet npm's 11.5.1+ requirement; the protected release runner must provision a newer npm explicitly.

### Validation

- `npm view @vii/core version --registry=https://registry.npmjs.org`: completed read-only and returned
  `E404`.
- `node --version` and `npm --version`: completed.
- `git diff --check`: passed.

### Architecture / compatibility

- No runtime, public API, package, version, filesystem, CLI, dry-run, network behavior, credentials,
  npm scope, GitHub configuration, workflow, tag, or publication changed.

### Remaining / recovery

- Publish this factual readiness update as a draft PR. Scope ownership, protected environment, trusted
  publisher configuration, versioning, and publication remain maintainer-authorized external actions.

## 2026-08-16 CEST | Record Core registry preflight pull request

Status: completed
Branch: `release/core-registry-preflight`
PR: [#68](https://github.com/kas-labs/vii/pull/68)

### Scope

- Publish the verified registry/toolchain preflight record as a draft review request.

### Changes

- Opened draft PR #68 from `release/core-registry-preflight` to `main` at `8093c2a`.

### Validation

- The preceding commit passed read-only npm registry/toolchain preflight, `pnpm format:check`,
  `pnpm pack:check`, `pnpm validate`, and `git diff --check`.

### Remaining / recovery

- Wait for PR #68 checks and review. Scope ownership, GitHub Environment, npm Trusted Publisher,
  versioning, private removal, tag, and publication require separate explicit maintainer authority.

## 2026-08-16 CEST | Prepare first Core experimental release candidate

Status: completed
Branch: `release/core-first-experimental`
PR: not opened

### Scope

- Prepare the explicitly authorized first public Core candidate, its protected one-time provenance
  bootstrap workflow, and release metadata without creating a tag or publishing to npm.

### Changes

- Created the protected `npm-publish` GitHub Environment with `vitala89` as its sole required reviewer,
  self-approval explicitly allowed, and deployment restricted to
  `v0.1.0-experimental.0`.
- Applied the accepted Core changeset in experimental prerelease mode: Core is now
  `0.1.0-experimental.0`, public, and has its generated changelog. Private adapters and CLI Core remain
  private with their prior Core peer ranges.
- Added a manual-only, exact-tag, environment-gated bootstrap workflow. It validates, audits, packs,
  publishes only the exact Core tarball to `next` with provenance, and uses an environment-scoped
  one-time `NPM_TOKEN` that has not been created or stored in this repository.
- Added a release-candidate validator and packed-artifact assertion for the Core changelog.

### Validation

- TDD release validator: red while the workflow was absent; green after the candidate configuration.
- `pnpm release:core:check`, `pnpm format:check`, `pnpm pack:check`, `pnpm validate`,
  `pnpm audit --prod --json`, and `git diff --check`: passed.
- Packed Core artifact was inspected locally at `0.1.0-experimental.0` and contains only the expected
  release files, including LICENSE and CHANGELOG.

### Architecture / compatibility

- Core remains framework-agnostic, value-free in diagnostics, without filesystem, CLI, dry-run,
  telemetry, transport, or hidden network runtime behavior.
- This is the first explicitly authorized public experimental candidate; no API or diagnostics protocol
  is promoted to Stable. No package has been published, tagged, or associated with an npm token yet.

### Remaining / recovery

- Open the release candidate as a draft PR. After checks/review and merge, add a one-day granular
  `NPM_TOKEN` scoped to `@vii` as the `npm-publish` Environment secret, create the exact release tag,
  approve and dispatch the workflow, verify npm/provenance, configure Trusted Publisher/OIDC, and revoke
  the bootstrap token. Do not publish another package or use `latest`.

## 2026-08-16 CEST | Record first Core experimental candidate pull request

Status: completed
Branch: `release/core-first-experimental`
PR: [#69](https://github.com/kas-labs/vii/pull/69)

### Scope

- Publish the verified first Core experimental release candidate as a draft review request without
  creating its tag, token, or npm release.

### Changes

- Opened draft PR #69 from `release/core-first-experimental` to `main` at `dc3db63`.

### Validation

- The preceding commit passed release candidate validation, YAML parsing, `pnpm format:check`,
  `pnpm pack:check`, `pnpm validate`, `pnpm audit --prod --json`, and `git diff --check`.

### Remaining / recovery

- Wait for PR #69 checks and review. After merge, add the one-day scoped `NPM_TOKEN` only to the
  `npm-publish` Environment, then create the exact tag and manually approve/dispatch the workflow.
  Verify publication/provenance, configure OIDC Trusted Publishing, and revoke the bootstrap token.

## 2026-08-16 CEST | Correct public npm namespace after failed bootstrap

Status: partial
Branch: `release/npm-scope-migration`
PR: not opened

### Scope

- Correct the unpublished public package namespace after confirming that `@vii` is owned by an
  unrelated npm user, and prepare a replacement experimental candidate under the project-owned
  `@vii-labs` organization.

### Changes

- Verified `vitalii.kas` owns `@vii-labs`; the organization includes its standard `developers` team.
- Migrated workspace package names, imports, fixtures, packed-consumer validation, diagnostics package
  metadata, and package documentation from `@vii/*` to `@vii-labs/*`.
- Replaced the unpublishable `@vii/core@0.1.0-experimental.0` candidate with the independent
  `@vii-labs/core@0.1.0-experimental.1` candidate and exact `v0.1.0-experimental.1` workflow contract.
- Preserved historical Duty Watch records for the old candidate. The old remote tag remains
  unmodified and no package was published.

### Validation

- TDD: Core diagnostics contract failed while events reported `@vii/core`, then passed after the
  package identity migration.
- `pnpm release:core:check`: passed after updating the candidate changelog assertion.
- Initial `pnpm pack:check` exposed stale local workspace links; `pnpm install --frozen-lockfile`
  refreshed the graph, and the rerun passed.
- `pnpm release:core:check`, `pnpm format:check`, `pnpm pack:check`, `pnpm validate`,
  `pnpm audit --prod --json` (0 vulnerabilities across 44 production dependencies), and
  `git diff --check`: passed.

### Remaining / recovery

- Update the protected `npm-publish` Environment from the abandoned `.0` tag to the reviewed
  `v0.1.0-experimental.1` tag only after the replacement PR merges.
- Create a new `@vii-labs`-scoped bootstrap token only after the reviewed candidate is merged; the
  prior secret was removed and the failed `@vii` bootstrap never published a package.

## 2026-08-16 CEST | Replace direct npm bootstrap with staged publication

Status: completed
Branch: `release/core-staged-bootstrap`
PR: not opened

### Scope

- Replace the failed direct npm bootstrap with an approval-preserving staged publication candidate.

### Changes

- Prepared `@vii-labs/core@0.1.0-experimental.2` for the `next` tag without changing the unpublished
  `.1` tag or attempting another direct publication.
- Changed the protected exact-tag workflow to run `npm stage publish --provenance`; npm keeps the package
  private until the npm maintainer explicitly approves it with 2FA.
- Updated the release validator and release-security, experimental-release, package, and project-state
  records for the staged `.2` candidate and the post-publication OIDC/token-revocation path.

### Validation

- TDD: `pnpm release:core:check` failed while the candidate still declared `.1` and direct publication,
  then passed after the `.2` staged workflow and contract were implemented.
- `pnpm release:core:check`, `pnpm format:check`, `pnpm pack:check`, and `pnpm validate` passed.

### Remaining / recovery

- Run the production dependency audit and final diff check, then open the staged-candidate draft PR.
- After review and merge, restrict the `npm-publish` Environment to `v0.1.0-experimental.2`, create that
  exact tag, dispatch the protected workflow, and approve the staged package in npm with 2FA.
- Configure OIDC Trusted Publishing for staged publication and revoke the bootstrap token after npm
  approval. Do not publish `latest` or use a direct token-based publish.

## 2026-08-17 CEST | Record npm staged-bootstrap prerequisite

Status: partial
Branch: `release/core-npm-stage`
PR: not opened

### Scope

- Execute the post-merge `.2` release staging and record the registry prerequisite discovered in CI.

### Changes

- Confirmed PR #72 merged to `main` at `4c896a9`; all checks passed and the PR has no comments or reviews.
- Updated the protected `npm-publish` Environment from exact tag `.1` to `.2`, created
  `v0.1.0-experimental.2`, and approved the sole configured reviewer for workflow run `31975525313`.
- The workflow passed checkout, locked install, release validation, audit, and pack, then failed only at
  `npm stage publish` with E404 because `@vii-labs/core` does not yet exist in npm. `npm view` and
  `npm stage list` confirm no published or staged package.
- Corrected release-security and project-state records: npm staged publishing cannot bootstrap a new
  package, so the maintainer must perform one local direct `.2` publish with interactive 2FA before OIDC
  staged publishing can be used for a later candidate.

### Validation

- Workflow run `31975525313`: validation, production audit, and packed artifact steps passed; staging
  failed closed with the documented npm E404 prerequisite.
- Official npm staged-publishing documentation confirms that the package must already exist before it
  can be staged.

### Remaining / recovery

- From the exact `.2` tag, the npm owner must publish the packed artifact once locally as `vitalii.kas`
  with interactive 2FA; never send the OTP through chat or store it in GitHub.
- After `@vii-labs/core@0.1.0-experimental.2` exists, create a new focused release candidate for the
  next version, configure OIDC Trusted Publishing with stage-only permission, and revoke `NPM_TOKEN`.
- Do not retry workflow `31975525313`, do not publish `latest`, and do not merge another release change
  without the normal PR review and checks.

## 2026-08-17 CEST | Bootstrap Core package exists on npm

Status: partial
Branch: `release/core-npm-stage`
PR: [#73](https://github.com/kas-labs/vii/pull/73)

### Changes

- Verified `npm whoami` as `vitalii.kas` and confirmed `@vii-labs/core@0.1.0-experimental.2` is published.
- Verified the intended `next` tag; npm also set `latest` during the manual bootstrap and its removal
  requires a separate interactive 2FA account operation.
- Deleted the GitHub `npm-publish` Environment secret `NPM_TOKEN` after the package was created.

### Validation

- Registry metadata reports one published version, 44 files, Apache-2.0 metadata, and expected exports.
  No npm provenance field is present for the local bootstrap publication.
- PR #73 checks are green; it has no comments or reviews and remains draft.

### Remaining / recovery

- Remove `latest` locally with npm 2FA, leaving only `next`.
- Configure the npm Trusted Publisher for `kas-labs/vii`, `publish-core.yml`, Environment `npm-publish`,
  with stage-only permission; this account action also requires interactive 2FA.
- Revoke the bootstrap npm token, then prepare and review a new candidate workflow for the next version
  using OIDC staged publishing with provenance. Do not use `latest`.

## 2026-08-17 CEST | Complete npm trust and bootstrap-token cleanup

Status: partial
Branch: `docs/release-publish-state`
PR: [#74](https://github.com/kas-labs/vii/pull/74)

### Changes

- Verified npm Trusted Publisher `02da092b-466a-4e9a-8e57-4ab8229de86c` for `kas-labs/vii`, workflow
  `publish-core.yml`, Environment `npm-publish`, with only `createStagedPackage` permission.
- Verified `npm token list` is empty and the GitHub `NPM_TOKEN` Environment secret is absent.
- Attempted to remove the accidental `latest` tag after interactive 2FA; npm registry rejected the
  DELETE with E400. The only published version remains `.2`, so no placeholder stable version or unpublish
  workaround is permitted. `next` remains the supported experimental install channel.

### Validation

- `npm view @vii-labs/core dist-tags --json`: `next` and registry-retained `latest` both point to `.2`.
- PR #74 checks: CodeQL, dependency review, governance, and validation all passed; no comments or reviews.

### Remaining / recovery

- Treat `latest` as a registry limitation of the sole published version; documentation directs users to
  `@vii-labs/core@next`.
- For the next release, update the exact candidate version/tag through a reviewed PR and use the configured
  OIDC stage-only Trusted Publisher. Do not intentionally publish `latest` or add a fake stable package.

## 2026-08-18 17:09 CEST | Review project state and roadmap

Status: completed
Branch: `main`
PR: not opened

### Scope

- Review the canonical project documents, latest operational handoff, repository history, current package
  surface, and roadmap to report completed work and the planned next steps.

### Changes

- No runtime or product behavior changed. This entry records the repository-state audit and its validation
  evidence.

### Validation

- Read `README.md`, `ROADMAP.md`, `PROJECT_STATE.md`, `CONTRIBUTING.md`, current governance/product-boundary
  documents, roadmap/implementation documents, relevant diagnostics RFCs, and the latest Duty Watch entries.
- Confirmed clean `main` at `531e83d`, synchronized with `origin/main`.
- `pnpm validate`: passed with network-enabled registry access; all lint, typecheck, test, build, and packed
  Core, reference, React, Angular, Vue, and CLI Core consumer checks passed.
- `git diff --check`: passed.

### Architecture / compatibility

- No package, public API, dependency, runtime, filesystem, network, release, security, or privacy behavior
  changed. PROJECT_STATE remains the durable implementation source of truth; roadmap research remains
  non-supporting design intent.

### Remaining / recovery

- None for this audit. The next implementation decision should use the Phase 3 consumer/governance gate
  and the Phase 4 real-application validation plan summarized in the handoff report.

## 2026-08-18 17:25 CEST | Activate project grilling workflow

Status: completed
Branch: `docs/activate-grilling-routing`
PR: not opened

### Scope

- Review the installed external skills and make grilling automatic for ambiguous repository feature and
  architecture work while preserving explicit bug-diagnosis and small-task paths.

### Changes

- Added task-routing rules to `AGENTS.md` for `aif-task-router`, `grill-with-docs`, `grill-me`,
  `diagnosing-bugs`/`aif-debugger`, discovery, planning review, TDD, and verification.
- Enabled model invocation for the local `grill-with-docs` entrypoint and added an external-skills
  adoption note covering provenance, MIT licensing, hashes, manual-only side effects, and rollback.
- Added the selected editable skills and `skills-lock.json` as the project-owned workflow bundle.

### Validation

- `pnpm validate`: passed; formatting, lint, typecheck, tests, builds, and packed Core, reference,
  React, Angular, Vue, and CLI Core consumers passed.
- `git diff --check`: passed.
- Static extension review found no automatic install, publish, telemetry, or hidden authority path;
  `claude-handoff` and `wizard` remain manual-only due to their external-process/secret-write capability.

### Architecture / compatibility

- No Vii runtime, package, public API, dependency, or product behavior changed. The routing rule affects
  agent workflow selection only; project governance and explicit human approval remain authoritative.
- External skills remain editable, hash-recorded guidance and are not treated as trusted authority.

### Remaining / recovery

- Review the full diff and PR checks. To roll back the workflow adoption, revert this commit and remove
  the added external skill bundle; do not update skills in place without repeating the extension review.

## 2026-08-18 17:28 CEST | Record grilling workflow pull request

Status: completed
Branch: `docs/activate-grilling-routing`
PR: [#78](https://github.com/kas-labs/vii/pull/78) draft

### Scope

- Correct the workflow handoff after publishing the completed agent-routing and skill-bundle change.

### Changes

- Pushed commit `038229c` to `origin/docs/activate-grilling-routing`.
- Opened draft PR #78 targeting `main` with the routing, provenance, validation, and manual-only side
  effect boundaries documented.

### Validation

- `pnpm validate`: passed before commit and push.
- `git diff --cached --check`: passed before commit.
- `gh auth status`: authenticated as the repository maintainer account.
- Branch push and draft PR creation: passed.

### Architecture / compatibility

- No runtime, package, public API, dependency, or product behavior changed beyond the project-owned agent
  workflow and editable skill bundle.

### Remaining / recovery

- Review PR #78 and its required checks. Merge only after human review and repository policy checks pass.

## 2026-08-19 16:16 CEST | Implement Diagnostics playground consumer

Status: partial
Branch: dogfood/phase4-vanilla-onboarding-validation
PR: not opened

### Scope

- Add the approved Vii-native Interactive Diagnostics playground to the external Vanilla reference
  consumer without changing Vii Core or introducing a renderer/framework dependency.

### Changes

- Added a diagnostics playground model with development mode, maxEvents: 100, and
  traceId: "diagnostics-playground".
- Added State/Computed counter controls, diagnostics-aware Batch +2, explicit Scope creation/disposal,
  Scope recreation, live event timeline, counters, Clear, JSON preview, and JSON download boundary.
- Switched the external consumer's active entrypoint and lifecycle probe to the playground.
- Added four public-seam Vitest tests; the existing onboarding and DOM tests remain in place.

### Validation

- External consumer pnpm test: passed; Vitest v4.1.11, 3 files and 12 tests passed.
- External consumer pnpm exec tsc --noEmit: passed.
- External consumer pnpm build: passed; Vite v8.2.1 transformed 19 modules and emitted 11.76 kB
  raw JavaScript/4.42 kB gzip and 3.32 kB raw CSS/1.23 kB gzip.
- External consumer local Vite HTML fetch: passed.
- Headless browser automation was not available in the current environment.
- User manual browser verification passed for timeline, Scope lifecycle, Clear, JSON preview, and
  vii-trace.json download.
- git diff --check: passed before this handoff update.

### Architecture / compatibility

- No Vii repository runtime, package, public API, dependency, or release behavior changed.
- The playground observes Vii Diagnostics and keeps browser DOM, Blob, URL, and download behavior at
  the application edge.
- The bounded trace remains value-free according to the Core diagnostics contract; no telemetry,
  network call, or automatic publication was added.

### Remaining / recovery

- None for this slice. Continue Phase 4 with the next bounded consumer or lifecycle slice.

## 2026-08-19 16:43 CEST | Publish Diagnostics playground handoff

Status: completed
Branch: dogfood/phase4-vanilla-onboarding-validation
PR: [#80](https://github.com/kas-labs/vii/pull/80) draft

### Scope

- Publish the completed Diagnostics playground evidence for review.

### Changes

- Pushed the branch to origin.
- Opened draft PR #80 targeting main.

### Validation

- git diff --check: passed before publication.
- The PR body records the external consumer tests, typecheck, build, manual browser verification,
  and the repository validation network limitation.

### Architecture / compatibility

- Documentation and handoff only; no Vii runtime, package, public API, dependency, release, telemetry,
  or network behavior changed.

### Remaining / recovery

- Review PR #80 and merge only after the required checks and human review pass.

## 2026-08-19 16:47 CEST | Validate Diagnostics lifecycle and bundle budgets

Status: partial
Branch: dogfood/phase4-vanilla-onboarding-validation
PR: [#80](https://github.com/kas-labs/vii/pull/80) draft

### Scope

- Extend the external Diagnostics playground evidence with active Scope lifecycle repetition,
  bounded diagnostics-buffer coverage, and reproducible bundle measurements.

### Changes

- Updated the dev-only lifecycle probe to exercise Create Scope, Increment, Batch +2, Dispose Scope,
  idempotent disposal, and an empty host across a default 1000-cycle run.
- Added Vitest coverage for 1000 repeated playground instances and the maxEvents: 100 buffer.
- Added the external consumer command pnpm report:bundle for raw and gzip artifact sizes.

### Validation

- External consumer pnpm test: passed; Vitest v4.1.11, 3 files and 14 tests passed.
- External consumer pnpm exec tsc --noEmit: passed.
- External consumer pnpm build: passed; Vite v8.2.1 transformed 19 modules.
- External consumer pnpm report:bundle: passed; total raw 15,089 bytes and gzip 5,645 bytes.
- Browser execution of runViiLifecycleProbe(1000): not run yet.
- git diff --check: pending after this handoff update.

### Architecture / compatibility

- No Vii Core runtime, package, public API, dependency, release, telemetry, or network behavior changed.
- The probe and report remain external consumer validation seams; the measured sizes are local evidence,
  not universal product budgets or a production memory claim.

### Remaining / recovery

- Run the dev server and execute runViiLifecycleProbe(1000) in the browser console. Expected result:
  iterations 1000, activeScopeCycles 1000, remainingChildren 0, hostConnected true.
- After that result, update this handoff to completed and push the final PR #80 head.

## 2026-08-19 16:55 CEST | Complete Diagnostics lifecycle and bundle validation

Status: completed
Branch: dogfood/phase4-vanilla-onboarding-validation
PR: [#80](https://github.com/kas-labs/vii/pull/80) draft

### Scope

- Close the Diagnostics playground lifecycle and artifact-budget validation after the browser probe.

### Changes

- Confirmed the active Scope lifecycle probe across the default 1000-cycle run.
- Confirmed the consumer host is empty after each disposal and the probe dispose path is idempotent.

### Validation

- User browser execution of runViiLifecycleProbe(1000): passed.
- Result: iterations 1000, activeScopeCycles 1000, remainingChildren 0, hostConnected true.
- Automated consumer tests, typecheck, build, and report:bundle checks remain passing as recorded above.
- git diff --check: passed before this handoff update.

### Architecture / compatibility

- No Vii Core runtime, package, public API, dependency, release, telemetry, or network behavior changed.
- Evidence remains local consumer validation and does not claim a universal production memory budget.

### Remaining / recovery

- None for this slice. Review and merge PR #80 after its required checks and human review pass.

## 2026-08-19 16:59 CEST | Publish final Diagnostics validation correction

Status: completed
Branch: docs/complete-diagnostics-budget-handoff
PR: [#81](https://github.com/kas-labs/vii/pull/81) draft

### Scope

- Preserve the final user-confirmed lifecycle result that was committed after PR #80 had already
  merged.

### Changes

- Created a corrective documentation branch from the merged PR state.
- Opened draft PR #81 with the final PROJECT_STATE and DUTY_WATCH correction only.

### Validation

- The corrective diff is limited to the completed lifecycle handoff.
- git diff --check: passed before publication.

### Architecture / compatibility

- Documentation only; no Vii runtime, package, public API, dependency, release, telemetry, or network
  behavior changed.

### Remaining / recovery

- Review and merge PR #81 after its required checks and human review pass.

## 2026-08-19 17:08 CEST | Review Diagnostics privacy boundary

Status: completed
Branch: security/diagnostics-privacy-review
PR: not opened

### Scope

- Review the packed Vanilla Diagnostics consumer against the Vii privacy and diagnostics threat-model
  requirements for production-safe redaction and value minimization.

### Changes

- Added two external consumer tests for production-safe and development Diagnostics data handling.
- Verified production-safe omission of caller trace IDs, Scope names, security field/route metadata,
  and raw state values.
- Verified development correlation remains available without collecting raw state values.

### Validation

- External consumer pnpm test: passed; Vitest v4.1.11, 4 files and 16 tests passed.
- External consumer pnpm exec tsc --noEmit: passed.
- External consumer pnpm build: passed; Vite v8.2.1 transformed 19 modules.
- External consumer pnpm report:bundle: passed; total raw 15,089 bytes and gzip 5,645 bytes.
- Static scan of the consumer boundary found no fetch, XMLHttpRequest, sendBeacon, telemetry, or
  analytics path.
- git diff --check: passed before this handoff update.

### Architecture / compatibility

- No Vii Core runtime, package, public API, dependency, release, telemetry, or network behavior changed.
- The review covers the packed Core consumer boundary and remains bounded evidence, not a penetration
  test or a universal privacy certification.

### Remaining / recovery

- None for this review. Continue Phase 4 with the next bounded slice.
