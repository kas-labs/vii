# RFC 0022: Public Website, Documentation, and Claude Design Lifecycle

Status: Proposed

## Summary

Vii should treat implementation, canonical repository documentation, public documentation, examples, website content, release communication, and design handoff as connected product surfaces.

Every public feature task must explicitly assess its effect on those surfaces. AI agents and Intentloom workflows should proactively identify when a validated feature is mature enough to add or update on the public website.

Claude Design is the design authoring source for visual website surfaces. Approved design work must move into the Vii codebase through an explicit export/handoff and repository-import step before it is treated as implemented product UI.

## Motivation

Without a publication and design-handoff lifecycle, several failure modes become likely as Vii grows:

- implementation lands but public documentation remains stale;
- the website advertises capabilities that are not actually validated;
- new framework adapters or packages become difficult to discover;
- website updates become a manual afterthought;
- AI agents complete code tasks without considering public product surfaces;
- design work and implementation drift apart;
- an exported design is mistaken for completed implementation;
- marketing copy and technical documentation drift apart;
- temporary deployment decisions become mistaken for architecture.

Vii already requires documentation updates as part of implementation work. This RFC makes public website, public documentation, and Claude Design handoff impact explicit and machine-readable enough for future Intentloom workflows.

## Decision

Adopt a required `Website and docs impact` assessment for implementation tasks and pull requests, plus a Claude Design handoff assessment when visual website work is involved.

The canonical lifecycle is:

```text
Implement
→ Validate
→ Classify public impact
→ Update canonical docs
→ Update public docs/examples
→ Assess Claude Design impact
→ Approve design
→ Export / hand off
→ Import into repository
→ Implement and validate visual surface
→ Update website when public value changes
→ Prepare release communication
→ Verify claims
→ Publish
```

For a website-only visual task where product behavior is already validated, the visual subsection may begin at `Assess Claude Design impact`, but publication still requires repository implementation and review.

## Required classification

Tasks should report:

```text
Website and docs impact
- Repository docs: required | not required
- Public docs: required | not required
- Website: required now | follow-up | not required
- Examples: required | not required
- Changelog/release notes: required | not required
- Reason: ...
```

Visual website tasks should additionally report:

```text
Claude Design reference:
Design status: missing | draft | approved
Export status: not-needed | pending | exported
Repository import status: not-needed | pending | imported
Implementation validation: pending | passed
```

A linked follow-up is valid when website work belongs to a separate repository/deployment boundary or when launch timing intentionally differs from implementation timing.

An untracked statement such as `update website later` is not sufficient.

## Website update triggers

An agent should recommend a website update when a validated change materially affects what Vii can accurately present to users.

Examples:

- new package or product-module release;
- new framework adapter;
- new runtime/platform support level;
- new public API family;
- major Devtools/UI capability;
- meaningful installation or developer-experience improvement;
- reproducible benchmark result;
- security/privacy capability important to product positioning;
- migration path;
- roadmap/status promotion that is intentionally public.

Internal refactors, test-only work, implementation detail changes, and unvalidated Research work normally do not require a website update.

## Technical source of truth

The public website is not authoritative for technical behavior.

Precedence remains:

```text
accepted RFCs and ADRs
→ implementation contracts and tests
→ package/version support metadata
→ canonical repository documentation
→ generated public documentation
→ website summaries
```

Claude Design is authoritative only for approved visual design intent within its scope. It does not define package/API behavior, support status, compatibility guarantees, runtime architecture, security guarantees, or release maturity.

Website copy may simplify, but it may not expand support claims beyond validated evidence.

## Claude Design contract

Claude Design is the visual design authoring source for Vii website surfaces.

It may define:

- layout;
- typography;
- spacing;
- visual hierarchy;
- component states;
- interaction behavior;
- responsive states;
- light and dark themes;
- tokens and brand assets;
- prototypes.

Approved design output must move through an explicit handoff:

