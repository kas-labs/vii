# Vii Form Release Readiness Gate

Status: Form Production Phase 1 Complete; Preview Candidate Approved for Release Preparation.

Publication status: **Deferred** — Package remains `"private": true`. Publication requires explicit maintainer release approval.

---

## 1. Overview & Separation of Concerns

This document defines the release gate for `@vii-labs/form`. It formally separates:
1. **P1m Graduation Completion (Achieved):** Verified package readiness, zero-leak public API boundary, full documentation, passing clean-consumer matrix, browser/a11y regression gates, and 41 automated HARD performance/bundle budgets.
2. **Explicit Publication Gate (Deferred):** The manual maintainer approval process required before removing `"private": true` and publishing the package artifact to npm.

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
- [x] Clean packed consumer matrix passes (Root, Vanilla, React 18 & 19, Angular 17 & 22, Vue 3.3 & 3.5).
- [x] Headless Chromium browser acceptance & a11y suite passes 100% (31/31 tests).
- [x] 41 automated HARD performance, bundle, and memory budgets pass 100%.
- [x] Definitive consumer documentation completed in `packages/form/README.md`.
- [x] Changeset created for candidate bump (`.changeset/preview-form-candidate.md`).
- [x] Package stability classified as `preview` in `packages/form/package.json`.
- [x] Package remains `"private": true`.

### Stage B: Future Publication Authorization (Pending Maintainer Approval)
The following steps are **strictly future actions** and must NOT be executed as part of P1m:
- [ ] Explicit maintainer authorization for public release of `@vii-labs/form`.
- [ ] Maintainer decision on public package scope and access (`publicConfig: { access: "public" }`).
- [ ] Decision to remove `"private": true` from `packages/form/package.json`.
- [ ] Version application via Changesets tooling (`pnpm changeset version`).
- [ ] Dedicated OIDC Trusted Publisher / npm token provisioning for `@vii-labs/form`.
- [ ] Execution of automated or manual release workflow with provenance (`--provenance`).
- [ ] Verification of published package artifact on npm registry.
- [ ] Git release tag creation (e.g. `v0.1.0-preview.1` or `v0.1.0`).
