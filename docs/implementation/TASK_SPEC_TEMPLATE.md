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
- architecture documents.

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

Examples
- examples/vue-counter

Release
- changelog entry
```

If the website is intentionally updated later, link the follow-up issue/task and explain why it is separate.

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
```

## Follow-up work

List deferred tasks without implementing them inside the current change.

Deferred public website/documentation work must have an explicit task rather than an informal TODO.
