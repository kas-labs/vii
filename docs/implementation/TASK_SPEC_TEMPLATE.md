# Implementation Task Template

Use this template for GitHub issues, agent instructions, or implementation plans.

## Goal

Describe the observable outcome, not only the file to edit.

## Why

Explain the current problem and which roadmap milestone it supports.

## In scope

- behavior to implement;
- packages or files allowed to change;
- expected public or internal API.

## Out of scope

- related work intentionally deferred;
- future abstractions that must not be added.

## Dependencies

- prerequisite tasks;
- relevant RFCs;
- relevant ADRs;
- architecture documents;
- Claude Design project/export references when visual website work is involved.

## Proposed example

```ts
// Small illustrative usage, not a complete implementation.
```

## Public surface impact

Classify the expected documentation and website impact before implementation:

```text
Repository docs: required | not required
Public docs: required | not required
Website: required now | follow-up | not required
Examples: required | not required
Changelog/release notes: required | not required
Reason: ...
```

If the task introduces or promotes a public feature, integration, package, framework adapter, runtime/platform support level, benchmark claim, migration path, or major developer-experience capability, identify the expected public page or follow-up task.

Do not use `not required` merely because website work is inconvenient or lives in another repository.

## Claude Design impact

For visual website work, record:

```text
Claude Design reference:
Design status: missing | draft | approved
Export status: not-needed | pending | exported
Repository import status: not-needed | pending | imported
Implementation validation: pending | passed
```

State whether the task:

- uses an existing approved Claude Design surface;
- requires a new or updated design state;
- requires export/handoff into the repository;
- changes shared website tokens/components;
- has no visual design impact.

Do not invent visual values when an approved Claude Design source exists but is unavailable. Record the missing dependency and defer or stop the affected visual work.

## Acceptance criteria

- [ ] Behavior is implemented.
- [ ] Edge cases are documented.
- [ ] Runtime tests pass.
- [ ] Type tests pass where public types change.
- [ ] Lifecycle cleanup is tested where resources are owned.
- [ ] Packed consumer fixture passes where package behavior changes.
- [ ] Repository documentation is updated when required.
- [ ] Public documentation/examples are updated or linked as explicit follow-up work when required.
- [ ] Website impact is assessed and the required update is included or tracked explicitly.
- [ ] Claude Design handoff state is recorded when visual website work is involved.
- [ ] Imported design artifacts are reviewable in the repository before being treated as implemented.
- [ ] Changelog/release-note impact is assessed.
- [ ] Security and privacy impact is addressed.
- [ ] Compatibility impact is addressed.

## Required tests

List exact test groups and important cases.

## Security considerations

State whether the task handles untrusted input, filesystem access, process execution, network access, secrets, HTML, URLs, SSR data, plugins, or registry content.

## Compatibility considerations

State affected runtimes, frameworks, package managers, TypeScript versions, or module formats.

## Website and documentation plan

When public surface impact is not `none`, list exact intended updates, for example:

```text
Docs
- guides/vue.md
- api/store.md

Website
- Ecosystem > Framework integrations > Vue
- Home feature card: no change

Claude Design
- integration card: approved
- export: pending
- repository import: pending

Examples
- examples/vue-counter

Release
- changelog entry
```

If the website or Claude Design work is intentionally updated later, link the follow-up issue/task and explain why it is separate.

## Completion evidence

Record commands and fixtures used, for example:

```text
pnpm test core
pnpm typecheck
pnpm build
pnpm pack:check
Vanilla fixture passed
```

Also record the final public-surface decision:

```text
Website and docs impact
- Repository docs: updated
- Public docs: updated
- Website: follow-up #123
- Examples: validated
- Changelog: prepared

Claude Design
- Design: approved
- Export: exported
- Repository import: imported
- Implementation validation: passed
```

## Follow-up work

List deferred tasks without implementing them inside the current change.

Deferred public website/documentation or Claude Design export/import work must have an explicit task rather than an informal TODO.
