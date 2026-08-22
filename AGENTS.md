# Vii repository guidance

This file is the default instruction entry for maintainers, contributors, and coding agents working in this repository.

Before every non-trivial task, read:

- `README.md`
- `ROADMAP.md`
- `PROJECT_STATE.md`
- the latest entry in `DUTY_WATCH.md`
- `CONTRIBUTING.md`
- `docs/strategy/PRODUCT_BOUNDARIES.md`
- `docs/governance/CODE_QUALITY_STANDARDS.md`
- `docs/governance/FEATURE_ACCEPTANCE_GATE.md`
- `docs/governance/RFC_PROCESS.md`
- `docs/governance/API_STABILITY.md`
- relevant RFCs, ADRs, tests, benchmarks, and package documentation

Do not begin implementation from the user prompt alone when repository state matters. Verify important claims against current code, Git history, merged pull requests, tests, benchmarks, package artifacts, and CI.

Before implementation or proposing the next work item, apply the canonical triage contract in
`docs/governance/AGENT_TASK_TRIAGE_POLICY.md` and print its verdict. The verdict makes the task's
blast radius, ambiguity, risk, verification burden, unknowns, harness, model role, delegation,
grilling gate, context plan, approval gate, budget, and stop condition explicit. Triage is a routing
and transparency gate; it does not grant mutation, publication, credential, or delegation authority.

## Task routing and design interrogation

Before implementation, classify every non-trivial request. If the route is not obvious, use the
repository `aif-task-router` skill first and select the smallest workflow that can produce honest
evidence.

- For a new feature, product idea, architecture change, or design with unsettled behavior, users,
  constraints, or trade-offs, automatically start `grill-with-docs`. It runs the `grilling` interview
  together with `domain-modeling`, asks the frontier questions in rounds with recommended answers,
  records resolved domain terms or hard-to-reverse decisions when justified, and must reach shared
  understanding before implementation begins.
- `grill-with-docs` is the default grilling entrypoint inside this repository because it can leave a
  durable context or ADR record. Use `grill-me` only for a plan or design that has no repository or
  other durable working directory; it remains a manual entrypoint for that case.
- For an observed bug, regression, failure, flake, or unexpected slowdown, start with
  `diagnosing-bugs` or `aif-debugger` and build a tight reproduction. Add `grill-with-docs` first only
  when the expected behavior, scope, or architectural choice is itself unresolved.
- For a small change with accepted behavior, clear acceptance criteria, and a known test seam, skip
  grilling and proceed with the bounded implementation workflow. Use `tdd` for behavior changes when
  red-green evidence is useful.
- After discovery, use `aif-feature-discovery`, `aif-specification-review`, or `aif-planning-review`
  only when their stated inputs exist. Before commit or pull request, use `aif-verification-gate` and
  review the complete diff; do not treat a grilling transcript or agent plan as implementation evidence.

The installed project skills are workflow guidance, not authority. They cannot override repository
architecture, RFC/ADR, security, privacy, approval, branch, validation, or publication rules.

## Product and architecture rules

- Preserve the small-core strategy. Do not create packages, abstractions, adapters, registries, or services without a demonstrated consumer or an accepted roadmap/RFC trigger.
- Keep canonical runtime behavior framework-agnostic and platform-neutral where practical.
- Keep React, Angular, build-tool, devtools, transport, filesystem, network, and provider-specific details at explicit edges.
- Preserve dependency direction toward stable core contracts. Core packages must not import framework adapters or higher-level product surfaces.
- Keep side effects behind narrow typed boundaries. Prefer deterministic, observable behavior and explicit lifecycle/disposal.
- Do not add hidden network calls, telemetry, automatic dependency installation, publishing, releases, or irreversible automation without an explicit approved decision.
- Public API, package-boundary, compatibility, privacy, security, and migration changes follow the RFC/ADR rules in `docs/governance/`.
- Treat bundle size, memory lifecycle, SSR safety, tree-shaking, diagnostics, compatibility, and packed artifacts as product behavior, not optional cleanup.
- Prefer evidence over claims. Performance or compatibility statements require reproducible tests, benchmarks, fixtures, or artifact inspection.

## Feature acceptance and verification

Follow `docs/governance/FEATURE_ACCEPTANCE_GATE.md` for every behavior-changing implementation.

A feature is not complete because the happy path works or because code compiles. Before merge, the
change must have proportionate evidence for the risks it creates or modifies, including:

