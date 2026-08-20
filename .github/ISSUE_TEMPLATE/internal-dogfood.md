---
name: Internal dogfood run
about: Record an internal packed Vii Core reference-app validation run
title: "[Dogfood] "
labels: "type: task, status: needs-triage"
assignees: ""
---

## Required checklist

- [ ] I used a clean copy of the Vanilla reference application.
- [ ] I installed the packed @vii-labs/core@next artifact, not a workspace alias or local tarball.
- [ ] I recorded the resolved Core version and application commit.
- [ ] I recorded the operating system, Node.js, pnpm, and browser versions.
- [ ] I ran pnpm test.
- [ ] I ran pnpm exec tsc --noEmit.
- [ ] I ran pnpm build.
- [ ] I ran the browser smoke checklist from docs/alpha/INTERNAL_DOGFOOD_PROTOCOL.md.
- [ ] I removed secrets, credentials, tokens, and private data from this report and any attachments.

## Outcome

- Result: pass / fail / blocked
- Core package version:
- Reference application commit:
- Operating system:
- Node.js:
- pnpm:
- Browser:

## Command results

Paste concise output or link to the relevant run:

    pnpm test:
    pnpm exec tsc --noEmit:
    pnpm build:

## Browser smoke result

- [ ] Scope creation worked.
- [ ] Increment updated State and Computed.
- [ ] Batch +2 updated the trace.
- [ ] Live timeline and counters updated.
- [ ] Scope disposal worked.
- [ ] Fresh Scope started from zero.
- [ ] Clear removed the timeline events.
- [ ] vii-trace.json exported and contained the vii.trace protocol.

## Findings

Describe the failure, unexpected behavior, API friction, or useful observation.
For failures, include the smallest reproduction and the expected versus actual
result. Do not attach unsanitized traces.

## Follow-up

- Recommended owner:
- Suggested next action:
- Related issue or pull request:
