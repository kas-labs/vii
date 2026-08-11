# Public Website and Documentation Lifecycle

Status: Proposed operating policy

## Purpose

Vii public work must evolve as one product surface rather than as disconnected code, repository documentation, and marketing pages.

When a feature becomes public, changes to the implementation should trigger an explicit assessment of whether the public website, documentation, examples, release notes, or feature overview must also change.

This policy applies to humans, AI agents, Intentloom workflows, and future repository automation.

## Product surfaces

Vii currently distinguishes these surfaces:

1. **Implementation**: packages, runtime behavior, adapters, CLI, UI, tooling, tests, and fixtures.
2. **Repository documentation**: architecture, RFCs, ADRs, implementation guides, security, compatibility, and roadmap.
3. **Public documentation**: user-facing guides, API references, examples, migration guides, tutorials, and troubleshooting.
4. **Public website**: landing pages, ecosystem overview, feature pages, release highlights, benchmarks, compatibility information, and links to documentation.
5. **Release communication**: changelog, release notes, upgrade notes, and public support status.

A change may affect one or more surfaces. The agent must assess all five rather than assuming a code change is complete when tests pass.

## Domain and deployment boundary

The initial public website may be hosted on the project owner's current domain while Vii's long-term product domain is decided.

The website architecture must not hard-code product semantics, package behavior, canonical documentation URLs, or application logic to one temporary domain.

Domain changes should be deployment/configuration changes, not framework architecture changes.

The current intended initial host should be recorded in deployment configuration once the website repository or application exists. Until then, documentation should refer to the Vii public website generically rather than treating a temporary domain as an architectural contract.

## Source of truth

The website is not the source of technical truth.

For technical behavior, precedence remains:

```text
accepted RFCs and ADRs
→ implementation contracts and tests
→ current package/version support metadata
→ repository documentation
→ generated public documentation
→ website summaries and marketing copy
```

The website may simplify technical content, but it must not claim support that is absent from implementation evidence.

## Feature publication lifecycle

For every public or potentially public feature, use:

```text
Implement
→ Validate
→ Classify public impact
→ Update canonical docs
→ Update examples/API reference
→ Update website when public value changes
→ Prepare release communication
→ Verify links and claims
→ Publish
```

### 1. Implement

Implement the smallest approved behavior and preserve existing architecture boundaries.

### 2. Validate

Collect deterministic evidence appropriate to the feature:

- tests;
- type checks;
- packed consumer fixtures;
- accessibility checks;
- compatibility checks;
- performance measurements;
- security validation;
- screenshots or traces where useful.

### 3. Classify public impact

Every task must answer:

```text
Does this change alter something a user can discover, install, configure,
call, observe, migrate to, compare, or depend on?
```

If **no**, record `Public surface impact: none` with a short reason.

If **yes**, identify affected surfaces explicitly.

### 4. Update canonical documentation

Update the repository documentation that defines or constrains the feature before changing marketing copy.

Examples include:

- package README;
- architecture document;
- API contract;
- RFC/ADR reference;
- compatibility notes;
- migration guide;
- security limitations;
- performance methodology.

### 5. Update public documentation

A public feature normally requires at least one user-facing artifact:

- overview;
- installation/configuration guide;
- API reference;
- practical example;
- limitations/non-goals;
- compatibility status;
- troubleshooting guidance where the feature can fail in non-obvious ways.

Examples should prefer runnable or validated code over illustrative pseudo-APIs.

### 6. Update the website

A website update is required when the change materially affects what Vii can publicly present.

Typical triggers:

- a new stable or preview package;
- a new ecosystem capability;
- a major feature or integration;
- a meaningful developer-experience improvement;
- a new supported framework/runtime/platform;
- a benchmark or performance claim backed by reproducible evidence;
- a major migration path;
- a new Devtools or UI capability;
- a security/privacy feature important to product positioning;
- a milestone promoted from Research to Planned, Preview, or Stable where public communication is appropriate.

The website does not need a new section for every internal refactor, test improvement, implementation detail, or experimental branch.

### 7. Prepare release communication

When release policy requires it, prepare:

- changelog entry;
- release note;
- breaking-change notice;
- migration note;
- package-version/support status.

### 8. Verify claims

Before publication, verify that public wording matches actual evidence.

Do not publish claims such as:

- "supports Vue";
- "zero dependencies";
- "SSR safe";
- "faster than X";
- "production ready";
- "accessible";
- "works on Bun/Deno";

unless the relevant support level and validation exist.

## Agent website-impact assessment

Before completing a feature task, an agent must report a `Website and docs impact` section.

Use this shape:

```text
Website and docs impact
- Repository docs: required | not required
- Public docs: required | not required
- Website: required now | follow-up | not required
- Examples: required | not required
- Changelog/release notes: required | not required
- Reason: ...
```

The agent must not silently decide that a public feature requires no documentation.

## Agent recommendation trigger

An agent should proactively say that it is time to update the website when all of the following are true:

1. the feature has implementation evidence;
2. its public status allows it to be discussed accurately;
3. it changes a meaningful user-facing capability or ecosystem story;
4. the public website does not currently describe that capability, or its description is stale.

Recommended report wording:

```text
Public surface trigger detected.
This feature is now validated enough to add/update:
- documentation: <pages>
- website: <section/page>
- examples: <examples>
- release communication: <entry>
```

The agent may prepare the content and implementation plan, but protected publication/deployment actions still follow normal approval rules.

## Website task classes

### Documentation sync

Use when public APIs or behavior changed but the product positioning did not.

Examples:

- API reference update;
- new option;
- migration note;
- corrected example.

### Feature publication

Use when a new capability should become discoverable on the website.

Examples:

- Vii State Alpha;
- Vue adapter Preview;
- Vii Query Alpha;
- Devtools inspector;
- UI registry release.

### Ecosystem update

Use when the relationship between Vii packages or supported platforms changes.

Examples:

- new framework adapter;
- desktop integration;
- server foundation release;
- new official tooling integration.

### Evidence publication

Use when benchmarks, security guarantees, compatibility results, or case studies become publishable.

Evidence pages must link to methodology or reproducible artifacts where practical.

## Website content model

The public Vii website should be able to grow around these stable content categories:

```text
Home
Ecosystem
Docs
API Reference
Examples
Guides
Releases
Compatibility
Benchmarks
Security & Privacy
Roadmap
Contributing
```

Not every category must exist on day one.

The website should grow when implementation evidence requires a new surface, not because an empty navigation item was planned years in advance.

## Figma and design-system relationship

Figma defines intended visual design and interaction references.

The repository defines implementation and technical truth.

When the website is implemented, reusable visual primitives should follow the approved design system and tokens rather than creating an unrelated website-only component language.

However:

- Figma is not the source of runtime/API truth;
- website copy must not be generated from mockups alone;
- design updates do not automatically change public support status;
- technical examples must be validated independently from visual design.

## Same-PR versus follow-up rule

Prefer the same PR when:

- documentation is small and directly coupled to the feature;
- examples are required to understand the API;
- a stale website claim would be incorrect after merge.

Use a linked follow-up task when:

- the website lives in a different deployment/repository boundary;
- launch timing is intentionally separate;
- the feature is implemented but not yet ready for public announcement;
- visual/content work is substantial and would make the implementation PR unsafe or hard to review.

A follow-up must be explicit. "Update website later" without an issue/task is not sufficient.

## Intentloom integration

Intentloom may provide this lifecycle as repository policy and task context.

A future Vii profile may automatically assess changed files and suggest public-surface work based on:

- affected packages;
- stability changes;
- public exports;
- changelog metadata;
- documentation paths;
- compatibility changes;
- roadmap status;
- labels or task metadata.

Intentloom may propose or create approved tasks, but it must not fabricate support claims or publish content without required authority.

## Example

A Vue adapter reaches Preview with passing compliance fixtures.

The implementation task should trigger:

```text
Repository docs
- update adapter architecture/status
- document supported Vue version range

Public docs
- add Vue installation guide
- add store integration example
- add SSR limitations if any

Website
- add Vue to the framework integration overview
- add or update ecosystem feature card

Release
- changelog/release note

Evidence
- link adapter compliance results
```

An internal refactor of the same adapter with no public behavior change would normally report:

```text
Website: not required
Public docs: not required
Reason: no public API, support, compatibility, or user-visible behavior changed
```

## Non-goals

This policy does not:

- require marketing work for every commit;
- make the website the technical source of truth;
- force website code into Vii runtime packages;
- require one deployment technology or domain forever;
- allow an agent to publish unsupported claims;
- bypass human approval for protected deployment or release operations.
