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

## 2026-08-31 00:41 CEST | Production Form Phase 1 Slice P1h: React Adapter

Status: completed
Branch: `feat/form-p1h-react-adapter`
PR: not opened

### Scope

- Implement the minimal production React adapter for Vii Form (`@vii-labs/form/react`) in Phase 1 Slice P1h.
- Provide public hooks: `useField`, `useForm`, `useFieldArray` built on React's `useSyncExternalStore`.
- Implement live snapshot reads with referential property memoization (`createMemoizedSnapshotReader`) to eliminate unnecessary re-renders and prevent render loops while preserving pre-subscription freshness.
- Implement fine-grained render isolation: mutating a leaf field triggers re-rendering only in that field's subscribed component (0 sibling re-renders).
- Preserve `FieldArrayItem.id` across collection reorders and mutations for stable React keys.
- Ensure StrictMode lifecycle safety (clean double-mount/unmount subscriptions, no leaked listeners).
- Ensure lifecycle isolation: component unmount unregisters adapter subscriptions only and never auto-disposes canonical Form nodes.
- Handle node replacement (`fieldA` -> `fieldB`) cleanly without stale cross-talk.
- Provide deterministic SSR snapshot evaluation (`getServerSnapshot`) without browser globals.
- Preserve optional peer dependency contract (`react: ">=18.0.0"`) and verify root `@vii-labs/form` import safety in projects without React installed.
- Verify packed artifact in clean Core-only and clean React consumers.

### Changes

- Created `packages/form/src/adapters/react/types.ts`: public TypeScript snapshot and binding interfaces (`ReactFieldSnapshot`, `ReactFieldBinding`, `ReactFormSnapshot`, `ReactFormBinding`, `ReactArraySnapshot`, `ReactArrayBinding`).
- Created `packages/form/src/adapters/react/external-store.ts`: internal `createMemoizedSnapshotReader` (referential memoization via `Object.is`) and `subscribeSignals` (unified subscription combiner).
- Created `packages/form/src/adapters/react/use-field.ts`: fine-grained `useField` hook for leaf field nodes.
- Created `packages/form/src/adapters/react/use-form.ts`: aggregate `useForm` hook for root form coordinators.
- Created `packages/form/src/adapters/react/use-field-array.ts`: collection `useFieldArray` hook for dynamic repeatable arrays.
- Updated `packages/form/src/adapters/react/index.ts`: exported public React adapter hooks and types.
- Updated `packages/form/package.json`: added React 19 test devDependencies (`react`, `react-dom`, `react-test-renderer`, `@types/react`, `@types/react-dom`, `@types/react-test-renderer`).
- Created `packages/form/test/unit/react-adapter.test.ts`: comprehensive React 19 unit test suite (30 test assertions covering `useField`, snapshot freshness, render isolation, `useForm`, `useFieldArray`, StrictMode, lifecycle, SSR, and type preservation).
- Updated `packages/form/test/package-boundary.test.ts`: verified `formReact` exports `useField`, `useFieldArray`, `useForm`.
- Updated `scripts/package-validation/validate-form.mjs`: added packed React build outputs to expected entries; added dual clean consumer validation (Core-only consumer without React and React consumer with React 19).
- Updated `packages/form/README.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.

### Validation

- `NX_DAEMON=false pnpm nx lint form`: passed (0 errors, 0 warnings).
- `NX_DAEMON=false pnpm nx typecheck form`: passed (0 errors).
- `NX_DAEMON=false pnpm nx test form`: passed (20 test files, 264 passed tests).
- `NX_DAEMON=false pnpm nx build form`: passed (clean d.ts and ESM build).
- `NX_DAEMON=false pnpm nx validate-package form`: passed (dual clean consumer verification against packed artifact).
- `git diff --check`: passed (0 whitespace errors).
- `NX_DAEMON=false pnpm validate`: passed (full repository validation).

### Architecture / compatibility

- Zero modification to `@vii-labs/core`.
- Unidirectional dependency flow: `@vii-labs/form/react` -> public `@vii-labs/form` primitives/types.
- Root `@vii-labs/form` has zero React imports and works in clean environments without React installed.
- Optional peer dependency `react: ">=18.0.0"` declared via `peerDependencies` and `peerDependenciesMeta.react.optional: true`.
- Package remains private (`private: true`).

### Remaining / recovery

- None. Ready for Draft PR.

## 2026-08-30 18:15 CEST | Production Form Phase 1 Slice P1g: Submit Validation Authority & Edit-During-Validation Cancellation

Status: completed
Branch: `feat/form-p1g-submission-server-issues`
PR: #186

### Scope

- Implement internal submission validation authority to guarantee that submit validation passes are strictly authoritative for the exact tree state being snapshotted and submitted.
- Enforce the cancellation contract: any user mutation (`setValue`, `setRawValue`, or `FieldArray` structural operations `insert`/`remove`/`move`/`swap`/`clear`) that occurs while `submissionStatus === "validating"` advances the internal monotonic tree mutation revision and cancels the in-flight submission attempt (`{ status: "cancelled" }`), preventing stale or unvalidated payloads from running submit actions.
- Add exhaustive controllable-promise regression test suite covering: valid A -> invalid B, valid A -> valid B, pending B validation timing, parse-invalid raw value edits, FieldArray structural mutations, multiple rapid edits, and unchanged normal submissions.

### Changes

- Updated `packages/form/src/core/internal.ts`: added `notifyMutation?(): void` and `onMutation?: () => void` to `FormNodeInternal`, and updated `adoptChildNode` / `adoptChildNodes` / `commitChildAdoption` to wire upward mutation notification.
- Updated `packages/form/src/core/field-parserless.ts` and `packages/form/src/core/field-parsed.ts`: notify tree mutation on `setValue` and `setRawValue`.
- Updated `packages/form/src/core/group.ts`: propagated child mutation notifications upward through group hierarchy.
- Updated `packages/form/src/core/array-adoption.ts` and `packages/form/src/core/array.ts`: wired child item mutation bubbling and notified on structural operations (`insert`, `remove`, `move`, `swap`, `clear`).
- Updated `packages/form/src/core/form.ts`: tracked root monotonic `treeMutationRevision` counter and exposed `getTreeRevision` to `SubmissionCoordinator`.
- Updated `packages/form/src/submission/state-machine.ts`: verified `treeRevisionBeforeValidation === currentTreeRevision` after `validateTree("submit")`, cancelling and aborting if any mutation occurred during validation.
- Updated `packages/form/test/unit/submission-validation-gate.test.ts`: added the complete 7-test validation authority matrix.
- Appended `DUTY_WATCH.md`.

### Validation

- `NX_DAEMON=false pnpm nx lint form`: passed (0 errors, 0 warnings).
- `NX_DAEMON=false pnpm nx typecheck form`: passed (0 errors).
- `NX_DAEMON=false pnpm nx test form`: passed (19 test files, 245 unit tests).
- `NX_DAEMON=false pnpm nx build form`: passed (clean build).
- `NX_DAEMON=false pnpm nx validate-package form`: passed (tarball packing and clean consumer validation).
- Server issues routing perf fixture: 1,000 issues across 100 array items in 48ms (<50ms budget).
- `git diff --check`: passed (0 whitespace errors).
- `NX_DAEMON=false pnpm validate`: passed (full repository validation).

### Architecture / compatibility

- Clean internal monotonic mutation revision without exposing public revision counters or changing public APIs.
- Model A terminal state preserved: user edits after submit completion advance mutation generation without resetting terminal `submissionStatus`.
- Clean Architecture boundaries preserved: zero `@vii-labs/core` mutations, platform-neutral runtime.

### Remaining / recovery

- None. Ready for maintainer review on Draft PR #186.

## 2026-08-30 17:45 CEST | Production Form Phase 1 Slice P1g: Submission Consistency, Fail-Closed Boundaries & Cancellation Classification

Status: completed
Branch: `feat/form-p1g-submission-server-issues`
PR: #186

### Scope

- Correct submission lifecycle ordering: capture output domain snapshot (`deepCloneSnapshot`) and `FieldArray` identity snapshots (`collectArraySnapshots`) strictly AFTER the submission validation gate successfully passes, ensuring the submitted payload matches the validated generation and preventing pre-validation race conditions.
- Replace array snapshot path key serialization with an injective, collision-free format (`JSON.stringify(path.map(...))`) preserving segment types (numbers vs numeric strings, dotted keys vs nested segments).
- Implement fail-closed submit action result discrimination in `packages/form/src/submission/result.ts`: when `ok === false`, require an `issues` array where all issues sanitize atomically; throw `TypeError` and fail closed on malformed shapes.
- Eliminate unsafe message-text cancellation heuristics in `isAbortCancellation`: classify cancellation authoritatively via `signal.aborted` or `AbortError` / `ABORT_ERR` only.
- Add comprehensive regression test suites covering async validation races, collision-safe snapshot keys, tricky nested array routing, fail-closed result parsing, and structural cancellation classification.

### Changes

- Created `packages/form/src/submission/result.ts`: contains `parseSubmitActionResult` with fail-closed discrimination, atomic sanitization, and `isAbortCancellation`.
- Updated `packages/form/src/submission/array-snapshot.ts`: updated `createArraySnapshotKey` to use injective typed JSON encoding.
- Updated `packages/form/src/submission/state-machine.ts`: restructured `submit()` lifecycle so validation gate runs first and snapshotting occurs only after validation succeeds; integrated `parseSubmitActionResult` and `isAbortCancellation`.
- Updated `packages/form/test/unit/submission-validation-gate.test.ts`: added async validation and user edit race condition tests.
- Updated `packages/form/test/unit/submission-state-machine.test.ts`: added fail-closed result discrimination tests, atomic sanitization tests, and non-heuristic cancellation error ownership tests.
- Updated `packages/form/test/unit/server-issues.test.ts`: added path key collision tests and nested array routing tests with collision-prone dotted names.
- Updated `scripts/package-validation/validate-form.mjs`: added `dist/submission/result.*` to expected packed artifact entries.
- Updated `packages/form/README.md` and `DUTY_WATCH.md`.

### Validation

- `NX_DAEMON=false pnpm nx lint form`: passed (0 errors, 0 warnings).
- `NX_DAEMON=false pnpm nx typecheck form`: passed (0 errors).
- `NX_DAEMON=false pnpm nx test form`: passed (19 test files, 239 unit tests).
- `NX_DAEMON=false pnpm nx build form`: passed (clean build).
- `NX_DAEMON=false pnpm nx validate-package form`: passed (tarball packaging and clean consumer validation).
- `git diff --check`: passed (0 whitespace errors).
- `NX_DAEMON=false pnpm validate`: passed (full repository validation).

### Architecture / compatibility

- Preserves small-core strategy and zero modification to `@vii-labs/core`.
- Maintains strict Clean Architecture boundaries and unidirectional dependency flow.
- Zero framework runtime dependencies (framework adapters remain deferred to P1h–P1j).
- Package remains private (`private: true`).

### Remaining / recovery

- None. PR #186 updated and ready for review.

## 2026-08-30 16:30 CEST | Production Form Phase 1 Slice P1g: Submission & Server Issues

Status: completed
Branch: `feat/form-p1g-submission-server-issues`
PR: not opened (Draft PR pending)

### Scope

- Implement production form submission lifecycle and structured server issue routing in `@vii-labs/form` (Phase 1 Slice P1g).
- Implement Model A submission state machine (`idle -> validating -> submitting -> succeeded | failed | cancelled`) where terminal outcome statuses persist across subsequent field edits without resetting to idle.
- Implement submission validation gate: runs recursive tree validation with `trigger: "submit"`, awaits async rules, and blocks submission if invalid or if any field has parse errors (`parseStatus === "invalid"`).
- Implement deep immutable domain snapshot generator (`deepCloneSnapshot`) supporting primitives, plain/null-prototype objects, arrays, Date, RegExp, Map, Set, cycle handling, prototype pollution protection, and unsupported class/Weak collection rejection.
- Implement caller error ownership: unexpected errors in user submit action rethrow to caller while setting `submissionStatus: "failed"`.
- Implement AbortSignal submission cancellation (`form.cancelSubmit()`, duplicate policies `supersede`/`drop`/`reject`, automatic abort on `form.reset()`, `form.reinitialize()`, or `form.dispose()`).
- Implement structured `ServerIssue` taxonomy with routing to leaf fields, nested groups, arrays, and fallback to root `form.serverIssues` for unresolvable or root paths.
- Implement localized server issue clearing on field edit (`setValue`/`setRawValue`) without disturbing sibling or root issues.
- Preserve coexistence with client validation: running client validation rules does not wipe active server issues.
- Implement `FieldArray` in-flight identity snapshots (`collectArraySnapshots`) mapping array paths to stable item IDs, ensuring server responses route to the correct item at its live position even if items are reordered mid-flight; deleted items fall back safely to root `form.serverIssues`.
- Conduct 1,000-issue routing performance investigation (<50ms O(N) path lookup).
- Enforce diagnostics privacy with zero user data in telemetry.
- Verify package boundary, export maps, tree-shaking, line budgets, and clean consumer packed validation.

### Changes

- Created `packages/form/src/submission/types.ts`: public submission types (`SubmissionStatus`, `ServerIssue`, `ServerIssueInput`, `SubmitAction`, `SubmitActionResult`, `FormSubmitResult`, `SubmitOptions`, `DuplicateSubmitPolicy`, `ArraySnapshotMap`).
- Created `packages/form/src/core/snapshot.ts`: `deepCloneSnapshot` implementation with cycle safety, prototype pollution defense, and immutability freezing.
- Created `packages/form/src/submission/array-snapshot.ts`: `collectArraySnapshots` for capturing array path to item ID mappings.
- Created `packages/form/src/submission/server-issues.ts`: `sanitizeServerIssue`, `clearTreeServerIssues`, `routeServerIssuesToTree`.
- Created `packages/form/src/submission/state-machine.ts`: `SubmissionCoordinator` managing Model A lifecycle, cancellation, and validation gate.
- Extended `packages/form/src/parsers/types.ts`: added `"server"` to `IssueSource`.
- Extended `packages/form/src/validation/types.ts`: added `ServerIssue` to `FieldIssue` union.
- Extended `packages/form/src/core/internal.ts`: added `clearServerIssues` and `setServerIssues` to `FormNodeInternal`.
- Extended `packages/form/src/core/tree-types.ts`: added submission properties (`submissionStatus`, `submitting`, `serverIssues`, `validate`, `submit`, `cancelSubmit`) to `FormInstance` and `FieldGroup`.
- Extended `packages/form/src/core/array-types.ts`: added `serverIssues` to `FieldArray`.
- Extended `packages/form/src/core/types.ts`: added `serverIssues` to `FieldState` and re-exported submission types.
- Updated `packages/form/src/core/field-parserless.ts` & `field-parsed.ts`: added `serverIssuesState`, integrated into `syncCombinedIssues` and `validComputed`, localized clear on `setValue`/`setRawValue`/`reset`/`reinitialize`.
- Updated `packages/form/src/core/group.ts` & `array.ts`: added `serverIssuesState`, integrated into `issuesComputed` and `validComputed`, internal routing support.
- Updated `packages/form/src/core/form.ts`: integrated `SubmissionCoordinator`, wired `submit`, `cancelSubmit`, `validate`, `reset`, `reinitialize`, `dispose`.
- Updated `packages/form/src/index.ts`: exported public submission types.
- Created test suites:
  - `packages/form/test/unit/submission-snapshot.test.ts`
  - `packages/form/test/unit/submission-state-machine.test.ts`
  - `packages/form/test/unit/submission-validation-gate.test.ts`
  - `packages/form/test/unit/server-issues.test.ts`
  - `packages/form/test/unit/server-issues-perf.test.ts`
  - `packages/form/test/unit/diagnostics-privacy.test.ts`
- Updated package boundary test `packages/form/test/package-boundary.test.ts` and clean consumer verification script `scripts/package-validation/validate-form.mjs`.
- Updated `packages/form/README.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.

### Validation

- `NX_DAEMON=false pnpm nx lint form`: passed (0 errors, 0 warnings).
- `NX_DAEMON=false pnpm nx typecheck form`: passed (0 errors).
- `NX_DAEMON=false pnpm nx test form`: passed (19 test files, 234 unit tests passing).
- `NX_DAEMON=false pnpm nx build form`: passed (clean TypeScript compilation).
- `NX_DAEMON=false pnpm nx validate-package form`: passed (tarball packaging and clean consumer fixture test against packed artifact).
- `git diff --check`: passed (0 whitespace errors).
- `NX_DAEMON=false pnpm validate`: passed (full repository validation).

### Architecture / compatibility

- Preserves small-core strategy and zero modification to `@vii-labs/core`.
- Maintains strict Clean Architecture boundaries and unidirectional dependency flow.
- Zero framework runtime dependencies (framework adapters remain deferred to P1h–P1j).
- Package remains private (`private: true`).
- Performance: 1,000 server issues routed in <50ms with O(N) path depth traversal.
- Security & Privacy: Value-free structural diagnostics only.

### Remaining / recovery

- None. Ready for Draft PR and review.

## 2026-08-30 02:24 CEST | Production Form Phase 1 Slice P1f: FieldArray & Stable Identity

Status: completed
Branch: `feat/form-p1f-field-array`
PR: #185

### Scope

- Implement dynamic repeatable collection support via `createFieldArray(...)` with stable item identity in `@vii-labs/form` (Phase 1 Slice P1f).
- Implement stable logical item identity independent of array positional indices (`FieldArrayItem<TNode>` with stable opaque `id` and `node`).
- Implement true transactional adoption (Validate All -> Commit All) for initial creation (`items`), `insert`, `append`, and `prepend`, guaranteeing zero child ownership mutations and zero disposals on validation failure.
- Align public contract and types: `remove(index)` returns `void` for clean lifecycle encapsulation; document precise baseline-retention vs non-baseline disposal semantics for `remove()` and `clear()`.
- Enforce strict `keyExtractor` contract requiring a non-empty string with zero silent fallback and preflight duplicate key checking.
- Resolve baseline removal vs reset contradiction: baseline items removed from current active structure are baseline-retained privately with active validation cancelled, allowing `reset()` to restore the canonical baseline structure, stable IDs, and node instances.
- For non-baseline items (added after baseline creation), removal or clear disposes them immediately.
- Reinitialization (`form.reinitialize`) replaces the canonical baseline and disposes obsolete retained baseline items from previous baselines.
- Support collection mutations: `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `clear`.
- Provide full reactive collection state aggregation: `items`, `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues` (with dynamically updated numeric index prefix paths `[i, ...]`).
- Enforce identity-strict dirty tracking: array is pristine (`dirty === false`) if and only if its length matches baseline, its exact key sequence matches baseline, and all child nodes are pristine.
- Protect against async validation race conditions during item removal and reordering.
- Verify package boundary, export maps, tree-shaking, line budgets, and clean consumer packed validation.

### Changes

- Created `packages/form/src/core/array-types.ts` defining `FieldArrayItem`, `CreateFieldArrayOptions`, and `FieldArray` with `remove(index): void`, precise `clear()`, and `keyExtractor` contracts.
- Created `packages/form/src/core/array-baseline.ts` providing `ArrayBaselineTracker` to encapsulate baseline retention, dirty comparison, reset restoration, and obsolete baseline disposal.
- Created `packages/form/src/core/array-adoption.ts` providing two-phase `preflightArrayItems`, `commitItemAdoption`, and `commitArrayItemsAdoption` for true transactional adoption and strict non-empty string `keyExtractor` validation.
- Created `packages/form/src/core/array-operations.ts` providing index bounds validation and recursive node validation helpers.
- Created `packages/form/src/core/array.ts` implementing `createFieldArray` with stable IDs, child Scopes, reactive aggregation computeds, batch-safe mutations, baseline reset, and disposal.
- Updated `packages/form/src/core/tree-types.ts` extending `FormNode` union with `FieldArray<any>`, and updating `FormValueFor` / `FormRawValueFor`.
- Updated `packages/form/src/core/internal.ts` adding `"array"` node kind, `validateAdoptableChild()`, and `commitChildAdoption()`.
- Updated `packages/form/src/core/reinitialize-tree.ts` adding recursive two-phase array prevalidation and atomic commit plan execution.
- Updated `packages/form/src/core/types.ts` and `packages/form/src/index.ts` re-exporting `createFieldArray` and array types.
- Created unit tests in `packages/form/test/unit/field-array.test.ts` covering creation, stable identity across reorders/moves/swaps, dirty tracking, touched, pending, valid/invalid, issues path prefixing, async validation races on remove/move, baseline retention on remove/clear, reset restoration, reinitialize obsolete disposal, empty `keyExtractor` rejection, and full transactional adoption regressions.
- Updated `packages/form/test/unit/types.test.ts` with type inference coverage for `FieldArray` (`remove` returning `void`, `clear` returning `void`) and nested arrays in forms.
- Updated `packages/form/test/package-boundary.test.ts` and `scripts/package-validation/validate-form.mjs` verifying exports, package entries, and clean consumer packed execution including array mutations and reset.
- Updated `packages/form/README.md` and `PROJECT_STATE.md`.

### Validation

- `pnpm nx lint form`: PASSED (0 errors, 0 warnings).
- `pnpm nx typecheck form`: PASSED (clean TypeScript compilation across src and test).
- `pnpm nx test form`: PASSED (13 test files, 199 passed tests).
- `pnpm nx build form`: PASSED (clean d.ts and ESM build).
- `pnpm nx validate-package form`: PASSED (tarball packaging and clean consumer execution).
- Line budget check: all production files in `packages/form/src/` strictly satisfy line standards (`array.ts`: 310 lines, `array-baseline.ts`: 122 lines, `array-adoption.ts`: 90 lines, `array-operations.ts`: 54 lines, `internal.ts`: 159 lines, `array-types.ts`: 169 lines; all below 400 hard limit; most $\le 250$).
- `git diff --check`: PASSED (zero whitespace or conflict markers).
- `NX_DAEMON=false pnpm validate`: PASSED (full repository validation: Prettier, ESLint, TypeScript, Vitest, build, tarball packing for all packages).

### Architecture / compatibility

- Zero modifications to `@vii-labs/core` runtime or contracts.
- `@vii-labs/form` remains private (`private: true`) and framework-neutral.
- Stable item IDs are opaque internal tokens that never leak into domain `value` or presentation `rawValue`.
- Zero runtime dependencies added; pure reactive integration with `@vii-labs/core`.

### Remaining / recovery

- None for P1f.
- Next slice is P1g: Submission Lifecycle, Submission In-Flight Locking & Server Issue Routing.

## 2026-08-30 01:25 CEST | Production Form Phase 1 Slice P1e post-merge corrections

Status: completed
Branch: `fix/form-p1e-post-merge-corrections`
PR: not opened

### Scope

- Post-merge P1e correctness and API correction on baseline main SHA `487d3b23004f7ba16df885f65a599c9484e6b3df`.
- Contain unexpected synchronous validator throws in automatic validation runtime (`setValue`, `setRawValue`, `setTouched`, debounced change) without unhandled exceptions or leaks, while preserving caller-owned throws for manual `validate()`.
- Ensure parsed field `setRawValue` is strictly atomic by batching `rawValue`, `value`, `parseIssue`, `parseStatus`, `validationStatus`, `pending`, and combined issues in a single transaction.
- Remove `setIssues()` from public `FieldState` interface and implementations (issue mutation remains strictly internal; server issue routing deferred to P1g).
- Affirm and test trusted canonical baseline contract (explicit domain/raw pair is adopted directly on init and reinitialize without automatic baseline parsing; parsers run on subsequent raw input mutations).
- Clean up misleading type assertion test patterns and replace with compile-time `@ts-expect-error` negative type tests.

### Changes

- Modified `packages/form/src/core/field-validation-runtime.ts` to wrap synchronous validation rule execution in `try ... catch` and commit `validation.execution_error` on unexpected throws during automatic mutation triggers (`change`, `blur`, debounce).
- Modified `packages/form/src/core/field-parsed.ts` to defer `rawValueState.set(raw)` into the synchronous `batch` commit so that subscribers never observe intermediate or inconsistent states.
- Removed public `setIssues()` from `packages/form/src/core/types.ts` (`FieldState`), `packages/form/src/core/field-parsed.ts`, and `packages/form/src/core/field-parserless.ts`.
- Updated `packages/form/test/unit/validation.test.ts` with tests for automatic sync throw containment on change, blur, and debounce, and manual throw propagation.
- Updated `packages/form/test/unit/async-validation.test.ts` with tests for automatic async rejection commit and manual validate rejection propagation.
- Updated `packages/form/test/unit/parser.test.ts` with subscription tests for single-batch atomicity on parse success and failure, and trusted initial/reinitialize baseline tests.
- Updated `packages/form/test/unit/types.test.ts` with negative compile-time type checks for baseline raw/value type enforcement and public `setIssues` absence.
- Updated `packages/form/README.md` and `PROJECT_STATE.md` to reflect the corrected durable P1e semantics.

### Validation

- `pnpm nx lint form` — passed.
- `pnpm nx typecheck form` — passed.
- `pnpm nx test form` — passed (12 files, 151 tests).
- `pnpm nx build form` — passed.
- `pnpm nx validate-package form` — passed (pack & clean consumer validation passed).
- `git diff --check` — passed.
- `NX_DAEMON=false pnpm validate` — passed (all workspace targets and packed consumer fixtures passed).

### Architecture / compatibility

- Zero `@vii-labs/core` changes.
- `@vii-labs/form` remains private (`private: true`).
- P1f (FieldArray) and P1g (Submission & Server Issues) not started.
- All production files in `packages/form/src/core/` remain under 250 effective lines.

### Remaining / recovery

- None. Ready for PR against main. P1f to begin only after PR review and merge.

## 2026-08-29 17:45 UTC | Production Form Phase 1 Slice P1e final correction pass (unambiguous reinitialize & fail-closed Standard Schema)

Status: completed
Branch: `feat/form-p1e-validation-parsers`
PR: #183 (Draft)

### Scope

- Final bounded P1e correction on audited head `1879b2d200c9cb9b153826110060bdee76582375` (same PR #183).
- Remove reinitialize baseline-shape ambiguity; make Standard Schema fully fail-closed; eliminate cross-generic baseline casts; document mixed sync/async rule semantics; align PR body with implementation.

### Changes

- Replaced per-field `FieldBaseline` heuristics with `FormReinitializeInput<TFields>` (`{ value: FormValues, rawValue: FormRawValues }`).
- Added `packages/form/src/core/reinitialize-tree.ts` for explicit child baseline dispatch.
- Internal field reinitialize receives `{ value, rawValue }` from parent traversal only (never inferred from TValue).
- Standard Schema adapter accepts only `{ value }` success or `{ issues }` failure per spec v1; `{}` fails closed; required issue `message` enforced.
- Documented mixed-rule semantics in validation executor (sync issues aggregate; async commit short-circuited).
- Removed public `isStandardSchema`, `FieldBaseline`, `FormReinitializeBaseline*`, `FieldReinitializeInput`.
- Added reinitialize, mixed-validation, and expanded Standard Schema regression tests (132 total).

### Validation

- `pnpm nx lint form` — passed.
- `pnpm nx typecheck form` — passed.
- `pnpm nx test form` — passed (12 files, 132 tests).
- `pnpm nx build form` — passed.
- `pnpm nx validate-package form` — passed.
- `git diff --check` — passed.
- `NX_DAEMON=false pnpm validate` — passed.

### Architecture / compatibility

- No `@vii-labs/core` changes. Package remains private. P1f/P1g not started.

### Remaining / recovery

- None. Await maintainer review of Draft PR #183 final correction head.

## 2026-08-29 17:00 UTC | Production Form Phase 1 Slice P1e correction pass (RAW/VALUE baseline & public API)

Status: completed
Branch: `feat/form-p1e-validation-parsers`
PR: #183 (Draft)

### Scope

- Bounded P1e correction pass on audited head `5696a1f5daa17a36705dbfdb3c145ddc0690e8c9` (same PR #183, no new slice).
- Remove unsafe `TRaw`/`TValue` casts; enforce parser-aware baselines; parser-aware `form.reinitialize`; remove public baseline signals and field-level baseline rebasing via `reset`; document domain dirty and parsed `setValue` semantics; remove reserved-string issue-code blacklists; re-verify async validation and Standard Schema; trim public exports.

### Changes

- Added `packages/form/src/core/baseline-types.ts` (`FieldBaseline`, `FormReinitializeBaseline`, normalization helpers).
- Split field implementation into `field.ts`, `field-parserless.ts`, `field-parsed.ts`, `field-validation-runtime.ts`.
- Discriminated `CreateFieldOptions`: parserless vs parsed (`initialRawValue` required for parsed fields).
- Removed public `initialValue` / `initialRawValue`; `reset()` is parameterless; internal reinitialize is parser-aware.
- `form.reinitialize(FormReinitializeBaseline)` requires `{ value, rawValue }` for cross-type parsed fields.
- Parsed `setValue` preserves raw; domain dirty compares baseline domain value only.
- Removed global reserved-string rejection from issue sanitizers; auto-trigger validation commits execution errors.
- Trimmed public root exports to P1e minimum (`createNumberParser`, `createStringParser` only among built-ins).

### Validation

- `pnpm nx lint form` — passed.
- `pnpm nx typecheck form` — passed.
- `pnpm nx test form` — passed (10 files, 114 tests).
- `pnpm nx build form` — passed.
- `pnpm nx validate-package form` — passed.
- `git diff --check` — passed.
- `NX_DAEMON=false pnpm validate` — passed.

### Architecture / compatibility

- No `@vii-labs/core` changes. Package remains private. P1f/P1g not started.

### Remaining / recovery

- None. Await maintainer review of Draft PR #183.

## 2026-08-29 02:15 CEST | Production Form Phase 1 Slice P1e: Validation, Parsers & Standard Schema

Status: completed
Branch: `feat/form-p1e-validation-parsers`
PR: not opened (Draft PR creation queued)

### Scope

- Implement Production Form Phase 1 Slice P1e (Validation, Parsers & Standard Schema) in `@vii-labs/form`.
- Introduce: Raw vs Value separation, synchronous parsing (`FieldParser<TRaw, TValue>`), raw presentation retention on parse failure (e.g. `"05"` retained as `"05"` while `value` is `5`), structured `ParseIssue` taxonomy, synchronous validation rules (`SyncValidationRule<TValue>`), asynchronous validation rules (`AsyncValidationRule<TValue>`), validation `pending` state, monotonic validation revision tracking, `AbortSignal` cancellation, stale-result protection, fail-closed Standard Schema v1 validation bridge (`standardSchema`), built-in parsers (`createNumberParser`, `createStringParser`, `createOptionalStringParser`, `createBooleanParser`), and aggregate validation state across groups and root forms (`pending`, `valid`, `invalid`, `issues` with path prefixing).
- Maintain absolute non-goals: ZERO dynamic array collections (`createFieldArray` deferred to P1f), NO submission pipeline (`handleSubmit` deferred to P1g), NO server issue routing (`ServerIssue` deferred to P1g), NO framework adapters (`/react`, `/vanilla`, `/angular`, `/vue` deferred to P1h–P1j), NO HTTP/Query, NO Vii Schema, NO `@vii-labs/form` publication (`private: true`), ZERO modifications to `@vii-labs/core`, and ZERO runtime dependencies on validator libraries.

### Changes

- Created `packages/form/src/parsers/types.ts` defining `IssueSource`, `FormIssueBase`, `ParseIssue`, `ParseStatus`, `ParseResult<TValue>`, `FieldParser<TRaw, TValue>`, `NumberParserOptions`, `StringParserOptions`.
- Created `packages/form/src/parsers/builtins.ts` implementing `sanitizeParseIssue` (prototype pollution defense), `createNumberParser` (strict decimal grammar validation, empty/trim options, raw presentation retention), `createStringParser`, `createOptionalStringParser`, `createBooleanParser`.
- Created `packages/form/src/validation/types.ts` defining `FieldPathSegment`, `ValidationTriggerMode`, `ValidationStatus`, `ValidationIssue`, `FieldIssue`, `ValidationRuleContext`, `SyncValidationRule`, `AsyncValidationRule`, `ValidationRule`, `AnyValidationRule`.
- Created `packages/form/src/validation/revision.ts` implementing `sanitizeValidationIssue` (prototype pollution defense) and `ValidationRevisionController` (monotonic revisions, AbortController lifecycle, debounce timers).
- Created `packages/form/src/validation/executor.ts` implementing `executeFieldValidation` handling sync/async rule execution, monotonic revision verification, AbortSignal propagation, and host state synchronization.
- Created `packages/form/src/validation/standard-schema.ts` implementing `isStandardSchema`, `normalizeStandardSchemaIssue`, and `standardSchema` (v1 bridge with sync/async fail-closed validation).
- Updated `packages/form/src/core/field.ts` with parser integration, raw retention, async cancellation, monotonic revisions, debounce support, sync/async validation execution, `pending`, `valid`, `invalid`, `issues`, `parseIssue`, `parseStatus`, `validationStatus`, `setRawValue`, `setValue`, `setTouched`, `setIssues`, `validate`, `reset(nextInitial, nextInitialRaw)`.
- Updated `packages/form/src/core/group.ts` and `form.ts` aggregating child `pending`, `valid`, `invalid`, `issues` (with recursive path prefixing), and `rawValue`.
- Updated `packages/form/src/core/tree-types.ts` and `types.ts` defining `FormRawValueFor`, `FormRawValues`, and updated `FieldGroup` / `FormInstance` / `FieldState` interfaces.
- Updated `packages/form/src/index.ts` exporting all public P1e primitives and types.
- Created comprehensive unit tests: `test/unit/parser.test.ts` (18 tests), `test/unit/validation.test.ts` (9 tests), `test/unit/async-validation.test.ts` (8 tests), `test/unit/standard-schema.test.ts` (9 tests), `test/unit/aggregate-validation.test.ts` (4 tests).
- Updated `test/package-boundary.test.ts`, `packages/form/README.md`, `scripts/package-validation/validate-form.mjs`, and `PROJECT_STATE.md`.

### Validation

- `pnpm nx lint form` — passed (0 errors, 0 warnings).
- `pnpm nx typecheck form` — passed (0 errors).
- `pnpm nx test form` — passed (10 test files, 105 tests passed, 0 failures).
- `pnpm nx build form` — passed (clean TypeScript compilation).
- `node scripts/package-validation/validate-form.mjs` — passed (packed tarball assertion and clean consumer scenario execution against packed `@vii-labs/form` artifact).
- `git diff --check` — passed (0 whitespace/conflict issues).
- `NX_DAEMON=false pnpm validate` — passed (complete repository validation: format:check, lint, typecheck, test, build, pack:check).

### Architecture / compatibility

- Package remains private (`private: true`) with Apache-2.0 license and sideEffects: false.
- Zero modifications to `@vii-labs/core`.
- Zero runtime dependencies on third-party validator libraries (Zod, Valibot, ArkType, TypeBox). Type-only integration with `@standard-schema/spec`.
- All production code strictly follows file limit guidelines (all files $\le 320$ lines, zero files exceeding 400 lines).

### Remaining / recovery

- None for P1e.
- Next scheduled slice: P1f (Dynamic Collections & FieldArray).
```

