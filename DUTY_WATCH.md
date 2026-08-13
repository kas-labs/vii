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

Status: partial
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

Status: partial
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

Status: partial
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

- The atomic commit is `c85a217`; the branch is pushed and PR #46 is open. Do not merge without
  separate explicit approval.
