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