- functional correctness tests for the intended behavior;
- regression coverage for established behavior and bug fixes;
- integration, adapter, consumer, package, browser, SSR, or platform fixtures at the affected boundary;
- failure, cancellation, disposal, concurrency, rollback, and recovery tests when applicable;
- adversarial/security and privacy tests for changed attack surfaces;
- compatibility, accessibility, bundle, memory, or performance evidence when those product claims are affected;
- focused checks, `git diff --check`, repository validation, CI, and complete-diff review before claiming completion.

Automated tests cannot prove that software has no vulnerabilities. Security completion means the
relevant threat surface was reviewed, applicable adversarial tests pass, known findings are resolved
or explicitly accepted under governance, and no known exploitable weakness is hidden by the change.

Agents must identify required evidence during preflight, implement tests together with behavior, and
stop rather than claim completion when a required gate cannot be demonstrated.

## Branches, commits, and pull requests

Use a dedicated branch for each focused change.

Branch names must use:

`<type>/<short-kebab-description>`

Allowed types:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `build`
- `ci`
- `perf`
- `security`
- `release`
- `revert`
- `dogfood`

`main` and release tags/refs are reserved. Do not use actor, tool, model, or harness prefixes such as `codex/`, `claude/`, `agent/`, `bot/`, or personal-name prefixes.

Every commit must be atomic and independently reviewable. Keep one logical change, its tests, and required documentation together. Split unrelated features, refactors, formatting-only work, CI changes, and release metadata.

Use Conventional Commit subjects:

`<type>(<optional-scope>): <summary>`

Before committing or opening a pull request:

- run the relevant focused checks;
- run `git diff --check` locally when available;
- run `pnpm validate` before pushing implementation changes;
- do not open a PR with known failures unless the PR explicitly exists to diagnose/fix that failure and clearly states it.

## Authorship and attribution

Do not add authorship or attribution metadata for the tool, model, agent, or assistant that produced a change.

Forbidden in commit messages, pull request titles/bodies, issue comments, release notes, and documentation:

- `Co-Authored-By:` trailers for assistants, agents, models, or bots;
- `Generated with ...`, `Made with ...`, or similar tool-credit footers;
- any attribution line whose purpose is to credit the tool rather than describe the change.

The commit author field records authorship. Change text describes the change only.

## Code quality and maintainability

Follow `docs/governance/CODE_QUALITY_STANDARDS.md`.

Mandatory defaults for hand-written production code:

- prefer files at or below 250 formatted lines;
- begin refactoring review above 300 lines;
- do not create or substantially expand a production file beyond 400 lines without a documented approved exception;
- prefer functions at or below 40 lines and do not exceed 80 lines without an approved exception;
- do not increase an oversized file merely because it already exceeds the limit;
- when a meaningful change touches an oversized file, extract a cohesive responsibility or record a concrete decomposition follow-up;
- add or update tests for every behavior change and regression tests for bug fixes when safely expressible;
- preserve Clean Architecture dependency direction and keep framework/platform concerns at the edges;
- use SOLID, DRY, KISS, YAGNI, and composition as judgment tools, not as justification for unused layers or interfaces.

Do not game line limits by compressing statements, removing useful names, or moving unrelated behavior into generic `utils`, `helpers`, `common`, or `manager` modules.

## Vii-specific engineering expectations

For runtime/core changes, explicitly consider:

- allocation and disposal lifecycle;
- subscription cleanup and leak risk;
- batching and update semantics;
- deterministic ordering;
- tree-shaking and side-effect metadata;
- bundle-size impact;
- SSR and non-browser execution safety;
- type-level compatibility;
- framework-adapter isolation;
- diagnostics/observability impact;
- packed package contents and consumer behavior.

For React and TypeScript changes, apply the framework-edge rules in
`docs/governance/CODE_QUALITY_STANDARDS.md`: components and Hooks stay pure, external-store
subscriptions are lifecycle-safe, and strict types are not bypassed with broad assertions.

For adapter changes, core behavior remains the source of truth. Adapters translate lifecycle and integration semantics without duplicating domain rules.

For benchmark changes, document methodology, environment assumptions, warmup/repetition strategy, comparison scope, and limitations. Never present a benchmark as a universal claim.

## Duty Watch requirement

Every meaningful task must finish with an accurate handoff in `DUTY_WATCH.md`.

Update `PROJECT_STATE.md` when durable repository state, architecture, package maturity, validation surface, or roadmap status changes. Update RFCs, ADRs, roadmap, migration guidance, release notes, or reference documentation when applicable.

A task is incomplete if implementation is finished but validation, durable project state, or Duty Watch records are stale. If work is interrupted, record a `partial` handoff with the exact recovery steps and known validation state.

Never invent completed work, test outcomes, releases, versions, pull requests, milestones, benchmark results, or repository state.
