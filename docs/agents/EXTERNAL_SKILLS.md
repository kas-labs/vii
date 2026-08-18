# External Agent Skills

This repository carries editable copies of selected skills from
[`mattpocock/skills`](https://github.com/mattpocock/skills). The source repository declares the
MIT license. `skills-lock.json` records the selected source paths and content hashes; updates are
manual and must be reviewed before adoption.

## Adoption boundary

These files provide workflow guidance only. They do not expand the agent's repository, process,
network, credential, publication, or delegation authority, and project-owned `AGENTS.md`, RFC/ADR,
security, privacy, approval, branch, and validation rules remain authoritative.

The installed skills were reviewed for executable and external side effects:

- `grill-with-docs`, `grilling`, `grill-me`, `ask-matt`, and the engineering skills are treated as
  interview, planning, review, documentation, or implementation guidance;
- `claude-handoff` is manual-only because it shells out to an external Claude background process;
- `wizard` is manual-only because its template can open URLs and write `.env` values or GitHub
  secrets after explicit human input and confirmation;
- no skill is permitted to install dependencies, publish packages, weaken validation, or bypass
  repository approval rules implicitly.

## Local adaptation

`grill-with-docs` is intentionally model-invoked in this repository so the agent can select it before
ambiguous feature, product, or architecture work. `grill-me` remains user-invoked for work without a
repository. The routing policy and exceptions live in the task-routing section of `AGENTS.md`.

Future updates should re-run the extension review, inspect the complete diff, verify license and
content-hash changes, and confirm that manual-only side-effectful skills remain outside automatic
routing.

## External workflow references

The task-triage shape was reviewed in the public
[`applye` repository](https://github.com/vitala89/applye) and adapted into the project-owned
[`AGENT_TASK_TRIAGE_POLICY.md`](../governance/AGENT_TASK_TRIAGE_POLICY.md). Vii retains only the
workflow concepts needed here; the external repository is not a runtime dependency and does not
grant any additional tool, model, network, credential, or delegation capability.