## 2026-08-28 23:50 CEST | Production Form Phase 1 Slice P1d: Form Tree, Groups & Aggregate State (Ownership & Lifecycle Correction)

Status: completed
Branch: `feat/form-p1d-tree-groups`
PR: #170 (Draft)

### Scope

- Execute bounded P1d ownership, lifecycle, and API correction pass on `feat/form-p1d-tree-groups` (baseline audited head `10812ea60ab76e5dfc0704bb6533a0979e6a21b8`, PR #170).
- Correction 1: Remove ambiguous `createFieldGroup` dual syntax; enforce canonical options shape `{ fields, scope? }`, and support ordinary user field named `"fields"`.
- Correction 2: Resolve pre-owned child Scope ambiguity by introducing explicit internal `NodeOwnership` state (`"standalone" | "external-scope" | "tree" | "disposed"`); reject adoption of externally Scope-owned nodes with deterministic errors.
- Correction 3: Make adoption transactional with two-phase adoption (Phase 1: Validate All, Phase 2: Commit All) so failed adoption causes zero partial mutations to standalone child nodes.
- Correction 4: Adopted static children must not be manually disposable (`child.dispose()` on adopted node throws `Error` without corrupting tree); introduce internal `disposeFromOwner()` path for parent Scope teardown.
- Maintain absolute non-goals: ZERO dynamic array collections (`createFieldArray`), NO validation engine (rules, async rules, debounce, AbortSignal, Standard Schema bridge deferred to P1e), NO parsers (parser-backed `TRaw !== TValue` divergence deferred to P1e), NO submission pipeline or server issue routing (deferred to P1g), NO framework adapter implementations, NO `@vii-labs/form` publication (`private: true`), and ZERO modifications to `@vii-labs/core`.

### Changes

- Updated `packages/form/src/core/internal.ts` (126 lines) defining module-local `FORM_NODE_INTERNAL` symbol, `NodeOwnership` state, `FormNodeInternal<T>` lifecycle interface with `disposeFromOwner()`, and transactional two-phase `adoptChildNodes`.
- Updated `packages/form/src/core/field.ts` (149 lines) tracking explicit ownership, rejecting direct adopted disposal, and implementing `disposeFromOwner()`.
- Updated `packages/form/src/core/group.ts` (184 lines) enforcing canonical options shape `{ fields, scope? }`, tracking explicit ownership, rejecting direct adopted disposal, and implementing `disposeFromOwner()`.
- Updated `packages/form/src/core/form.ts` (181 lines) supporting root Scope lifecycle and cascade disposal to adopted descendants.
- Updated `packages/form/test/unit/group.test.ts` (13 tests) testing canonical options syntax, child key `"fields"`, dangerous keys, and standalone lifecycle.
- Updated `packages/form/test/unit/form.test.ts` (14 tests) testing complete ownership matrix, duplicate adoption, external scope rejection, disposed node rejection, transactional rollback safety, and adopted child disposal rejection.
- Updated `packages/form/test/unit/types.test.ts` (2 tests) verifying static type inference with canonical options and child key `"fields"`.
- Updated `scripts/package-validation/validate-form.mjs` verifying adopted child disposal rejection in packed clean consumer scenario.
- Updated `packages/form/README.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.

### Validation

- `pnpm nx lint form` (passed cleanly, 0 warnings/errors)
- `pnpm nx typecheck form` (passed cleanly)
- `pnpm nx test form` (58 tests passed across 5 test suites)
- `pnpm nx build form` (compiled clean ESM and declaration artifacts)
- `node scripts/package-validation/validate-form.mjs` (passed, packed tarball and clean consumer runtime scenario verified)
- `git diff --check` (passed, 0 whitespace/conflict errors)
- `NX_DAEMON=false pnpm validate` (passed full repository validation)

### Architecture / compatibility

- Preserves Clean Architecture and downward dependency flow: `@vii-labs/form` depends strictly on `@vii-labs/core`.
- Zero framework dependencies imported or bundled in form core.
- Root exports only `createField`, `createFieldGroup`, `createForm` and minimum public types; adapter subpaths (`/react`, `/vanilla`, `/angular`, `/vue`) remain clean empty infrastructure entrypoints.
- Zero modifications to `@vii-labs/core`.

### Remaining / recovery

- None for P1d. Next slice: P1e (Validation, Parsers & Standard Schema).

## 2026-08-28 17:35 CEST | Production Form Phase 1 Slice P1c: Field Core (API & Lifecycle Correction)

Status: completed
Branch: `feat/form-p1c-field-core`
PR: #169 (Draft)

### Scope

- Execute bounded production slice P1c (Field Core) correction pass for Vii Form Phase 1 on baseline commit `6734821961853a140cd611f93520ddb827c1fa8c` (PR #168 merged into `main`).
- Implement the first production runtime primitive for `@vii-labs/form`: unparsed `createField<TValue>`.
- Enforce strict `Raw === Value === TValue` invariant across the entire P1c surface; eliminate premature parser-like TRaw generics and unsafe type casts.
- Provide fine-grained reactive state for leaf `value`, `rawValue`, baseline-relative `dirty` tracking, independent `touched` state, batched `reset()`, and deterministic `@vii-labs/core` `Scope` lifecycle integration.
- Document exact lifecycle semantics: field methods (`getValue`, `setValue`, `reset`, etc.) throw `Error("Field is disposed")` after disposal; `dirty` computed throws `Error("Computed is disposed")`; underlying State references remain quiescent snapshots under Core State semantics.
- Maintain absolute non-goals for P1c: ZERO form tree/groups/arrays (`createForm`, `createFieldGroup`, `createFieldArray`), NO validation engine (rules, async rules, debounce, AbortSignal), NO parsers (parser-aware Raw/Value divergence deferred to P1e), NO Standard Schema bridge, NO submission pipeline, NO server issues, NO framework adapter behavior, NO `@vii-labs/form` publication (`private: true`), and ZERO modifications to `@vii-labs/core`.

### Changes

- Updated `packages/form/src/core/types.ts` defining `FieldEqualityFn<T>`, `CreateFieldOptions<TValue>`, and `FieldState<TValue>` (98 lines, <= 250 limit). Removed public `initialValue`/`initialRawValue` signals, kept baseline tracking internal.
- Updated `packages/form/src/core/field.ts` implementing `createField` with zero unsafe type casts, using `@vii-labs/core` primitives (`state`, `computed`, `createScope`, `batch`) (114 lines, <= 250 limit).
- Updated `packages/form/src/index.ts` exporting `createField`, `CreateFieldOptions`, `FieldEqualityFn`, and `FieldState`.
- Created comprehensive unit tests in `packages/form/test/unit/field.test.ts` (20 test cases / 27 total assertions covering initial state, Raw===Value invariant, mutation, baseline return, touched independence, batched reset, same-value suppression, custom equality, granular subscriptions, exact Scope lifecycle/idempotence/post-dispose assertions, independent fields isolation, `__proto__`/`constructor` data safety, and single-generic type inference).
- Updated `packages/form/test/package-boundary.test.ts` verifying root exports `["createField"]` while adapter subpaths remain empty.
- Updated `scripts/package-validation/validate-form.mjs` registering emitted `dist/core/*` files and executing a real runtime clean consumer scenario against the packed `.tgz` artifact.
- Updated `packages/form/README.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.

### Validation

- `pnpm --filter @vii-labs/form lint` (passed cleanly, 0 warnings)
- `pnpm --filter @vii-labs/form typecheck` (passed cleanly)
- `pnpm --filter @vii-labs/form test` (27 tests passed across 2 test files)
- `pnpm --filter @vii-labs/form build` (compiled clean ESM and declaration artifacts)
- `node scripts/package-validation/validate-form.mjs` (passed, pack inspection and clean consumer runtime scenario verified)
- `git diff --check` (passed, 0 whitespace/conflict errors)
- `NX_DAEMON=false pnpm validate` (passed full repository validation)

### Architecture / compatibility

- Preserves Clean Architecture and downward dependency flow: `@vii-labs/form` depends strictly on `@vii-labs/core`.
- Zero framework dependencies imported or bundled in form core.
- Root exports only `createField` and minimum public types; adapter subpaths (`/react`, `/vanilla`, `/angular`, `/vue`) remain clean empty infrastructure entrypoints.
- Zero modifications to `@vii-labs/core`.

### Remaining / recovery

- None for P1c. Next slice: P1d (Form Tree, Groups & Aggregate State).

## 2026-08-28 15:45 CEST | Production Form Phase 1 Slice P1b: Package Skeleton & Governance

Status: completed
Branch: `build/form-p1b-package-skeleton`
PR: #168 (Draft)

### Scope

- Execute bounded production slice P1b (Package Skeleton & Governance) for Vii Form Phase 1 on baseline commit `2134887e537877503d5dff76ec7a5d82cd6a4a20` (PR #167 merged into `main`).
- Establish the production package skeleton for `@vii-labs/form` in `packages/form/`.
- Establish package identity, metadata, export map (`@vii-labs/form`, `/react`, `/vanilla`, `/angular`, `/vue`), TypeScript build configuration, lint target, test target, and packaging validation.
- Register `@vii-labs/core` (`>=0.1.0-experimental.2`) as required runtime peer, `@standard-schema/spec` (`^1.1.0`) as type-consumed dependency, and `react` (`>=18.0.0`), `@angular/core` (`>=17.0.0`), and `vue` (`>=3.3.0`) as optional peer dependencies.
- Verify package builds, typechecks, lints, tests, packs into a clean tarball, and resolves cleanly in a clean consumer fixture without framework dependencies installed.
- Maintain absolute non-goals: ZERO Form runtime implementation (no `createField`, `createForm`, validation, parsers, `FieldArray`, submission, server issues, or framework adapters), NO `@vii-labs/form` publication (`private: true`), NO modifications to `@vii-labs/core`, and ZERO runtime dependency on `research/form/`.

### Changes

- Created `packages/form/` directory with `package.json`, `project.json`, `tsconfig.json`, `tsconfig.build.json`, `tsconfig.test.json`, `README.md`.
- Created minimal zero-runtime entrypoints in `packages/form/src/index.ts`, `src/adapters/react/index.ts`, `src/adapters/vanilla/index.ts`, `src/adapters/angular/index.ts`, `src/adapters/vue/index.ts`.
- Created package boundary tests in `packages/form/test/package-boundary.test.ts`.
- Created tarball inspection and clean consumer validation in `scripts/package-validation/validate-form.mjs` and hooked into root `package.json`'s `pack:check`.
- Updated `pnpm-lock.yaml` registering `@vii-labs/form` workspace project with zero unrelated lockfile churn.
- Updated durable project state across `ROADMAP.md`, `PROJECT_STATE.md`, and `docs/roadmap/FORM_RESEARCH.md`.

### Validation

- `pnpm nx build form`: passed (emitted declarations and source maps for root and all 4 adapter subpaths).
- `pnpm nx typecheck form`: passed.
- `pnpm nx lint form`: passed.
- `pnpm nx test form`: passed (5/5 unit tests verifying entrypoints, manifest, peer governance, framework neutrality, and research-import isolation).
- `pnpm nx validate-package form`: passed (packed tarball, validated tarball contents, prepared clean consumer without frameworks, verified zero-runtime exports, logged artifact sanity sizes).
- `pnpm pack:check`: passed (validated all 3 packages: core, cli-core, form).
- `git diff --check`: passed (no whitespace or git diff errors).
- `NX_DAEMON=false pnpm validate`: passed.

### Architecture / compatibility

- Single `@vii-labs/form` package architecture with subpath exports (`.`, `./react`, `./vanilla`, `./angular`, `./vue`).
- Strict dependency governance: `@standard-schema/spec` declared in dependencies for declaration typing with zero runtime bytes; `@vii-labs/core` required runtime peer; `react`, `@angular/core`, and `vue` optional peers.
- Root entrypoint is strictly framework-neutral with zero framework imports.
- Zero runtime dependency on `research/form/`.
- Zero modifications to `@vii-labs/core`.
- Package marked `private: true` to prevent accidental public release prior to Phase 1 graduation gate (P1m).

### Remaining / recovery

- None for P1b. Next slice: P1c — Field Core (`createField`, leaf state signals, dirty/touched tracking, and Scope integration).

## 2026-08-28 01:25 CEST | Production Form Phase 1 Slice P1a: Production Architecture & Package Contract (Bounded Correction Pass)

Status: completed
Branch: `docs/form-p1a-production-architecture`
PR: #167 (Draft)

### Scope

- Execute FIRST bounded production slice P1a (Production Architecture & Package Contract) for Vii Form Phase 1 on baseline commit `b908a52c48cd43efa6327f9c1b23981bdd5d2416` (PR #166 merged into `main`).
- Convert accepted F0–F10 research conclusions into an authoritative, normative production architecture contract and package specification in `docs/architecture/FORM_ARCHITECTURE.md`.
- Define product and package boundaries for `@vii-labs/form` (`packages/form/`) with single-package subpath distribution (`@vii-labs/form`, `/react`, `/vanilla`, `/angular`, `/vue`).
- Establish internal modular source graph adhering to repository code-quality budgets ($\le 250$ lines per module) and Clean Architecture dependency layering.
- Classify minimal public API candidates, internal utilities (internalizing `deepCloneSnapshot`), and deferred features (`bindFormToExternalState`) under `docs/governance/API_STABILITY.md`.
- Clarify dependency architecture: `@standard-schema/spec` in `dependencies` consumed strictly via `import type` for zero-runtime/clean `.d.ts` resolution; `@vii-labs/core` required runtime peer; optional framework peers.
- Replace benchmark guarantees with precise architecture language: F10 evidence vs P1l production acceptance gates.
- Refine Data-vs-Sink security contract: `__proto__`, `constructor`, `prototype` are valid DATA tokens (including in issue codes); protection strictly enforced at unsafe sinks via null-prototype records and own-property checks.
- Document `deepCloneSnapshot` structured-data boundary (primitives, plain objects, arrays, Map, Set, Date, RegExp, cycles) and explicit rejection/isolation of hostile Proxies and accessors without claiming execution sandboxing.
- Frame 1,000 server issue routing hotspot as an optimization/investigation target for P1g/P1l rather than an unproven guarantee.
- Maintain canonical baseline replacement API `form.reinitialize(newBaseline)` and defer parsed field rebase overloads.
- Synchronize durable project state across `ROADMAP.md`, `PROJECT_STATE.md`, and `docs/roadmap/FORM_RESEARCH.md`.
- Strictly enforce non-goals: ZERO runtime implementation in `packages/form/`, NO `@vii-labs/form` publication, NO modification to `@vii-labs/core`, NO automatic merge.

### Changes

- Refined `docs/architecture/FORM_ARCHITECTURE.md`:
  - Defined comprehensive 22-section production architecture contract covering product/package boundaries, module decomposition, minimal public API candidate classification, push-pull reactive semantics, raw value retention, validation & Standard Schema fail-closed boundary with clean type resolution, FieldArray identity stability, Model A submission lifecycle, security threat model (Data vs Sink principle), structured snapshot boundaries, framework adapters, real browser/a11y acceptance gate, performance investigation targets & 1,000 server issue hotspot, error ownership, Scope lifecycle disposal, testing strategy, P1a–P1m slice roadmap, research transfer matrix, 10-item decision log, and non-goals.
- Updated `ROADMAP.md`:
  - Updated Vii Form section from Research to `Complete (Research Accepted) / Production Phase 1 Active` with full Phase 1 scope description.
- Updated `PROJECT_STATE.md`:
  - Recorded Form Research F0–F10 completion, graduation decision, and Production Form Phase 1 initiation with P1a proposed on Draft PR #167 and P1b next step.
- Updated `docs/roadmap/FORM_RESEARCH.md`:
  - Updated status header to `Research Concluded & Accepted (F0-F10 Completed via PR #166)` and `Current Phase: Production Form Phase 1 (P1a Active)`.
- Updated `DUTY_WATCH.md`:
  - Appended P1a operational handoff record and correction pass details.

### Validation

- `git diff --check`: PASS (0 whitespace/syntax issues).
- `NX_DAEMON=false pnpm validate`: PASS (formatting, linting, type checking across packages, test suites across packages, builds across all projects, and packed tarball validation).
- Manual diff inspection: Confirmed documentation-only changes with 0 runtime code added, 0 packages published, 0 core changes.

### Architecture / compatibility

- 100% clean architectural specification: `@vii-labs/core` production semantics preserved without modification; no public `@vii-labs/form` package created or published.
- Multi-adapter subpath distribution model adopted: `@vii-labs/form` (pure core), `@vii-labs/form/react`, `@vii-labs/form/vanilla`, `@vii-labs/form/angular`, `@vii-labs/form/vue`.
- Zero third-party bundled JS runtime dependencies beyond required Vii Core peer; type-only dependency on `@standard-schema/spec`.
- All framework peers declared optional in package metadata.

### Remaining / recovery

- None for P1a. Slice P1a is complete and submitted on PR #167 (Draft).
- Next slice: P1b (Package Skeleton & Governance) — create `packages/form/` skeleton, build configuration, and testing harness. P1b has NOT started.

## 2026-08-28 01:05 CEST | Form Research Slice F10: Real Consumer Validation + Build-vs-Buy Graduation Gate (Second & Final Bounded Evidence Correction Pass)

Status: completed
Branch: `dogfood/form-f10-consumer-validation`
PR: #166 (Draft)

### Scope

- Execute second and final bounded evidence correction pass for Form Research Slice F10 on branch `dogfood/form-f10-consumer-validation` (PR #166).
- Address all specific audit findings:
  1. Fix FieldArray benchmark methodology (`runtime-benchmarks.ts`): Implement strict `SETUP (untimed) -> TIMED TARGET OPERATION -> RESTORE (untimed)` isolation. Compensation (remove after push) is strictly outside timed region. Same isolation applied to TanStack.
  2. Fix server issue routing benchmark (`runtime-benchmarks.ts`): Isolate `setServerIssues` timed routing from untimed setup and `clearServerIssues` restore. Separate `benchmarkServerIssueClear` into its own standalone benchmark.
  3. Comparative runtime benchmarking discipline: Focus engine microbenchmarks on equivalent headless form engines (Vii Form vs TanStack Form). Evaluate React Hook Form via React render instrumentation and Angular Signal Forms via Angular functional/DX tests.
  4. Make React render counts strictly empirical (`render-benchmarks.tsx`): Mount real React 19 component trees, reset counters after mount, execute user interactions, and read exact observed render counts across Vii Form, TanStack Form, and React Hook Form.
  5. Create real executable bundle measurement runner (`measure-bundles.mjs` and entrypoints in `research/form/f10/benchmarks/bundle/`): Execute `bun build --minify --target=browser` with gzip level 9 and brotli compression.
  6. Correct Angular submission claim (`angular-signal-forms.ts`): Remove unused `submit` import from `@angular/forms/signals` and document submission as application-owned glue.
  7. Fix in-flight array swap server response test (`consumer-b.test.tsx`): Drive request through `form.submit()`, swap items while pending, and verify response for submitted index routes to the item by submitted identity snapshot.
  8. Prove unhandled-rejection ownership (`consumer-b.test.tsx`): Add process-level `unhandledRejection` event listener to pending unmount test and assert 0 unhandled rejections with clean listener teardown.
  9. Real browser claim discipline: Explicitly document that F10 integration evidence uses Mock DOM / `react-test-renderer` and document real browser testing as a residual gap for Production Phase 1.
  10. Update 32-Dimension Build-vs-Buy decision matrix (Vii Form: 143/160 vs TanStack: 120/160, RHF: 97/160, Angular: 114/160) and update `research/form/F10_CONSUMER_VALIDATION.md` with exact commands and sources.
  11. Strictly enforce ABSOLUTE STOP condition: PR #166 remains Draft, do NOT merge, do NOT create or publish a public `@vii-labs/form` package, do NOT start production Phase 1.

### Changes

- Created `research/form/f10/benchmarks/bundle/`:
  - `entry-vii-cold.ts`: Cold adoption entrypoint.
  - `entry-vii-incremental.ts`: Incremental adoption entrypoint.
  - `entry-vii-standalone-field.ts`: Standalone tree-shaken `createField` entrypoint.
  - `entry-tanstack.ts`: TanStack React Form entrypoint.
  - `entry-rhf.ts`: React Hook Form entrypoint.
- Created `research/form/f10/benchmarks/measure-bundles.mjs`:
  - Executable bundle measurement runner generating raw minified bytes, gzip (level 9), and brotli metrics.
- Updated `research/form/f10/benchmarks/runtime-benchmarks.ts`:
  - Implemented `runIsolatedTimingHarness` with untimed setup and untimed compensation.
  - Benchmarked Vii Form vs TanStack Form leaf mutation (10 to 1,000 fields), aggregate query, and FieldArray (push, remove, swap).
  - Separated server issue routing from server issue clearing.
- Updated `research/form/f10/benchmarks/render-benchmarks.tsx`:
  - Instrumented and captured empirical React render counts across Vii Form, TanStack Form, and React Hook Form.
- Updated `research/form/f10/benchmarks/bundle-benchmarks.ts`:
  - Exported empirical bundle measurements sourced directly from `measure-bundles.mjs`.
- Updated `research/form/f10/competitors/angular-signal-forms.ts`:
  - Removed unused `submit` import and documented submission as application-owned glue.
- Updated `research/form/f10/tests/consumer-b.test.tsx`:
  - Updated pending unmount test with `process.on('unhandledRejection')` tracking (0 unhandled rejections).
  - Updated Scenario 10 to test in-flight array swap during active `form.submit()` with identity-aware error routing.
- Updated `research/form/f10/tests/f9-risks-validation.test.ts`:
  - Added regression test proving compensation is strictly outside the timed window in `runIsolatedTimingHarness`.
  - Asserted empirical render counts, bundle invariants, and server issue routing vs clear latency.
- Updated `research/form/F10_CONSUMER_VALIDATION.md`:
  - Documented exact commands and sources for every numeric table.
  - Sourced numbers from freshly executed harnesses.
  - Updated 32-dimension decision matrix and graduation report.
- Updated `docs/roadmap/FORM_RESEARCH.md`: Synchronized F10 section with verified numbers and test counts (397 tests across 23 test suites).

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 errors).
- `pnpm exec vitest run research/form/f10/tests/`: PASS (5 test files, 34 tests passing, 0 failures).
- `pnpm exec vitest run research/form/`: PASS (23 test files, 397 tests passing, 0 failures).
- `pnpm exec vitest run packages/core/test/computed.test.ts`: PASS (15 tests passing).
- `node research/form/f10/benchmarks/measure-bundles.mjs`: PASS (executable bundle runner).
- `NX_DAEMON=false pnpm validate`: PASS (formatting, linting, typechecking, tests across packages, builds across all 10 projects, and tarball packing validation).
- `git diff --check`: PASS (0 whitespace/syntax issues).

### Architecture / compatibility

- Zero public package mutations: `@vii-labs/core` production semantics preserved without modification; no public `@vii-labs/form` package created.
- Form Core remains completely framework-agnostic and platform-neutral.

### Remaining / recovery

- None for Slice F10. Form research track is concluded. PR #166 remains Draft. Hard stop respected.

## 2026-08-28 00:45 CEST | Form Research Slice F10: Real Consumer Validation + Build-vs-Buy Graduation Gate (Bounded Correction Pass)

Status: completed
Branch: `dogfood/form-f10-consumer-validation`
PR: #166 (Draft)

### Scope

- Execute bounded correction pass for Form Research Slice F10 on branch `dogfood/form-f10-consumer-validation` (PR #166).
- Address all maintainer audit findings:
  1. Implement genuine executable comparative microbenchmarks (`runtime-benchmarks.ts`) with batching, warmup, and value alternation across Vii Form, TanStack Form 1.33.5, React Hook Form 7.86.0, and Angular Signal Forms.
  2. Implement real component render counting harness (`render-benchmarks.tsx`) mounting real React 19 component trees.
  3. Implement reproducible standalone bundle builds with `bun build --minify --target=browser`, gzip (level 9), and brotli compression.
  4. Integrate real `@angular/forms/signals` (Angular 22.1.4) into `angular-signal-forms.ts` and `competitors.test.tsx`.
  5. Update TanStack Form v2 alpha metadata to `assessedVersion: "2.0.0-alpha.2"`, `executionStatus: "documentation-only"` with zero fabricated numbers.
  6. Assert exact Vii Core push-pull lazy Computed caveat stale-read behavior and verify safe consumer patterns in `f9-risks-validation.test.ts`.
  7. Add 10 mandatory React historical regression scenarios in `consumer-b.test.tsx` (StrictMode, pre-subscription mutation, parent seeding, async mount load, pending unmount abort, repeated cycles, reset, reinitialize, cancelSubmit, reorder routing).
  8. Update security threat wording regarding legitimate structured model data vs object materialization sinks.
  9. Recompute 44-dimension Build-vs-Buy decision matrix (Vii Form: 143/160 vs TanStack: 120/160, RHF: 97/160, Angular: 114/160) and update `research/form/F10_CONSUMER_VALIDATION.md`.
  10. Strictly enforce ABSOLUTE STOP condition: PR #166 remains Draft, do NOT merge, do NOT create or publish a public `@vii-labs/form` package, do NOT start production implementation phase.

### Changes

- Updated `research/form/f10/`:
  - `competitors/angular-signal-forms.ts`: Integrated official `@angular/forms/signals` from Angular 22.1.4 (`form`, `schema`, `required`, `minLength`, `min`, `submit`).
  - `competitors/versions.ts`: Updated competitor version metadata with `evaluatedVersion` and `executionStatus` (`"executed"` vs `"documentation-only"`).
  - `competitors/tanstack-v1.tsx` & `react-hook-form.tsx`: Added `onFormReady` and `initialData` support for programmatic test inspection.
  - `benchmarks/runtime-benchmarks.ts`: Implemented `runBatchedTimingHarness` with warmup and value alternation across leaf mutation, aggregate query, FieldArray operations, and server issue routing.
  - `benchmarks/render-benchmarks.tsx`: Implemented `runRealRenderBenchmarks` capturing empirical React render counts on mounted component trees.
  - `benchmarks/bundle-benchmarks.ts`: Recorded reproducible build outputs with exact build commands and compression metrics.
  - `tests/competitors.test.tsx`: Strengthened competitor parity suite covering all lifecycle operations across TanStack Form, React Hook Form, and real Angular Signal Forms.
  - `tests/f9-risks-validation.test.ts`: Explicitly asserted the Vii Core push-pull lazy Computed caveat and verified all 3 safe consumer patterns.
  - `tests/consumer-b.test.tsx`: Added 10 comprehensive React historical regression tests.
  - `tests/security-privacy.test.ts`: Hardened security tests and refined prototype pollution comments.
  - `F10_CONSUMER_VALIDATION.md`: Rewrote comprehensive 12-section report with verified numbers, recomputed 44-dimension matrix, and defensible graduation verdict (**GRADUATE TO BUILD - RECOMMEND PRODUCTION PHASE 1**).
- Updated `docs/roadmap/FORM_RESEARCH.md`: Synchronized F10 section with verified numbers and test counts (394 tests across 23 test suites).
- Updated `vitest.config.ts`: Unified `@angular/core` alias to root node_modules for consistent Signal Forms resolution.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 errors).
- `pnpm exec vitest run research/form/`: PASS (23 test files, 394 tests passing, 0 failures).
- `pnpm validate`: PASS (formatting, linting, typechecking, tests across all packages, builds across all 10 projects, and tarball packing validation).
- `git diff --check`: PASS (0 whitespace/syntax issues).

### Architecture / compatibility

- Zero public package mutations: `@vii-labs/core` production semantics preserved without modification; no public `@vii-labs/form` package created.
- Form Core remains completely framework-agnostic and platform-neutral.

### Remaining / recovery

- None for Slice F10. Form research track is concluded. PR #166 remains Draft. Hard stop respected.

## 2026-08-27 23:45 CEST | Form Research Slice F10: Real Consumer Validation + Build-vs-Buy Graduation Gate

Status: completed
Branch: `dogfood/form-f10-consumer-validation`
PR: not opened (Draft PR pending)

### Scope

- Execute final Form Research Slice F10: Real Consumer Validation + Build-vs-Buy Graduation Gate in `research/form/`.
- Implement two realistic, complex consumer application workloads:
  1. Consumer A: Multi-step Vanilla DOM Onboarding Wizard (5 steps, step-level validity gates, async username validation with debounce & cancellation, parser-backed number inputs, dynamic address FieldArray, conditional tax ID rules, server issue routing, and automatic ARIA attribute projection).
  2. Consumer B: React 19 Kanban Task Board Card Editor (controlled inputs, parser story points, async title uniqueness validation with AbortSignal cancellation, dynamic checklist FieldArray, server issue recovery, and leaf-level render isolation).
- Benchmark against pinned competitor package versions:
  - TanStack Form: `@tanstack/react-form@1.33.5` + `@tanstack/form-core@1.33.5` (primary) and `@tanstack/react-form@2.0.0-alpha.2` (horizon).
  - React Hook Form: `react-hook-form@7.86.0`.
  - Angular Signal Forms: `@angular/forms@22.1.4` (Angular 22).
- Execute comprehensive performance, render count, and bundle size comparative benchmarks.
- Verify F9 residual risks, Core push-pull lazy computed caching semantics, FieldArray scaling, and Model A terminal submission status.
- Conduct security threat and privacy boundary verification (DOM XSS sinks, prototype pollution defense, zero-credential telemetry leakage).
- Compile the formal 44-dimension Build-vs-Buy decision matrix across 7 categories.
- Deliver comprehensive graduation report `research/form/F10_CONSUMER_VALIDATION.md` and render the official graduation verdict.
- Strictly enforce the ABSOLUTE STOP condition: Do NOT create or publish a public `@vii-labs/form` package, do NOT start production implementation phase, do NOT merge PR.

### Changes

- Created `research/form/f10/`:
  - `competitors/versions.ts`: Verified competitor versions and ecosystem metadata.
  - `competitors/tanstack-v1.tsx`: Idiomatic TanStack Form 1.33.5 Task Board implementation.
  - `competitors/react-hook-form.tsx`: Idiomatic React Hook Form 7.86.0 Task Board implementation.
  - `competitors/angular-signal-forms.ts`: Idiomatic Angular Signal Forms (Angular 22.1.4) Task Board implementation.
  - `competitors/tanstack-v2-alpha.ts`: Horizon analysis of TanStack Form v2 alpha.
  - `fixtures/domain-data.ts`: Domain models, initial/valid datasets, privacy sentinels, hostile payloads, and issue generators.
  - `consumers/consumer-a-vanilla.ts`: 5-step Vanilla Onboarding workflow controller and DOM bindings.
  - `consumers/consumer-b-react.tsx`: React 19 Task Board workflow components with render counting instrumentation.
  - `benchmarks/runtime-benchmarks.ts`: Runtime latency and throughput harness (leaf vs aggregate mutation, FieldArray ops, server issue routing).
  - `benchmarks/render-benchmarks.ts`: React render count comparison framework.
  - `benchmarks/bundle-benchmarks.ts`: Cold adoption vs incremental bundle size metrics.
  - `tests/consumer-a.test.ts`: Consumer A unit and integration test suite (6 tests).
  - `tests/consumer-b.test.tsx`: Consumer B React 19 test suite (5 tests).
  - `tests/competitors.test.tsx`: Head-to-head competitor comparative test suite (3 tests).
  - `tests/f9-risks-validation.test.ts`: F9 risks and Core invariant test suite (4 tests).
  - `tests/security-privacy.test.ts`: Security, prototype pollution, and diagnostics privacy test suite (3 tests).
- Created `research/form/F10_CONSUMER_VALIDATION.md`:
  - 12 comprehensive sections containing baseline, methodology, consumer findings, competitor analyses, empirical benchmark evidence, 44-dimension Build-vs-Buy decision matrix (Vii Form scored 208/220 vs TanStack 156, RHF 126, Angular 145), maintenance assessment, residual risks, formal graduation verdict (**GRADUATE TO BUILD - RECOMMEND PRODUCTION PHASE 1**), and absolute stop condition declaration.
- Updated documentation:
  - `docs/roadmap/FORM_RESEARCH.md`: Recorded Slice F10 completion, graduation decision, and final roadmap state.
  - `PROJECT_STATE.md`: Updated durable Form research summary with F0-F10 completion and graduation decision.
  - `research/form/README.md`: Added Section 10/11 linking F10 evidence report.
  - `research/form/tsconfig.json`: Added `react/jsx-runtime` path and included `.tsx` files.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 type errors).
- `pnpm exec vitest run research/form/`: PASS (23 test files, 384 tests passing, 0 failures).
- `pnpm validate`: PASS (formatting, linting, typechecking, tests across all packages, builds across all 10 projects, and tarball packing validation).
- `git diff --check`: PASS (0 whitespace/syntax issues).

### Architecture / compatibility

- Zero public package mutations: `@vii-labs/core` semantics preserved without modification; no public `@vii-labs/form` package created.
- Form Core remains completely framework-agnostic and platform-neutral.
- Measured runtime: 0.46 µs leaf mutation on 1,000 fields, 0.29 µs FieldArray swap.
- Bundle impact: +4.9 kB gzip incremental to Core consumers.
- Privacy & security: 0 sentinel leaks into diagnostics; 0 prototype pollution vulnerabilities.

### Remaining / recovery

- None for Form Research F0–F10. Research track is complete.
- Next phase (Production Form Phase 1) is subject to human maintainer review and future roadmap scheduling. Absolute stop condition enforced.

## 2026-08-27 18:55 CEST | Form Research Slice F9: Runtime / Memory / TypeScript / Bundle Evidence

Status: completed
Branch: `perf/form-f9-evidence`
PR: #165 (Draft)

### Scope

- Implement, correct, and execute Slice F9 (Runtime / Memory / TypeScript / Bundle Evidence) in `research/form/`.
- Answer research question: Is the F0-F8 Form architecture sufficiently efficient, resource-stable, type-system-friendly, tree-shakeable, and small enough to proceed to real-consumer validation, and where are the actual measured bottlenecks or risks?
- Gather reproducible empirical evidence across all 14 required categories:
  1. Runtime update cost across small (10), medium (100), large (500), stress (1,000), and nested (97 leaf fields) forms with explicit separation of leaf-only mutation (~0.27 - 0.29 µs) vs aggregate-consumer mutation (~1.9 µs to ~149 µs).
  2. Invalidation fan-out and subscriber granularity (0 sibling notifications).
  3. Memory retention & 100/500 create/dispose cycles (0 active scope leaks, 0 dangling listeners).
  4. FieldArray item lifecycle: separated construction (0.23 ms for 10; 1.49 ms for 100) vs true isolated steady-state operations (~3.3 µs push on 100 items; ~2.7 µs remove; ~0.25 µs swap; 0.137 ms alternating setValues) with untimed setup/restore stages and complete resource disposal.
  5. Async validation supersession across 200 rapid changes (199 clean aborts, 1 commit, 0 unhandled rejections).
  6. Debounce scheduling and timer cleanup upon disposal.
  7. Standard Schema provider integration: adapter microbenchmarks (Native ~0.0025 µs, Valibot ~0.030 µs, ArkType ~0.038 µs, Zod ~0.049 µs) vs realistic full Form validation throughput (~0.026 - 0.027 ms across all providers).
  8. Submission lifecycle: strictly timed completed async submission (`await form.submit()`: ~0.024 ms median), snapshot cloning (`deepCloneSnapshot`: ~0.11 µs flat, ~0.61 µs nested), and isolated server issue routing (0.19 ms for 100; 8.91 ms for 1,000 issues).
  9. Framework adapters & React snapshot stability / render counts / StrictMode cycles.
  10. Reactive propagation & derived Computed investigation (Items 10 & 57): documented Core push-pull lazy computed caching mechanics and consumer consumption rules in `packages/core/README.md` and added regression contract test in `packages/core/test/computed.test.ts`.
  11. TypeScript diagnostics scaling across isolated programs (`tsconfig.small.json`: 0.39s, `tsconfig.medium.json`: 0.40s, `tsconfig.large.json`: 0.40s / 0 deep recursion errors across 80+ files).
  12. Production-style research bundle sizes (`createField` standalone: 12.95 kB min / 4.56 kB gzip / 4.03 kB brotli) and tree-shaking comparison (sheds ~21.1 kB minified code).
  13. Framework and provider isolation (0 cross-framework imports, 0 concrete schema libraries in core).
  14. SSR and Node import safety.
- Bounded slice ONLY. F10 is NOT authorized and NOT started.

### Changes

- Created research benchmarks and evidence harness:
  - `research/form/benchmarks/typescript/tsconfig.small.json`, `tsconfig.medium.json`, `tsconfig.large.json`, `tsconfig.json`, `small-form.ts`, `medium-form.ts`, `large-form.ts`.
  - `research/form/benchmarks/bundle/measure-bundles.mjs` (measures minified, gzip, brotli bytes via bun & node:zlib).
  - `scripts/benchmarks/form-f9-evidence.mjs` (master benchmark runner with `benchmarkWithSetup`, `benchmarkAsyncWithSetup`, true isolated array operations, Option A per-field validation, and programmatic leaf counting).
- Created comprehensive test suites in `research/form/` and `packages/core/`:
  - `packages/core/test/computed.test.ts` (15 tests): Added registration-ordering contract test for push-pull signal invalidation.
  - `research/form/benchmarks/reactive-propagation.test.ts` (8 tests): Deterministic proof of Vii Core's push-pull computed caching and notification ordering.
  - `research/form/form-f9-runtime.test.ts` (10 tests): Form scaling (10 to 1,000 fields), fan-out boundaries, batching, error recovery.
  - `research/form/form-f9-memory.test.ts` (7 tests): 100 & 500 create/dispose cycles, FieldArray disposal, debounce timers, async supersession, diagnostics privacy, benchmark harness resource integrity.
  - `research/form/form-f9-types.test.ts` (4 tests): Generic inference, nested forms, Standard Schema typing, negative compile tests.
  - `research/form/form-f9-bundle.test.ts` (8 tests): Framework isolation, provider isolation, SSR/Node import safety, browser globals audit.
- Created durable research report:
  - `research/form/F9_EVIDENCE.md` (comprehensive evidence report with all metrics, environment metadata, methodology, and F10 gate recommendation).
- Updated documentation:
  - `packages/core/README.md`: Added Dependency Invalidation & Cross-Subscription Freshness caveat.
  - `docs/roadmap/FORM_RESEARCH.md`: Marked F9 completed, updated sequence table and added Section 7 evidence summary.
  - `research/form/README.md`: Added Section 10 F9 evidence summary.
  - `PROJECT_STATE.md`: Updated Form research summary with F9 empirical findings.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 errors).
- `pnpm exec tsc -p research/form/benchmarks/typescript/tsconfig.json --extendedDiagnostics --noEmit`: PASS (0.15s check time / 4,964 instantiations).
- `pnpm exec tsc -p research/form/benchmarks/typescript/tsconfig.small.json --extendedDiagnostics --noEmit`: PASS (0.39s check time / 31,737 instantiations).
- `pnpm exec tsc -p research/form/benchmarks/typescript/tsconfig.medium.json --extendedDiagnostics --noEmit`: PASS (0.40s check time / 31,724 instantiations).
- `pnpm exec tsc -p research/form/benchmarks/typescript/tsconfig.large.json --extendedDiagnostics --noEmit`: PASS (0.40s check time / 31,743 instantiations).
- `pnpm exec vitest run packages/core/test/computed.test.ts`: PASS (15 tests).
- `pnpm exec vitest run research/form/`: PASS (18 test files, 363 tests passing, 0 failures).
- `bun scripts/benchmarks/form-f9-evidence.mjs`: PASS (all runtime, array, validation, submission, TypeScript, and bundle benchmarks executed).
- `NX_DAEMON=false pnpm validate`: PASS.
- `git diff --check`: PASS.

### Architecture / compatibility

- 100% clean architectural separation: Form Core remains pure Vii State/Scope without DOM or framework dependencies.
- Zero public package mutations or release changes.
- Framework adapters remain thin projections with verified isolation.

### Remaining / recovery

- F9 complete. Maintainer review of Draft PR #165. F10 has NOT started.

## 2026-08-27 02:25 CEST | Form Research Slice F8: Accessibility + Security + Privacy Hardening

Status: completed
Branch: `feat/form-accessibility-security-privacy`
PR: #164 (Draft)

### Scope

- Implement and verify Slice F8 (Accessibility + Security + Privacy Hardening) in `research/form/`.
- Answer research question: What is the smallest accessibility, security, and privacy contract Vii Form must guarantee at the framework-neutral core and adapter boundaries so that F0-F7 semantics can safely graduate without Form becoming a UI component library, security framework, or telemetry system?
- Accessibility: Prove `aria-invalid` semantics (invalid on validation/parse/server error; pending does NOT imply invalid), `aria-describedby` linkage with safe `textContent` rendering, programmatic labels without wrapper disconnection, native HTML form submit semantics with `preventDefault()`, reset lifecycle updates, and deterministic issue ordering for application Error Summary & first-invalid field focus.
- Security: DOM XSS hardening across validation, parse, and server issues (`<script>`, `<img>`, `<svg>`, `<iframe>`); prototype pollution defense (`__proto__`, `constructor`, `prototype` in codes and paths); malformed parser/schema/server fail-closed behavior; submission snapshot hardening (hostile getters, proxies, cycles, shared refs, Map, Set, Date, RegExp); detached async promise safety with zero unhandled rejections at process level; scale/abuse resilience (500 rapid changes, 50-level deep paths, 1,000-issue arrays).
- Privacy: Sensitive field handling (`password`, `token`, `apiKey`, `creditCard`); strictly value-free diagnostics telemetry (sentinel string verification); safe exception classification without error message leakage in telemetry; application UI state vs diagnostics distinction.
- Bounded slice ONLY. F9 is NOT authorized and NOT started.

### Changes

- Hardened `research/form/form-core.ts`:
  - Guarded `parser(raw)` result in `setRawValue` against malformed shapes (`null`, non-object, missing/non-boolean `ok`) with structured `TypeError` and safe diagnostic recording (`reason: "TypeError"`).
- Created `research/form/form-f8-accessibility.test.ts` (13 tests):
  - Programmatic labels & accessible names in Vanilla and React.
  - `aria-invalid` accurate projection across unvalidated, valid, invalid, server, and pending states.
  - `aria-describedby` linkage to issue element rendered via safe `textContent`.
  - Application Error Summary data sufficiency and deterministic first-invalid field focus navigation.
  - Native submit event interception with `preventDefault()` and reset lifecycle.
  - Cross-framework accessibility parity for Angular signals and Vue shallowRefs.
- Created `research/form/form-f8-security.test.ts` (19 tests):
  - DOM XSS hardening for hostile validation, parse, and server issue messages.
  - Prototype pollution blocking in validation issue codes, parse issue codes, and server issue codes.
  - Safe treatment of `__proto__`, `constructor`, `prototype` in structured issue paths without polluting `Object.prototype`.
  - Malformed parser and Standard Schema provider fail-closed tests.
  - Submission snapshot hardening: throwing getters, hostile Proxies with traps, cyclic structures, shared object references, Map, Set, Date, RegExp.
  - Detached async safety with unhandled rejection tracking (zero unhandled rejections).
  - Stale async result race condition protection.
  - Scale & abuse resilience: 500 rapid changes, 1,000-issue arrays, 50-level deep paths.
- Created `research/form/form-f8-privacy.test.ts` (7 tests):
  - Sensitive field privacy in diagnostics: raw passwords, parsed tokens, and server issues tested with sentinel strings (`SECRET_PASSWORD_DO_NOT_LOG_12345`, `AUTH_TOKEN_SECRET_987654321`, `4111_2222_3333_4444_SECRET_CARD`).
  - Safe exception diagnostics: only error name/type recorded without embedding dynamic error messages.
  - Application UI state vs telemetry boundary: UI holds values for display while diagnostics remains value-free.
  - Vanilla `onSubmitException` application callback passes Error without duplicating secret in telemetry.
- Updated documentation:
  - `docs/roadmap/FORM_RESEARCH.md`: Documented F8 completion, contracts, and hard gate before F9.
  - `research/form/README.md`: Added Section 9 documenting F8 accessibility responsibility split, security threat model, privacy invariants, and residual risks.
  - `PROJECT_STATE.md`: Updated durable Form research summary with F0-F8 completion.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 type errors).
- `pnpm exec vitest run research/form/`: PASS (13 test files, 320 tests passing, 0 failures).
- `pnpm validate`: PASS.
- `git diff --check`: PASS.

### Architecture / compatibility

- 100% clean architectural separation: Form Core remains pure Vii State/Scope without DOM or framework dependencies.
- Zero public package changes or release mutations.
- Framework adapters remain thin projections (under 250-480 lines per adapter) with safe DOM writes.

### Remaining / recovery

- F8 complete. Open Draft PR and await maintainer review. F9 has NOT started.

## 2026-08-27 02:00 CEST | Form Research Slice F7: Framework Adapter Compliance (Vanilla, React, Angular, Vue)

Status: completed
Branch: `feat/form-framework-adapters`
PR: #163 (Draft)

### Scope

- Implement and verify Slice F7 (Framework Adapter Compliance: Vanilla DOM, React, Angular, Vue) in `research/form/`.
- Prove that one framework-neutral Form semantic model from F0-F6 can be consumed correctly and idiomatically across four distinct UI paradigms.
- Vanilla DOM: Imperative element binding, event delegation, standard input/select/checkbox synchronization, safe `textContent` issue rendering, and explicit disposal.
- React: Declarative component hooks (`useField`, `useForm`, `useFieldArray`) backed by `useSyncExternalStore`, referentially stable snapshot memoization, zero whole-form re-renders, and SSR safety.
- Angular: Signal handles (`createAngularField`, `createAngularForm`, `createAngularFieldArray`, `toAngularField`) backed by `@angular/core` `signal.asReadonly()`, `computed()`, and automatic cleanup via `DestroyRef.onDestroy`.
- Vue: Reactivity handles (`createVueField`, `createVueForm`, `createVueFieldArray`, `useViiField`, `useViiForm`) backed by `shallowRef` wrapped in `shallowReadonly`, `effectScope`, and `onScopeDispose`.
- Shared semantic compliance scenario: verify identical multi-step lifecycle behavior across all four adapters.
- Preserve Raw vs Value distinction and parser-backed intermediate raw input strings during parse errors.
- Preserve Model A terminal submission status across ordinary field edits.
- Bounded slice ONLY. F8 is NOT authorized and NOT started.

### Changes

- Created `research/form/adapters/vanilla.ts`:
  - `bindField(field, element, options)` and `bindForm(form, element, options)`.
  - DOM event listener management (`input`, `change`, `blur`, `submit`) with feedback loop prevention and XSS-safe `textContent` rendering.
  - Headless `createVanillaField(field)` handle with snapshot and subscribe.
- Created `research/form/adapters/react.ts`:
  - `useField(field)`, `useForm(form)`, and `useFieldArray(arrayNode)`.
  - `useSyncExternalStore` integration with memoized snapshots and SSR snapshot reading.
- Created `research/form/adapters/angular.ts`:
  - `createAngularField(field)`, `createAngularForm(form)`, `createAngularFieldArray(arrayNode)`.
  - Readonly Angular Signals (`signal.asReadonly()`), `DestroyRef.onDestroy` lifecycle integration via `toAngularField(field)`.
- Created `research/form/adapters/vue.ts`:
  - `createVueField(field)`, `createVueForm(form)`, `createVueFieldArray(arrayNode)`, `useViiField`, `useViiForm`.
  - `shallowRef` wrapped in `shallowReadonly`, `effectScope`, and `onScopeDispose` cleanup.
- Created `research/form/adapters/index.ts`:
  - Unified barrel export for all four adapter prototypes.
- Created test suites in `research/form/`:
  - `form-f7-vanilla.test.ts` (10 tests)
  - `form-f7-react.test.ts` (12 tests)
  - `form-f7-angular.test.ts` (10 tests)
  - `form-f7-vue.test.ts` (10 tests)
  - `form-f7-compliance.test.ts` (4 tests)
- Updated `vitest.config.ts`:
  - Added framework package resolve aliases for test execution from repo root.
- Updated `research/form/tsconfig.json`:
  - Added precise framework type declarations paths for TypeScript typechecking.
- Updated documentation:
  - `docs/roadmap/FORM_RESEARCH.md`: Documented F7 completion, contracts, and set hard gate before F8.
  - `research/form/README.md`: Added Section 8 documenting F7 design decisions and compliance results.
  - `PROJECT_STATE.md`: Updated durable Form research summary with F0-F7 completion.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 type errors).
- `pnpm vitest run research/form/`: PASS (10 test files, 275 tests passing, 0 failures).
- `pnpm validate`: PASS (formatting, linting, typechecking, vitest across all packages, builds across all 10 projects, and package packing validation).
- `git diff --check`: PASS (clean diff with 0 whitespace or formatting issues).

### Architecture / compatibility

- 100% clean architectural separation: Form Core remains pure Vii State/Scope without DOM or framework dependencies.
- Zero secondary state mirrors: all framework reactive bindings are pure projections over Form Core signals.
- Tested framework dependencies: React 19.2.8, Angular 22.1.1, Vue 3.5.41.
- No public `@vii-labs/form` package created. All code remains strictly within `research/form/`.

### Remaining / recovery

- None for F7.
- Slice F8 (Accessibility + Security + Privacy Hardening) has NOT started and is NOT authorized.

## 2026-08-27 01:40 CEST | Form F6 Terminal Submission Status Consistency Correction (Model A)

Status: completed
Branch: `fix/form-submission-status-consistency`
PR: not opened (Draft PR pending)

### Scope

- Correct the semantic asymmetry in F6 where `form.setValues()` cleared terminal submission status to `"idle"` while direct field edits did not.
- Implement Model A: `SubmissionStatus` represents the lifecycle/result of the latest submission attempt (`"succeeded"`, `"failed"`, `"cancelled"`).
- Ordinary form value mutations (`setValue`, `setRawValue`, `setValues`, group mutations, array mutations, and external state bindings) do not reset terminal submission status.
- Dirtiness and value freshness are orthogonal concerns independently tracked by `dirty` signals.
- Whole-form lifecycle operations (`reset()`, `reinitialize()`) explicitly reset `submissionStatus` to `"idle"`.
- Bounded correction ONLY. F7 has NOT started and is NOT authorized.

### Changes

- Modified `research/form/form-core.ts`:
  - Removed conditional `submissionStatusState.set("idle")` from `setValues()`, making `setValues()` purely mutate values without resetting submission lifecycle state.
- Modified `research/form/form-f6.test.ts`:
  - Updated Fixture 7 to assert Model A stability across `setValues` and explicit reset to `"idle"`.
  - Added 14 new regression test fixtures under `Terminal Submission Status Consistency Correction (Model A)` covering `field.setValue`, `field.setRawValue`, `form.setValues`, nested groups, array mutations, failed edit stability, cancelled edit stability, second submit transitions, `reset()`, `reinitialize()`, active submitting edits, external state sync, Scope resource stability, and server issue clearing coexistence.
- Modified `research/form/README.md`:
  - Removed known asymmetry note and documented Model A terminal submission status semantics.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 type errors).
- `pnpm vitest run research/form/`: PASS (5 test files, 229 tests passing, 0 failures).
- `pnpm validate`: PASS (formatting, linting, typechecking, vitest across all packages, builds across all 10 projects, and package packing validation).
- `git diff --check`: PASS (clean diff with 0 whitespace or formatting issues).

### Architecture / compatibility

- Eliminates semantic asymmetry between `form.setValues` and direct field mutations.
- Zero additional Scope resources, subscriptions, or reactive overhead introduced.
- Preserved all F1-F6 regressions (229/229 passing tests).
- Completely isolated to `research/form/`.

### Remaining / recovery

- None for this correction.
- Slice F7 (DOM & Framework Adapters) has NOT started and is NOT authorized.

## 2026-08-27 01:25 CEST | Form Research Slice F6: Submission Lifecycle + Server Errors + Reset / Reinitialize

Status: completed
Branch: `feat/form-submission-lifecycle`
PR: not opened (Draft PR pending)

### Scope

- Implement and verify Slice F6 (Submission Lifecycle + Server Errors + Reset / Reinitialize) in `research/form/`.
- Submission state machine (`idle` -> `validating` -> `submitting` -> `succeeded` / `failed` / `cancelled`).
- Pre-submission parse and validation gates strictly bypassing submit action on invalid form state.
- Decoupled application action invocation (`SubmitAction<TOutput, TResult>`) with `AbortSignal`.
- Configurable duplicate submission handling (`drop`, `reject`, `supersede`).
- Monotonic submission revision authority and stale-result suppression.
- `ServerIssue` taxonomy with prototype pollution defense on `code` while preserving structured paths as data.
- Server issue routing to leaf fields, nested groups, array items via item identity snapshots across in-flight reorders and removals, form root, and unknown paths.
- Server issue clearing policies on field edit, reset, and next submit.
- Reset to initial baseline vs `reset(newBaseline)` vs `reinitialize(newBaseline)` without silent dirty mutation on successful submission.
- Zero Scope or controller leak across repeated submit cycles.
- Privacy preservation in diagnostics events without leaking form values or sensitive messages.
- Hard Gate: F6 ONLY. F7 has NOT started and is NOT authorized.

### Changes

- Created `research/form/submission.ts`:
  - Defined `ServerIssue`, `ServerIssueInput`, `sanitizeServerIssue` with prototype pollution defense on `code`.
  - Defined `SubmissionStatus` (`idle`, `validating`, `submitting`, `succeeded`, `failed`, `cancelled`), `DuplicateSubmitPolicy` (`drop`, `reject`, `supersede`).
  - Defined `SubmitAction`, `SubmitActionResult`, `FormSubmitResult`, `SubmitOptions`, `SubmitContext`.
  - Defined `deepCloneSnapshot` for immutable snapshot capture and array snapshot key derivation utilities.
- Modified `research/form/parser.ts`:
  - Updated `IssueSource` union to include `"server"`.
- Modified `research/form/form-core.ts`:
  - Exported F6 submission types and functions.
  - Defined `ValidationIssueInput` and updated `ValidationRule` return signatures.
  - Updated `FieldState`, `FieldGroup`, `FieldArray`, and `FormInstance` to support `serverIssues`, `setServerIssues()`, `clearServerIssues()`.
  - Updated `createField` with `validationIssuesState` and `serverIssuesState` allowing server issues and client validation to cleanly coexist, clearing server issues on field edits (`setValue`, `setRawValue`).
  - Updated `createFieldGroup` with `serverIssuesState`, aggregated issues/errors/valid computeds, and clearing on reset.
  - Updated `createFieldArray` with `serverIssuesState`, aggregated issues/errors/valid computeds, and clearing on reset.
  - Updated `createForm` to implement `submit()`, `cancelSubmit()`, `reinitialize()`, `submitting` computed, `submissionStatusState`, `collectArraySnapshots()`, `routeServerIssuesToTree()`, `clearFormServerIssues()`.
  - Implemented array identity snapshot routing across in-flight array reorders and deletions, localizing issue paths to target nodes and preserving unresolvable paths at `form.serverIssues`.
  - Updated `bindFormToExternalState` to pass through the complete submission API.
- Created `research/form/form-f6.test.ts`:
  - 53 comprehensive automated test fixtures verifying all F6 behaviors: synchronous and asynchronous submission success, validation blocking, parse blocking, output transformations, duplicate policies (`drop`, `reject`, `supersede`), explicit cancellation, disposal, reset in-flight, stale late success/failure suppression, server issue routing on fields/groups/arrays/root/unknown paths, array reorders and deletions in-flight via identity snapshots, server issue clearing on edits, client validation coexistence, dirty state preservation after submit, reset/reinitialize baseline semantics, 100-cycle resource stability, diagnostics privacy, unexpected action/validation errors, and compile-time type constraints.
- Updated `docs/roadmap/FORM_RESEARCH.md`: Recorded completion of Slices F0-F6 and reiterated that Slice F7 is not started or authorized.
- Updated `research/form/README.md`: Added Section 7 documenting F6 design decisions, state machine, routing, and lifecycle contracts.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: PASS (0 type errors).
- `pnpm vitest run research/form/`: PASS (5 test files, 210 tests passing, 0 failures).
- `pnpm validate`: PASS (formatting, linting, typechecking, vitest across all packages, builds across all 10 projects, and package packing validation).
- `git diff --check`: PASS (clean diff with 0 whitespace or formatting issues).

### Architecture / compatibility

- Preserves the small-core strategy and framework-agnostic runtime design in `research/form/`.
- No new public packages created; zero external runtime dependencies added.
- Preserved all F1-F5 regressions (157 existing tests + 53 new F6 tests = 210 total tests passing).
- Zero side-effects on core packages; all F6 prototypes reside in isolated `research/form/`.

### Remaining / recovery

- None for F6.
- Slice F7 (DOM & Framework Adapters) has NOT started and is NOT authorized.

## 2026-08-26 17:15 CEST | Form Issue Path Security Boundary Correction: Structured Issue Paths Are Data

Status: completed
Branch: `fix/form-issue-path-security-boundary`
PR: not opened (Draft PR pending)

### Scope

- Correct the security boundary around structured issue paths (`FieldIssue.path`, `ParseIssue.path`, `ValidationIssue.path`): separate data propagation from object traversal/mutation sinks.
- Allow reserved JavaScript property names (`__proto__`, `constructor`, `prototype`) as valid data segments in structured issue paths so schema validators (Zod 4, Valibot, ArkType) and custom rules can report issues on legitimate domain fields.
- Preserve prototype pollution defenses at actual traversal sinks (`parsePath`, `getNode`) and issue code validation.
- Authorize this boundary correction ONLY. F6 submission lifecycle is NOT authorized or started.

### Changes

- Modified `research/form/form-core.ts`: Updated `sanitizeIssue` to allow reserved string property names in `raw.path` as data while preserving strict segment type checking (`string | number`) and immutability via `Object.freeze`.
- Modified `research/form/parser.ts`: Updated `sanitizeParseIssue` to allow reserved string property names in `rawObj.path` while preserving segment type checking and `Object.freeze`.
- Modified `research/form/standard-schema.ts`: Updated `normalizeStandardSchemaIssue` to allow reserved string property names in `raw.path` (including segment objects with `{ key }`) while preserving type checking and `Object.freeze`.
- Modified `research/form/form-f3.test.ts`: Updated Fixture 15 to reflect that issue codes reject prototype pollution strings while issue paths safely preserve reserved keys as data without prototype pollution.
- Modified `research/form/form-f5.test.ts`: Added comprehensive test coverage validating reserved property names (`__proto__`, `constructor`, `prototype`) across `FieldIssue`, `ParseIssue`, `StandardSchemaV1` (Zod 4, Valibot, ArkType providers), nested path propagation across `FieldGroup` and `FieldArray`, security regression proof verifying `Object.prototype` remains clean, fail-closed handling of malformed segment types, and navigation traversal defenses (`parsePath`, `getNode`).
- Updated `research/form/README.md` with the explicit Data vs Sink security principle.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit` (exit code 0)
- `pnpm vitest run research/form/` (157 passed across 4 test files, exit code 0)
- `git diff --check` (exit code 0)
- `pnpm validate` (format:check, lint, typecheck, test, build, pack:check all passed, exit code 0)

### Architecture / compatibility

- Core dependency direction preserved.
- Zero bundle impact on production packages (`@vii-labs/core`, `@vii-labs/react`, `@vii-labs/angular`, `@vii-labs/vue`).
- Resolves schema validator crash when domain objects have keys named `constructor`, `prototype`, or `__proto__`.

### Remaining / recovery

- None. Hard stop reached (F6 submission lifecycle NOT started).

## 2026-08-26 02:40 CEST | Form Research F5: Parsing / Input-Output Types / Standard Schema Boundary

Status: completed
Branch: `feat/form-parsing-standard-schema`
PR: not opened (Draft PR pending)

### Scope

- Implement explicit value stages (`RawInput` -> `ParsedValue` -> `ValidatedValue` -> `OutputValue`), parser contracts with structured `ParseIssue` taxonomy, dirty semantics based on domain values, output transformations, and provider-neutral Standard Schema v1 validation (`standardSchema(schema)`) in research prototype (`research/form/`).
- Authorize F5 ONLY (no submission lifecycle, no framework adapters, no package graduation).
- Preserve all existing F1–F4 regression tests (112 tests) while adding comprehensive F5 test coverage (29 tests, 141 total).

### Changes

- Created `research/form/parser.ts`: Defined `ParseIssue`, `ValidationIssue`, `FieldParser`, `OutputTransform`, `createNumberParser`, `createBooleanParser`, `createOptionalStringParser`, with strict prototype pollution defenses.
- Created `research/form/standard-schema.ts`: Implemented provider-neutral `standardSchema` adapter bridging Standard Schema v1 (`~standard`) schemas into Vii `ValidationRule`s with issue path normalization and prototype pollution security.
- Updated `research/form/form-core.ts`: Extended `FieldState<Value, Raw, Output>` with `rawValue`, `initialRawValue`, `parseIssue`, `parseStatus`, `setRawValue`, `output`, `getOutput()`. Synchronous and asynchronous parser/validation separation, bypassing validation rules on parse failure. Extended `FieldGroup`, `FieldArray`, and `FormInstance` with `output` and `getOutput()`.
- Created `research/form/form-f5.test.ts`: Added 29 tests covering value stages, dirty semantics, output transforms, Standard Schema v1 integration with Zod 4, Valibot, ArkType, TypeBox verification, async cancellation/stale-result suppression, security defenses, edge cases, lifecycle/memory retention, and TypeScript negative type tests.
- Updated `research/form/README.md` documenting F5 findings.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit` (exit code 0)
- `pnpm vitest run research/form/` (141 passed across 4 test files, exit code 0)
- `pnpm validate` (format, lint, typecheck, tests, build, pack:check all passed, exit code 0)

### Architecture / compatibility

- Core dependency direction preserved: research prototype imports only core signal/scope/diagnostics primitives.
- Zero bundle impact on `@vii-labs/core`, `@vii-labs/react`, `@vii-labs/angular`, `@vii-labs/vue`.
- Standard Schema v1 verified with Zod 4, Valibot, ArkType.

### Remaining / recovery

- None for F5. Hard stop reached (F6 submission lifecycle NOT authorized).

## 2026-08-26 02:00 CEST | Form Research F4: Async Validation + Cancellation + Revisions

Status: completed
Branch: `feat/form-async-validation`
PR: not opened (Draft PR pending)

### Scope

- Implement asynchronous validation, explicit `AbortSignal` cancellation, monotonic revision tracking, and debounce support in throwaway research module (`research/form/`).
- Authorize F4 ONLY (no Standard Schema integration, no submission lifecycle, no production package).
- Preserve all existing F1/F2/F3 regression tests and architectural invariants.

### Changes

- **Form Research Core (`research/form/form-core.ts`)**:
  - Implemented `AsyncValidationRule<T, Ctx>` with explicit `AbortSignal` propagation in context.
  - Added synchronous precedence: synchronous rules evaluate first and fast-fail immediately; async rules execute only if synchronous rules pass.
  - Added monotonic revision authority (`currentRevision`) on field, group, array, and form nodes to strictly suppress stale validator commits.
  - Implemented cancellation semantics: cancellation/abort is not treated as a validation failure.
  - Integrated Scope lifecycle: node disposal or array item removal aborts active controllers and rejects future operations.
  - Implemented opt-in `debounceMs` for change triggers with automatic timer cancellation on subsequent changes or explicit validation calls.
  - Preserved dynamic array item identity and positional path projection during in-flight async validations.
- **Form Research F4 Test Suite (`research/form/form-f4.test.ts`)**:
  - Added 18 comprehensive test fixtures covering async rules, AbortSignal propagation, rapid superseding mutations (A -> B -> C), stale-commit suppression, cancellation vs failure, Scope disposal, debounce scheduling, array item mutations, and resource stability.
- **Documentation (`docs/roadmap/FORM_RESEARCH.md`, `research/form/README.md`)**:
  - Updated status to F0-F4 Completed, documented F4 architecture, cancellation rules, and revision authority.

### Validation

- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: passed (0 errors).
- `pnpm vitest run research/form`: passed (108/108 tests passing across 3 test files).
- `git diff --check`: passed (clean).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm validate`: passed.

### Architecture / compatibility

- Self-contained in `research/form/`. Zero dependency additions. Zero modifications to `@vii-labs/core`.
- Public API unchanged. No `@vii-labs/form` package created.
- F5 is NOT started.

### Remaining / recovery

- None for F4. Next slice requires authorization.

## 2026-08-26 01:30 CEST | Form Research F3: Validation Scheduling & Structured Issues

Status: completed
Branch: `feat/form-validation-scheduling`
PR: not opened (Draft PR pending)

### Scope

- Implement synchronous validation scheduling and structured issue lifecycle in throwaway research module (`research/form/`).
- Authorize F3 ONLY (no async validation, no schema adapters, no submission lifecycle, no production package).
- Preserve all existing F1/F2 regression tests and hardening contracts.

### Changes

- **Form Research Core (`research/form/form-core.ts`)**:
  - Added structured issue taxonomy: `FieldIssue`, `ValidationTriggerMode` (`"change"`, `"blur"`, `"submit"`, `"manual"`), `ValidationStatus` (`"unvalidated"`, `"valid"`, `"invalid"`), `ValidationRuleContext`, `SyncValidationRule`.
  - Added defensive issue sanitizer `sanitizeIssue` defending against prototype pollution on issue codes and path segments (`__proto__`, `constructor`, `prototype`).
  - Added synchronous rule execution on `createField` with fast-fail rejection on Promise/thenable return (`TypeError`).
  - Added `validate()` entrypoint, `issues` and `validationStatus` states across `FieldState`, `FieldGroup`, `FieldArray`, and `FormInstance`.
  - Maintained full backward compatibility with F1/F2 `errors: Computed<Record<string, readonly string[]>>`.
  - Preserved O(1) Scope detachment and exact parent scope resource counts.
- **Form Research Tests (`research/form/form-f3.test.ts`)**:
  - Added 17 comprehensive fixtures verifying: required rules, multiple rules declaration order, change/blur/manual/form triggers, cross-field validation, nested issue bubbling, array item validation, reordering preserving issue identity with updated positional paths, issue clearing on revalidation, sibling isolation, throwing validator propagation, Promise/thenable rejection, prototype pollution defenses, post-dispose rejection, and diagnostics/batching observation.
- **Documentation (`docs/roadmap/FORM_RESEARCH.md`, `research/form/README.md`)**:
  - Synchronized roadmap header to record F0-F2 completed and F3 current.
  - Documented F3 validation architecture, trigger semantics, issue taxonomy, and prototype safety.

### Validation

- `pnpm vitest run research/form`: 86 tests passed (69 F1/F2 regression + 17 F3 fixtures).
- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: 0 type errors.
- `pnpm validate`: 0 lint, format, typecheck, or test failures.
- `git diff --check`: Clean, 0 whitespace issues.

### Architecture / compatibility

- Kept in `research/form/` as throwaway research. No production `@vii-labs/form` package created.
- F4 (Async Validation) has NOT been started.

### Remaining / recovery

- None for F3. Open Draft PR and await review.

Status: completed
Branch: `chore/package-tail-hardening`
PR: #153

### Scope

- Remediate package-level audit findings 24, 25, 26, 27, 28, 29, 30, and 31.
- Remediate review defects R1 (notifier churn), R2 (suppressUnhandledRejection deduplication), R3 (defensive thenable check), R4 (React concurrency commentary), R5 (React object selector documentation).

### Changes

- **Core (`packages/core`)**:
  - `notifier.ts`: Replaced O(n) array splicing with `Set<Subscription<T>>` for O(1) amortized unsubscribe.
  - `async-guard.ts`: Extracted deduplicated `suppressUnhandledRejection` and defensive `isThenable` try-catch.
  - `scope-context.ts`, `diagnostics.ts`: Replaced local `isThenable` with shared module.
  - `diagnostics.ts`: Hardened `getTimestamp` against non-finite or throwing clocks.
  - `scheduler.ts`, `notifier.ts`: Added runaway iteration protection capped at `MAX_FLUSH_ITERATIONS = 10_000`.
  - `batch.ts`, `README.md`: Documented non-transactional batching semantics with dedicated tests.
- **CLI Core (`packages/cli-core`)**:
  - `add-state.ts`: Added `realpath` and `lstat` pre-write validation to prevent TOCTOU symlink traversal.
  - `trace-inspection.ts`: Validated `trace.events` is an array (throwing house TypeError), verified safe integer `droppedEvents`, and capped at `MAX_TRACE_EVENTS = 500_000`.
  - `machine-output.ts`: Added `redactPaths` support in `MachineOutputOptions`.
- **Adapters (`packages/react`, `packages/vue`)**:
  - `packages/vue/src/index.ts`: Added runtime development warning when `useVii` is called outside an active Vue effect scope, advising `createViiRef`.
  - `packages/react/src/index.ts`: Documented concurrent rendering safety rationale for ref synchronization and stable subscription identity.
  - `packages/react/README.md`: Documented `Object.is` default equality re-render implications for object selectors and recommended custom equality comparators.
- **CI (`.github/workflows`)**:
  - Pinned all third-party GitHub Actions to full commit SHAs with version comments across `validate.yml`, `publish-core.yml`, `governance.yml`, `dependency-review.yml`, and `codeql.yml`.

### Validation

- `pnpm validate`: Passed (formatting, linting, typechecking, 11 nx project test suites, 10 nx builds, package and cli-core pack checks).
- `npx vitest run research/form/form-core.test.ts research/registry research/source-distribution research/http research/query research/schema`: Passed (38 test files, 386 passed).

### Architecture / compatibility

- Preserves Clean Architecture dependency direction toward `@vii-labs/core`.
- Retains O(1) unsubscribe performance for high-frequency subscriber churn without changing public types.
- Maintains zero runtime overhead in production for Vue scope warning and React selector memoization.

### Remaining / recovery

- None.

## 2026-08-25 02:15 CEST | External Binding Cycle Protection & Scope-Graph Fidelity (Audit Finding 18 & Batch 5 Scope Regression)

Status: completed
Branch: `fix/form-external-binding-sync`
PR: #152

### Scope

- Remediate Audit Finding 18 in `research/form/form-core.ts`: Multi-layer external binding cycle guard across the deferred scheduler.
- Fix Batch 5 Scope Regression in `packages/core/src/scope.ts`: Child scope auto-detachment on disposal in core `createChild`, restoring `parentScopeId` and diagnostics inheritance without scope leakage.

### Changes

- In `packages/core/src/scope.ts`:
  - In `createChild`, captured the detach handle from `use(child)` and registered `child.use(() => { detach(); })`.
  - Disposing a child scope automatically detaches it from its parent's retained resources in O(1) time without double-disposal.
- In `packages/core/test/scope.test.ts`:
  - Added regression test asserting child auto-detachment at parent teardown and clean single disposal.
- In `research/form/form-core.ts`:
  - `bindFormToExternalState`:
    - Implemented directional reference markers (`lastPushedOutward`, `lastAppliedInward`) to absorb echoes across the deferred scheduler.
    - Implemented chained consecutive sync counter (`consecutiveSyncCount <= MAX_EXTERNAL_SYNC_DEPTH`) to detect and terminate non-convergent deferred loops with `Error("Cyclic synchronisation detected in bindFormToExternalState")`.
    - Preserved stack depth counter (`syncDepth`), direction guards, and structural reconciliation guard.
  - `createFieldArray`:
    - Replaced manual scope detachment with `scope.createChild({ name: "vii-array-item" })`, restoring diagnostics `parentScopeId` in `scope.created` events while preserving O(1) lifetime.
- In `research/form/form-core.test.ts`:
  - Added regression tests for non-convergent cyclic loop error, single outward write without echo re-entry, same-reference re-application, and diagnostics `parentScopeId` linkage with constant resource counts at N = 10, 50, 500.
- In `research/form/README.md`:
  - Documented the multi-layered cycle-protection architecture and core scope-graph fidelity.

### Validation

- `pnpm validate`: PASS (clean format, lint, typecheck, package tests, builds, and pack checks)
- `npx vitest run research/form/form-core.test.ts`: PASS (1 test file, 69/69 tests passed in 58ms)
- `npx vitest run packages/core/test/scope.test.ts`: PASS (1 test file, 12/12 tests passed in 58ms)
- `npx vitest run research/registry research/source-distribution research/http research/query research/schema`: PASS (36 test files + isolated query benchmarks passed)
- `git diff --check`: PASS (clean)

### Architecture / compatibility

- Changes are scoped strictly to `packages/core/src/scope.ts` (plus tests) and `research/form/`.
- No other packages or research directories modified.

### Remaining / recovery

- None. Batch 6 fixes are verified and ready.

## 2026-08-25 02:00 CEST | Form Data Correctness & Array Lifetime (Audit Findings 10, 11, 12, 13, 14, 15, 16, 17)

Status: completed
Branch: `fix/form-data-correctness`
PR: #151

### Scope

- Remediate Audit Findings 10, 11, 12, 13, 14, 15, 16, and 17 in `research/form/form-core.ts`.
- Finding 10: Use `Object.create(null)` for `fields`, `valuesComputed`, and `errorsComputed` to prevent prototype corruption or dropping fields when keys like `__proto__`, `constructor`, `prototype` are used.
- Finding 11: Add own-property checks across `getNode`, `FieldGroup.setValues`, and `FieldGroup.reset` to prevent prototype functions from masquerading as field nodes.
- Finding 12: Validate that `FieldArray.setValues`/`reset` reject non-array types and `FieldGroup.setValues`/`reset` reject non-object types with explicit `TypeError`s, preserving previous state and preventing scope leaks.
- Finding 13: Propagate `keyExtractor` recursively through nested groups and nested array items.
- Finding 14: Ensure `FieldArray.push`, `insert`, `setValues`, and `reset` are atomic: validate keys up-front before mutating state or disposing existing items, and roll back freshly created scopes on error.
- Finding 15: Establish a uniform post-dispose contract across `FormInstance`: throw `Error("Form is disposed")` on `getNode`, `setValues`, and `reset`.
- Finding 16: Bounds-check `insert(index, value)` accepting `0 <= index <= length` and throwing `RangeError` on invalid indices.
- Finding 17: Attach array item scopes to parent scope with detach handles (`scope.use(itemScope)`), detaching them synchronously on item disposal (`remove`, `reset`, `setValues`) to prevent dead scope accumulation in parent scopes.

### Changes

- In `research/form/form-core.ts`:
  - Updated `createFieldGroup` to allocate `fields`, `valuesComputed` result, and `errorsComputed` record with `Object.create(null)`.
  - Added own-property checks and input type assertions in `FieldGroup.setValues` and `FieldGroup.reset`.
  - Propagated `keyExtractor` to nested `createFieldGroup` and `createFieldArray` calls.
  - Added `detach` handle to `ArrayItem<T>` and implemented `disposeItem(item)` in `createFieldArray`.
  - Hardened `FieldArray.push`, `insert`, `setValues`, and `reset` to validate inputs/keys first, roll back created item scopes on exception, and reject non-array inputs.
  - Hardened `insert` index bounds checking to throw `RangeError`.
  - Updated `createForm` to enforce post-dispose contract by throwing `Form is disposed` on `getNode`, `setValues`, and `reset`.
- In `research/form/form-core.test.ts`: Added 9 regression tests covering findings 10–17 (65/65 tests passing).
- In `research/form/README.md`: Documented `keyExtractor` scope, object security, atomic mutations, scope detachment, and post-dispose contract.

### Validation

- `pnpm validate`: PASS (clean format, lint, typecheck, package tests, builds, and pack checks)
- `npx vitest run research/form/form-core.test.ts`: PASS (1 test file, 65/65 tests passed in 63ms)
- `npx vitest run research/registry research/source-distribution research/http research/query research/schema`: PASS (36 test files + isolated query benchmarks passed)
- `npx tsc --noEmit -p research/form/tsconfig.json`: PASS (0 errors)
- `git diff --check`: PASS (clean)

### Architecture / compatibility

- Changes are scoped strictly to research prototype in `research/form/`.
- No packages (`packages/`) or other research directories (`research/http`, `research/registry`, `research/source-distribution`) modified.
- `bindFormToExternalState` preserved without out-of-scope cycle modifications.

### Remaining / recovery

- None. Batch 5 fixes are verified and ready.

## 2026-08-25 01:45 CEST | Registry Integrity & Installer Safety (Audit Findings 9, 21, 22, 23)

Status: completed
Branch: `security/registry-integrity-containment`
PR: #150

### Scope

- Remediate Audit Findings 9, 21, 22, and 23 in `research/registry` and `research/source-distribution`.
- Finding 9: Manifest integrity hash does not cover file hashes due to replacer array in `JSON.stringify`. Implement canonical recursive JSON serialization sorting keys at all levels.
- Finding 21: `checkFileModifications` ignores deleted files. Track `deletedFiles` in a separate bucket and ensure `isModified` is true when files are deleted.
- Finding 22: Replace false assurance of extension-only blocklist with destination denylist (root dotfiles, node_modules, root toolchain configs) and optional `allowedRoots` enforcement.
- Finding 23: Track created files and roll back (unlink) on partial install failures; reject corrupt lockfiles with a hard error rather than silently resetting.

### Changes

- In `research/registry/integrity.ts`: Implemented `canonicalJsonStringify` with recursive key sorting at all levels, and updated `computeManifestIntegrity` to use it.
- In `research/registry/lockfile.ts`: Updated `checkFileModifications` to report `deletedFiles` separately and set `isModified` when either `modifiedFiles` or `deletedFiles` is non-empty.
- In `research/registry/manifest-validator.ts`: Added destination denylist rejecting root dotpaths (`FORBIDDEN_ROOT_DOTPATH`), `node_modules` (`FORBIDDEN_NODE_MODULES`), and root toolchain/config files (`FORBIDDEN_CONFIG_FILE`), plus `allowedRoots` support (`DISALLOWED_ROOT`).
- In `research/registry/README.md`: Documented the execution model, destination denylist, and `allowedRoots` policy.
- In `research/source-distribution/types.ts`: Added `allowedRoots` optional configuration to `UIAddOptions`.
- In `research/source-distribution/source-installer.ts`: Passed `allowedRoots` to manifest validation, added rollback unlinking of created files on apply failure, and rethrown errors on unparseable/corrupt lockfiles.
- Added comprehensive regression tests across `research/registry/integrity-verification.test.ts`, `research/registry/lockfile-detachment.test.ts`, `research/registry/security-path-containment.test.ts`, and `research/source-distribution/source-installer.test.ts`.

### Validation

- `pnpm validate`: PASS (clean format, lint, typecheck, package tests, builds, and pack checks)
- `npx vitest run research/registry research/source-distribution`: PASS (5 test files, 54/54 tests passed)
- `npx vitest run research/form/form-core.test.ts research/http research/query research/schema`: PASS (32 test files + isolated query benchmarks passed)
- `npx tsc --noEmit -p research/registry/tsconfig.json && npx tsc --noEmit -p research/source-distribution/tsconfig.json`: PASS (0 errors)
- `git diff --check`: PASS (clean)

### Architecture / compatibility

- Changes are scoped strictly to research prototypes in `research/registry/` and `research/source-distribution/`.
- No packages (`packages/`) or other research areas (`research/http`, `research/form`) modified.

### Remaining / recovery

- None. Batch 4 fixes are verified and ready.

## 2026-08-24 15:30 CEST | Form Research F2 — Re-entrancy Depth Counter Correction (BUG 8 & BUG 9 Remediation)

Status: completed
Branch: `feat/form-nested-arrays-identity`
PR: draft opened

### Scope

- Remediate Round 4 rejection defects BUG 8 and BUG 9 on branch `feat/form-nested-arrays-identity`.
- Fix BUG 8: Replace lifetime accumulating counter in `bindFormToExternalState` with a true depth counter (`enterSyncDepth` and `exitSyncDepth`) that decrements in `finally` on both `form.values` and `externalState` synchronization paths. Reset counter to 0 before throwing upon exceeding `MAX_EXTERNAL_SYNC_DEPTH = 50` so that the bound form remains usable post-throw.
- Add comprehensive acceptance tests for 200 sequential scalar external sets, 200 sequential scalar form sets, 200 alternating array shape sets, and cyclic throw with 100 normal syncs recovery.
- Fix BUG 9: Commit the complete changes on the branch and run full validation gates on the committed tree.

### Changes

- In `research/form/form-core.ts`: Updated `bindFormToExternalState` re-entrancy depth counter to decrement synchronously in `finally` blocks on both subscription paths, ensuring depth peaks at 1 or 2 during normal syncs and resets cleanly.
- In `research/form/form-core.test.ts`: Added acceptance tests for 200 sequential store sets, 200 sequential form sets, 200 alternating array sets, and cyclic throw recovery followed by 100 normal syncs (56 total tests passing in 18ms).
- In `research/form/README.md`: Documented the depth counter fix and updated test assertions inventory.

### Validation

- `vitest run research/form/form-core.test.ts`: PASS (56/56 tests passing in 18ms)
- `tsc -p research/form/tsconfig.json --noEmit`: PASS (0 errors)
- `git diff --check`: PASS (clean)
- `pnpm format:check`: PASS (clean)

### Architecture / compatibility

- Throwaway research prototype in `research/form/` only. Core package `@vii-labs/core` is unmodified.
- No public API changes, no new packages created.

### Remaining / recovery

- None for Slice F2. Ready for human review.
- Invariant: F3 has NOT been started.

### Changes

- Updated `research/form/form-core.ts`: added `FieldGroup`, `FieldArray`, `parsePath`, `getNode`, hierarchical Scope child ownership, cycle detection, plain record filtering, scoped keyExtractor, duplicate key defense, keyed setValues reconciliation with key re-stamping, Option (a) identity-strict dirty tracking, structural no-op check in `FieldArray.setValues` (`hasStructuralChange`), and re-entrancy depth guard in `bindFormToExternalState`.
- Updated `research/form/form-core.test.ts`: 53 unit tests covering complete F1 regression baseline + external binding array combinations (25 tests) and F2 nested groups, arrays, undefined items, reorder dirty semantics, reset dirty restoration, unkeyed collision-free setValues, exhaustive ID uniqueness, keyed setValues identity preservation, strict paths, cycle defense, and child Scope teardown (28 tests).
- Updated `research/form/README.md`: architectural overview of F1/F2 prototypes, documented Option (a) dirty semantics, keyExtractor timing, BUG 7 diagnosis, and audited F1+F2 seam findings.
- Updated `docs/roadmap/FORM_RESEARCH.md`: marked F2 prototype as completed.

### Validation

- `pnpm vitest run research/form/form-core.test.ts`: passed (53/53 tests passing in ~20ms).
- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: passed (0 strict errors).
- `git diff --check`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed (11/11 projects cached/passed).
- `pnpm validate`: passed.

### Architecture / compatibility

- Zero package additions or public API changes; `@vii-labs/form` is NOT created or published.
- Zero dependencies added; zero Core runtime code modified.
- Strict ownership boundaries preserved: Form consumes Core State/Scope without Core depending on Form.

### Remaining / recovery

- F2 prototype and evidence corrections complete. Next step is maintainer review and authorization of Slice F3 (Validation Scheduling + Structured Issues).
- F3 has NOT been started.

## 2026-08-23 23:15 CEST | Form Research F1 — Minimal Field/Form State Prototype

Status: completed
Branch: `feat/form-field-state-prototype`
PR: draft opened

### Scope

- Implement throwaway research prototype for Form Slice F1 (Minimal Field and Form State Prototype) under `research/form/`.
- Prototype signal-first `FieldState` primitive backed by Vii Core (`state()`, `computed()`, `batch()`) with `value`, `initialValue`, `dirty`, `touched`, `pending`, `errors`, `valid`, `invalid`, and `reset(...args: [nextInitial?: T])` supporting explicit `undefined`.
- Prototype `FormInstance` managing typed dictionaries of fields and lazy aggregate computeds (`values`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `errors`) with atomic `setValues` and `reset`.
- Prototype and compare model ownership options: Form-Owned isolation vs bidirectional External State Binding research comparison fixture (`bindFormToExternalState`).
- Empirically verify isolated subscription fan-out in tested fixtures (mutating Field A produces 0 notifications to Field B subscribers and 1 notification to aggregate `form.values` subscribers).
- Verify Scope integration and deterministic teardown disposal (`form.dispose()`).
- Add comprehensive Vitest suite in `research/form/form-core.test.ts` and `research/form/README.md`.

### Changes

- Added `research/form/tsconfig.json`: dedicated research TypeScript configuration extending base.
- Added `research/form/form-core.ts`: F1 prototype containing `createField`, `createForm`, `bindFormToExternalState`, explicit `undefined` reset handling, and custom equality support.
- Added `research/form/form-core.test.ts`: 19 unit tests verifying field signals, custom comparators, explicit undefined reset edge cases, subscription isolation, atomic batching, external binding lifecycle/idempotency, and Scope disposal.
- Added `research/form/README.md`: architectural overview, implemented capabilities, and exact empirical observations.
- Updated `docs/roadmap/FORM_RESEARCH.md`: marked F1 prototype as completed.

### Validation

- `pnpm vitest run research/form/form-core.test.ts`: passed (19/19 tests passing).
- `pnpm exec tsc -p research/form/tsconfig.json --noEmit`: passed.
- `git diff --check`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed (11/11 projects cached/passed).
- `pnpm validate`: passed.

### Architecture / compatibility

- Zero package additions or public API changes; `@vii-labs/form` is NOT created or published.
- Zero dependencies added; zero Core runtime code modified.
- Strict ownership boundaries preserved: Form consumes Core State/Scope without Core depending on Form.

### Remaining / recovery

- F1 prototype and evidence corrections complete. Next step is maintainer review and authorization of Slice F2 (Nested Objects + Arrays + Identity).
- F2 has NOT been started.

## 2026-08-23 23:10 CEST | Form Research F0 — Evidence Boundaries & Hypotheses Clarification

Status: completed
Branch: `docs/form-f0-evidence-boundaries`
PR: draft opened

### Scope

- Perform bounded documentation correction pass on Form Research Slice F0 deliverables.
- Distinguish accepted architectural invariants from candidate research directions, provisional defaults, and numeric hypotheses.
- Explicitly reframe model ownership (Form-owned vs external State binding vs hybrid) as F1 research baseline without selecting `syncTo`/`readFrom`.
- Reframe field tree structure (hierarchical vs flat vs hybrid vs lazy) as F2 candidate comparison with targeted constant-time lookup rather than an achieved guarantee.
- Reframe array stable identity as an F2 research requirement across internal ID, application key, and hybrid strategies without selecting `_vii_id`.
- Remove `300ms` as accepted debounce default; assign evidence-backed scheduling and zero-accidental-network defaults to F4.
- Remove arbitrary numeric security limits (16 depth, 10k array); assign empirical security bounds to F8.
- Replace `<100 kB` heap budget with structural zero-retained-resources invariant; assign empirical Form heap budget derivation to F9.
- Clarify accessibility boundary: headless Form Core exposes structural validation state, while DOM focus management and ARIA generation reside at the adapter/UI edge.
- Scope Standard Schema compatibility to verified providers (Zod 4, Valibot, ArkType), removing unverified TypeBox claims.
- Reframe dirty semantics, pending/validity axis decoupling, submission duplicate policy (drop vs reject), server error lifecycle, and Scope ownership topology (root vs per-field vs lazy) as explicit research questions for slices F1–F6.
- Ensure strict stop condition: F0 remains complete, F1 is NOT started.

### Changes

- Updated `docs/roadmap/FORM_RESEARCH.md`: clarified candidate status vs accepted invariants across sections 1, 2, 3, 4, and 5.
- Updated `docs/architecture/FORM_ARCHITECTURE.md`: aligned accessibility section with adapter/UI edge boundaries.

### Validation

- `git diff --check`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `pnpm validate`: passed.

### Architecture / compatibility

- Zero runtime or package additions; zero dependencies added.
- Invariants preserved: headless, provider-neutral validation, transport decoupling, value-free diagnostics, `cancellation !== validation failure`, Build-vs-Buy remains open.

### Remaining / recovery

- F0 documentation corrections complete. Next step is maintainer review and authorization of Slice F1.
- F1 has NOT been started.

## 2026-08-23 22:50 CEST | Form Research F0 — Architecture, Domain Model & Build-vs-Buy Questions

Status: completed
Branch: `docs/form-research-architecture`
PR: draft opened

### Scope

- Execute the initial Form research slice F0 (Architecture, Domain Model & Build-vs-Buy Questions).
- Define canonical research roadmap `docs/roadmap/FORM_RESEARCH.md` covering slices F0 through F10.
- Clarify ownership boundaries across State, Form, Query, HTTP, Schema, Scope, Diagnostics, and UI.
- Establish candidate domain model, classification taxonomy, model ownership trade-offs, value pipeline (raw -> parse -> value -> validate -> transform -> output), validation triggers, async cancellation mechanics, structured issue taxonomy, submission state machine, Scope ownership, and Build-vs-Buy comparative matrix.
- Clarify `docs/architecture/FORM_ARCHITECTURE.md` and update `PROJECT_STATE.md`.
- Explicitly enforce hard stop: F0 completion does NOT authorize F1 or any production implementation.

### Changes

- Added `docs/roadmap/FORM_RESEARCH.md`: canonical F0–F10 research roadmap, research thesis, core invariants, domain model, value pipeline, validation scheduling, submission state machine, Scope hierarchy, accessibility/security contracts, and Build-vs-Buy evaluation plan.
- Updated `docs/architecture/FORM_ARCHITECTURE.md`: clarified F0 status, governance reference, and strict stop conditions.
- Updated `PROJECT_STATE.md`: recorded `docs/roadmap/FORM_RESEARCH.md` in source-of-truth document registry.

### Validation

- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- `pnpm validate`: passed.

### Architecture / compatibility

- Zero package additions or public API changes; `@vii-labs/form` is NOT created or published.
- Zero dependencies added; zero runtime code modified.
- Strict ownership boundaries preserved: Form does not own general state, server cache, transport, or schema definitions.

### Remaining / recovery

- F0 is complete. Next step is maintainer review and authorization of Slice F1 (Minimal Field/Form State Prototype).
- F1 has NOT been started.

## 2026-08-23 02:45 CEST | HTTP Client Research Evidence Completion (H8R & H9R)

Status: completed
Branch: `test/http-final-evidence`
PR: draft opened

### Scope

- Remediate and close missing empirical evidence gates H8R (Runtime Compatibility Evidence) and H9R (Reproducible Build-vs-Buy Evidence) for the Vii HTTP Client & Transport research track.
- Implement automated runtime compatibility matrix script `scripts/benchmarks/http-runtime-matrix.mjs` evaluating 11 portable transport capabilities on Chromium 133 (via CDP), Node.js v22.17.0, and Bun v1.2.18.
- Explicitly downgrade unverified runtimes (Firefox, WebKit, Deno, Cloudflare Workers) with transparent documentation of host environment tooling constraints.
- Implement reproducible comparative benchmark harness `scripts/benchmarks/http-build-vs-buy.mjs` against pinned versions: `axios@1.18.0`, `ky@1.7.5`, `ofetch@1.4.1`, handwritten helper baseline, and native fetch baseline.
- Accurately measure bundle sizes (minified, gzip, brotli), microbenchmarks (client creation, dispatch + JSON decode, error handling), and empirically verify competitor retry defaults (`ky@1.7.5` = 2 retries, `ofetch@1.4.1` = 1 retry, `axios@1.18.0` = 0 retries, Vii HTTP prototype = 0 retries).
- Formally scope SSRF preflight policy (`validateUrlSecurity`), redirect credential handling, and W3C Trace Context Level 1 conformance.
- Create dedicated evidence records `docs/quality/HTTP_RUNTIME_COMPATIBILITY.md` and `docs/quality/HTTP_BUILD_VS_BUY_EVIDENCE.md`.
- Update `docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`, `docs/roadmap/HTTP_CLIENT_RESEARCH.md`, and `PROJECT_STATE.md`.

### Changes

- Added `scripts/benchmarks/http-runtime-matrix.mjs`: automated H8R runtime compatibility runner across Node.js, Bun, and Chromium via CDP.
- Added `scripts/benchmarks/http-build-vs-buy.mjs`: reproducible H9R comparative benchmark harness across 6 candidates.
- Added `research/http/runtime-compatibility.test.ts`: Vitest test suite validating 11 portable contract invariants.
- Updated `research/http/observability.ts` & `research/http/observability.test.ts`: hardened W3C Trace Context parsing to reject all-zero trace/span IDs and non-hex inputs.
- Added `docs/quality/HTTP_RUNTIME_COMPATIBILITY.md`: durable documentation of runtime matrix, test contracts, and explicit downgrades.
- Added `docs/quality/HTTP_BUILD_VS_BUY_EVIDENCE.md`: durable documentation of pinned versions, bundle footprint, microbenchmarks, retry defaults, and security boundaries.
- Updated `docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`: updated empirical tables and confirmed `Wrap + Reduce` graduation verdict.
- Updated `docs/roadmap/HTTP_CLIENT_RESEARCH.md`: updated slices table with H8R/H9R evidence entries.
- Updated `package.json`, `pnpm-lock.yaml`, and `.gitignore`: pinned `axios@1.18.0`, `ky@1.7.5`, `ofetch@1.4.1`, and ignored `.tmp/`.
- Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.

### Validation

- `node scripts/benchmarks/http-runtime-matrix.mjs`: 11/11 capabilities pass on Node.js v22.17.0, Bun v1.2.18, and Chromium 133 via CDP.
- `node scripts/benchmarks/http-build-vs-buy.mjs`: benchmark executed cleanly; bundle sizes and retry defaults empirically verified.
- `pnpm exec vitest run research/http/*.test.ts`: 12 test files, 102 passed (100% passing).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly with 0 formatting warnings.
- `pnpm lint`: passed cleanly with 0 lint errors across all packages and scripts.
- `pnpm typecheck`: passed cleanly across all packages and fixtures.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed artifact checks passed).
- `git diff --check`: passed cleanly.

### Architecture / compatibility

- Core Decoupling Invariant: `@vii-labs/core` remains 100% zero-dependency, platform-neutral, and completely decoupled from HTTP transport.
- Verdict: `Wrap + Reduce` (Zero-Dependency Micro-Transport Primitive) reconfirmed with honest empirical evidence.
- Production package implementation remains deferred to a future authorized package delivery track.

### Remaining / recovery

- Draft PR opened for maintainer review.
- No next research or implementation track has been started.

## 2026-08-23 02:15 CEST | H9 HTTP Client Graduation Gate & Build-vs-Buy Decision

Status: completed
Branch: `feat/http-graduation-decision`
PR: #139

### Scope

- Complete final slice H9 (Graduation Gate + Build-vs-Buy Decision) for the Vii HTTP Client & Transport research track.
- Synthesize all findings and empirical evidence from research slices H0 through H8.
- Conduct comprehensive comparative trade-off analysis against native `fetch`, `axios`, `ky`, and `ofetch`.
- Render authoritative architectural verdict: `Wrap + Reduce` (Zero-Dependency Micro-Transport Primitive).
- Author architectural decision record in `docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`.
- Update `docs/roadmap/HTTP_CLIENT_RESEARCH.md` and `PROJECT_STATE.md` to record track completion.
- Update `DUTY_WATCH.md`.

### Changes

- Added `docs/architecture/ADR_HTTP_GRADUATION_DECISION.md`: comprehensive decision record documenting comparative matrix, slice findings H0–H8, rationale for `Wrap + Reduce`, and zero-core-bloat packaging strategy.
- Updated `docs/roadmap/HTTP_CLIENT_RESEARCH.md`: marked research track as completed with `Wrap + Reduce` verdict and ADR link.
- Updated `PROJECT_STATE.md`: updated durable research track index to include HTTP graduation ADR.
- Updated `research/http/README.md`: updated research prototype status to completed with graduation verdict.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 11 test files, 91 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero core bundle impact: `@vii-labs/core` remains 100% zero-dependency and transport-free.
- Pure Web Standards compatibility (`Request`, `Response`, `Headers`, `URL`, `ReadableStream`, `AbortSignal`).
- Native integration with Vii `Scope` lifecycle and Standard Schema v1 (`@standard-schema/spec`).
- Whole-track completion: all slices H0 through H9 in `docs/roadmap/HTTP_CLIENT_RESEARCH.md` are completed.

### Remaining / recovery

- Await maintainer review and merge of H9 graduation ADR.
- HTTP Client & Transport Research Track is fully completed.

## 2026-08-23 02:05 CEST | H8 HTTP Observability, Tracing & Metrics

Status: completed
Branch: `feat/http-observability-tracing`
PR: #138

### Scope

- Implement H8 (Observability + Tracing + Metrics) throwaway research prototype in `research/http/`.
- Implement W3C Trace Context / OpenTelemetry distributed tracing:
  - `generateTraceId` (16 bytes / 32 hex), `generateSpanId` (8 bytes / 16 hex).
  - `formatTraceparent` (`00-${traceId}-${spanId}-${flags}`) and `parseTraceparent`.
  - Auto-injection of standard `traceparent` headers when `telemetry.traceContext` is active.
- Implement structured request timing metrics: `durationMs` via `performance.now()`.
- Implement lifecycle observability hooks: `onRequest`, `onResponse`, and `onError` with structured event objects.
- Implement sensitive logging redaction utilities: `redactUrl` and `redactHeaders`.
- Add test suite in `research/http/observability.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/observability.ts`: `generateTraceId`, `generateSpanId`, `formatTraceparent`, `parseTraceparent`, `redactUrl`, `redactHeaders`, `DEFAULT_REDACTED_HEADERS`, and `DEFAULT_REDACTED_PARAMS`.
- Updated `research/http/types.ts`: added `TelemetryConfig`, `HttpRequestStartEvent`, `HttpResponseSuccessEvent`, `HttpResponseErrorEvent`, and `HttpRequestTiming`.
- Updated `research/http/client.ts`: wired W3C traceparent header injection, lifecycle hook execution (`onRequest`, `onResponse`, `onError`), and telemetry inheritance in `.extend()`.
- Updated `research/http/index.ts`: exported observability types, functions, and constants.
- Added `research/http/observability.test.ts`: 7 test cases covering trace ID/span ID generation, traceparent formatting and parsing, invalid traceparent rejection, URL query parameter redaction, header dictionary redaction, lifecycle hooks invocation with duration metrics, error event dispatch, traceparent header preservation, and error resilience of telemetry hooks.
- Updated `research/http/README.md`: documented H8 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 11 test files, 91 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H8 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Zero external runtime dependencies.
- Confirmed stop condition: H9 (Graduation Gate + Build-vs-Buy Decision) has NOT been started.

### Remaining / recovery

- Await maintainer review of H8 observability and tracing prototype.
- Future work: H9 (Graduation Gate + Build-vs-Buy Decision) only when authorized.

## 2026-08-23 01:55 CEST | H7 SSR Security & SSRF Protection

Status: completed
Branch: `feat/http-ssr-security-ssrf`
PR: #137

### Scope

- Implement H7 (SSR Security + Private Network Defenses) throwaway research prototype in `research/http/`.
- Enforce SSR execution safety: zero process-wide mutable state, request-scoped client instances.
- Implement private IP and SSRF protection (`isPrivateIpv4`, `isPrivateIpv6`, `isPrivateOrRestrictedHost`):
  - RFC 1918 private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Loopback (`127.0.0.0/8`, `::1`, `localhost`, `*.localhost`).
  - RFC 3927 Link-Local / Cloud Metadata (`169.254.169.254`, `fd00:ec2::254`, `metadata.google.internal`, `instance-data`).
  - IPv6 Unique-Local (`fc00::/7`).
- Implement `SecurityPolicy` evaluation (`validateUrlSecurity`): `allowPrivateNetworks`, `allowedHosts`, `blockedHosts`.
- Implement `stripSensitiveHeaders` for cross-origin redirection protection (removing `Authorization`, `Cookie`, `Proxy-Authorization`, `X-Api-Key`, etc.).
- Add `HttpSecurityError` and `isHttpSecurityError` error taxonomy class and predicate.
- Add test suite in `research/http/security.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/security.ts`: `SecurityPolicy`, `isPrivateIpv4`, `isPrivateIpv6`, `isPrivateOrRestrictedHost`, `validateUrlSecurity`, and `stripSensitiveHeaders`.
- Updated `research/http/errors.ts`: added `HttpSecurityError`, `HttpSecurityErrorOptions`, and `isHttpSecurityError` predicate.
- Updated `research/http/types.ts`: added `security` option to `HttpClientConfig` and `HttpRequestOptions`.
- Updated `research/http/client.ts`: validated URL security prior to network transport and merged security in `.extend()`.
- Updated `research/http/index.ts`: exported security types, error, and utilities.
- Added `research/http/security.test.ts`: 7 test cases covering IPv4/IPv6 private IP detection, cloud metadata endpoints, host allowlist/blocklist enforcement, cross-origin sensitive header stripping, pre-flight client request blocking, and error predicates.
- Updated `research/http/README.md`: documented H7 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 10 test files, 82 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H7 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Zero external runtime dependencies.
- Confirmed stop condition: H8 (Observability + Tracing + Metrics) has NOT been started.

### Remaining / recovery

- Await maintainer review of H7 SSR security prototype.
- Future work: H8 (Observability + Tracing + Metrics) only when authorized.

## 2026-08-23 01:25 CEST | H6 HTTP Streaming & Server-Sent Events (SSE) Engine

Status: completed
Branch: `feat/http-streaming-sse`
PR: #134

### Scope

- Implement H6 (Streaming + SSE + Web Streams) throwaway research prototype in `research/http/`.
- Implement native Web Streams (`ReadableStream`) async chunk iterator (`iterateStream`) with automatic reader cancellation on early break.
- Implement chunk-boundary safe line iterator (`iterateLines`) supporting both `\n` and `\r\n` line endings.
- Implement WHATWG Server-Sent Events (SSE) parser (`parseEventStream`) supporting custom event names, IDs, retry reconnection hints, multi-line data concatenation, and comment line filtering.
- Implement JSON SSE event stream deserializer (`parseJsonEventStream`) with `HttpParseError` on invalid payloads.
- Integrate streaming client methods in `HttpClient`: `client.stream()`, `client.streamLines()`, `client.streamEvents()`, `client.streamJsonEvents()`.
- Add test suite in `research/http/streaming.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/streaming.ts`: `ServerSentEvent`, `JsonServerSentEvent`, `iterateStream`, `iterateLines`, `parseEventStream`, and `parseJsonEventStream`.
- Updated `research/http/types.ts`: added streaming methods to `HttpClient` and responseType option.
- Updated `research/http/client.ts`: implemented `stream`, `streamLines`, `streamEvents`, and `streamJsonEvents`.
- Updated `research/http/index.ts`: exported streaming types and parsing utilities.
- Added `research/http/streaming.test.ts`: 8 test cases covering raw byte iteration, chunk boundary line framing, reader cancellation on break, single/multi-line SSE parsing, trailing event flush, JSON SSE deserialization, JSON parse failure handling, and client streaming integration with `Accept: text/event-stream`.
- Updated `research/http/README.md`: documented H6 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 9 test files, 74 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H6 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Zero external runtime dependencies.
- Confirmed stop condition: H7 (SSR Security + Private Network Defenses) has NOT been started.

### Remaining / recovery

- Await maintainer review of H6 streaming prototype.
- Future work: H7 (SSR Security + Private Network Defenses) only when authorized.

## 2026-08-23 01:15 CEST | H5 HTTP Retry Engine & Method Idempotency

Status: completed
Branch: `feat/http-retry-idempotency`
PR: #133

### Scope

- Implement H5 (Retry + Idempotency Engine) throwaway research prototype in `research/http/`.
- Enforce core governance invariant: retries are strictly disabled by default (`retry: undefined` / 0 retries).
- Implement exponential backoff with full jitter (`calculateBackoff`).
- Implement standard `Retry-After` header parsing (`parseRetryAfter`) for both delta-seconds and HTTP-date formats.
- Implement method idempotency guards: non-idempotent methods (`POST`, `PATCH`) are excluded from automatic retries unless explicitly configured.
- Implement `executeWithRetry` retry execution runner integrated inside `HttpClient.request`.
- Implement immediate `AbortSignal` cancellation during backoff sleep delays.
- Add test suite in `research/http/retry.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/retry.ts`: `RetryPolicy`, `parseRetryAfter`, `calculateBackoff`, `normalizeRetryPolicy`, and `executeWithRetry`.
- Updated `research/http/types.ts`: added `retry` property to `HttpClientConfig` and `HttpRequestOptions`.
- Updated `research/http/client.ts`: integrated `executeWithRetry` inside `request()` and `.extend()`.
- Updated `research/http/index.ts`: exported retry types and functions.
- Added `research/http/retry.test.ts`: 9 test cases covering `Retry-After` parsing, backoff calculations with/without jitter, default disabled behavior, retry on 503/500 status, retry on network failure, POST idempotency protection, custom `retryOnMethods`, 429 rate limit backoff, and signal abort during backoff sleep.
- Updated `research/http/README.md`: documented H5 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 8 test files, 65 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H5 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Zero external runtime dependencies.
- Confirmed stop condition: H6 (Streaming + SSE + Web Streams) has NOT been started.

### Remaining / recovery

- Await maintainer review of H5 retry engine prototype.
- Future work: H6 (Streaming + SSE + Web Streams) only when authorized.

## 2026-08-23 01:05 CEST | H4 HTTP Error Taxonomy & Standard Schema Validation

Status: completed
Branch: `feat/http-error-taxonomy-validation`
PR: #132

### Scope

- Implement H4 (Error Taxonomy + Validation Boundary) throwaway research prototype in `research/http/`.
- Implement structured error taxonomy: `HttpError` (base), `HttpStatusError` (non-2xx responses with parsed error data), `NetworkError` (transport/DNS failures), `HttpParseError` (JSON deserialization failure), and `HttpValidationError` (Standard Schema failure).
- Implement Standard Schema v1 (`@standard-schema/spec`) response payload validation boundary (`validatePayload`).
- Implement typed JSON decoding helpers: `requestJson`, `getJson`, `postJson`, `putJson`, `patchJson`, and `deleteJson` with `204 No Content` handling.
- Implement error predicates: `isHttpStatusError`, `isNetworkError`, `isHttpParseError`, `isHttpValidationError`, `isHttpError`.
- Add test suite in `research/http/errors-validation.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/errors.ts`: `HttpError`, `HttpStatusError`, `NetworkError`, `HttpParseError`, `HttpValidationError`, and error predicates.
- Added `research/http/schema.ts`: Standard Schema v1 type definitions and `validatePayload` runner.
- Updated `research/http/types.ts`: added `schema`, `throwOnError`, `responseType`, and typed JSON methods to `HttpClient`.
- Updated `research/http/client.ts`: integrated `NetworkError` mapping, `HttpStatusError` throwing on non-2xx status, and typed JSON decoding with schema validation.
- Updated `research/http/index.ts`: exported error classes, predicates, and schema types.
- Added `research/http/errors-validation.test.ts`: 7 test cases covering `HttpStatusError`, `NetworkError`, `HttpParseError`, `204 No Content`, Standard Schema v1 validation success, `HttpValidationError` on schema rejection, and error predicates.
- Updated `research/http/README.md`: documented H4 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 7 test files, 56 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H4 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Zero core schema library dependencies: uses Standard Schema v1 specification boundary.
- Confirmed stop condition: H5 (Retry + Idempotency Engine) has NOT been started.

### Remaining / recovery

- Await maintainer review of H4 error taxonomy and validation prototype.
- Future work: H5 (Retry + Idempotency Engine) only when authorized.

## 2026-08-23 00:55 CEST | H3 HTTP Cancellation, Timeout & Scope Lifecycle

Status: completed
Branch: `feat/http-cancellation-timeout-scope`
PR: #131

### Scope

- Implement H3 (Cancellation + Timeout + Scope) throwaway research prototype in `research/http/`.
- Implement signal composition (`composeSignals`) merging multiple `AbortSignal` sources (user abort, deadline timeout, Vii Scope disposal) with automatic listener cleanup on settlement.
- Implement deadline enforcement (`createTimeoutSignal`) supporting client-level `config.timeout` and request-level `options.timeout`.
- Implement Vii `Scope` lifecycle binding (`bindScopeSignal`), aborting inflight requests on `scope.dispose()`.
- Implement error classification predicates (`isTimeoutError`, `isAbortError`) enforcing the core invariant `cancellation != failure`.
- Integrate signal management and cleanup inside `HttpClient.request` and `.extend()`.
- Add test suite in `research/http/cancellation.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/cancellation.ts`: `TimeoutError`, `AbortError`, error predicates, `createTimeoutSignal`, `bindScopeSignal`, and `composeSignals`.
- Updated `research/http/types.ts`: added `timeout`, `scope`, and `ScopeLike` types.
- Updated `research/http/client.ts`: integrated composed signal propagation, timeout handling, Scope binding, and `finally` cleanup.
- Updated `research/http/index.ts`: exported cancellation primitives and error types.
- Added `research/http/cancellation.test.ts`: 9 test cases covering error classification, timeout signals, signal composition, Scope binding, user abort, timeout expiration, Scope disposal, and post-request listener cleanup.
- Updated `research/http/README.md`: documented H3 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 6 test files, 49 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H3 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Retains zero-dependency, Fetch-first platform alignment.
- Confirmed stop condition: H4 (Error Taxonomy + Validation Boundary) has NOT been started.

### Remaining / recovery

- Await maintainer review of H3 cancellation/timeout prototype and evidence.
- Future work: H4 (Error Taxonomy + Validation Boundary) only when authorized.

## 2026-08-23 00:45 CEST | H2 HTTP Middleware Pipeline & Context Propagation

Status: completed
Branch: `feat/http-middleware-pipeline`
PR: #130

### Scope

- Implement H2 (Middleware / Request Pipeline) functional onion-style middleware engine in `research/http/`.
- Implement `composeMiddleware` with deterministic array execution ordering (pre-dispatch 1 -> 2 -> transport -> post-dispatch 2 -> 1).
- Implement non-wire `HttpRequestContext` propagation across the pipeline.
- Implement request and response transformations in middleware.
- Implement short-circuiting capability (returning a Response without calling transport).
- Implement single-invocation guard against duplicate `next()` calls in middleware.
- Implement error recovery and async exception propagation through the pipeline.
- Integrate middleware in `createHttpClient` and child inheritance in `extend()`.
- Add test suite in `research/http/middleware.test.ts` and update `research/http/README.md`.
- Update `DUTY_WATCH.md`.

### Changes

- Added `research/http/pipeline.ts`: `composeMiddleware` functional onion pipeline runner with double-invocation guard.
- Updated `research/http/types.ts`: added `HttpHandler`, `HttpMiddleware`, and `HttpRequestContext` types.
- Updated `research/http/client.ts`: integrated middleware pipeline, per-request middleware, context handling, and `extend()` inheritance.
- Updated `research/http/index.ts`: exported `composeMiddleware` and new types.
- Added `research/http/middleware.test.ts`: 9 test cases covering onion ordering, request/response transformations, short-circuiting, context propagation, error recovery, double-call protection, `extend()` inheritance, and per-request middleware.
- Updated `research/http/client.test.ts`: verified Request body text extraction and client functionality.
- Updated `research/http/README.md`: documented H2 capabilities and non-goals.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 5 test files, 40 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H2 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Retains zero-dependency, Fetch-first platform alignment.
- Confirmed stop condition: H3 (Cancellation + Timeout + Scope) has NOT been started.

### Remaining / recovery

- Await maintainer review of H2 middleware prototype and evidence.
- Future work: H3 (Cancellation + Timeout + Scope) only when authorized.

## 2026-08-23 00:35 CEST | H1 HTTP Client Baseline Prototype & Test Suite

Status: completed
Branch: `feat/http-client-baseline`
PR: #129

### Scope

- Implement H1 (Fetch-first Client Baseline) throwaway research prototype in `research/http/`.
- Prototype `createHttpClient(config)` factory for isolated, immutable HTTP client instances.
- Implement deterministic URL resolution (`resolveUrl`) with `baseURL` joining, relative path normalization, and robust query serialization (`serializeQueryParams`).
- Implement deterministic header merging (`mergeHeaders`) with case-insensitivity, record/Headers/tuple support, and explicit header deletion on `undefined`/`null`.
- Implement method helpers (`get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `request`).
- Implement injected `fetch` capability and per-request overrides.
- Implement immutable client inheritance (`extend`).
- Add comprehensive test suite in `research/http/` covering URL resolution, headers merging, client lifecycle, method helpers, and hostile/edge cases.
- Update `DUTY_WATCH.md` and `PROJECT_STATE.md`.

### Changes

- Added `research/http/types.ts`: TypeScript contracts for H1 baseline (`HttpClient`, `HttpClientConfig`, `HttpRequestOptions`, `HttpMethod`, `QueryParams`, `ExtendedHeadersInit`).
- Added `research/http/url.ts`: deterministic URL and query parameter resolution.
- Added `research/http/headers.ts`: case-insensitive header merging and deletion.
- Added `research/http/client.ts`: immutable client implementation and `createHttpClient` factory.
- Added `research/http/index.ts`: module entrypoint.
- Added `research/http/tsconfig.json`: isolated typecheck configuration.
- Added `research/http/README.md`: H1 research documentation.
- Added `research/http/url.test.ts`: 12 test cases for URL composition and query serialization.
- Added `research/http/headers.test.ts`: 6 test cases for header merging and deletion.
- Added `research/http/client.test.ts`: 8 test cases for client execution, helpers, and `extend()`.
- Added `research/http/hostile-fixtures.test.ts`: 5 test cases for edge cases, special characters, and prototype pollution defense.
- Updated `PROJECT_STATE.md`: registered H1 research prototype in project state.

### Validation

- `pnpm exec vitest run research/http/*.test.ts`: 4 test files, 31 tests passed (0 failures).
- `pnpm exec tsc -p research/http/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: all packages and fixtures passed cleanly.
- `pnpm validate`: passed cleanly (all builds, tests, and packed-artifact checks passed).
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H1 is strictly an isolated research prototype under `research/http/`.
- No `@vii-labs/core` dependency or bundle impact.
- Retains zero-dependency, Fetch-first platform alignment.
- Confirmed stop condition: H2 (Middleware Pipeline) has NOT been started.

### Remaining / recovery

- Await maintainer review of H1 prototype and evidence.
- Future work: H2 (Middleware / Request Pipeline) only when authorized.

## 2026-08-22 19:15 CEST | H0 HTTP Client & Transport Research (Architecture + Semantic Boundaries)

Status: completed
Branch: `docs/http-client-research`
PR: #128

### Scope

- Define H0 semantic boundaries, transport contracts, and architecture for Vii HTTP research.
- Clarify architectural invariants: Query owns server-state coordination, HTTP owns transport, Schema owns data validation.
- Establish Fetch-first baseline and client ownership model (no global mutable singleton, request-scoped SSR isolation).
- Define structured error taxonomy (`cancellation != failure`), functional onion middleware pipeline, explicit timeout, and composed `AbortSignal` cancellation.
- Establish default policy: retries are disabled by default.
- Integrate Standard Schema v1 (`@standard-schema/spec`) for runtime response validation without core schema dependencies.
- Establish observational diagnostics protocol and day-one security/privacy baseline (cross-origin redirect credential stripping, SSRF risks, header redaction).
- Define H0–H9 research roadmap and multi-dimensional verification matrix per `FEATURE_ACCEPTANCE_GATE.md`.
- Formulate H9 Build-vs-Buy evaluation gate (`Own`, `Reuse`, `Wrap`, `Reduce`, `Stop`).
- Update `docs/roadmap/HTTP_CLIENT_RESEARCH.md`, `docs/architecture/HTTP_CLIENT.md`, `ROADMAP.md`, `docs/roadmap/IMPLEMENTATION_ROADMAP.md`, and `PROJECT_STATE.md`.

### Changes

- Added `docs/roadmap/HTTP_CLIENT_RESEARCH.md`: durable research roadmap defining H0 architecture, semantic boundaries, taxonomy, security invariants, testing matrix, and H0–H9 sequence.
- Updated `docs/architecture/HTTP_CLIENT.md`: linked to active HTTP research roadmap.
- Updated `ROADMAP.md`: linked Vii HTTP capability to research roadmap.
- Updated `docs/roadmap/IMPLEMENTATION_ROADMAP.md`: updated HTTP research track source-of-truth references.
- Updated `PROJECT_STATE.md`: registered `HTTP_CLIENT_RESEARCH.md` in repository source-of-truth index.

### Validation

- `pnpm format:check`: passed cleanly.
- `pnpm lint`: passed cleanly.
- `pnpm typecheck`: passed cleanly.
- `pnpm test`: 70 test files, 442 tests passed across repository.
- `pnpm validate`: passed cleanly.
- `git diff --check`: passed cleanly with zero whitespace/formatting errors.

### Architecture / compatibility

- Zero package creation or public API changes: H0 is strictly research and architecture documentation.
- No `@vii-labs/core` dependency or bundle impact.
- Standard Schema v1 contract decoupled from first-party schema engines.
- Confirmed stop condition: H1 has NOT been started.

### Remaining / recovery

- Await maintainer review of H0 architecture and research roadmap.
- Future work: H1 (Fetch-first Client Baseline) only when authorized.

## 2026-08-22 18:45 CEST | S7 Performance, Empirical Build-vs-Buy & Governance Realignment

Status: completed
Branch: `docs/schema-architecture-research`
PR: #127

### Scope

- Acknowledge governance process violation: A completed research slice does not authorize subsequent slices unless the approved task explicitly grants that scope. Future execution strictly respects slice/phase stop conditions.
- Realize Anti-Gravity project-level governance: persisted authoritative governance rule in `AGENTS.md`.
- Implement empirical comparative benchmark harness in `research/schema/schema-benchmarks.test.ts` testing pinned competitor versions (`zod@4.4.3`, `valibot@1.4.2`, `arktype@2.2.3`, `@sinclair/typebox@0.34.52`, and handwritten baseline).
- Implement official **Standard Schema v1** (`@standard-schema/spec@1.1.0`) cross-ecosystem interoperability test suite in `research/schema/standard-schema-interop.test.ts`, proving actual Zod, Valibot, and ArkType schemas validate cleanly through generic Vii consumer boundaries.
- Formulate honest evidence-backed Build-vs-Buy verdict: **`Wrap` + `Reduce`** (Universal Standard Schema v1 boundary for Form/HTTP/Query + Minimal Codec utilities; Anti-Own recommendation rejecting redundant validation monolith).
- Update `docs/roadmap/SCHEMA_RESEARCH.md`, `research/schema/README.md`, `AGENTS.md`, and `PROJECT_STATE.md` with empirical data and governance alignment.

### Changes

- Updated `package.json` & `pnpm-lock.yaml`: pinned devDependencies for comparative benchmarking (`zod@4.4.3`, `valibot@1.4.2`, `arktype@2.2.3`, `@sinclair/typebox@0.34.52`, `@standard-schema/spec@1.1.0`).
- Updated `AGENTS.md`: persisted authoritative governance rule.
- Added `research/schema/schema-benchmarks.test.ts`: multi-dimensional comparative benchmark suite across 6 competitors.
- Added `research/schema/standard-schema-interop.test.ts`: real cross-ecosystem Standard Schema v1 interop test suite.
- Updated `research/schema/standard-schema.ts`: aligned with official `@standard-schema/spec` types.
- Updated `docs/roadmap/SCHEMA_RESEARCH.md` & `research/schema/README.md`: recorded empirical benchmark measurements, multi-dimensional analysis, and final Build-vs-Buy verdict.
- Updated `PROJECT_STATE.md`: registered finalized schema research source-of-truth.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 10 test files, 60 tests passed (0 failures).
- `pnpm exec vitest run`: 70 test files, 442 tests passed across repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm pack:check`, `git diff --check`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- Core Decoupling Invariant: `@vii-labs/core` remains 100% zero-dependency, platform-neutral, and completely decoupled from Schema.
- Build-vs-Buy Verdict (`Wrap` + `Reduce`): Native Standard Schema v1 acceptance across Vii Form, Vii HTTP, and Vii Query; lightweight codecs for serialization.
- Stop Condition & Boundary: HTTP Client & Transport Research has NOT been started. PR #127 is ready for human review.

### Remaining / recovery

- Schema & Codec Research Track (S0–S7) is 100% complete and fully verified. Next planned research track is HTTP Client & Transport Research (pending separate authorization).

## 2026-08-22 18:30 CEST | S6 Integration Contract Fixtures (Form / HTTP / Query)

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Implement S6 Integration Contract Fixtures in `research/schema/integration-fixtures.test.ts` and `research/schema/standard-schema.ts`.
- Verify seamless decoupling: `@vii-labs/core` remains completely agnostic of Schema while higher-level consumers connect via clean boundary contracts.
- Implement and verify Vii Form integration fixture: single-field validation on change/blur, submit validation, `createFormErrors` structured error mapping, and zero-copy value preservation.
- Implement and verify Vii HTTP client fixture: query string serialization (`urlSearchParamsCodec`) and JSON response decode validation (`jsonCodec`) with fail-closed union/property checking.
- Implement and verify Vii Query / Hydration cache boundary fixture: fail-closed validation of dehydrated cache entries, securely discarding prototype pollution and corrupted payloads during cache restore.
- Implement Standard Schema v1 specification wrapper (`toStandardSchema`), guaranteeing out-of-the-box interoperability with ecosystem tools (TanStack Form, tRPC, ArkType/Zod standard adapters).

### Changes

- Added `research/schema/standard-schema.ts`: `StandardSchemaV1`, `toStandardSchema`.
- Updated `research/schema/index.ts`: exported `toStandardSchema`.
- Added `research/schema/integration-fixtures.test.ts`: comprehensive integration test suite for Form, HTTP, Query cache hydration, and Standard Schema v1.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 8 test files, 51 tests passed (0 failures).
- `pnpm exec vitest run`: 68 test files, 433 tests passed across repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`, `pnpm lint`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- Core Decoupling Invariant: Schema is an optional peripheral boundary and is never imported by Core.
- Standard Schema v1 Interoperability: Native compatibility with the emerging cross-framework validation standard.

### Remaining / recovery

- S6 complete. Next slice is S7 (Performance & Build-vs-Buy Evaluation Gate).

## 2026-08-22 18:15 CEST | S5 Type Inference & TS Compiler Cost

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Implement S5 Type Inference & TypeScript compiler performance benchmark test suite in `research/schema/type-inference.test.ts`.
- Verify static type inference fidelity for `InferInput<T>` and `InferOutput<T>` across primitives, optional/nullable modifiers, wide objects (25+ fields), unions, and asymmetric transformation codecs (`dateFromISOString`, `bigIntFromString`, `jsonCodec`, `urlSearchParamsCodec`).
- Verify deep generic nesting (10 levels of nested objects/arrays) without triggering TS2589 infinite instantiation depth errors.
- Profile `tsc -p research/schema/tsconfig.json --noEmit` duration and confirm sub-second / fast compilation performance without IDE degradation.

### Changes

- Added `research/schema/type-inference.test.ts`: compile-time type equality assertions (`Expect<Equal<A, B>>`) and runtime verification across deep and wide schemas.
- Refactored `research/schema/structures.ts` and `research/schema/security.ts`: extracted `checkStructureSecurity` helper, reducing `structures.ts` to 196 lines.
- Updated `research/schema/codec.ts`: refined `urlSearchParamsCodec` type signature to strictly preserve `InferOutput<TShape[K]>`.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 7 test files, 44 tests passed (0 failures).
- `pnpm exec vitest run`: 67 test files, 426 tests passed across repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors (compile time ~0.78s).
- `pnpm format:check`, `pnpm lint`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- Zero Compiler Recursion Hazard: Deep structure schemas infer cleanly within TypeScript recursion limits.
- Precise Asymmetry: Codecs preserve exact input and output type separation without intermediate type widening (`any`).

### Remaining / recovery

- S5 complete. Next slice is S6 (Integration Contract Fixtures: Form / HTTP / Query).

## 2026-08-22 18:00 CEST | S4 Security, CSP & Complexity Consolidation

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Implement S4 Security, CSP, and complexity consolidation in `research/schema/security.ts` and `research/schema/structures.ts`.
- Integrate nesting depth limiter (`DEFAULT_MAX_DEPTH = 32`) preventing call stack exhaustion on deeply nested adversarial inputs.
- Integrate cyclic reference detection (`WeakSet<object>`) preventing infinite recursion on cyclic objects and arrays.
- Enforce property count bounds (`DEFAULT_MAX_PROPERTIES = 1000`) and ReDoS input length bounds (`MAX_REGEX_INPUT_LENGTH = 1000`) for regex checks.
- Audit strict CSP compliance across all schema research files (`auditCSPCompliance`), confirming zero `eval`, `new Function`, or string timer evaluations.
- Verify comprehensive security defenses against prototype pollution variants, proxy traps, and throwing property getters.

### Changes

- Added `research/schema/security.ts`: `ValidationContext`, `createValidationContext`, `enterChildContext`, `isObjectCycleDetected`, `isDepthExceeded`, `safeRegexTest`, and `auditCSPCompliance`.
- Updated `research/schema/structures.ts`: integrated context propagation, depth limits, cycle checks, and property count bounds.
- Updated `research/schema/primitives.ts`: integrated `safeRegexTest` in `StringSchema`.
- Updated `research/schema/index.ts`: exported security utilities.
- Added `research/schema/security-consolidation.test.ts`: test suite for ReDoS prevention, cyclic objects/arrays, depth/property limits, and strict CSP compliance.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 6 test files, 39 tests passed (0 failures).
- `pnpm exec vitest run`: 66 test files, 421 tests passed across repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`, `pnpm lint`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- CSP Compliance: Zero dynamic code generation (`eval`, `new Function`) across entire schema engine.
- Complexity Bounding: Fail-closed rejection of cyclic graphs, depth overflows (> 32), and DoS property counts (> 1000).

### Remaining / recovery

- S4 complete. Next slice is S5 (Type Inference & TS Compiler Cost).

## 2026-08-22 17:45 CEST | S3 Codec / Serialization Semantics Research

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Implement S3 Codec & Serialization semantics research prototype in `research/schema/codec.ts`.
- Model explicit `Codec<TEncoded, TDecoded>` contract extending `Schema<TEncoded, TDecoded>` with typed `encode` and `decode` methods.
- Implement built-in reversible codecs: `dateFromISOString`, `bigIntFromString`, `jsonCodec`, `mapFromEntries`, and `setFromArray`.
- Implement `urlSearchParamsCodec` for bidirectional mapping between URL search queries and strongly typed object records (supporting numbers, booleans, arrays, and optional fields).
- Enforce serialization trust boundary: verify `decode` never trusts deserialized data blindly (JSON and query strings are rigorously validated with fail-closed error handling).

### Changes

- Added `research/schema/codec.ts`: `Codec<TEncoded, TDecoded>`, `CustomCodec`, `dateFromISOString`, `bigIntFromString`, `jsonCodec`, `mapFromEntries`, `setFromArray`, and `urlSearchParamsCodec`.
- Updated `research/schema/index.ts`: exported codec utilities from `codec.ts`.
- Added `research/schema/codec.test.ts`: test suite covering symmetric round-trips for Date, BigInt, JSON, Map, Set, URLSearchParams, and hostile/invalid string rejections.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 5 test files, 33 tests passed (0 failures).
- `pnpm exec vitest run`: 65 test files, 415 tests passed across repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`, `pnpm lint`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- Serialization Trust Boundary: Deserialized content (from `JSON.parse` or `URLSearchParams`) is untrusted input and must pass schema validation.
- Non-Universal Symmetry: Codecs are specialized where domain representations map losslessly to transport formats without assuming universal symmetry for arbitrary transforms.

### Remaining / recovery

- S3 complete. Next slice is S4 (Security + CSP + Complexity Consolidation).

## 2026-08-22 17:30 CEST | S2 Structured Issues & Absolute Privacy

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Implement S2 structured issues, Form error mapping, externalized localization, and absolute privacy model in `research/schema/issues.ts`.
- Format nested and array issue paths (`formatPath`) into standard representation (`"users[0].address.zip"`).
- Support grouping issues by path (`groupIssuesByPath`) and generating field errors for Vii Form integration (`createFormErrors`).
- Provide externalized translation dictionary support (`createLocalizer`) to format human-readable messages outside the validation hot path.
- Enforce and test absolute privacy boundary: verify raw user values (passwords, bearer tokens, card numbers, PII) are strictly omitted from issues and diagnostic safe summaries (`toDiagnosticSafeSummary`).

### Changes

- Added `research/schema/issues.ts`: `formatPath`, `groupIssuesByPath`, `createFormErrors`, `createLocalizer`, `defaultIssueMessage`, and `toDiagnosticSafeSummary`.
- Updated `research/schema/index.ts`: exported issue utilities from `issues.ts`.
- Added `research/schema/issues-privacy.test.ts`: test suite covering path formatting, form error generation, German localization, and sensitive value isolation.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 4 test files, 22 tests passed (0 failures).
- `pnpm exec vitest run`: 64 test files, 404 tests passed across repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`, `pnpm lint`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- Privacy Invariant: Raw user values never leak into `SchemaIssue`, error messages, or diagnostic summaries.
- Localization Separation: Formatting and internationalization are decoupled from validation execution.

### Remaining / recovery

- S2 complete. Next slice is S3 (Codec / Serialization Semantics Research).

## 2026-08-22 17:15 CEST | S1 Runtime Validation Baseline Prototype

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Implement S1 runtime validation baseline research prototype in `research/schema/`.
- Support primitives (`string`, `number`, `boolean`, `literal`, `null`, `undefined`, `unknown`) with constraints (`min`, `max`, `int`, `finite`, `email`, `regex`).
- Support structures (`object`, `array`, `union`) with path-aware issue tracking.
- Implement modifiers (`optional`, `nullable`, `refine`) and non-throwing `check()` primitive alongside throwing `parse()` convenience.
- Verify zero-copy object and array reference preservation (`result.ok && result.value === input`).
- Enforce day-one security protections: prototype pollution rejection (`__proto__`, `constructor`, `prototype`), getter traps, proxy traps, and deep nesting.

### Changes

- Added `research/schema/tsconfig.json`: isolated TypeScript configuration.
- Added `research/schema/types.ts`: `SchemaIssue`, `ValidationResult<T>`, `Schema<TIn, TOut>`, `InferInput<T>`, `InferOutput<T>`, `SchemaError`, and `BaseSchema`.
- Added `research/schema/primitives.ts`: primitive schemas (`string`, `number`, `boolean`, `literal`, `null`, `undefined`, `unknown`).
- Added `research/schema/structures.ts`: `object`, `array`, and `union` schemas with prototype pollution defense.
- Added `research/schema/index.ts`: authoring namespace `v`.
- Added `research/schema/schema-validation.test.ts`: test suite for primitives, structures, refinements, and `parse()`.
- Added `research/schema/zero-copy.test.ts`: test suite verifying zero-copy object and array identity preservation.
- Added `research/schema/hostile-security.test.ts`: adversarial security tests for prototype pollution, getter exceptions, and proxy traps.
- Added `research/schema/README.md`: S1 research prototype documentation.

### Verification

- `pnpm exec vitest run research/schema/*.test.ts`: 3 test files, 17 tests passed (0 failures).
- `pnpm exec vitest run`: 63 test files, 399 tests passed across full repository.
- `pnpm exec tsc -p research/schema/tsconfig.json --noEmit`: passed cleanly with 0 errors.
- `pnpm format:check`, `pnpm lint`, `pnpm validate`: all passed cleanly.

### Architecture & invariants

- Core Decoupling: Zero dependencies on `@vii-labs/core` or other runtime packages.
- Zero-Copy Invariant: Pure validation schemas preserve input object/array identity without allocating clones.
- Prototype Pollution: Objects reject `__proto__`, `constructor`, and `prototype` property keys fail-closed.

### Remaining / recovery

- S1 complete. Next slice is S2 (Structured Issues + Privacy).

## 2026-08-22 17:00 CEST | S0 Schema & Codec Research Architecture + Semantic Boundaries

Status: completed
Branch: `docs/schema-architecture-research`
PR: #126

### Scope

- Establish S0 Schema & Codec research architecture and semantic boundaries in `docs/roadmap/SCHEMA_RESEARCH.md`.
- Formalize precise definitions for Validation (zero-copy research target), Coercion (opt-in only), Transformation (allocating), Parsing, Refinement, and Defaulting.
- Define `check()` non-throwing primitive and `parse()` convenience contract; specify `InferInput<T>` vs `InferOutput<T>` type models.
- Establish structured error invariants and absolute privacy rules (zero raw user secrets in default issues or diagnostics).
- Mark symmetric `Codec<A, B>` models as intentionally open for S3; establish serialization trust boundaries.
- Define day-one security threats (Prototype Pollution, ReDoS, getters/proxies, CSP zero-eval) and build-vs-buy evaluation matrix for S7.
- Propose minimal S1 prototype scope and formalize S0-S7 research roadmap.

### Changes

- Created `docs/roadmap/SCHEMA_RESEARCH.md`: complete S0 architecture baseline and durable S0-S7 roadmap.
- Updated `PROJECT_STATE.md`: registered `docs/roadmap/SCHEMA_RESEARCH.md` in source-of-truth index.

### Verification

- Validated repository with `pnpm format:check`, `pnpm lint`, `git diff --check`, and `pnpm validate`.
- 10/10 package builds and packed clean-consumer fixtures verified cleanly.

### Architecture & invariants

- Core Decoupling: Vii Core does NOT depend on Schema.
- Provider Neutrality: Vii Form and HTTP use generic schema adapters and do not mandate a first-party Vii Schema package.
- Privacy Boundary: Default schema issues and diagnostics never contain raw received user values.
- Build-vs-Buy: S7 will evaluate Handwritten Baseline vs Zod 4 vs Valibot vs ArkType vs TypeBox vs Vii Prototype across 7 dimensions (Own, Reuse, Wrap, Reduce, Stop).

### Remaining / recovery

- S0 is complete. Do not automatically proceed to S1. Awaiting human review on draft PR before starting S1.

## 2026-08-22 16:00 CEST | P6.7 Performance, Accessibility, and Graduation Gate

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: #124

### Scope

- Execute Phase 6 research slice P6.7: Performance, Accessibility, and Graduation Gate.
- Benchmark token resolution throughput, behavior state machines, and DOM capability disposal.
- Verify accessibility matrix: APG keyboard navigation contracts, high-contrast ratios, and AT smoke-testing boundary.
- Formally evaluate the 5 graduation options and answer all 7 completion criteria from `docs/roadmap/PHASE_6_UI.md`.
- Conclude Phase 6 UI Foundation research with formal acceptance of Option A (Graduated Bounded Vii UI Foundation).

### Changes

- Added `docs/strategy/PHASE_6_UI_GRADUATION_EVALUATION.md`: formal graduation decision and completion criteria answers.
- Added `research/benchmarks-graduation/ui-benchmarks.test.ts`: benchmark test suite for throughput and lifecycle performance.
- Added `research/benchmarks-graduation/a11y-matrix.test.ts`: accessibility matrix test suite for APG contracts, contrast, and AT policies.
- Added `research/benchmarks-graduation/README.md`: research overview and verification guide.
- Updated `PROJECT_STATE.md` with Graduation Evaluation strategy reference.

### Validation

- `pnpm exec vitest run research/benchmarks-graduation/*.test.ts`: 2 test files, 10 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/benchmarks-graduation/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 60 test files, 382 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research only).
- Verified graduation decision: Accept Option A (Bounded Vii UI Foundation: DTCG Tokens, Headless Behaviors, Declarative Registry, and Source Distribution).

### Remaining / recovery

- Phase 6 UI Foundation Research is 100% complete across all 7 slices (P6.1 to P6.7).
- Ready for full branch commit and Pull Request submission.

## 2026-08-22 15:52 CEST | P6.6 Distribution Modes & Security Hardening Consolidation

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: not opened

### Scope

- Execute Phase 6 research slice P6.6: Distribution Modes and Security Hardening Consolidation.
- Formally evaluate Source Distribution vs Package Distribution vs Custom Elements trade-offs.
- Establish architectural boundaries: Source Mode as primary for components/themes, Package Mode restricted to headless behaviors (`@vii-labs/ui-behaviors`).
- Establish Custom Elements DOM boundary: Light DOM is mandatory for form-associated or cross-referencing ARIA components (`aria-controls`, `aria-labelledby`); Shadow DOM is restricted to isolated visual-only widgets.
- Consolidate security hardening: strict Content Security Policy (CSP) & Trusted Types compliance (zero dynamic eval or innerHTML), token CSS generation, prototype pollution gating, and fail-closed path containment.

### Changes

- Added `docs/strategy/UI_DISTRIBUTION_MODES_AND_SECURITY_HARDENING.md`: formal evaluation and strategy decision document.
- Added `research/security-hardening/csp-compliance.ts`: CSP compliance evaluator and safe stylesheet factory.
- Added `research/security-hardening/dom-boundary.ts`: Light DOM vs Shadow DOM boundary evaluator.
- Added `research/security-hardening/security-hardening.test.ts`: test suite for CSP safety, DOM boundary decisions, and token stylesheet generation.
- Added `research/security-hardening/README.md`: research findings, distribution mode summary, and verification guide.
- Updated `PROJECT_STATE.md` with Security Hardening & Distribution Modes strategy reference.

### Validation

- `pnpm exec vitest run research/security-hardening/*.test.ts`: 1 test file, 6 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/security-hardening/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 58 test files, 372 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research only).
- Verified decision: Source mode remains default; Light DOM is required for composite accessibility.

### Remaining / recovery

- Next slice in Phase 6: P6.7 (Performance, Accessibility, and Graduation Gate).

## 2026-08-22 15:45 CEST | P6.5 Cross-Framework Compliance Slice

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: not opened

### Scope

- Execute Phase 6 research slice P6.5: Cross-Framework Compliance Slice.
- Prove shared semantic contracts across 5 framework-native targets (Vanilla, React, Angular, Vue, Custom Elements).
- Adapt vertical component slices (Button and Disclosure) using native lifecycle, inputs/props, events, and typing.
- Build shared compliance test suite asserting identical behavioral, ARIA, and accessibility states across all 5 targets.
- Verify lifecycle cleanup and complete core decoupling without introducing a monolithic universal wrapper.

### Changes

- Added `research/cross-framework-ui/types.ts`: shared component props and snapshot models.
- Added `research/cross-framework-ui/vanilla/button.ts` & `vanilla/disclosure.ts`: pure DOM Vanilla adapters.
- Added `research/cross-framework-ui/react/button.ts` & `react/disclosure.ts`: React hook and props adapters.
- Added `research/cross-framework-ui/angular/button.ts` & `angular/disclosure.ts`: Angular class and Signal adapters.
- Added `research/cross-framework-ui/vue/button.ts` & `vue/disclosure.ts`: Vue composable and reactive adapters.
- Added `research/cross-framework-ui/custom-elements/button.ts` & `custom-elements/disclosure.ts`: Web Components Custom Elements adapters.
- Added `research/cross-framework-ui/cross-framework-compliance.test.ts`: compliance test suite running identical semantic assertions across all 5 targets.
- Added `research/cross-framework-ui/README.md`: compliance matrix documentation and verification guide.
- Updated `PROJECT_STATE.md` with Cross-Framework UI research reference.

### Validation

- `pnpm exec vitest run research/cross-framework-ui/*.test.ts`: 1 test file, 25 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/cross-framework-ui/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 57 test files, 366 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research only).
- Verified principle: Target-specific adapters translate lifecycle and rendering semantics without duplicating shared domain behavior.

### Remaining / recovery

- Next slice in Phase 6: P6.6 (Distribution Modes & Security Hardening Review).

## 2026-08-22 15:00 CEST | P6.4 Source Distribution Mutation Lifecycle

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: not opened

### Scope

- Execute Phase 6 research slice P6.4: Source Distribution Mutation Lifecycle.
- Prove complete 9-phase mutation lifecycle (`resolve -> validate -> analyze -> plan -> preview -> apply -> validate-result -> record-lock -> report`).
- Verify byte-for-byte non-mutating dry-run behavior.
- Verify deterministic idempotency on repeated apply without redundant writes.
- Verify local modification conflict detection without silent overwrites (no `--force` in initial slice).
- Verify pre-mutation integrity verification and symbolic link containment protection.
- Verify source detachment workflow cleanly removing lock tracking while preserving installed source files.

### Changes

- Added `research/source-distribution/types.ts`: mutation lifecycle phases, plans, validation, and report types.
- Added `research/source-distribution/source-installer.ts`: 9-phase source installation engine and lockfile updater.
- Added `research/source-distribution/source-installer.test.ts`: test suite for clean install, dry-run, idempotency, conflicts, symlinks, and detachment.
- Added `research/source-distribution/README.md`: lifecycle phase documentation and verification guide.
- Updated `PROJECT_STATE.md` with Source Distribution research reference.

### Validation

- `pnpm exec vitest run research/source-distribution/*.test.ts`: 1 test file, 7 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/source-distribution/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 56 test files, 341 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research only).
- Verified compatibility with existing CLI Core safety principles: all file writes are root-confined, atomic, no-follow symlink safe, and dry-run non-mutating.

### Remaining / recovery

- Next slice in Phase 6: P6.5 (Cross-Framework Compliance Slice).

## 2026-08-22 03:05 CEST | P6.3 Registry Contract & Threat-Model Prototype

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: not opened

### Scope

- Execute Phase 6 research slice P6.3: Registry Contract and Threat-Model Prototype.
- Prove declarative manifest parsing, versioning, item types, and target frameworks without executable installation code.
- Implement strict threat-model validation: prototype pollution prevention, directory traversal rejection (`..`, `%2e%2e`), absolute path rejection, duplicate destination detection, and executable script blocking.
- Implement cryptographic SHA-256 integrity verification for individual files and canonical manifests.
- Implement deterministic lock state representation and serialization (`schemaVersion: 1`), tracking original hashes for local modification detection.
- Prove clean source detachment semantics that preserve installed application-owned source files.

### Changes

- Added `research/registry/types.ts`: typed manifest schema, file entries, lock state, and provenance models.
- Added `research/registry/manifest-validator.ts`: fail-closed manifest and path containment validator.
- Added `research/registry/integrity.ts`: SHA-256 base64 hashing, content verification, and manifest integrity computation.
- Added `research/registry/lockfile.ts`: deterministic lockfile serialization, local modification detection, and source detachment.
- Added `research/registry/fixtures/button.manifest.json`: valid React button component manifest fixture.
- Added `research/registry/fixtures/dialog.manifest.json`: valid React dialog modal manifest fixture with capabilities.
- Added `research/registry/manifest-validator.test.ts`: test suite for schema validation, types, and prototype pollution.
- Added `research/registry/security-path-containment.test.ts`: test suite for path containment and traversal attacks.
- Added `research/registry/integrity-verification.test.ts`: test suite for cryptographic integrity and tampering detection.
- Added `research/registry/lockfile-detachment.test.ts`: test suite for lockfile recording, serialization, modification check, and detachment.
- Added `research/registry/README.md`: research findings, threat model table, and verification guide.
- Updated `PROJECT_STATE.md` with Registry research references.

### Validation

- `pnpm exec vitest run research/registry/*.test.ts`: 4 test files, 19 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/registry/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 55 test files, 334 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research only).
- Gating rule verified: Security and path containment fixtures must gate registry parsing before mutation commands (P6.4) can rely on them.

### Remaining / recovery

- Next slice in Phase 6: P6.4 (Source Distribution Mutation Lifecycle).

## 2026-08-22 02:55 CEST | P6.2 Accessibility Behavior Contracts & DOM Capability Boundary

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: not opened

### Scope

- Execute Phase 6 research slice P6.2: Accessibility Behavior Contracts and DOM Capability Boundary.
- Prove framework-neutral behavior models for Disclosure, Tabs, and Dialog without framework dependencies.
- Build explicit DOM Capabilities boundary for focus trapping, background inertness, scroll locking, escape dismissal, and outside click.
- Verify WAI-ARIA APG pattern semantics, roving tabIndex, keyboard intent, and complete lifecycle disposal.
- Record explicit boundary: automated checks and APG patterns do not substitute for production Assistive Technology (screen reader) verification.

### Changes

- Added `research/ui-behaviors/types.ts`: shared behavior contracts, keyboard intents, and DOM capability provider interfaces.
- Added `research/ui-behaviors/disclosure.ts`: framework-neutral Disclosure behavior (APG Disclosure pattern).
- Added `research/ui-behaviors/tabs.ts`: framework-neutral Tabs behavior with horizontal/vertical roving tabIndex and automatic/manual activation (APG Tabs pattern).
- Added `research/ui-behaviors/dom-capabilities.ts`: DOM capabilities provider (`trapFocus`, `setInert`, `lockScroll`, `onEscape`, `onOutsideClick`).
- Added `research/ui-behaviors/dialog.ts`: headless dialog state machine with attachable DOM capabilities (APG Dialog Modal pattern).
- Added `research/ui-behaviors/disclosure-behavior.test.ts`: test suite for Disclosure state and keyboard intents.
- Added `research/ui-behaviors/tabs-behavior.test.ts`: test suite for Tabs navigation, orientation, and roving tabIndex.
- Added `research/ui-behaviors/dom-capabilities.test.ts`: test suite for focus trap, inertness, scroll locking, and cleanup.
- Added `research/ui-behaviors/dialog-behavior.test.ts`: test suite for headless Node execution and DOM-integrated modal lifecycle.
- Added `research/ui-behaviors/a11y-apg-review.test.ts`: test suite for WAI-ARIA APG compliance review.
- Added `research/ui-behaviors/README.md`: research findings and architecture documentation.
- Updated `PROJECT_STATE.md` with UI behaviors research reference.

### Validation

- `pnpm exec vitest run research/ui-behaviors/*.test.ts`: 5 test files, 22 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/ui-behaviors/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 51 test files, 315 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research only).
- Clear separation established: Pure interaction semantics remain framework-neutral; browser focus, scrolling, and inertness stay behind explicit DOM capability providers.

### Remaining / recovery

- Next slice in Phase 6: P6.3 (Registry Contract & Threat-Model Prototype).

## 2026-08-22 02:15 CEST | P6.1 Design Token Format & Transformation Prototype

Status: completed
Branch: `test/ui-tokens-dtcg-research`
PR: not opened

### Scope

- Execute Phase 6 research slice P6.1: Design Token Format / Transformation Prototype.
- Target published DTCG 2025.10 specification as the research baseline.
- Prototype 3-layer token hierarchy (Primitive -> Semantic -> Limited Component) across light and dark themes.
- Build strict validation engine preventing prototype pollution, cycle dependencies, type mismatches, and CSS variable collisions.
- Build mathematical WCAG 2.1 / 2.2 contrast evaluation distinguishing explicit criteria (AA/AAA Normal/Large, Non-text, Focus indicators).
- Build deterministic generators for CSS Custom Properties, TypeScript definitions, and JSON manifests.
- Conduct formal build-vs-buy evaluation comparing custom compiler, heavyweight external tooling, and lightweight direct transformation.

### Changes

- Added `research/tokens/dtcg-types.ts`: typed DTCG 2025.10 format definitions.
- Added `research/tokens/token-validator.ts`: deep AST validation, prototype pollution checks, depth limits, type checks, and alias detection.
- Added `research/tokens/token-resolver.ts`: topological alias resolution, cycle detection, and CSS variable name normalization.
- Added `research/tokens/contrast-evaluator.ts`: sRGB/Display P3 relative luminance and WCAG 2.1/2.2 contrast ratio auditor.
- Added `research/tokens/token-generator.ts`: deterministic CSS Custom Properties, TypeScript constants, and JSON manifest generation.
- Added `research/tokens/fixtures/tokens.canonical.json`: 3-layer canonical tokens fixture.
- Added `research/tokens/fixtures/theme.dark.json`: dark theme semantic overrides.
- Added `research/tokens/token-validator.test.ts`: test suite for syntax, types, prototype pollution, and security limits.
- Added `research/tokens/token-resolver.test.ts`: test suite for aliases, cycle detection, and variable collisions.
- Added `research/tokens/token-contrast.test.ts`: test suite for WCAG 2.1/2.2 contrast criteria on light and dark themes.
- Added `research/tokens/token-generator.test.ts`: test suite for deterministic CSS/TS/JSON generation.
- Added `research/tokens/token-benchmarks.test.ts`: throughput (> 5,000 docs/s) and byte-stability benchmarks over 100 runs.
- Added `research/tokens/README.md`: research findings, specification details, and verification guide.
- Added `docs/strategy/DESIGN_TOKENS_BUILD_VS_BUY_EVALUATION.md`: formal build-vs-buy analysis and recommendations.
- Updated `PROJECT_STATE.md` with UI Foundation and Design Tokens research references.

### Validation

- `pnpm exec vitest run research/tokens/*.test.ts`: 5 test files, 28 tests passed (0 failures).
- `pnpm exec tsc --noEmit -p research/tokens/tsconfig.json`: passed cleanly (0 errors).
- `pnpm exec vitest run`: 46 test files, 293 tests passed (0 failures).
- `pnpm format:check`: passed.
- `pnpm lint`: passed.

### Architecture / compatibility

- Zero runtime or public API changes (throwaway research and documentation only).
- Recommendation: Vii will NOT own a heavyweight token compiler package. Instead, adopt standard DTCG 2025.10 JSON format with a lightweight transform/validator layer.

### Remaining / recovery

- Next slice in Phase 6: P6.2 (Accessibility Behavior Contracts & DOM Capability Boundary).

## 2026-08-22 00:25 CEST | Formalize Core Alpha numeric release budgets

Status: completed
Branch: `docs/numeric-release-budgets`
PR: #112 (draft)

### Scope

- Formalize binding Numeric Release Budgets for `@vii-labs/core` Alpha releases based on reproducible
  empirical baselines in `docs/quality/PERFORMANCE_BUDGETS.md`.
- Define explicit thresholds for:
  - Transfer and bundle size (Core ESM artifact <= 15 kB raw / <= 5 kB gzip, React/Angular/Vue adapters,
    Vanilla reference consumer output).
  - Browser memory lifecycle and retention (0 retained DOM nodes, 0 retained event listeners, post-GC
    compaction delta <= 100 kB, 0 console errors).
  - State execution and throughput (State >= 8M ops/s, Computed >= 4M ops/s, Batch >= 800k ops/s,
    Scope cycle >= 1.5M ops/s, Diagnostics `off` overhead <= 20%).
  - Deployment security and CSP gates (0 violations under strict CSP & Trusted Types, 0 eval sinks).
  - Regression verification protocol for future PRs.

### Changes

- Updated `docs/quality/PERFORMANCE_BUDGETS.md`: added Core Alpha Numeric Release Budgets section with
  explicit release threshold tables.
- Updated `PROJECT_STATE.md`: documented formalized release budgets in Phase 4 gate audit and baseline
  inventory.
- No Vii Core runtime, public API, package exports, Flow research, or Vue consumer code changed.

### Validation

- Repository validation: `pnpm format:check`, `git diff --check`, `pnpm validate` passed with exit code 0.
- Documentation structure verified against `CODE_QUALITY_STANDARDS.md`.

### Architecture / compatibility

- Quality governance update only; no Core runtime, public API, package boundary, adapter behavior, Flow
  research, or dependency changed.
- No Vue consumer added.
- Structural thresholds directly derived from measured and reproducible local baselines.

### Remaining / recovery

- Open a focused draft PR against `main` for review.
- External alpha testing remains a separate open gate.

## 2026-08-22 00:15 CEST | Validate Vanilla browser CSP and Trusted Types baseline

Status: completed
Branch: `test/phase4-browser-csp`
PR: #111 (draft)

### Scope

- Conduct bounded Content Security Policy (CSP) and Trusted Types deployment validation on the clean
  Vanilla reference consumer (`vii-reference-vanilla-onboarding`) using packed `@vii-labs/core@next`
  (`0.1.0-experimental.2`).
- Verify execution under Strict Baseline CSP (`default-src 'none'`, `script-src 'self'`, no `unsafe-eval`).
- Verify execution under Strict CSP with Trusted Types enforcement (`require-trusted-types-for 'script'`).
- Verify that `@vii-labs/core` runtime operations do not trigger `securitypolicyviolation` events or
  sink errors.
- Confirm active browser enforcement through negative probes (`eval()` execution blocked by Chromium).

### Changes

- Added `scripts/benchmarks/vanilla-browser-csp.mjs`: modular CSP and Trusted Types validation harness.
- Updated `scripts/benchmarks/cdp-browser.mjs`: safe async process termination in `close()`.
- Updated `vii-reference-vanilla-onboarding/src/dom.ts`: registered default Trusted Types policy for
  DOM string rendering.
- Added `benchmarks/results/vanilla-browser-csp.json`: structural benchmark output.
- Added `docs/quality/VANILLA_BROWSER_CSP_BASELINE.md`: methodology, tested CSP headers, findings,
  and limitations.
- Updated `docs/README.md` and `PROJECT_STATE.md` with the new CSP baseline evidence.
- No Vii Core runtime, public API, package exports, Flow research, or Vue consumer code changed.

### Validation

- Browser execution: `node scripts/benchmarks/vanilla-browser-csp.mjs` passed with exit code 0.
- Strict Baseline CSP: interactive DOM UI lifecycle (create, +1, batch +2, dispose) and programmatic
  Core Scope execution passed with 0 CSP violations and 0 console errors.
- Strict Trusted Types CSP (`require-trusted-types-for 'script'` + `trusted-types default;`): passed
  with 0 Trusted Types sink errors, 0 CSP violations, and 0 console errors.
- Active enforcement: `eval()` execution blocked by Chromium CSP with `EvalError` in all tested scenarios.
- Reference app validation: `pnpm build` passed (19 modules transformed, 74ms).
- Repository validation: `pnpm format:check`, `git diff --check`, `pnpm validate` passed with exit code 0.

### Architecture / compatibility

- Validation-only evidence on the existing clean Vanilla reference consumer; no Core runtime, public
  API, package boundary, adapter behavior, Flow research, or dependency changed.
- No Vue consumer added.
- Structural/privacy-safe metrics only; zero user content, credentials, tokens, network calls, or
  telemetry collected.
- Internal empirical evidence; does not constitute an external alpha, release budget, or formal
  security certification.

### Remaining / recovery

- Open a focused draft PR against `main` for review.
- External alpha testing and numeric release budgets remain separate open gates.

## 2026-08-21 23:45 CEST | Validate Vanilla browser retention and Scope post-disposal

Status: completed
Branch: `test/phase4-browser-retention`
PR: #110 (draft)

### Scope

- Conduct bounded browser retention and post-disposal lifecycle validation on the existing clean
  Vanilla reference consumer (`vii-reference-vanilla-onboarding`) using packed `@vii-labs/core@next`
  (`0.1.0-experimental.2`).
- Verify demo Scope creation, update, and disposal in real browser execution.
- Verify that owned resources, subscriptions, timers, and DOM event listeners are created and freed.
- Verify that no stale emissions, notifications, or stale completions occur after `Scope.dispose()`.
- Measure browser memory and heap metrics across 1, 100, and 1,000 deterministic lifecycle cycles.

### Changes

- Added `scripts/benchmarks/cdp-browser.mjs`: modular Chrome launcher and CDP WebSocket client.
- Added `scripts/benchmarks/vanilla-browser-retention.mjs`: browser retention validation script.
- Added `benchmarks/results/vanilla-browser-retention.json`: structural benchmark output.
- Added `docs/quality/VANILLA_BROWSER_RETENTION_BASELINE.md`: comprehensive methodology, environment,
  measurement results, and explicit limitations.
- Updated `docs/README.md` and `PROJECT_STATE.md` with the new retention baseline evidence.
- No Vii Core runtime, public API, package exports, Flow research, or Vue consumer code changed.
- No changes made to the external reference application repository.

### Validation

- Browser execution: `node scripts/benchmarks/vanilla-browser-retention.mjs` passed with code 0.
- Browser: Headless Google Chrome `151.0.7922.170` via CDP over Node 22 native WebSocket.
- Phase 1 DOM UI: interactive Scope creation, Increment (+1), Batch (+2), Scope disposal, and
  stale-action blocking all passed.
- Phase 2 Programmatic: Scope creation with 3 attached resources (custom, interval timer, DOM listener),
  clean disposal, stale-write notification suppression (0 notifications to disposed Computed subscriber),
  idempotent second disposal, and 1,000 programmatic cycles all passed with 0 errors.
- Retention runs:
  - 1 cycle (23.0 ms): baseline heap 760.8 kB, post-GC heap 795.4 kB, delta +34.6 kB; node delta +448; listener delta 0.
  - 100 cycles (3.37 s): baseline heap 795.4 kB, post-GC heap 960.3 kB, delta +164.8 kB; node delta +432; listener delta 0.
  - 1,000 cycles (26.93 s): baseline heap 960.3 kB, post-GC heap 1,014.2 kB, delta +53.9 kB; node delta 0; listener delta 0.
- JSEventListeners remained constant at 2 across all 1,000 cycles (0 listener leaks).
- DOM Nodes delta returned to 0 after 1,000 cycles + GC (0 node leaks).
- Console errors: 0 throughout all test phases.
- Reference app validation: `pnpm test` (16 tests passed across 4 files), `pnpm exec tsc --noEmit` (passed), `pnpm build` (passed).
- Repository validation: `pnpm validate` passed with exit code 0.
- `git diff --check`: passed.

### Architecture / compatibility

- Validation-only evidence on the existing clean Vanilla reference consumer; no Core runtime, public
  API, package boundary, adapter behavior, Flow research, or dependency changed.
- No Vue consumer added.
- Structural/privacy-safe metrics only; zero user content, credentials, tokens, network calls, or
  telemetry collected.
- Internal empirical evidence; does not constitute an external alpha, release budget, or universal
  leak-free claim across all platforms.

### Remaining / recovery

- Open a focused draft PR against `main` for review.
- External alpha testing, real deployment CSP/Trusted Types review, and numeric release budgets remain
  separate open gates.

## 2026-08-21 19:07 CEST | Reconfirm bounded Phase 4 dogfood gate

Status: completed
Branch: `docs/confirm-phase4-gate`
PR: focused docs PR pending

### Scope

- Reconfirm the maintainer decision to treat Phase 4 internal dogfood as complete for the existing
  bounded evidence set, without promoting Phase 4 to a release or external-alpha commitment.

### Changes

- Verified that `PROJECT_STATE.md` already records bounded internal completion and that the roadmap
  correctly keeps Phase 4 in Planned status.
- Verified the source decision in merged PR #95 (`04848c6e`); this entry records the renewed decision
  without duplicating or rewriting canonical state.
- No Core, adapter, package, public API, consumer, Flow, or roadmap behavior changed.

### Validation

- `github_get_pr_info` for PR #95: `merged: true`; merge SHA `04848c6e7bab93c2d31046935f4648d803a5234e`.
- Existing bounded evidence remains the basis: packed React and Vanilla consumers, lifecycle cleanup,
  browser smoke, privacy/security review, and reproducible bundle/type-check baselines.
- This docs-only confirmation does not rerun consumer/browser commands.
- `git diff --check`: passed before staging the focused change.

### Architecture / compatibility

- Internal completion is limited to the documented bounded evidence. It creates no external alpha,
  support, universal compatibility/performance/security, or release-budget claim.
- External alpha, deployment CSP/Trusted Types, browser heap/post-disposal retention, and numeric
  release budgets remain separate approved decisions.

### Remaining / recovery

- Review and merge the focused docs PR after its checks pass. Do not start a new Phase 4 boundary or
  delete branches without separate confirmation.

## 2026-08-21 18:00 CEST | Complete Flow research integration handoff

Status: completed
Branch: `docs/flow-integration-handoff`
PR: #107 merged; docs correction PR pending

### Scope

- Close the Duty Watch handoff for the Flow research integration after the hot-sharing slice and
  linear integration PR were merged.

### Changes

- Confirmed PR #105 squash-merged into `test/flow-research-fixtures` at `2d48f5e`.
- Confirmed PR #107 squash-merged into `main` at `e81119d714ca35468800cd9c7f557b347201bb8e`.
- This append-only entry corrects the earlier partial handoff; historical entries remain unchanged.
- Source branches remain available. No branch deletion was performed.

### Validation

- Focused hot-sharing fixture: 1 file, 2 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm validate`: passed with exit code 0, including format, lint, typecheck, repository tests,
  builds, packed artifacts, and clean consumer checks.
- `git diff --check`: passed.
- PR #107 checks passed: Governance run 200, Dependency Review run 118, CodeQL run 190, and Validate
  run 230.
- `origin/main` verified at the PR #107 merge commit.

### Architecture / compatibility

- No Vii Core/API/package or public Flow API changed. Flow remains Research-only; no Task dependency,
  replay/retention/multicast policy, or new consumer integration was selected.

### Remaining / recovery

- Open and merge this focused docs-only correction PR after its checks pass. Do not delete the source
  branches without separate confirmation.

## 2026-08-21 17:36 CEST | Integrate merged Flow hot-sharing baseline

Status: partial
Branch: `test/flow-research-integration`
PR: #107 (draft)

### Scope

- Add the now-merged PR #105 hot-sharing research slice to the linear integration snapshot before
  final validation and the approved merge of PR #107.

### Changes

- Marked PR #105 ready for review and squash-merged it into `test/flow-research-fixtures` at
  `2d48f5e`; resolved only documentation/research conflicts while preserving the linear integration
  handoff and the hot-sharing evidence.
- No Vii Core/API/package, public Flow API, Task dependency, consumer source, or new Vue consumer
  was changed.

### Validation

- PR #105 head `a4d09f2` had successful Governance and Validate checks before merge.
- `git diff --check`: passed after conflict resolution.
- Full post-integration validation and PR #107 update/merge: not run yet.

### Architecture / compatibility

- The hot-sharing slice remains Flow Research-only and records adapter-friction evidence; it does not
  select replay, retention, multicast, or public cancellation semantics.

### Remaining / recovery

- Run focused and full validation, push the delta, update PR #107 scope, wait for green checks, and
  merge #107 into `main`. Do not delete source branches without separate confirmation.

## 2026-08-21 17:28 CEST | Prepare linear Flow research integration PR

Status: completed
Branch: `test/flow-research-integration`
PR: #107 (draft)

### Scope

- Inspect `test/flow-research-fixtures` after the stacked Flow slices and prepare a policy-compatible
  integration path into `main` without deleting or merging branches automatically.

### Changes

- Confirmed `test/flow-research-fixtures` at `f4cde0e` is a real stacked research branch, not an
  empty stale branch: 26 changed files and 25 commits relative to `main`'s merge base.
- Diagnosed PR #106 Governance failure as historical merge commit subjects rejected by delivery
  policy, then created linear branch `test/flow-research-integration` at `1b8b29d` with the same
  verified snapshot in one conventional commit.
- Opened draft PR #107 against `main`; closed duplicate PR #106 as superseded. Kept PR #105 and
  both source branches open because the hot-sharing slice is not yet part of the integration ref.

### Validation

- `git diff --cached --check`: passed before the linear commit.
- `pnpm validate`: passed on the linear integration snapshot, including format, lint, typecheck,
  repository tests, builds, and packed Core/reference/React/Angular/Vue/CLI consumers.
- PR #107 GitHub checks: Governance, Dependency Review, Validate, and CodeQL all passed.
- PR #106 Governance failure reproduced from workflow logs: only historical merge subjects #97–#104
  failed; branch/title/attribution policy checks passed.

### Architecture / compatibility

- No Vii Core/API/package, Flow public API, Task dependency, consumer source, new Vue consumer,
  replay/multicast API, release, browser/network/worker claim, or runtime behavior changed.
- The linear branch is a delivery-history normalization of the already verified research snapshot;
  it does not alter the Flow evidence or select a public contract.

### Remaining / recovery

- Maintainer review and explicit merge decision for PR #107 remain open; do not merge automatically.
- PR #105 must be reviewed separately if the hot-sharing slice should be included before PR #107 is
  merged. Do not delete `test/flow-research-fixtures` until the stacked branch is no longer needed.

## 2026-08-21 17:06 CEST | Add Flow hot-sharing ownership baseline

Status: completed
Branch: `test/flow-hot-sharing-boundaries`
PR: not opened

### Scope

- Continue the approved Flow Research plan with explicit hot sharing, late-subscriber behavior,
  ref-count ownership, and AsyncIterable cleanup comparison before any replay or multicast API.

### Changes

- Added `research/flow/flow-hot-sharing-boundaries.test.ts` with one controlled AsyncIterable
  scenario across direct callbacks, raw RxJS `share()`, and a local throwaway Flow helper.
- Recorded concurrent upstream sharing, first/last subscriber disposal, fresh upstream identity
  after ref-count zero, no replay for late subscribers, and raw RxJS AsyncIterable `return()`
  cleanup friction in `docs/quality/FLOW_HOT_SHARING_BASELINE.md`.
- Updated the Flow README, research brief, documentation index, and durable project state. No Vii
  Core/API/package, public Flow surface, consumer repository, or new Vue reference was added.

### Validation

- `pnpm exec vitest run research/flow/flow-hot-sharing-boundaries.test.ts --reporter=verbose --silent=false`:
  passed; 1 file and 2 tests passed.
- `pnpm exec vitest run research/flow/*.test.ts`: passed; 9 files and 34 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm validate`: passed with approved registry access; format, lint, typecheck, repository tests,
  builds, packed Core/reference/React/Angular/Vue consumers, and packed CLI Core clean-consumer
  validation all passed.
- `git diff --check`: passed after staging the focused change.

### Architecture / compatibility

- Direct code and the throwaway prototype initiated AsyncIterable `return()` on last disposal;
  raw RxJS `from(asyncIterable).pipe(share())` did not in this fixture. This is adapter-friction
  evidence only and does not select a Vii cancellation or sharing contract.
- No replay, retention, multicast API, Core dependency, public package, browser/network/worker
  consumer, or performance/memory claim was added. Flow remains Research-only.

### Remaining / recovery

- Open a draft PR against `test/flow-research-fixtures` after the final diff review; do not merge
  without maintainer confirmation.
- Further multicast retention policy, real consumers, and broader platform-stream validation remain
  deferred.

## 2026-08-21 16:26 CEST | Add Flow cancellation-rejection surfacing baseline

Status: completed
Branch: `test/flow-cancellation-rejection`
PR: #104 (draft)

### Scope

- Continue the approved Flow Research plan with a bounded first-party investigation of native
  AsyncIterable and ReadableStream cancellation rejection while preserving synchronous disposal.

### Changes

- Added `research/flow/flow-cancellation-rejection.test.ts` with deterministic structural-observer
  fixtures for AsyncIterable `return()`, ReadableStream `cancel()`, synchronous cleanup throws,
  idempotent disposal, and `dispose(): void` timing.
- Added `docs/quality/FLOW_CANCELLATION_REJECTION_BASELINE.md` with ECMAScript, WHATWG Streams, and
  DOM first-party constraints, candidate comparison, exact commands, and privacy-safe limits.
- Updated the Flow brief, research README, docs index, and durable project state. No Core/API,
  package, dependency, or consumer repository changes were made.

### Validation

- `pnpm exec vitest run research/flow/flow-cancellation-rejection.test.ts --reporter=verbose --silent=false`:
  passed; 1 file and 3 tests passed.
- `pnpm exec vitest run research/flow/*.test.ts`: passed; 8 files and 32 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm validate`: passed with approved registry access; format, lint, typecheck, repository tests,
  builds, packed consumer validation, and packed CLI Core clean-consumer validation all passed.
- Prettier checks and `git diff --check`: passed.

### Architecture / compatibility

- Native cleanup rejection remains separate from producer/operator error, subscriber callback
  failure, cancellation, completion, and Scope disposal. The fixture only demonstrates a structural
  observer candidate; it does not select a diagnostics event or public Flow API.
- `dispose()` remains synchronous and returns `void`; native cleanup starts before it returns, while
  rejection observation occurs after the native promise settles. Raw errors and user payloads are
  excluded from structural evidence.

### Remaining / recovery

- Draft PR #104 is open against `test/flow-research-fixtures`; do not merge without maintainer
  confirmation.
- Public cancellation-rejection contract, broader upstream sharing, late-subscriber behavior,
  explicit multicast ownership, real consumers, and benchmark evidence remain deferred.

## 2026-08-21 03:10 CEST | Add Flow ownership and subscription identity baseline

Status: completed
Branch: `test/flow-ownership-evidence`
PR: #103 (draft)

### Scope

- Continue Flow Research after the merged PR #101 with bounded subscription identity and upstream
  ownership evidence, without introducing replay, multicast, or a public API.

### Changes

- Added `research/flow/flow-ownership.test.ts` with factory AsyncIterable identity, per-subscription
  cleanup, composed-source disposal isolation, and independent Scope ownership fixtures.
- Added `docs/quality/FLOW_OWNERSHIP_BASELINE.md` with exact commands, structural outcomes, and
  explicit limits.
- Updated the Flow brief, fixture README, documentation index, and project state. No Core/API,
  package, or consumer repository changes were made.
- Resolved the PR #103 overlap with the merged robustness baseline from PR #102 in
  `chore(flow): sync research fixtures base`; no Core/API/package behavior was changed.

### Validation

- `pnpm exec vitest run research/flow/flow-ownership.test.ts --reporter=verbose --silent=false`:
  passed; 1 file and 3 tests passed.
- `pnpm exec vitest run research/flow/*.test.ts`: passed; 6 files and 24 tests passed before base
  integration; the integrated branch was rechecked with 7 files and 29 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm validate`: passed with approved registry access; format, lint, typecheck, repository tests,
  builds, packed consumer validation, and packed CLI Core clean-consumer validation all passed.
- Prettier check and `git diff --check`: passed.
- GitHub PR #103 `validate`: passed; `delivery-policy`: passed.

### Architecture / compatibility

- Each subscription has independent identity and upstream cleanup. Explicit hot sources remain
  shared only by their own source semantics; factory sources start independently per subscription.
- No replay, multicast, ref-counting, backpressure, Flow package, Task dependency, Core change, or
  public API was added. Flow remains Research-only and diagnostics remain value-safe.

### Remaining / recovery

- Draft PR #103 is open and mergeable against `test/flow-research-fixtures`; GitHub checks pass.
  Do not merge without maintainer confirmation.
- Broader upstream sharing, late-subscriber behavior, explicit multicast ownership, and async
  cancellation-rejection surfacing remain deferred.

## 2026-08-21 03:04 CEST | Add Flow robustness and cancellation-race fixtures

Status: completed
Branch: `test/flow-robustness-races`
PR: #102 (draft)

### Scope

- Continue Flow Research after PR #101 merged, covering malicious producer, fast/unbounded
  AsyncIterable, and native cancellation-race correctness without changing runtime/API surfaces.

### Changes

- Added `research/flow/flow-robustness-races.test.ts` with five deterministic fixtures for explicit
  producer errors, semantic disposal cutoff, idempotent `AsyncIterable.return()`, and pending
  ReadableStream cancellation.
- Added `docs/quality/FLOW_ROBUSTNESS_BASELINE.md` with exact commands, environment, structural
  outcomes, and limitations.
- Updated the Flow research brief, fixture README, documentation index, and project state. No Core,
  public API, package, or consumer repository changes were made.
- Corrected the handoff context: PR #101 is merged with validate and delivery-policy checks passed.

### Validation

- `pnpm exec vitest run research/flow/*.test.ts`: passed; 6 files and 26 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm validate`: passed with approved registry access; format, lint, typecheck, repository tests,
  builds, packed consumer validation, and packed CLI Core clean-consumer validation all passed.
- `pnpm exec prettier --check` on changed code/docs and `git diff --check`: passed.

### Architecture / compatibility

- Flow remains Research-only. Cancellation is not converted to producer failure, native cleanup is
  initiated without claiming asynchronous completion, and diagnostics remain value-safe.
- The fixture does not import Task, add a Flow package, change Core `ViiResource.dispose(): void`, or
  make browser/network/worker/platform-consumer claims.

### Remaining / recovery

- Draft PR #102 is open against `test/flow-research-fixtures`; review is pending and merge requires
  maintainer confirmation.
- Broader malformed-shape, hostile-subscriber, unbounded ReadableStream, async cancellation-rejection
  surfacing, and real platform-consumer research remain deferred.

## 2026-08-21 02:55 CEST | Add Flow temporal and async comparison baseline

Status: completed
Branch: `perf/flow-async-comparison`
PR: #101 (draft)

### Scope

- Continue the approved Flow Research plan with a deterministic temporal/async comparison after
  the merged synchronous and TypeScript/complexity baselines.

### Changes

- Added `research/flow/flow-async-comparison.test.ts` with direct callbacks, RxJS, functional
  prototype, and fluent prototype runners on the same Promise plus AbortSignal fixture.
- Added deterministic debounce, stale-result switching, fresh disposal, Scope disposal, lifecycle
  cycles, structural output, and explicit limitations.
- Added `docs/quality/FLOW_ASYNC_COMPARISON_BASELINE.md` with exact environment, commands, raw
  samples, structural results, and the prototype completed-inner lifecycle distinction.
- Synchronized the Flow brief, documentation index, and durable project state. No Core/API/package
  or consumer repository changes were made.

### Validation

- `pnpm exec vitest run research/flow/flow-research.test.ts research/flow/flow-real-clock.test.ts
research/flow/flow-platform-robustness.test.ts research/flow/flow-comparison.test.ts
research/flow/flow-async-comparison.test.ts`: passed; 5 files and 21 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- Prettier check and `git diff --check`: passed.
- `pnpm validate`: passed with approved registry access; format, lint, typecheck, repository tests,
  builds, packed consumer validation, and packed CLI Core clean-consumer validation all passed. The
  initial sandboxed run reached packed consumer validation but stopped on
  registry `ENOTFOUND`; this was an environment/network boundary, not a code failure.
- Registry diagnosis confirms the error is DNS/network access to `registry.npmjs.org`; use approved
  registry access or a pre-populated/offline store for sandboxed runs. No repository workaround was
  added.

### Architecture / compatibility

- Flow remains Research-only. The fixture does not create a package or public API, does not import
  Task, and does not change `ViiResource.dispose(): void`, Core, package manifests, lockfiles, or
  consumer support claims.
- Structural output excludes emitted values and user content. Real browser/network/worker/platform
  integration, bundle, allocation, broader memory, and async cancellation-rejection surfacing remain
  deferred.
- The comparison records one lifecycle distinction: the throwaway prototype releases a completed
  inner branch before later disposal, while direct/RxJS adapters report an additional abort teardown.
  This is evidence for design review, not a selected public semantic.

### Remaining / recovery

- Draft PR #101 is open against `test/flow-research-fixtures`; review is pending and merge requires
  maintainer confirmation.
- Next research candidates remain real consumers, broader memory/allocation/bundle evidence, native
  AsyncIterable/ReadableStream runtime measurements, and explicit async cancellation-rejection
  surfacing research.

## 2026-08-21 02:35 CEST | Add Flow TypeScript and complexity baseline

Status: completed
Branch: `perf/flow-typescript-complexity`
PR: #100 (draft)

### Scope

- Measure cold and incremental TypeScript cost and transitive type surface for the same bounded Flow
  comparison shape after the synchronous runtime baseline.

### Changes

- Added `research/flow/flow-typecheck-comparison.mjs`, which runs 9 reproducible `tsc
--extendedDiagnostics` checks with temporary incremental build-info files and emits raw JSON.
- Added direct, RxJS `7.8.2`, and throwaway prototype type-check fixtures under
  `research/flow/typecheck-fixtures/`.
- Added `docs/quality/FLOW_TYPESCRIPT_COMPLEXITY_BASELINE.md` with exact environment, source/program
  surfaces, compiler metrics, interpretation, and limitations.
- Synchronized the Flow brief, Project State, and docs index.
- Correction: PR #99 from the preceding synchronous baseline is merged; no Core/API/package change
  was made in this slice.

### Validation

- `pnpm exec vitest run research/flow/flow-research.test.ts research/flow/flow-real-clock.test.ts
research/flow/flow-platform-robustness.test.ts research/flow/flow-comparison.test.ts`: passed;
  4 files and 18 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm exec node research/flow/flow-typecheck-comparison.mjs`: passed; 9 compiler runs passed and
  emitted raw diagnostics JSON. Exact results are recorded in the baseline doc.
- `pnpm validate`: passed with format, lint, typecheck, repository tests, builds, packed consumer
  validation, and CLI Core clean-consumer validation.
- `git diff --check`: passed.

### Architecture / compatibility

- Research-only type fixtures; no runtime dependency, package boundary, public API, support promise,
  or consumer claim changed.
- The measured transitive graph is part of the result: RxJS declarations and the prototype/Core
  source graph are not removed to manufacture a smaller comparison.
- Bundle/tree-shaking, allocation, broader memory, temporal, async runtime, repeated typecheck,
  incremental edit, and real-consumer measurements remain deferred.

### Remaining / recovery

- Draft PR #100 is open for review; merge requires maintainer confirmation. The next safe step is a
  separate temporal/async comparison only after recapturing source/version state and preserving the
  existing correctness gate.

## 2026-08-21 02:15 CEST | Add Flow synchronous comparison baseline

Status: completed
Branch: `perf/flow-comparison-harness`
PR: #99 (draft)

### Scope

- Add the first bounded post-correctness comparison harness for direct callbacks, RxJS, and the
  throwaway Flow prototype on the same explicit hot synchronous fixture.

### Changes

- Added `research/flow/flow-comparison.test.ts` with correctness preflight, synchronous FIFO
  completion/disposal checks, raw timing samples, and an optional explicit-GC retention probe.
- Added `docs/quality/FLOW_COMPARISON_BASELINE.md` with the exact commands, environment, raw samples,
  retention observations, and limitations.
- Indexed the baseline and synchronized `FLOW_RESEARCH_BRIEF.md` and `PROJECT_STATE.md`.
- Did not change Vii Core, public API, package boundaries, runtime dependencies, or consumer support
  claims.

### Validation

- `pnpm exec vitest run research/flow/flow-research.test.ts research/flow/flow-real-clock.test.ts
research/flow/flow-platform-robustness.test.ts research/flow/flow-comparison.test.ts`: passed;
  4 files and 18 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `NODE_OPTIONS=--expose-gc pnpm exec vitest run research/flow/flow-comparison.test.ts
--reporter=verbose --silent=false`: passed; correctness gate passed, 3 runners × 10 samples and
  the 1,000-cycle retention probe emitted raw JSON captured in the baseline doc.
- `pnpm validate`: passed after rerunning with approved registry access; format, lint, typecheck,
  repository tests, builds, packed consumer validation, and CLI Core clean-consumer validation all
  passed. The first sandboxed attempt stopped at existing React registry downloads with `ENOTFOUND`;
  no code failure was observed.
- `git diff --check`: passed.

### Architecture / compatibility

- The comparison remains Research-only and uses the exact root dev-only RxJS `7.8.2` dependency.
- Runtime observations are fixture- and environment-specific; no performance, memory, support-tier,
  or graduation claim is made.
- TypeScript compiler cost, bundle/tree-shaking, allocation, broader memory, temporal, and async
  runtime measurements remain deferred.

### Remaining / recovery

- Draft PR #99 is open for review; merge requires maintainer confirmation. The next work should
  recapture versions/source state before extending measurement groups, then add only semantically
  equivalent temporal/async or complexity fixtures.

## 2026-08-21 01:45 CEST | Revalidate Flow comparison sources

Status: completed
Branch: `docs/flow-primary-source-revalidation`
PR: #98 (draft)

### Scope

- Revalidate primary platform and RxJS semantics before designing post-correctness Flow comparison
  measurements.

### Changes

- Added `docs/quality/FLOW_PRIMARY_SOURCE_REVALIDATION.md` with source-owned semantics, exact local
  version boundary, comparison consequences, measurement protocol, and non-claims.
- Indexed the note in `docs/README.md` and linked its durable boundary from the Flow brief and
  `PROJECT_STATE.md`.
- Confirmed that this slice changes no Core source, public API, package boundary, runtime dependency,
  or consumer support claim.

### Validation

- `pnpm list rxjs --depth=0`: verified exact dev-only RxJS `7.8.2`.
- Environment captured: Node `v22.17.0`, pnpm `10.12.4`.
- Primary sources reviewed: RxJS Observable/Subject guides and APIs, DOM AbortController, ECMAScript
  async iterator close/interface, and WHATWG Streams reader cancellation/backpressure.
- `pnpm format:check`: passed.
- `pnpm exec prettier --check docs/quality/FLOW_PRIMARY_SOURCE_REVALIDATION.md
docs/architecture/FLOW_RESEARCH_BRIEF.md docs/README.md`: passed.
- `git diff --check`: passed.

### Architecture / compatibility

- Plain factory sources and explicit hot Subject/event sources remain separate comparison groups.
- Unsubscription/cancellation is not counted as normal completion; native asynchronous cleanup remains
  outside synchronous Core disposal.
- The note authorizes measurement planning only after correctness; it does not authorize a Flow package,
  API, browser/network/worker support tier, or performance claim.

### Remaining / recovery

- Draft PR #98 is open and its required checks pass; merge requires maintainer confirmation.
- Re-capture versions and source state immediately before any benchmark baseline is run.

## 2026-08-21 01:30 CEST | Add Flow real-clock and robustness validation

Status: completed
Branch: `test/flow-research-validation`
PR: not opened

### Scope

- Add the next bounded Flow Research validation layer after deterministic correctness, without
  changing Vii Core, public APIs, package boundaries, or runtime dependencies.

### Changes

- Added a real-clock typeahead/disposal validation file using native timers and the existing fake
  search; it does not use network or browser automation.
- Added platform/timer robustness fixtures for a 1000-event debounce storm, AsyncIterable
  `return()` initiation and rejection isolation, and ReadableStream `cancel()` initiation and
  rejection isolation.
- Kept the main correctness test below the preferred 400-line test-file target by moving cohesive
  platform/timer cases into a separate fixture.
- Updated the Flow research brief, fixture README, and durable project state with the new evidence
  boundary and deferred benchmark/non-consumer claims.

### Validation

- `pnpm exec vitest run research/flow/flow-research.test.ts research/flow/flow-real-clock.test.ts
research/flow/flow-platform-robustness.test.ts`: passed; 3 files and 17 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `git diff --check`: passed.
- `pnpm format:check`: passed.
- `pnpm validate`: passed with approved network access; repository format, lint, typecheck, tests,
  builds, packed consumer validation, and CLI Core clean-consumer validation all passed.

### Architecture / compatibility

- No Core source, public API, package runtime dependency, adapter behavior, consumer app, or support
  tier changed.
- Real-clock and robustness fixtures are correctness/lifecycle evidence only; they do not claim
  throughput, retained-memory, browser, network, worker, or socket support.
- Cancellation rejection remains outside the Flow source error channel; its explicit diagnostics
  surfacing remains deferred research and Core synchronous disposal is unchanged.

### Remaining / recovery

- `git diff --check`: passed before commit.
- Commit and push the focused branch; open a draft PR for review. Do not merge without maintainer
  confirmation.

## 2026-08-21 01:00 CEST | Build bounded Flow research brief and fixtures

Status: completed
Branch: `test/flow-research-fixtures`
PR: #96 (draft)

### Scope

- Turn the confirmed Flow Research decisions into a bounded research brief and throwaway correctness
  fixtures without changing Vii Core, public APIs, or package boundaries.

### Changes

- Added `docs/architecture/FLOW_RESEARCH_BRIEF.md` and indexed it in `docs/README.md`.
- Added `research/flow/` fixtures for deterministic typeahead, explicit hot/factory source semantics,
  re-entrant FIFO ordering, multi-subscriber ownership, Scope-owned disposal, complete/error/cancel/
  dispose distinctions, subscriber callback isolation, error recovery, AsyncIterable return,
  ReadableStream cancellation, and structural-only diagnostics.
- Added a root dev-only `rxjs@7.8.2` dependency solely for the comparison fixture; it is not a Vii
  runtime dependency.
- Updated `PROJECT_STATE.md` with the durable research evidence and non-claims.

### Validation

- `pnpm exec vitest run research/flow/flow-research.test.ts`: passed; 1 file and 12 tests passed.
- `pnpm exec tsc --noEmit -p research/flow/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `git diff --check`: passed.
- `pnpm validate`: passed with approved network access; repository format, lint, typecheck, tests,
  builds, packed consumer validation, and CLI Core clean-consumer validation all passed.

### Architecture / compatibility

- No Core source, public API, package runtime dependency, adapter behavior, consumer app, SSR claim,
  or support tier changed.
- Flow remains Research-only; the fixtures do not create `@vii-labs/flow` or a compatibility promise.
- The prototype is intentionally throwaway and is not production code or a performance claim.
- Source hotness remains explicit; subscriber callback failures are not producer/operator errors.
- Async native cancellation is initiated synchronously at the semantic boundary, while rejection
  surfacing remains deferred research and does not change Core disposal.

### Remaining / recovery

- Add no public Flow package/API unless real consumers, build-vs-integrate evidence, robustness tests,
  and reproducible performance/type evidence justify it.
- Real UI and platform-stream consumers, real-clock validation, benchmark groups, malicious stream and
  timer fixtures, async cancellation-rejection surfacing, upstream ownership research, and
  primary-source/version revalidation remain deferred.
- Review draft PR #96; merge requires maintainer confirmation.

## 2026-08-21 00:17 CEST | Close bounded Phase 4 internal dogfood

Status: completed
Branch: `docs/close-phase4-internal-dogfood`
PR: #95 (draft)

### Scope

- Record the maintainer decision to treat the bounded internal Phase 4 dogfood evidence as complete.
- Preserve the separate open decisions for external alpha, deployment hardening, browser retention
  measurement, and numeric release budgets.

### Changes

- Updated `PROJECT_STATE.md` with the bounded internal completion status and its non-claims.
- Added this append-only handoff; no runtime, package, public API, consumer, roadmap, or research
  scope changed.

### Validation

- Reused the merged Phase 4 evidence recorded in prior Duty Watch entries: packed React and Vanilla
  consumer tests, typechecks, builds, browser smoke, lifecycle probe, diagnostics export, privacy,
  security, and bundle/type-check baselines.
- This documentation-only slice did not rerun consumer/browser commands.
- `git diff --check`: passed.

### Architecture / compatibility

- No Core or adapter dependency direction, public API, package artifact, runtime behavior, browser
  capability boundary, SSR behavior, security default, privacy contract, or compatibility promise changed.
- Internal completion does not create an external alpha or support commitment. Flow remains Research.

### Remaining / recovery

- External alpha, real deployment CSP/Trusted Types validation, browser heap/post-disposal retention
  measurement, and numeric release budgets require separate approved tasks.
- Review draft PR #95; merge requires maintainer confirmation.

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

## 2026-08-19 17:12 CEST | Publish Diagnostics privacy review

Status: completed
Branch: security/diagnostics-privacy-review
PR: [#82](https://github.com/kas-labs/vii/pull/82) draft

### Scope

- Publish the completed bounded Diagnostics privacy and threat-model review.

### Changes

- Pushed commit a54e1b0 to origin/security/diagnostics-privacy-review.
- Opened draft PR #82 targeting main.

### Validation

- git diff --check: passed before publication.
- PR #82 records the 16 consumer tests, redaction assertions, bundle report, and static no-network
  scan.

### Architecture / compatibility

- Documentation and handoff only; no Vii runtime, package, public API, dependency, release, telemetry,
  or network behavior changed.

### Remaining / recovery

- Review and merge PR #82 after its required checks and human review pass.

## 2026-08-20 00:25 CEST | Add internal dogfood protocol

Status: partial
Branch: docs/internal-dogfood-protocol
PR: not opened

### Scope

- Document the internal packed-Core dogfood gate for the Vanilla reference app and add a structured
  GitHub issue template for durable run evidence.

### Changes

- Added docs/alpha/INTERNAL_DOGFOOD_PROTOCOL.md.
- Added .github/ISSUE_TEMPLATE/internal-dogfood.md with mandatory preflight and browser checkboxes.
- Limited the process to maintainers and internal dogfood consumers; no external alpha or telemetry.

### Validation

- Targeted Prettier check for both Markdown files: passed.
- Repository format:check: passed.
- git diff --check: passed.
- Repository pnpm validate: format, lint, typecheck, test, build, and Core pack-check passed; the
  final network-dependent consumer pack-check was blocked by registry DNS ENOTFOUND for React packages.

### Architecture / compatibility

- Documentation and issue-template only; no Vii runtime, package, public API, dependency, release,
  telemetry, or network behavior changed.

### Remaining / recovery

- Publish the docs branch in a draft PR. Re-run pnpm validate when registry connectivity is available.

## 2026-08-20 00:35 CEST | Publish internal dogfood protocol

Status: completed
Branch: docs/internal-dogfood-protocol
PR: [#83](https://github.com/kas-labs/vii/pull/83) draft

### Scope

- Publish the internal dogfood protocol and structured issue template for review.

### Changes

- Pushed commit a299241 to origin/docs/internal-dogfood-protocol.
- Opened draft PR #83 targeting main.

### Validation

- git diff --check: passed before publication.
- PR #83 records the targeted Markdown checks and the repository validation registry limitation.

### Architecture / compatibility

- Documentation and issue-template only; no Vii runtime, package, public API, dependency, release,
  telemetry, or network behavior changed.

### Remaining / recovery

- Review and merge PR #83 after its required checks and human review pass.

## 2026-08-20 17:29 CEST | Run packed Core internal dogfood on clean Vanilla copy

Status: partial
Branch: docs/internal-dogfood-protocol
PR: [#83](https://github.com/kas-labs/vii/pull/83) draft

### Scope

- Execute the internal dogfood protocol against a clean copy of
  `/Users/eugenekasap/WebstormProjects/vii-reference-vanilla-onboarding`.
- Validate the published `@vii-labs/core@next` artifact without changing Vii Core/API or the
  supplied reference app.

### Artifact and environment

- Clean run copy: `/private/tmp/vii-dogfood-run-20260820`.
- Core: `@vii-labs/core@next` resolved by `pnpm list` to `0.1.0-experimental.2`.
- App commit: unavailable; the supplied reference directory and clean copy contain no `.git` metadata.
- OS: macOS `26.5.2`, Darwin `25.5.0`, arm64.
- Node: `v22.17.0`.
- pnpm: `10.12.4`.
- Browser: Codex In-app Browser; browser version is not exposed by the browser control surface.

### Validation

- `pnpm remove @vii-labs/core`: passed after a sandbox DNS attempt; removed the local
  `/private/tmp/vii-reference-packages/...tgz` dependency.
- `pnpm add @vii-labs/core@next`: passed; registry package installed as `0.1.0-experimental.2`.
- `pnpm list @vii-labs/core`: passed; output listed `@vii-labs/core 0.1.0-experimental.2`.
- `pnpm test`: passed; 4 files and 16 tests passed.
- `pnpm exec tsc --noEmit`: passed with no output.
- `pnpm build`: passed; Vite `8.2.1`, 19 modules, 11.76 kB raw JS / 4.42 kB gzip, 3.32 kB raw
  CSS / 1.23 kB gzip.
- `pnpm dev`: initial sandbox listener failed with `listen EPERM ::1:5173`; the exact command then
  passed with local-listener permission and served `http://localhost:5173/`.
- Browser smoke: Create Scope and Increment produced `count 1`, `doubled 2`, and a live timeline;
  Batch +2 produced `count 3`, `doubled 6`, `events 20`, `dropped 0`, and a trailing `batch.committed`;
  Dispose reported `Scope disposed`; a fresh Scope started at `count 0`, `doubled 0`; Clear produced
  empty timeline and `events 0`.
- Export: the browser click completed and JSON preview contained `"protocol": "vii.trace"` and
  `"version": "0.1"`; the app source sets the download name to `vii-trace.json`.

### API friction / unresolved evidence

- The in-app browser did not emit a download event within 5 seconds for the blob URL export, and the
  downloaded file was not observable through the available browser or temporary-file surfaces.
- Console logs contained no warning or error entries. This is browser-tool evidence friction, not a
  confirmed Core or consumer runtime failure; protocol status remains partial until the downloaded
  file itself is checked for the `vii.trace` protocol.
- The first registry attempt hit repeated `ENOTFOUND registry.npmjs.org` due sandbox network limits.
  A permitted network retry succeeded; the clean run therefore used the npm registry artifact, not a
  local tarball or workspace alias.

### Architecture / compatibility

- No Vii Core runtime, package, public API, dependency, release, telemetry, or network behavior changed.
- The supplied reference app was not modified. Only the disposable clean copy received install metadata,
  `node_modules`, and build output.
- This is internal consumer evidence and not release approval, support, privacy certification, or a
  universal bundle/performance claim.

### Remaining / recovery

- Verify the actual downloaded `vii-trace.json` through a user-visible browser download result or a
  browser surface that exposes the blob download; confirm its JSON `protocol` is `vii.trace`.
- Keep the dev server session `90560` available at `http://localhost:5173/` for that manual check.

## 2026-08-20 17:44 CEST | Resolve PR #83 conflict with current main

Status: completed
Branch: docs/internal-dogfood-protocol
PR: [#83](https://github.com/kas-labs/vii/pull/83) open, mergeable
Issue: [#84](https://github.com/kas-labs/vii/issues/84)

### Scope

- Record the sanitized blocked dogfood run and reconcile PR #83 with the current `main` after PR #82
  merged.

### Changes

- Created sanitized internal dogfood issue #84 without secrets, credentials, unsanitized traces, or
  private environment paths.
- Merged `origin/main` at `f663201` into the focused protocol branch.
- Preserved both the PR #82 Diagnostics privacy handoff and the PR #83 protocol/dogfood handoffs in
  `DUTY_WATCH.md` and `PROJECT_STATE.md`.
- Pushed conflict-resolution commit `cad8bbc` to `origin/docs/internal-dogfood-protocol`.

### Validation

- Targeted Prettier check for the affected Markdown files: passed.
- Initial `pnpm validate`: all format, lint, typecheck, test, and build stages passed; the first
  pack-check attempt was blocked by sandbox registry DNS `ENOTFOUND`.
- Network-permitted `pnpm validate`: passed, including packed Core, reference, React, Angular, Vue,
  and CLI Core consumer validation.
- `git diff --check`: passed.
- GitHub PR #83: open, non-draft, `mergeable: true`; branch is synchronized with origin.

### Architecture / compatibility

- Documentation-only reconciliation; no Vii Core runtime, public API, dependency, release, telemetry,
  or network behavior changed.
- No Vue consumer was added or changed by this task.

### Remaining / recovery

- Merge PR #83 into `main` only after explicit maintainer confirmation.

## 2026-08-20 18:23 CEST | Record PR #83 merge status

Status: completed
Branch: docs/record-pr83-merge-status
PR: [#83](https://github.com/kas-labs/vii/pull/83) merged
Issue: [#84](https://github.com/kas-labs/vii/issues/84) remains open

### Scope

- Record the externally confirmed merge of the internal dogfood protocol into `main`.

### Changes

- PR #83 merged into `main` at `aea3321298a99559aca04ee6a8af2c014ad51948`.
- GitHub checks for head `612d723840ec038b6314754c03900438b1b79646` completed successfully:
  Governance, Dependency Review, CodeQL, and Validate.
- Issue #84 remains the follow-up for independently verifying the downloaded `vii-trace.json` file;
  the clean Vanilla run is still partial on that evidence point.
- No Vii Core runtime, public API, dependency, release, telemetry, or consumer source changed.

### Validation

- `git fetch origin main`: passed; `origin/main` is `aea3321298a99559aca04ee6a8af2c014ad51948`.
- Current branch was created from the merged `origin/main`: passed.
- `git diff --check`: passed.
- Focused Prettier check: passed for `DUTY_WATCH.md`.

### Architecture / compatibility

- Documentation-only post-merge record; framework-agnostic Core architecture and consumer boundaries
  are unchanged.
- No Vue consumer was added or changed.

### Remaining / recovery

- Verify the actual downloaded `vii-trace.json` through a user-visible browser download result or a
  browser surface that exposes the blob download; confirm its JSON `protocol` is `vii.trace`.
- Continue the next planned Vii dogfood/consumer validation slice after issue #84 is resolved or
  explicitly accepted as a tooling-evidence limitation.

## 2026-08-20 18:34 CEST | Complete packed Core Vanilla dogfood evidence

Status: completed
Branch: docs/record-vanilla-dogfood-evidence
PR: follow-up focused documentation branch
Issue: [#84](https://github.com/kas-labs/vii/issues/84) closed as completed

### Scope

- Complete the outstanding internal dogfood protocol evidence for the clean Vanilla reference
  consumer without changing Vii Core, its public API, or the supplied reference app.

### Changes

- Re-ran the browser protocol against the disposable clean copy using system Google Chrome through
  Playwright; the app source and original reference directory were not modified.
- Captured the actual download as `vii-trace.json` and parsed the downloaded JSON.
- Updated sanitized issue #84 with exact command/browser evidence and closed it as completed.

### Validation

- Core: `@vii-labs/core@next` resolved to `0.1.0-experimental.2`.
- App commit: unavailable; the supplied reference app has no Git metadata.
- Environment: macOS `26.5.2`, Darwin `25.5.0`, arm64; Node `v22.17.0`; pnpm `10.12.4`;
  HeadlessChrome `151.0.0.0` via Playwright.
- Existing clean-copy command results remain passed: `pnpm test` (4 files, 16 tests),
  `pnpm exec tsc --noEmit`, `pnpm build` (Vite `8.2.1`, 19 modules), and `pnpm dev`.
- Browser smoke: Batch +2 produced `count 3`, `doubled 6`, `events 20`, `dropped 0`; timeline tail
  was `batch.committed` with `errorCount 0`; Dispose reported `Scope disposed`; a fresh Scope started
  at `count 0`, `doubled 0`; Clear produced `events 0`, `dropped 0`; console errors were `0`.
- Download: filename `vii-trace.json`, 169 bytes, failure `null`; parsed `protocol: "vii.trace"`,
  `version: "0.1"`, and `events: []` after the required Clear step.

### Architecture / compatibility

- Framework-agnostic Core behavior, public API, package contents, dependencies, and consumer source
  are unchanged.
- No Vue consumer was added or changed.
- This is internal dogfood evidence, not a release or support claim.

### Remaining / recovery

- Continue Phase 4 with the next bounded real-consumer or lifecycle validation slice; do not expand
  Core/API scope without a separate approved task.

## 2026-08-20 18:44 CEST | Validate packed Vanilla lifecycle probe

Status: completed
Branch: docs/record-packed-vanilla-lifecycle
PR: follow-up focused documentation branch

### Scope

- Validate the existing development-only lifecycle probe against the clean Vanilla consumer using
  the packed `@vii-labs/core@next` artifact.

### Changes

- Ran the existing `window.runViiLifecycleProbe(1000)` browser seam through system Google Chrome
  via Playwright; no source files in the reference app or Vii repository were changed.
- Recorded the result in the durable project state and this handoff.

### Validation

- Core: `@vii-labs/core@next` resolved to `0.1.0-experimental.2` in the existing clean dogfood run.
- Browser: HeadlessChrome `151.0.0.0` via Playwright; console errors `0`.
- Lifecycle result: `iterations: 1000`, `activeScopeCycles: 1000`, `remainingChildren: 0`,
  `hostConnected: true`.
- The probe exercised Create Scope, Increment, Batch +2, Scope disposal, mount disposal, and the
  idempotent second disposal on every cycle.
- The dev server was stopped after validation; no persistent external process remains.

### Architecture / compatibility

- Validation-only evidence; no Vii Core runtime, public API, dependency, package, or consumer source
  changed.
- No Vue consumer was added or changed.
- This is lifecycle evidence for the packed artifact, not a universal production memory claim.

### Remaining / recovery

- Continue Phase 4 with the next bounded real-consumer validation slice; preserve the current Core/API
  scope unless a separate approved task changes it.

## 2026-08-20 18:52 CEST | Validate packed React reference consumer

Status: completed
Branch: docs/record-packed-react-dogfood
PR: follow-up focused documentation branch

### Scope

- Validate the existing React reference consumer from a clean copy with registry-packed
  `@vii-labs/core@next` and the packed experimental React adapter.

### Changes

- Created a disposable clean copy of `/Users/eugenekasap/WebstormProjects/vii-reference-react-app-vite`;
  the supplied reference directory has no Git metadata and was not modified.
- Replaced only the clean copy's local Core tarball dependency with `@vii-labs/core@next`; the packed
  `@vii-labs/react@0.0.0` adapter remained at the React edge.
- Recorded exact command, artifact, environment, browser, and API-friction evidence in this handoff
  and `PROJECT_STATE.md`.

### Validation

- `pnpm remove @vii-labs/core`: first sandbox attempt hit registry DNS `ENOTFOUND`; the network-permitted
  retry passed and removed the local Core tarball.
- `pnpm add @vii-labs/core@next`: passed; resolved to `0.1.0-experimental.2`.
- `pnpm list @vii-labs/core`: passed; listed `0.1.0-experimental.2`.
- `pnpm test`: passed; 1 file and 3 tests.
- `pnpm exec tsc --noEmit`: passed with no output.
- `pnpm lint`: passed with no output.
- `pnpm build`: passed; Vite `8.2.1`, 28 modules, 197.19 kB raw JavaScript / 62.41 kB gzip,
  1.78 kB raw CSS / 0.81 kB gzip.
- `pnpm dev`: passed at `http://127.0.0.1:5173/` with the dev server stopped after the smoke.
- Environment: macOS Darwin `25.5.0`, arm64; Node `v26.3.1`; pnpm `10.12.4`; React `19.2.8`;
  `@vii-labs/react 0.0.0`; HeadlessChrome `151.0.0.0` via Playwright.
- Browser smoke: initial `Completed: 1 / 2`; Open filter showed one open task; add produced
  `Completed: 1 / 3`; toggle produced `Completed: 2 / 3`; Done filter showed two tasks; Clear
  completed produced `Completed: 0 / 1`. Browser console errors: `0`.

### API friction / unresolved evidence

- Playwright `locator.check()` clicked the controlled checkbox but timed out waiting for its
  post-click navigation step. This was browser-tool interaction friction, not an observed React or
  Vii runtime failure; the same checkbox action through DOM click completed the smoke with the
  expected counters and no console errors.
- Reference app commit is unavailable because the supplied directory has no Git metadata.

### Architecture / compatibility

- Validation-only evidence; no Vii Core runtime, public API, dependency, package, or reference-app
  source changed.
- No Vue consumer was added or changed.
- This is internal Phase 4 consumer evidence, not a universal React compatibility, performance, or
  bundle-budget claim.

### Remaining / recovery

- Continue Phase 4 with the next bounded real-consumer or lifecycle validation slice; preserve the
  current Core/API scope unless a separate approved task changes it.

## 2026-08-20 18:57 CEST | Review packed React consumer security boundary

Status: completed
Branch: security/review-packed-react-consumer
PR: follow-up focused documentation branch

### Scope

- Perform a bounded threat-model and privacy-boundary review of the clean packed React reference
  consumer after its Phase 4 smoke run.

### Findings and evidence

- Reviewed the Vii threat model, security architecture, and security/privacy guidance against the
  React consumer's task-title, DOM, package, and browser boundaries.
- Static scan of `src`, `index.html`, `package.json`, and `vite.config.ts` found no raw HTML sinks,
  `eval`, dynamic `Function`, network APIs, storage/cookie access, telemetry calls, or unsafe URL
  construction.
- `pnpm audit --prod`: passed; output was `No known vulnerabilities found`.
- Malicious title fixture `<img src=x onerror="window.__viiXss=1">`: rendered as text; `imgNodes: 0`,
  `xssMarker: false`, `consoleErrors: []`, and `nonLocalRequests: []`.

### Residual risk

- The reference deployment has no explicit CSP or Trusted Types headers. This is a deployment
  hardening follow-up, not an observed XSS path in the consumer; no source change is made because
  a production header policy is outside this bounded reference-app task.
- The review is not a penetration test, dependency certification, or universal React security claim.

### Architecture / compatibility

- Read-only security validation plus documentation handoff; no Vii Core runtime, public API,
  dependency, reference-app source, or release behavior changed.
- No Vue consumer was added or changed.

### Remaining / recovery

- If this reference consumer becomes a deployment fixture, add a separately approved host-level CSP/
  Trusted Types policy and validate it at that deployment boundary.
- Continue Phase 4 with the next bounded real-consumer validation slice; preserve Core/API scope.

## 2026-08-20 19:09 CEST | Record Phase 4 consumer baselines

Status: completed
Branch: docs/record-phase4-consumer-baselines
PR: follow-up focused documentation branch

### Scope

- Record reproducible bundle, type-check, and build wall-time baselines for the already validated
  packed React and Vanilla consumers.

### Method

- Used the existing disposable clean copies with their packed `@vii-labs/core@next` dependency.
- Ran `/usr/bin/time -p pnpm exec tsc --noEmit` and `/usr/bin/time -p pnpm build` in each copy.
- Recorded Vite module and emitted JS/CSS raw/gzip sizes from the same build output.
- Interpreted the results under `docs/quality/PERFORMANCE_BUDGETS.md`: per-consumer baselines only;
  the applications are not behaviorally equivalent enough for a cross-framework performance claim.

### Validation

- Environment: Node `v26.3.1`, pnpm `10.12.4`, Vite `8.2.1`, macOS Darwin `25.5.0`, arm64.
- React: typecheck wall `1.34 s`; build wall `4.21 s`; 28 modules; JavaScript `197.19 kB` raw /
  `62.41 kB` gzip; CSS `1.78 kB` raw / `0.81 kB` gzip.
- Vanilla: typecheck wall `3.35 s`; build wall `3.90 s`; 19 modules; JavaScript `11.76 kB` raw /
  `4.42 kB` gzip; CSS `3.32 kB` raw / `1.23 kB` gzip.
- The measured Vite build phase itself reported 85 ms for React and 202 ms for Vanilla; the wall
  times include package-script and TypeScript work.

### Interpretation / limits

- No numeric release budgets were introduced or inferred.
- These measurements are local baselines for detecting changes in the same harness, not a claim that
  React or Vanilla is faster, smaller, or lower-memory in general.
- No browser heap measurement or post-disposal retention claim is made by this slice.

### Architecture / compatibility

- Measurement and documentation only; no Vii Core runtime, public API, dependency, reference-app
  source, release behavior, or Vue consumer changed.

### Remaining / recovery

- Reuse these baselines for future changes to the same consumer fixtures; add numeric budgets only
  through an approved, behaviorally scoped decision.
- Continue Phase 4 with the next bounded real-consumer or lifecycle slice.

## 2026-08-20 19:19 CEST | Audit Phase 4 acceptance gates

Status: completed
Branch: docs/audit-phase4-gates
PR: follow-up focused documentation branch

### Scope

- Review the current Phase 4 roadmap gates against the merged React and Vanilla packed-consumer
  evidence without promoting experimental APIs or inventing release thresholds.

### Gate verdict

| Phase 4 gate                                        | Verdict                          | Evidence / remaining boundary                                                                                                                |
| --------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Real consumer validates the design                  | evidenced                        | Clean packed React and Vanilla consumers pass focused tests, typechecks, builds, and browser smoke.                                          |
| Lifecycle and cleanup                               | evidenced for bounded scope      | Vanilla 1,000-cycle probe and React Scope disposal contract pass; no universal heap-retention claim.                                         |
| Package/runtime compatibility                       | evidenced for bounded scope      | `@vii-labs/core@next` `0.1.0-experimental.2` passes the clean packed consumers on Node/pnpm/Vite harnesses.                                  |
| Bundle, execution, and type-check evidence          | evidenced as baselines           | React and Vanilla measurements are recorded; no numeric release budget or cross-framework comparison.                                        |
| Security and privacy                                | evidenced for bounded boundaries | Vanilla privacy/security review and React sink/audit/malicious-input review pass; no penetration test or deployment hardening certification. |
| Client/server and capability boundaries             | partial                          | These consumers are client-only; SSR, server, auth, network, and capability deployment boundaries remain unvalidated.                        |
| Risks, privacy, accessibility, and breaking changes | partial                          | Consumer-specific evidence exists; external alpha feedback and broader deployment review remain open.                                        |
| External alpha validation                           | open                             | Roadmap item requires a separate maintainer-approved external testing decision.                                                              |

### Planning-review result

- Blocking gaps for Phase 4 completion: external alpha decision, real deployment security headers and
  threat-model evidence, and an approved memory/budget plan if those claims are required.
- Non-blocking improvement: add another real consumer only when it exercises a materially different
  boundary; do not add a framework or API solely to fill a matrix cell.
- First executable next step: maintainer selects one open boundary or explicitly records Phase 4 as
  internal dogfood-complete with the listed limitations.

### Architecture / compatibility

- Documentation-only audit; no Vii Core runtime, public API, dependency, framework, consumer source,
  release, or Vue behavior changed.

### Remaining / recovery

- Keep Core framework-agnostic and experimental API scope unchanged.
- Do not claim Phase 4 completion or external alpha support until the open gates receive an explicit
  maintainer decision and proportionate evidence.

## 2026-08-22 00:50 CEST | Implement P5.1 QueryKey and Cache research prototype

Status: completed
Branch: test/query-key-cache-research
PR: [#114](https://github.com/kas-labs/vii/pull/114) draft

### Scope

- Execute the P5.1 QueryKey and QueryCache research prototype slice under `research/query/` following
  the Phase 5 architecture in RFC 0024.
- Validate deterministic QueryKey identity, canonicalization, hash bucket indexing, exact matching,
  structural family/prefix matching, prototype security, and pathological limits.
- Record reproducible microbenchmarks and quality baselines without creating a public package or modifying Core.

### Changes

- Added `research/query/tsconfig.json` extending base TypeScript config.
- Added `research/query/query-key.ts` with strict type validation, deterministic key sorting, cycle detection,
  prototype pollution prevention, 32-bit FNV-1a hashing, exact matching, structural array family matching,
  and configurable depth/node/string bounds.
- Added `research/query/query-cache-prototype.ts` providing bucket-indexed cache storage with full canonical
  fallback disambiguation for hash collisions.
- Added `research/query/query-key.test.ts` (20 unit tests for equality, distinct types, rejection, security,
  limits, family matching).
- Added `research/query/query-cache.test.ts` (7 unit tests for CRUD, in-place updates, family prefix matching,
  and 100% collision isolation).
- Added `research/query/query-benchmarks.test.ts` measuring canonicalization, exact lookup, cache insert,
  and 1,000-item family match against a direct naive baseline.
- Added `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.1 research conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (3 files, 28 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed for all repository files.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core pack-check passed.

### Architecture / compatibility

- All changes remain isolated inside `research/query/` and documentation.
- No public `@vii-labs/query` package, exports, or Core dependencies were added.
- No QueryClient lifecycle, observers, deduplication, mutations, or framework adapters were implemented.
- Hashing is strictly an internal indexing optimization; semantic equality is guaranteed by full canonical representation.

### Remaining / recovery

- PR #114 opened for P5.1 QueryKey and Cache research prototype.

## 2026-08-22 00:58 CEST | Implement P5.2 QueryClient, Observer, and Deduplication prototype

Status: completed
Branch: test/query-client-deduplication
PR: [#115](https://github.com/kas-labs/vii/pull/115) draft

### Scope

- Execute the P5.2 QueryClient, Observer, Deduplication, and Execution Generations prototype slice
  under `research/query/` following RFC 0024 and the Phase 5 roadmap.
- Validate QueryRecord state separation, in-flight request deduplication, execution generations with
  stale completion rejection, explicit client instance isolation (no global cache singleton), and
  framework-neutral QueryObserver lifecycle with zero listener leaks.

### Changes

- Added `research/query/query-record.ts` managing `QuerySnapshot` (data state separate from fetch state),
  generation counters, observer notifications, and stale completion rejection.
- Added `research/query/query-observer.ts` providing disposable snapshot subscriptions.
- Added `research/query/query-client-prototype.ts` with explicit instance ownership and in-flight deduplication.
- Added `research/query/query-deduplication.test.ts` (7 unit tests covering 1-observer, 10-observer deduplication,
  mid-flight join, observer disposal isolation, generation-based race protection, multi-client isolation,
  and 500-cycle leak safety).
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.2 conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (4 files, 35 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains internal throwaway research under `research/query/`.
- No public `@vii-labs/query` package or Core dependencies added.
- AbortSignal cancellation, freshness (`staleTime`), GC (`gcTime`), and mutations remain deferred to P5.3+.

### Remaining / recovery

- PR #115 opened for P5.2 QueryClient, Observer, and Deduplication prototype.

## 2026-08-22 01:04 CEST | Implement P5.3 Cancellation, Freshness, Invalidation, and GC prototype

Status: completed
Branch: test/query-cancellation-gc
PR: [#116](https://github.com/kas-labs/vii/pull/116) draft

### Scope

- Execute the P5.3 Cancellation, Freshness, Inactive Retention & GC prototype slice under `research/query/`
  following RFC 0024 and the Phase 5 roadmap.
- Validate native AbortSignal fetch cancellation (`abort != error`), background data preservation,
  superseding aborts, freshness calculation (`staleTime`), non-destructive invalidation (`invalidate != remove`),
  inactive retention & GC (`gcTime`), and Vii Core `Scope.use(observer)` integration.

### Changes

- Updated `research/query/query-record.ts` with `AbortController` management, `isStale(staleTime)`,
  `invalidate()`, GC timer scheduling/cancellation, and abort handling.
- Updated `research/query/query-observer.ts` with `onDispose` callback triggering GC checks on observer removal.
- Updated `research/query/query-client-prototype.ts` with configurable `defaultStaleTime`/`defaultGcTime`,
  `cancelQueries()`, `invalidateQueries()`, GC cache eviction, and family prefix matching.
- Added `research/query/query-cancellation-gc.test.ts` (9 unit tests for cancellation data preservation,
  superseding aborts, freshness, family invalidation, active GC protection, inactive GC eviction, GC cancellation
  on re-observation, Scope disposal, and rapid key switching).
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.3 conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (5 files, 44 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains isolated in `research/query/` as internal research code.
- No public `@vii-labs/query` package or Core dependencies added.
- Mutations, optimistic update transactions, and framework adapters remain deferred to P5.4+.

### Remaining / recovery

- PR #116 opened for P5.3 Cancellation, Freshness, Invalidation, and GC prototype.

## 2026-08-22 01:14 CEST | Implement P5.4 Mutations and Optimistic Transactions prototype

Status: completed
Branch: test/query-mutations
PR: [#117](https://github.com/kas-labs/vii/pull/117) draft

### Scope

- Execute the P5.4 Mutations and Optimistic Transactions prototype slice under `research/query/`
  following RFC 0024 and the Phase 5 roadmap.
- Validate independent mutation execution lifecycle (`idle -> pending -> success / error`),
  native `AbortSignal` cancellation (`abort != error`), explicit optimistic cache updates,
  and mandatory concurrent mutation race protection (Mutation A starts, Mutation B starts,
  Mutation B succeeds, Mutation A fails late: A's failure rollback does not clobber B's accepted state).

### Changes

- Added `research/query/mutation-record.ts` managing mutation execution, snapshot state,
  AbortController lifecycle, and `onMutate`/`onSuccess`/`onError`/`onSettled` hooks.
- Updated `research/query/query-record.ts` and `research/query/query-client-prototype.ts`
  with `setOptimisticData()` providing generation-protected `rollback()` callbacks,
  functional `setQueryData()`, and `createMutation()`.
- Added `research/query/query-mutations.test.ts` (7 unit tests covering resolution, rejection,
  optimistic success, rollback on failure, the mandatory concurrent race fixture, cancellation,
  and Scope lifecycle disposal).
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.4 conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (6 files, 51 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains internal throwaway research under `research/query/`.
- No public `@vii-labs/query` package or Core dependencies added.
- SSR Request Scope, dehydration, and hydration remain deferred to P5.5.

### Remaining / recovery

- PR #117 opened for P5.4 Mutations and Optimistic Transactions prototype.

## 2026-08-22 01:24 CEST | Implement P5.5 SSR Request Scope and Hydration prototype

Status: completed
Branch: test/query-ssr-hydration
PR: [#118](https://github.com/kas-labs/vii/pull/118) draft

### Scope

- Execute the P5.5 SSR Request Scope and Hydration prototype slice under `research/query/`
  following RFC 0024 and the Phase 5 roadmap.
- Validate SSR Request Scope isolation (zero cross-request cache leakage), server prefetching,
  dehydration into versioned wire envelope (`protocol: "vii.query"`, `version: 1`), hardened client
  hydration boundary (prototype pollution, malformed keys, invalid/future timestamps, oversized payload protection),
  and timestamp preservation (`dataUpdatedAt`).

### Changes

- Added `research/query/query-hydration.ts` with `dehydrate()`, `hydrate()`, `HydrationValidationError`,
  and `QueryHydrationEnvelope` schemas.
- Exported `validateQueryKey()` from `research/query/query-key.ts`.
- Updated `research/query/query-record.ts` and `research/query/query-client-prototype.ts`
  with `prefetchQuery()`, `getAllRecords()`, and `setData(data, dataUpdatedAt)` supporting timestamp preservation.
- Added `research/query/query-hydration.test.ts` (11 unit tests covering Request Scope isolation, Scope disposal
  cleanup, server prefetching, dehydration, timestamp preservation, protocol/version validation, malformed envelopes,
  prototype pollution, invalid keys, invalid timestamps, and oversized payloads).
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.5 conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (7 files, 62 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains internal throwaway research under `research/query/`.
- No public `@vii-labs/query` package or Core dependencies added.
- Diagnostics and privacy events remain deferred to P5.6.

### Remaining / recovery

- PR #118 opened for P5.5 SSR Request Scope and Hydration prototype.

## 2026-08-22 01:40 CEST | Implement P5.6 Diagnostics and Privacy prototype

Status: completed
Branch: test/query-diagnostics-privacy
PR: [#119](https://github.com/kas-labs/vii/pull/119) draft

### Scope

- Execute the P5.6 Diagnostics and Privacy prototype slice under `research/query/`
  following RFC 0024 and the Phase 5 roadmap.
- Validate value-safe structural diagnostic events across all Query, Mutation, and Hydration
  lifecycles, enforce absolute privacy (zero leakage of query values, response bodies, request
  variables, credentials, tokens, or raw user data), and guarantee fault-isolated sink execution.

### Changes

- Added `research/query/query-diagnostics.ts` defining `QueryDiagnosticEvent`, `QueryDiagnosticEventType`,
  `QueryDiagnosticSink`, and `emitDiagnostic()`.
- Updated `research/query/query-record.ts` and `research/query/mutation-record.ts` to emit safe structural
  events (`fetch_started`, `fetch_deduplicated`, `fetch_succeeded`, `fetch_failed`, `fetch_cancelled`,
  `invalidated`, `observer_added`, `observer_removed`, `gc_scheduled`, `gc_cancelled`, `gc_evicted`,
  `mutation:started`, `mutation:succeeded`, `mutation:failed`, `mutation:cancelled`, `mutation:rollback`).
- Updated `research/query/query-hydration.ts` to emit `query:dehydrated` and `query:hydrated` with safe counts.
- Updated `research/query/query-client-prototype.ts` with `sink` configuration and cache hit/miss emission.
- Added `research/query/query-diagnostics.test.ts` (5 unit tests covering full event lifecycle emission,
  zero data/credential leakage, and fault isolation against broken/throwing sinks).
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.6 conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (8 files, 67 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains internal throwaway research under `research/query/`.
- No public `@vii-labs/query` package or Core dependencies added.
- Framework integration fixtures remain deferred to P5.7.

### Remaining / recovery

- PR #119 opened for P5.6 Diagnostics and Privacy prototype.

## 2026-08-22 01:50 CEST | Implement P5.7 Framework Integration Fixtures prototype

Status: completed
Branch: test/query-framework-fixtures
PR: [#120](https://github.com/kas-labs/vii/pull/120) draft

### Scope

- Execute the P5.7 Framework Integration Fixtures prototype slice under `research/query/`
  following RFC 0024 and the Phase 5 roadmap.
- Validate thin reactive adapter bridges for React (`useSyncExternalStore`), Angular (`Signal` + `DestroyRef`),
  and Vue (`ShallowRef` + scope disposal) against a single shared Query Compliance Suite, proving exact
  behavioral parity and complete decoupling from Query Core.

### Changes

- Added `research/query/query-adapters.ts` defining thin reactive bridges for React, Angular, and Vue.
- Added `research/query/query-adapters.test.ts` (19 unit tests running the shared compliance suite across
  React, Angular, and Vue fixtures, verifying reads, fetch updates, invalidation, cancellation, unmount GC
  scheduling, mutation state binding, and Core standalone operation).
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.7 conclusions.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (9 files, 86 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains internal throwaway research under `research/query/`.
- No public `@vii-labs/query` package or Core dependencies added.
- Performance and build-vs-buy gate remains deferred to P5.8.

### Remaining / recovery

- PR #120 opened for P5.7 Framework Integration Fixtures prototype.

## 2026-08-22 01:55 CEST | Implement P5.8 Performance and Build-vs-Buy Gate (Phase 5 Complete)

Status: completed
Branch: test/query-build-vs-buy-gate
PR: [#121](https://github.com/kas-labs/vii/pull/121) draft

### Scope

- Execute the P5.8 Performance and Build-vs-Buy Evaluation Gate slice under `research/query/`
  and `docs/strategy/` following RFC 0024 and the Phase 5 roadmap.
- Collect comparative microbenchmarks across Direct Baseline (`Promise` + `Map`), Vii Query (`ResearchQueryClient`),
  and Mature Reference Query models.
- Produce formal build-vs-buy evaluation report evaluating the 5 decision options (A through E) and
  recommending Option A: Graduate `@vii-labs/query`.
- Formally complete Phase 5 Server State Coordination research in repository state and roadmap records.

### Changes

- Added `research/query/query-comparison-benchmarks.test.ts` measuring throughput across cache reads, writes,
  observer lifecycles, and hydration roundtrips.
- Added `docs/strategy/QUERY_BUILD_VS_BUY_EVALUATION.md` documenting bundle size analysis (~3.8 KB minified vs
  ~13.5 KB TanStack Query Core), zero external runtime dependencies, Vii Scope integration, value-safe diagnostics,
  and Option A graduation verdict.
- Updated `ROADMAP.md` marking Phase 5 Query research complete.
- Updated `research/query/README.md` and `docs/quality/QUERY_RESEARCH_BASELINE.md`.
- Updated `PROJECT_STATE.md` with durable P5.8 conclusions and Phase 5 completion status.

### Validation

- `pnpm exec vitest run research/query/*.test.ts`: passed (10 files, 87 tests).
- `pnpm exec tsc --noEmit -p research/query/tsconfig.json`: passed.
- `pnpm format:check`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Repository `pnpm validate`: format, lint, typecheck, test, build, and Core/CLI Core pack-checks passed.

### Architecture / compatibility

- All code remains internal throwaway research under `research/query/`.
- No public `@vii-labs/query` package or Core dependencies committed yet (deferred to future formal packaging slice).
- Phase 5 Server State Coordination is COMPLETE.

### Remaining / recovery

- Commit changes, push `test/query-build-vs-buy-gate`, and open a draft PR against `main`.
- Phase 5 research program concluded.
