# Vii Form Release Readiness Gate

Status: Form Production Phase 1 Complete; Preview Candidate Approved for Release Preparation.

Publication status: **Deferred** — Package remains `"private": true`. Publication requires explicit maintainer release approval.

---

## 1. Overview & Separation of Concerns

This document defines the release gate for `@vii-labs/form`. It formally separates:
1. **P1m Graduation Completion (Achieved):** Verified package readiness, zero-leak public API boundary, full documentation, passing clean-consumer matrix (8 configurations), browser/a11y regression gates (Playwright Chromium + axe checks), and 41 automated HARD performance/bundle budgets.
2. **Explicit Publication Gate (Deferred):** The manual maintainer approval process required before making the package publishable, applying Changeset versions, and publishing the package artifact to npm.

### Changesets Configuration & Versioning Behavior

The repository Changesets configuration (`.changeset/config.json`) does **not** enable `privatePackages.version: true`. Consequently:
- Packages marked `"private": true` (such as `@vii-labs/form`) are intentionally skipped by `pnpm changeset version`.
- Running `pnpm changeset status` detects zero packages to be bumped while `@vii-labs/form` remains private.
- Version application will occur only when publication is explicitly authorized and `@vii-labs/form` is made publishable in a dedicated publication PR.

### Three Distinct Versioning & Stability Concepts

To prevent ambiguity, the following three concepts must never be conflated:
1. **API Stability Tier (`vii.stability: "preview"`):**
   A Vii governance classification under `docs/governance/API_STABILITY.md` indicating that the API surface has graduated from experimental exploration to a hardened candidate, subject to pre-1.0 stability rules.
2. **Package Publishability (`"private": true` vs `"private": false`):**
   A packaging status in `package.json`. While `"private": true` is retained, package publication is strictly blocked and Changesets ignores the package.
3. **npm Semver Release String:**
   The exact version string generated when Changesets versions the package:
   - **Path A (Normal Release — Default):** When the package is made publishable (`"private": false`), applying a `minor` changeset bump to the current `0.1.0-experimental.1` under standard semver / Changesets rules yields `0.2.0`.
   - **Path B (Optional Prerelease/Preview Tag):** If maintainers decide to publish an explicit npm prerelease tag (e.g. `0.2.0-preview.0`), repository maintainers must enter Changesets prerelease mode (`pnpm changeset pre enter preview`) before versioning.

---

## 2. Gate Status Checklist

### Stage A: Graduation to Preview Candidate (P1m — Completed)
- [x] Full public runtime API inventory audited (18 exports across 5 entrypoints).
- [x] Full public type declaration inventory audited (74 named types).
- [x] Machine-readable API surface snapshot committed (`packages/form/api-surface.json`).
- [x] Package boundary test enforces API snapshot and rejects deep internal imports.
- [x] Zero leakage of internal helpers, test utilities, or diagnostics details.
- [x] Zero changes to `@vii-labs/core` runtime semantics.
- [x] Zero new form feature implementations; Phase 2 deferred.
- [x] Framework adapters isolated: zero cross-framework peer pollution.
- [x] Clean packed consumer matrix passes (8 configurations: Root/Core-only, Vanilla DOM, React 18.3.1, React 19.2.8, Angular 17.3.12, Angular 22.1.4, Vue 3.3.13, Vue 3.5.41).
- [x] Headless Chromium browser acceptance & a11y suite passes 100% (31/31 tests using Playwright Chromium and axe checks against the configured WCAG 2.2 AA rule set).
- [x] 41 automated HARD performance, bundle, and memory budgets pass 100%.
- [x] Definitive consumer documentation completed in `packages/form/README.md`.
- [x] Changeset created for candidate bump (`.changeset/preview-form-candidate.md`).
- [x] Package stability classified as `preview` in `packages/form/package.json`.
- [x] Package remains `"private": true`.

### Stage B: Future Publication Authorization (Pending Maintainer Approval)
The following steps are **strictly future actions** and must NOT be executed as part of P1m. They must follow this exact ordered sequence:
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
