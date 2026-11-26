# Repository Operating Model

This document defines how the Vii monorepo should be organized and operated as implementation begins.

## Branches

- `main` is the protected integration branch.
- Feature and documentation work uses short-lived branches.
- Large architecture work may use stacked pull requests.
- Direct pushes to `main` should be disabled once branch protection is configured.

## Pull requests

Pull requests should be small enough to review, have a single primary purpose, and reference the relevant RFC or ADR when required.

Draft pull requests are encouraged for architecture and early implementation work.

## Ownership

Ownership should be assigned by area rather than by the entire repository.

Potential ownership groups include:

- Core and State
- diagnostics and protocols
- framework adapters
- CLI and generators
- UI and Registry
- Server and runtimes
- documentation and governance

A future `.github/CODEOWNERS` file should reflect actual maintainers rather than aspirational teams.

## Required checks

The initial repository checks should grow incrementally:

1. formatting and linting
2. TypeScript build
3. unit tests
4. package build and contents validation
5. consumer fixtures
6. compatibility and performance checks
7. security and provenance checks

Checks should only become required after they are reliable and maintainable.

## Stacked pull requests

Stacked PRs may be used when later documents or implementations depend on earlier unmerged work. Each PR must clearly identify its base branch and dependency order.

Before final merge, stacked branches should be retargeted or updated so each PR contains only its intended changes.

## Issue tracking

Issues should represent actionable work, reproducible defects, accepted roadmap items, or focused research questions. Broad ideas should begin as discussions or RFC drafts rather than implementation issues.

## Labels

A future label taxonomy may include:

- area:core
- area:adapter
- area:cli
- area:ui
- area:server
- type:bug
- type:feature
- type:docs
- type:rfc
- status:blocked
- status:needs-evidence

## Automation

Automation must remain inspectable and deterministic. Repository workflows must not introduce hidden source uploads, unreviewed code generation, or implicit release authority.

## Canonical AI-assisted delivery lifecycle

This is the **process index**, not a second source for architecture, testing, release or AI permissions. Follow their linked canonical policies for detailed gates. A task may take the proportional small-change route only when its impact is genuinely limited; no small-change exception bypasses a relevant security, accessibility, privacy or data-integrity check.

```text
Task Triage + current repository truth
 -> Product Discovery (problem, audience, value, evidence)
 -> Alternatives, proportional SWOT + RAID risk analysis
 -> Milestone/slice planning, responsibility and capacity
 -> System Design (DDD boundaries, diagrams, contracts)
 -> Accessibility impact + test planning
 -> Explicit owner design approval
 -> Test-first work where appropriate, then implementation
 -> Focused validation, regression and required manual checks
 -> Independent PR review -> Owner-controlled merge
 -> Verify main -> separate release readiness/approval
 -> Production release -> post-release verification
```

Discovery, SWOT, RAID, RACI and time planning are **scaled to the task**, not compulsory ceremonies or new documents. The design record or existing issue/task plan holds them. Preserve the existing roadmap, package priorities, RFC/ADR decisions and Definition of Done; do not introduce Scrum meetings or a parallel tracking system.

### Discovery and value gate

For a substantial feature or direction, record the user problem, target audience, user and business value, product goal, scoped and excluded behavior, acceptance criteria, dependencies, success measures, counterfactual (do nothing / defer / integrate rather than build), and evidence. Mark evidence as **observed**, **inferred**, **assumption** or **hypothesis**. Set a baseline and measurement owner where metrics are proposed; do not invent customer demand, revenue, people or adoption data. Unvalidated ideas remain Research or Vision under `ROADMAP.md`.

For a major feature, architectural alternative, integration or commercialization decision, assess SWOT: internal **strengths/weaknesses**, external **opportunities/threats**. Compare at least a viable alternative and defer/do-not-build where meaningful. For significant observations capture evidence, assumption, business and technical effects, mitigation and a recommended decision. A SWOT is not proof by itself. For small fixes, a concise risk/alternative note suffices.

