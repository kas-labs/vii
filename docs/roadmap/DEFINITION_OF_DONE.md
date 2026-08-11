# Definition of Done

A Vii work item is complete only when the relevant criteria below are satisfied.

## Product and architecture

- the behavior matches accepted RFCs and ADRs;
- scope and non-goals remain respected;
- public terminology is consistent with the documentation;
- new architecture decisions are recorded.

## Implementation

- code is understandable and maintains package boundaries;
- no unnecessary runtime, framework, or platform dependency is introduced;
- errors use documented categories and codes where applicable;
- resources have explicit ownership and cleanup.

## Testing

- behavioral tests cover the change;
- regression tests exist for corrected defects;
- adapter or runtime contract tests are updated where applicable;
- clean consumer fixtures pass;
- memory, SSR isolation, accessibility, or security tests are included when relevant.

## Performance

- the change does not exceed established budgets without an accepted exception;
- bundle, execution, memory, diagnostics, and type-check impact are considered;
- benchmark claims include reproducible context.

## Documentation and public surface

- public APIs and behavior are documented;
- limitations and non-goals are visible;
- migration notes exist for breaking changes;
- examples compile against packed artifacts where practical;
- repository documentation impact is assessed;
- public documentation and examples impact is assessed;
- website impact is classified as `required now`, `follow-up`, or `not required` with a reason;
- a validated public feature is added to or updated on the website when it materially changes the public Vii ecosystem story;
- separate website work is represented by an explicit linked task rather than an informal reminder;
- public claims match implementation evidence, compatibility status, and roadmap maturity;
- the website is not used as a substitute for canonical technical documentation.

See `docs/website/PUBLIC_WEBSITE_AND_DOCUMENTATION_LIFECYCLE.md`.

## Packaging and release

- package exports and declarations are correct;
- package contents are validated;
- stability level is accurate;
- changelog or release note entry is prepared when required;
- provenance and publication checks follow release policy.

## Security and privacy

- no telemetry or external transfer is introduced silently;
- secrets and state values are not exposed by default;
- new capabilities require explicit permission;
- dependencies and generated files are reviewed.

## Review evidence

A pull request should show:

- what changed;
- why it changed;
- how it was validated;
- known limitations;
- compatibility impact;
- website and documentation impact;
- screenshots or traces only when they add useful evidence.

For public feature work, the PR should include a section such as:

```text
Website and docs impact
- Repository docs: updated | not required
- Public docs: updated | follow-up | not required
- Website: updated | follow-up | not required
- Examples: updated | not required
- Changelog/release notes: prepared | not required
- Reason: ...
```

## Documentation-only work

Documentation work is complete when:

- it matches the current accepted design;
- links and navigation are valid;
- examples are internally consistent;
- unresolved items are marked rather than presented as settled;
- follow-up implementation work is identifiable.

## Website-only work

Website work is complete when:

- feature/support claims can be traced to current implementation evidence;
- technical terminology matches canonical repository documentation;
- links to guides, API reference, compatibility, security, or benchmark evidence are valid where applicable;
- temporary deployment domains are not treated as architecture contracts;
- design follows the approved Vii/Kas Labs visual system without inventing conflicting runtime semantics;
- protected production deployment still follows normal approval rules.
