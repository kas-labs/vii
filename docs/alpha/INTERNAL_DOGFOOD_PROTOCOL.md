# Internal Vii Dogfood Protocol

Status: internal pre-alpha validation.

This protocol is for the Vii maintainers and internal dogfood consumers. It is
not an external alpha program and does not promise API stability, support, or
production readiness.

## Objective

Verify that the packed @vii-labs/core@next artifact works in the separate
Vanilla reference application:

    vii-reference-vanilla-onboarding

The gate is intentionally narrow. A passing reference application is evidence
that the published artifact can be installed and exercised in a real consumer.
It is not a release approval by itself.

## Clean-install procedure

Run this from a clean copy of the Vanilla reference application. Do not use a
workspace alias or a local Core tarball for this gate.

    pnpm remove @vii-labs/core
    pnpm add @vii-labs/core@next
    pnpm list @vii-labs/core

Record the resolved package version, application commit, operating system,
Node.js version, pnpm version, and browser version in the dogfood issue.

## Required checks

Run every check and record the result:

    pnpm test
    pnpm exec tsc --noEmit
    pnpm build
    pnpm dev

The development server must be opened in a browser for the smoke check. The
reference application passes only when all command checks and the browser check
pass.

## Browser smoke checklist

- Create the demo Scope.
- Run Increment and confirm count and doubled change.
- Run Batch +2 and confirm the trace contains a committed Batch event.
- Confirm the live event timeline and event counter update.
- Dispose the Scope and confirm the UI reports the disposed state.
- Create a fresh Scope and confirm the counter starts from zero.
- Clear the trace and confirm the timeline and event counter are empty.
- Export the trace and confirm the JSON preview and downloaded
  vii-trace.json contain the vii.trace protocol.

## Evidence and issue handling

Create an internal dogfood issue for each blocked or failed run. A successful
run may also use the template when a durable evidence record is useful.

Use .github/ISSUE_TEMPLATE/internal-dogfood.md. Keep the report structured:

- artifact and application identity;
- environment;
- exact commands and results;
- browser smoke result;
- failure or API-friction description;
- smallest reproduction or logs;
- follow-up recommendation.

Never attach secrets, credentials, tokens, private user data, or unsanitized
diagnostic traces. If a trace is needed, remove values and identifiers first.

## Decision rule

- pass: clean packed install, all command checks, and browser smoke pass;
- blocked: the environment or artifact cannot be installed or verified;
- fail: a reproducible command, type, build, runtime, or browser expectation
  fails.

This protocol records consumer evidence. Changes to Core behavior, public API,
release channels, security contracts, or package support still require the
normal RFC, review, and release gates.
