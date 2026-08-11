# RFC 0022: Public Website and Documentation Lifecycle

Status: Proposed

## Summary

Vii should treat implementation, canonical repository documentation, public documentation, examples, website content, and release communication as connected product surfaces.

Every public feature task must explicitly assess its effect on those surfaces. AI agents and Intentloom workflows should proactively identify when a validated feature is mature enough to add or update on the public website.

## Motivation

Without a publication lifecycle, several failure modes become likely as Vii grows:

- implementation lands but public documentation remains stale;
- the website advertises capabilities that are not actually validated;
- new framework adapters or packages become difficult to discover;
- website updates become a manual afterthought;
- AI agents complete code tasks without considering public product surfaces;
- marketing copy and technical documentation drift apart;
- temporary deployment decisions become mistaken for architecture.

Vii already requires documentation updates as part of implementation work. This RFC makes the public website and public documentation impact explicit and machine-readable enough for future Intentloom workflows.

## Decision

Adopt a required `Website and docs impact` assessment for implementation tasks and pull requests.

The canonical lifecycle is:

```text
Implement
→ Validate
→ Classify public impact
→ Update canonical docs
→ Update public docs/examples
→ Update website when public value changes
→ Prepare release communication
→ Verify claims
→ Publish
```

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

Website copy may simplify, but it may not expand support claims beyond validated evidence.

## Agent behavior

Before completing a task, an agent must:

1. inspect whether the change is public or potentially public;
2. classify repository docs, public docs, website, examples, and release impact;
3. update required in-repository surfaces where allowed;
4. identify exact website pages/sections to update where applicable;
5. create or recommend an explicit follow-up when publication is intentionally separate;
6. report evidence for claims;
7. stop short of protected production deployment unless explicitly authorized.

When a feature becomes mature enough for public presentation, the agent should report:

```text
Public surface trigger detected.
This feature is now validated enough to add/update:
- documentation: <pages>
- website: <section/page>
- examples: <examples>
- release communication: <entry>
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
- validation evidence.

Intentloom may suggest or prepare tasks, but deterministic evidence and normal human authority remain required for support claims and protected publication actions.

## Figma and design system

Figma may remain the primary visual design reference for the Vii/Kas Labs website.

The public website implementation should reuse approved visual tokens and components where practical.

Figma does not define:

- package/API behavior;
- support status;
- compatibility guarantees;
- runtime architecture;
- security guarantees.

Those remain grounded in repository evidence.

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

### Generate all website content automatically from source code

Rejected as a complete solution. Some API reference can be generated, but product explanations, limitations, examples, migrations, evidence, and roadmap status require curated context and validation.

## Consequences

Positive:

- public feature work becomes discoverable;
- documentation and website drift is visible;
- agents can proactively surface publication work;
- unsupported marketing claims are less likely;
- future Intentloom automation has a clear contract;
- website work can remain separate from runtime architecture.

Costs:

- every meaningful feature task gains a small impact-assessment step;
- separate website repositories require linked task tracking;
- public launch work may add review overhead.

These costs are accepted because they reduce long-term ecosystem drift.

## Validation

This policy is working when:

- feature PRs consistently include website/docs impact;
- new public capabilities have discoverable docs and website coverage;
- website claims link back to validated support status;
- agents reliably identify publication triggers without inventing support;
- separate website follow-ups are explicit and traceable;
- temporary domain changes do not require changes to Vii runtime packages.
