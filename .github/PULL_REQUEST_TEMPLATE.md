## Summary

Describe the problem, the chosen approach, and the observable outcome.

## Related work

- Issue:
- RFC:
- ADR:
- Roadmap phase or milestone:

## Change type

- [ ] Documentation only
- [ ] Internal refactor
- [ ] Bug fix
- [ ] New experimental API
- [ ] Public API change
- [ ] Tooling or CI
- [ ] Performance-related change
- [ ] Security/privacy-related change
- [ ] Website or public documentation
- [ ] Claude Design / design-system related

## Validation

List the exact commands and evidence used to validate this change. Do not claim a check passed unless it was run.

```text
pnpm ...
```

- [ ] Relevant focused tests pass
- [ ] `pnpm validate` passes when implementation changed
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Package build passes
- [ ] Packed-artifact validation passes when applicable
- [ ] Consumer fixture passes when applicable
- [ ] Framework/runtime compliance tests pass when applicable
- [ ] `git diff --check` passes locally when available

## Architecture and maintainability

Describe:

- affected package/module boundary;
- intended dependency direction;
- whether core remains framework/platform neutral;
- whether files/functions exceed quality budgets;
- decomposition performed or intentionally deferred;
- any code-quality exception, responsible area, and review trigger.

```text
Production file >250 lines: yes | no
Production file >300 lines: yes | no
New/substantially expanded production file >400 lines: yes | no
Function >40 lines: yes | no
Function >80 lines: yes | no
Exception required: yes | no
Reason / follow-up:
```

## Runtime, compatibility, and package impact

Describe public API, framework, runtime, package-manager, type-level, package-export, SSR, migration, or compatibility implications.

```text
Public API: changed | unchanged
Compatibility: changed | unchanged
Bundle/tree-shaking: improved | regressed | unchanged | not measured
Memory/disposal: improved | regressed | unchanged | not applicable | not measured
SSR/non-browser safety: changed | unchanged | not applicable
Diagnostics overhead: changed | unchanged | not applicable
Packed artifact impact: changed | unchanged | not applicable
Migration required: yes | no
```

Performance, bundle, or memory claims must include reproducible evidence or be described as unverified hypotheses.

## Security and privacy

Describe changes to permissions, diagnostics, data handling, registry content, dependencies, network behavior, telemetry, or supply-chain behavior. Write `None identified` when applicable.

- [ ] No hidden telemetry or network access was introduced.
- [ ] New runtime dependencies are explicitly justified.
- [ ] No secrets, private source code, or personal data are included.

## Documentation and durable state

- [ ] Public behavior is documented
- [ ] Relevant architecture/RFC/ADR documents are updated
- [ ] Migration notes are included when required
- [ ] `PROJECT_STATE.md` is updated when durable state changed
- [ ] `DUTY_WATCH.md` contains an accurate task handoff
- [ ] No additional documentation change is required

## Website and docs impact

```text
Repository docs: updated | follow-up | not required
Public docs: updated | follow-up | not required
Website: updated | follow-up | not required
Examples: updated | not required
Changelog/release notes: prepared | not required
Reason:
```

Use `docs/website/PUBLIC_WEBSITE_AND_DOCUMENTATION_LIFECYCLE.md` for classification.

## Claude Design impact

For visual website work:

```text
Claude Design reference:
Design status: missing | draft | approved | not-needed
Export status: pending | exported | not-needed
Repository import status: pending | imported | not-needed
Implementation validation: pending | passed | not-needed
```

- [ ] Existing approved Claude Design output is sufficient
- [ ] New or updated Claude Design work is required
- [ ] Export/handoff is required
- [ ] Exported artifacts are imported and reviewable in the repository
- [ ] No visual design impact

## Authorship and delivery checklist

- [ ] Branch follows `<type>/<short-kebab-description>` and has no actor/tool/model prefix.
- [ ] Commits are atomic and use Conventional Commit subjects.
- [ ] Commit messages contain no `Co-Authored-By` trailer for an assistant, model, agent, tool, or bot.
- [ ] PR title/body contain no generated-by or tool/AI attribution.
- [ ] The change is focused and reviewable.
- [ ] I understand the submitted code, including AI-assisted code.
- [ ] New dependencies are justified.
- [ ] Research or experimental work is not presented as stable support.
- [ ] Website claims do not exceed current implementation and validation evidence.
- [ ] New visual values are not invented when approved Claude Design context is required.
- [ ] Claude Design output is not treated as implementation evidence by itself.
