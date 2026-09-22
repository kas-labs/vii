# Vii Form Release Readiness Gate

Status: Form Production Phase 1 complete. Form Phase 2 product development complete. Preview readiness confirmed. Package remains Preview, private, and unpublished.

Publication status: **Deferred** — Package remains `"private": true`. Publication requires explicit maintainer release approval. P2h does not publish, version, tag, or consume the existing Changeset.

---

## 1. Overview & Separation of Concerns

This document defines the release gate for `@vii-labs/form`. It formally separates:

1. **P1m Phase 1 Graduation (Historical, achieved):** Verified Phase 1 package readiness, API snapshot, documentation, packed-consumer matrix, Chromium browser/a11y gate, and 41 HARD performance/bundle budgets. Historical inventory at P1m: 18 runtime exports and 74 named types; Chromium browser suite 31/31.
2. **P2h Phase 2 Graduation (Achieved):** Final Phase 2 API review, documentation sync, and performance audit. Current inventory: 35 runtime exports and 93 public named types across 5 preview entrypoints. Cross-browser acceptance: Chromium 46/46, Firefox 46/46, WebKit 46/46 (138/138). Packed consumers 8/8 plus Angular 17 signal-only / no-`@angular/forms`. 41/41 HARD gates still pass. Package remains unpublished.
3. **Explicit Publication Gate (Deferred):** The manual maintainer approval process required before making the package publishable, applying Changeset versions, and publishing the package artifact to npm.

Phase completion is not Stable API status and is not publication. Preview under `docs/governance/API_STABILITY.md` means the design is usable and documented, still subject to refinement; breaking changes require migration notes and explicit release communication.

### Changesets Configuration & Versioning Behavior

The repository Changesets configuration (`.changeset/config.json`) does **not** enable `privatePackages.version: true`. Consequently:

- Packages marked `"private": true` (such as `@vii-labs/form`) are intentionally skipped by `pnpm changeset version`.
- Running `pnpm changeset status` detects zero packages to be bumped while `@vii-labs/form` remains private.
- Version application will occur only when publication is explicitly authorized and `@vii-labs/form` is made publishable in a dedicated publication PR.
- P2h must not consume `.changeset/preview-form-candidate.md`, bump `0.1.0-experimental.1`, remove `"private": true`, add `publishConfig`, enter prerelease mode, publish, or create a release tag.

### Three Distinct Versioning & Stability Concepts

To prevent ambiguity, the following three concepts must never be conflated:

1. **API Stability Tier (`vii.stability: "preview"`):**
   A Vii governance classification under `docs/governance/API_STABILITY.md` indicating that the API surface has graduated from experimental exploration to a hardened candidate, subject to pre-1.0 stability rules. P2h does not promote Form to Stable.
2. **Package Publishability (`"private": true` vs `"private": false`):**
   A packaging status in `package.json`. While `"private": true` is retained, package publication is strictly blocked and Changesets ignores the package.
3. **npm Semver Release String:**
   The exact version string generated when Changesets versions the package:
   - **Path A (Normal Release — Default):** When the package is made publishable (`"private": false`), applying a `minor` changeset bump to the current `0.1.0-experimental.1` under standard semver / Changesets rules yields `0.2.0`.
   - **Path B (Optional Prerelease/Preview Tag):** If maintainers decide to publish an explicit npm prerelease tag (e.g. `0.2.0-preview.0`), repository maintainers must enter Changesets prerelease mode (`pnpm changeset pre enter preview`) before versioning.

---

## 2. Gate Status Checklist

### Stage A1: Graduation to Preview Candidate (P1m — Historical, Completed)

These counts and browser facts are the frozen Phase 1 graduation snapshot. Do not copy them forward as current readiness.

- [x] Full public runtime API inventory audited (historical P1m: 18 exports across 5 entrypoints).
- [x] Full public type declaration inventory audited (historical P1m: 74 named types).
- [x] Machine-readable API surface snapshot committed (`packages/form/api-surface.json`).
- [x] Package boundary test enforces API snapshot and rejects deep internal imports.
- [x] Zero leakage of internal helpers, test utilities, or diagnostics details.
- [x] Zero changes to `@vii-labs/core` runtime semantics.
- [x] Zero new form feature implementations in P1m; Phase 2 was deferred at that time.
- [x] Framework adapters isolated: zero cross-framework peer pollution.
- [x] Clean packed consumer matrix passes (8 configurations: Root/Core-only, Vanilla DOM, React 18.3.1, React 19.2.8, Angular 17.3.12, Angular 22.1.4, Vue 3.3.13, Vue 3.5.41).
- [x] Headless Chromium browser acceptance & a11y suite passed 100% at P1m (historical: 31/31 tests using Playwright Chromium and axe checks against the configured WCAG 2.2 AA rule set). Browser acceptance is no longer Chromium-only; see Stage A2.
- [x] 41 automated HARD performance, bundle, and memory budgets pass 100%.
- [x] Definitive consumer documentation completed in `packages/form/README.md`.
- [x] Changeset created for candidate bump (`.changeset/preview-form-candidate.md`). Unconsumed.
- [x] Package stability classified as `preview` in `packages/form/package.json`.
- [x] Package remains `"private": true`.