### Planning, ownership and responsibility

Use `docs/roadmap/MILESTONE_MODEL.md` and existing issue/slice conventions. Record priority (where the project uses P0–P3), user/business impact, technical risk, effort, dependencies, deliverables, milestone, acceptance criteria, Definition of Done and stop condition. **Priority, effort and Task Triage score are independent values.** Break large work into independently reviewable slices; do not pre-authorize subsequent slices.

For non-trivial work, name an actual person or authorized role for **Responsible** (does the work), **Accountable** (one final decision owner), **Consulted** and **Informed**. For multi-stage work, a concise RACI matrix may map design, implementation, testing, independent review, merge and release. A small project may assign several roles to the same person, but an AI coding agent can never be Accountable for product scope, design approval, merge or release and must never approve its own implementation. Do not invent employees or availability. The project owner retains final merge and release control. See `CONTRIBUTOR_ROLES.md` and `docs/agents/AGENT_GOVERNANCE.md` for actual permissions.

### Effort, calendar and resources

For substantial slices, estimate **human active effort**, **AI agent execution effort** and **calendar duration** separately, each as a range with unit, assumptions, confidence and dependencies. Include discovery, design, test planning, owner review, development, automated/manual tests, accessibility/security review, independent review, rework, release verification, waiting and contingency as applicable. Unknown staffing and review availability mean calendar duration may be **not yet estimable**. Re-estimate after discovery, scope changes or blockers. Optionally use T-shirt sizing, timeboxing, Work Breakdown Structure, Gantt, critical path or PERT when the decision warrants it; none is compulsory. Never shorten required quality checks to hit an estimate.

### Proportional RAID record

Keep **Risks, Assumptions, Issues and Dependencies** together in the existing plan/design/issue, not a second risk registry. Record for material risks: cause, potential impact, likelihood, severity, mitigation, contingency, responsible role, trigger and status. Explicitly consider privacy, security, accessibility, loss of data, supplier dependence, cost and reversibility where relevant. Identify who can resolve a blocking issue and the decision needed. No invented probabilities.

### Evidence and status convention

For each required check use `PASS`, `FAIL`, `PENDING`, `BLOCKED` or `NOT APPLICABLE`, with applicable commit SHA, environment, exact command or manual method, result, reviewer and reason for omission. A green local run is not proof that CI passed on the PR head. Unexecuted checks are never `PASS`. Independent reviewers examine code **and tests**, plus diagrams, scope, risks and results. The owner performs merge after the required evidence is complete. After merge, verify the expected diff and checks on actual `main`, record enduring state in `PROJECT_STATE.md`, operational handoff in `DUTY_WATCH.md` and changelog only where warranted. Merge does not authorize or complete publication.

## CI automation and cost inventory (observed configuration)

As recorded from `.github/workflows/` at governance review time:

| Workflow | Trigger | Evidence / cost implication |
| --- | --- | --- |
| `validate.yml` | PR and push to main | Installs dependencies plus Chromium/Firefox/WebKit; runs `pnpm validate`, `pnpm test:browser`, `pnpm nx performance form` on all PRs, including docs-only |
| `governance.yml` | PR lifecycle | Branch and PR/commit text policy checks |
| `codeql.yml` | PR, main push, weekly schedule | Security scans for JavaScript/TypeScript and Actions |
| `dependency-review.yml` | PR to main | Dependency diff review |
| `publish-core.yml` | Manual dispatch with tag/confirmation guard | Privileged, separately approved release operation |

This is a **configuration inventory**, not proof of branch-protection requirements, actual billing or successful runs. Check branch settings and exact-head CI before claiming enforcement. Prefer scoped/affected-project checks, caching and safe path filtering **only after separate design, cost/coverage analysis and owner approval**. This governance change does not edit workflows, security posture, repository settings or paid resources. AI model calls and live evaluations likewise need bounded budget and explicit consent where they incur cost.
