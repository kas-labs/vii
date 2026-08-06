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

## Acceptance criteria

- [ ] Behavior is implemented.
- [ ] Edge cases are documented.
- [ ] Runtime tests pass.
- [ ] Type tests pass where public types change.
- [ ] Lifecycle cleanup is tested where resources are owned.
- [ ] Packed consumer fixture passes where package behavior changes.
- [ ] Documentation is updated.
- [ ] Security and privacy impact is addressed.
- [ ] Compatibility impact is addressed.

## Required tests

List exact test groups and important cases.

## Security considerations

State whether the task handles untrusted input, filesystem access, process execution, network access, secrets, HTML, URLs, SSR data, plugins, or registry content.

## Compatibility considerations

State affected runtimes, frameworks, package managers, TypeScript versions, or module formats.

## Completion evidence

Record commands and fixtures used, for example:

```text
pnpm test core
pnpm typecheck
pnpm build
pnpm pack:check
Vanilla fixture passed
```

## Follow-up work

List deferred tasks without implementing them inside the current change.