### Stage A2: Phase 2 Graduation / Current Preview Readiness (P2h — Completed)

Current public API and test inventory are derived from `packages/form/api-surface.json` and the live CI/test matrix. They supersede P1m counts for current-state claims.

- [x] Public API audit: 35 runtime exports and 93 public named types across 5 preview entrypoints (`.` 7/50, `./react` 7/12, `./vanilla` 4/9, `./angular` 8/9, `./vue` 9/13). Stability `preview` on package and entrypoints.
- [x] Runtime exports and public types match `packages/form/api-surface.json` and package `exports`. Zero production API delta in P2h.
- [x] Zero leakage of internal helpers, tests, or research fixtures from the packed artifact. LICENSE present. Deep internal imports rejected.
- [x] Root `@vii-labs/form` remains DOM-free, framework-neutral, and headless. Framework peers stay optional and subpath-isolated. `@angular/forms` is optional (CVA only).
- [x] Zero `@vii-labs/core` runtime modification in Phase 2.
- [x] Packed consumer matrix 8/8: Root/Core-only, Vanilla, React 18.3.1, React 19.2.8, Angular 17.3.12, Angular 22.1.4, Vue 3.3.13, Vue 3.5.41. Additional Angular 17 signal-only / no-`@angular/forms` consumer passes.
- [x] Cross-browser Form acceptance is Chromium, Firefox, and WebKit with identical inventory: 46/46 per engine, 138/138 total. Axe WCAG 2.2 AA scans report 0 violations on all three engines.
- [x] 41/41 HARD performance, bundle, and memory budgets pass. `packages/form/performance-budgets.json` unchanged (`createFieldOnly` 18000 / 5000 / 4500). Memory: 0 retained subscriptions, 0 retained scopes, 0 retained timers, 0 stale commits, 0 unhandled rejections.
- [x] Consumer documentation synchronized (`packages/form/README.md`) including Phase 2 APIs and current bundle measurements.
- [x] Phase 2 slices P2a–P2h complete. No P2i. Phase 3 not started.
- [x] Package remains `"private": true`, version `0.1.0-experimental.1`, stability `preview`, unpublished. Publication was not performed.

### Stage B: Future Publication Authorization (Pending Maintainer Approval)

The following steps are **strictly future actions** and must NOT be executed as part of P1m or P2h. They must follow this exact ordered sequence:

1. **Explicit Maintainer Authorization:** Maintainers formally authorize the public release of `@vii-labs/form`.
2. **Release Format Decision:** Maintainers decide whether the release format is a normal pre-1.0 release (yielding `0.2.0`) or Changesets prerelease mode (yielding `0.2.0-preview.0`).
3. **Publication Pull Request:** Create a dedicated publication PR that removes `"private": true` from `packages/form/package.json` and configures `"publishConfig": { "access": "public" }`.
4. **Prerelease Mode Entry (Conditional):** If the prerelease format was selected in Step 2, run `pnpm changeset pre enter preview` to enter Changesets prerelease mode.
5. **Changesets Versioning:** Run `pnpm changeset version` to consume `.changeset/preview-form-candidate.md`, update `packages/form/package.json`, and generate `packages/form/CHANGELOG.md`.
6. **Changelog & Version Inspection:** Review the generated `CHANGELOG.md` and verify that the resulting version string matches the decision from Step 2.
7. **Validation Gate Verification:** Rerun the complete validation suite (`pnpm validate`, `pnpm test:browser`, `pnpm nx performance form`) against the versioned candidate.
8. **Publish Execution:** Execute the publish workflow with provenance (`pnpm publish --provenance --access public`) using provisioned npm Trusted Publisher tokens.
9. **Registry Artifact Verification:** Verify that the published package artifact and tarball on npm match the release candidate.
10. **Release Tagging:** Create and push the Git release tag (e.g. `v0.2.0` or `v0.2.0-preview.0`) and publish GitHub release notes.
