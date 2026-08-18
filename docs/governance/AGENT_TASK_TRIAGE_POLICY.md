# Agent Task Triage Policy

Status: Active project guidance

## Purpose

Every non-trivial Vii task starts with a small, inspectable preflight. The preflight chooses the
smallest honest workflow, makes uncertainty visible, and gives the maintainer a chance to challenge
the route before mutation. It is a routing contract, not a model-quality promise and not a
permission grant.

This policy is a Vii adaptation of the task-triage workflow in the public
[`applye` repository](https://github.com/vitala89/applye), especially its `AGENTS.md`,
`docs/ai/model-policy.md`, and Cursor triage rule. The Vii policy is authoritative for this
repository and keeps Vii's own approval, RFC/ADR, security, privacy, branch, and validation rules.

## When it runs

Run triage before implementation or before proposing the next work item for any non-trivial task.
It may be skipped for a direct answer, a one-word confirmation, or an unchanged-scope continuation.
If the scope changes, say `re-triage` and print a fresh verdict.

For Codex, `AGENTS.md` is the project entrypoint and is read per session. The preflight is therefore
the required session workflow; do not claim that the repository provides a verified per-prompt hook.
Apply it again when a new task changes scope inside the same session.

## Scoring

Score five axes from 0 to 2 and report every digit, not only the total:

| Axis | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Blast radius | one file or text only | 2–5 files | 6+ files, a public API, schema, or boundary |
| Ambiguity | one honest reading | small gaps with safe defaults | materially different honest readings |
| Risk | no meaningful risk | user-visible behavior | privacy, security, migration, or outward-facing effect |
| Verification | nothing to run | focused lint, type-check, or tests | full validation, benchmark, or manual walkthrough |
| Unknowns | area and paths known | a few targeted reads | the repository area needs mapping before planning |

The total selects a role and effort, not a specific model name:

| Total | Model role | Effort | Delegation ceiling |
| --- | --- | --- | --- |
| 0–2 | cheapest | low | none |
| 3–4 | mid | medium | none |
| 5–6 | mid | high | one read-only scout |
| 7–8 | frontier | high | read-only scout and reviewer |
| 9–10 | frontier | highest | decision gate, then read-only scout and reviewer |

These are routing roles. The agent must report a model name only when the current harness exposes
and verifies it. Codex chooses its model at launch, so a task cannot silently switch the main model
from inside the session.

## Required verdict

Print this block before implementation or a substantive next-step recommendation:

```text
Triage <total>/10 (radius <0-2> · ambiguity <0-2> · risk <0-2> · verify <0-2> · unknowns <0-2>)
Harness: Codex · Model: <verified name or unknown> · Effort: <level or role>
Delegation: <none, or bounded read-only plan> · Grilling: <yes/no> · Skills: <short list>
Context/load code: <named files, symbols, or documents to read>
Approval: <not required / confirm plan / explicit mutation approval>
Budget: <bounded estimate or context budget> · Stop when: <observable condition>
```

Follow it with one sentence naming the smallest change the maintainer could make that would lower
the score. Never present a guessed model, budget, or delegation capability as a verified fact.

## Routing rules

- A clear, bounded edit with accepted behavior takes the direct implementation path; use `tdd` when
  a behavior change benefits from red-green evidence.
- A new feature, product idea, architecture change, or design with unsettled behavior, constraints,
  or trade-offs uses `grill-with-docs` before the plan hardens. It may invoke `grilling` and
  `domain-modeling`, and it must wait for shared understanding before editing.
- An observed bug, regression, failure, flake, or slowdown starts with `diagnosing-bugs` or
  `aif-debugger`. Add `grill-with-docs` only when expected behavior, scope, or architecture is
  unresolved.
- An external skill, plugin, MCP server, or workflow pack requires `aif-extension-review` before
  its instructions become trusted or active.
- Security, privacy, public API, package-boundary, schema, migration, compatibility, or release
  work adds the applicable specialist review and follows the RFC/ADR and approval rules.
- Before commit or pull request, use `aif-verification-gate` and review the complete diff. A plan,
  grilling transcript, or delegated report is not implementation evidence.

The repository's `aif-task-router` selects the route and skills. It does not select a model, grant
authority, or replace this triage policy.

## Delegation and confirmation

Delegation is opt-in. The default is `Delegation: none`; the main Codex session remains the
conductor and owns framing, context selection, edits, verification, and the final report.

Delegated work, when explicitly requested or separately approved, is limited to a named read-only
scout or reviewer with bounded paths, commands, and output. Do not create a generic implementer,
fan out automatically, or let a delegated agent commit, publish, merge, change policy, or approve
its own privileged action.

Triage does not equal approval. Read-only inspection and a clearly authorized low-risk edit may
continue without an extra confirmation. Present the plan and wait for confirmation before mutation
when the route changes a public API, package boundary, schema, privacy or security posture,
architecture, publication/release behavior, or any capability not already authorized by the task.
Silence is not approval.

## Stop conditions

Stop before mutation when required context is missing or stale, authoritative documents conflict,
the requested authority is absent, a material product decision is unresolved, the applicable gate
cannot be run, or rollback is not possible for a high-risk action. Report the blocker and the exact
next safe action. A safe stop is a successful policy outcome, not a failed task.