```text
Claude Design
→ review / approval
→ export or handoff
→ repository import
→ implementation
→ accessibility and responsive validation
→ website review
```

Repository implementation must consume reviewable artifacts. Live Claude Design access is not a runtime requirement.

A Claude Design project, prototype, screenshot, or export is not implementation-support evidence by itself.

Agents must not invent missing visual values when an approved Claude Design source exists but is unavailable. They should report the missing design dependency and defer or stop the affected visual work.

If design and implementation disagree, the discrepancy must be reviewed explicitly rather than silently resolved in favor of either side.

## Agent behavior

Before completing a task, an agent must:

1. inspect whether the change is public or potentially public;
2. classify repository docs, public docs, website, examples, and release impact;
3. assess Claude Design impact when a visual surface changes;
4. update required in-repository surfaces where allowed;
5. identify exact website pages/sections to update where applicable;
6. identify design, export, and repository-import state where applicable;
7. create or recommend an explicit follow-up when publication or design handoff is intentionally separate;
8. report evidence for claims;
9. stop short of protected production deployment unless explicitly authorized.

When a feature becomes mature enough for public presentation, the agent should report:

```text
Public surface trigger detected.
This feature is now validated enough to add/update:
- documentation: <pages>
- website: <section/page>
- examples: <examples>
- release communication: <entry>
- Claude Design: existing approved design | new design required | export/import pending
```

## Intentloom integration

Intentloom may represent this policy in future Vii project context and use repository evidence to assist classification.

Possible inputs include:

- changed packages;
- public exports;
- stability level;
- compatibility metadata;
- roadmap status;
- changelog entries;
- documentation paths;
- labels/task metadata;
- validation evidence;
- Claude Design reference and handoff metadata for visual surfaces.

Intentloom may suggest or prepare tasks, but deterministic evidence and normal human authority remain required for support claims and protected publication actions.

It may not fabricate design state, invent missing visual design, or treat an unreviewed export as implementation.

## Domain boundary

The initial website may use a temporary or organization-owned domain before a dedicated Vii domain is chosen.

The domain is a deployment concern, not an architecture dependency. Product URLs and deployment configuration should be replaceable without changing Vii package semantics.

## Alternatives considered

### Documentation-only completion

Rejected as insufficient because public discoverability and product communication would still drift from implementation.

### Update the website for every code change

Rejected because it creates noise and couples internal implementation detail to public presentation.

### Let agents decide informally

Rejected because inconsistent agent behavior would recreate the same drift this RFC is intended to prevent.

### Treat Claude Design export as implementation

Rejected because exported design artifacts still require repository import, integration, validation, accessibility review, responsive checks, and normal engineering review.

### Generate all website content automatically from source code

Rejected as a complete solution. Some API reference can be generated, but product explanations, limitations, examples, migrations, evidence, roadmap status, and visual implementation require curated context and validation.

## Consequences

Positive:

- public feature work becomes discoverable;
- documentation and website drift is visible;
- design-to-code handoff becomes explicit and auditable;
- agents can proactively surface publication and design work;
- unsupported marketing claims are less likely;
- future Intentloom automation has a clear contract;
- website work can remain separate from runtime architecture.

Costs:

- every meaningful feature task gains a small impact-assessment step;
- visual tasks gain explicit design/export/import status tracking;
- separate website repositories require linked task tracking;
- public launch work may add review overhead.

These costs are accepted because they reduce long-term ecosystem and design drift.

## Validation

This policy is working when:

- feature PRs consistently include website/docs impact;
- visual website PRs record Claude Design handoff state;
- new public capabilities have discoverable docs and website coverage;
- website claims link back to validated support status;
- approved visual design is traceable to imported repository artifacts;
- agents reliably identify publication triggers without inventing support or design;
- separate website follow-ups are explicit and traceable;
- temporary domain changes do not require changes to Vii runtime packages.
