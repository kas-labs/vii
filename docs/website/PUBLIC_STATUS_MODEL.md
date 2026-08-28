# Vii Public Status Model

Status: Accepted for D1
Scope: public website, user documentation, ecosystem/status/roadmap surfaces

## 1. Purpose

This document defines the single public maturity vocabulary used by `viijs.org`.

The model separates maturity from availability so the website can describe Vii honestly while the ecosystem is still evolving.

A capability may be architecturally mature enough to describe while not yet being published as a package. Conversely, an available package may still be experimental.

## 2. Maturity statuses

The allowed public maturity statuses are:

```text
Stable
Experimental
In Development
Research Accepted
Research
Planned
Vision
Deprecated
```

No website page may invent synonyms such as `Preview`, `Coming Soon`, `Beta-ish`, `Available`, or custom color-only labels as independent maturity states.

Marketing copy may use ordinary language, but structured status UI must map to this taxonomy.

## 3. Stable

Use `Stable` when a capability has an established supported public contract and is intended for normal production use within its documented support policy.

Stable implies:

- public contract is intentionally supported;
- release/support policy exists;
- compatibility expectations are documented;
- breaking changes follow the project's release governance.

Stable does not mean bug-free or immutable.

## 4. Experimental

Use `Experimental` when a capability is implemented and sufficiently real to use/test, but the public contract may still change materially.

Experimental should communicate:

- implementation exists;
- behavior is backed by repository evidence;
- use is intentionally pre-stable;
- breaking changes remain possible;
- adoption should consider the documented maturity caveats.

## 5. In Development

Use `In Development` when production implementation is actively being built but is not yet ready to be represented as an established experimental public capability.

This status may cover private packages or partial production slices.

The website must not imply normal installation merely because implementation exists in the repository.

## 6. Research Accepted

Use `Research Accepted` when a research track has completed its defined graduation/decision process and an architectural direction has been accepted, but production implementation is not yet complete or available.

This status is deliberately distinct from `Research`.

It means:

- the project has accepted a direction;
- research evidence exists;
- production work may still be deferred;
- no installable package is implied.

## 7. Research

Use `Research` when a capability or architectural direction is actively being investigated and has not yet graduated into an accepted production direction.

Research content must avoid product promises.

## 8. Planned

Use `Planned` when the project intends to pursue a capability or major work area but active research or production implementation is not yet the current state.

Planned is directional, not a release-date guarantee.

## 9. Vision

Use `Vision` for long-horizon ecosystem direction that explains strategic intent without committing to implementation timing or final architecture.

Vision content must not be presented as a promised feature.

## 10. Deprecated

Use `Deprecated` when a previously supported or usable public capability remains visible for migration/history purposes but should no longer be selected for new work.

A deprecated capability should provide replacement/migration guidance where practical.

## 11. Availability is separate

`Available` is not a maturity status.

Public capability metadata must represent availability separately.

Recommended availability values:

```text
public
private
repository-only
not-implemented
retired
```

### public

A supported distribution mechanism exists for external users according to the documented release channel.

### private

Implementation/package exists but is intentionally private and is not a normal public install target.

### repository-only

The capability exists as source/evidence/examples in the repository but has no supported external package distribution.

### not-implemented

The capability is research/planned/vision only or production implementation has not started.

### retired

The capability is no longer distributed for normal use.

## 12. Capability metadata contract

The future website should consume a central structured capability registry rather than hardcoding status facts independently across pages.

Conceptual schema:

```ts
interface PublicCapabilityStatus {
  id: string;
  name: string;
  maturity:
    | 'stable'
    | 'experimental'
    | 'in-development'
    | 'research-accepted'
    | 'research'
    | 'planned'
    | 'vision'
    | 'deprecated';
  availability:
    | 'public'
    | 'private'
    | 'repository-only'
    | 'not-implemented'
    | 'retired';
  package?: string;
  version?: string;
  supportLevel?: string;
  documentation?: 'none' | 'internal' | 'partial-public' | 'public';
  lastVerified?: string;
  evidence?: string[];
}
```

This is an information contract, not yet an implementation API. D2/D10 will decide the concrete data-file format and validation mechanism.

## 13. Current baseline mapping

The public website implementation must revalidate this table at the time content is created. The D1 baseline is:

| Capability | Maturity | Availability | Notes |
| --- | --- | --- | --- |
| Core primitives (State, Computed, Batch, Scope, Diagnostics) | Experimental | repository-only / publication-gated | production implementation exists; first public package target is separately gated |
| Vanilla integration/validation | Experimental | repository evidence | validated consumer usage exists; public distribution must be checked before install claims |
| React adapter | Experimental | private | implementation/validation exists, package remains private at D1 |
| Angular adapter | Experimental | private | implementation/validation exists, package remains private at D1 |
| Vue adapter | Experimental | private | implementation/validation exists, package remains private at D1 |
| CLI Core | In Development | private | substantial implementation exists, but it is not a public install target |
| Form | In Development | private | research graduated; production Phase 1 is active |
| Query | Research Accepted | not-implemented as production package | research track accepted; production package not yet established |
| HTTP | Research Accepted | not-implemented as production package | accepted Wrap + Reduce direction; production package deferred |
| Schema | Research | not-implemented | research direction exists |
| Flow | Research | not-implemented | research/architecture track exists |
| Devtools | Planned | not-implemented | planned capability |
| UI | Planned | not-implemented | planned production area with research material |
| Native components / build | Research | not-implemented | research track |
| Application framework | Vision | not-implemented | long-horizon ecosystem direction |

The table is not a permanent source of truth. It records the D1 architecture baseline. The future central status registry must be updated from current repository evidence as capabilities change.

## 14. Status badge design

The Vii design system already contains status-badge concepts. The public implementation should extend those visual patterns to support the complete taxonomy in this document.

Status must never rely on color alone.

A badge should expose readable text and sufficient contrast in both light and dark modes.

## 15. Status display rules

Every capability page that is not Stable SHOULD make maturity visible near the top of the page.

When availability is not public, the page SHOULD also expose availability in plain language.

Example:

```text
Query
Research Accepted
Production package: not available yet
```

Do not write an installation command for an unavailable package.

## 16. Version display rules

Version numbers may be shown only when they correspond to real package/release metadata.

Design mockup values are not evidence.

A package target or planned version must not be rendered as though it has already been published.

## 17. Public status source rules

A status change requires evidence appropriate to the transition.

Examples:

- `Research -> Research Accepted`: accepted graduation/ADR/RFC decision;
- `Research Accepted -> In Development`: production implementation track starts with accepted scope;
- `In Development -> Experimental`: implemented contract plus required validation/release readiness evidence;
- `Experimental -> Stable`: explicit stability/release governance decision;
- any status -> Deprecated: accepted deprecation decision and migration intent.

A website-only PR must not promote maturity without matching repository evidence.

## 18. Public roadmap relationship

Status and roadmap answer different questions.

Status answers:

> What is the maturity and availability now?

Roadmap answers:

> What direction or next work is intended?

The website must not use roadmap placement as a substitute for current status.

## 19. Compatibility relationship

Compatibility is another independent dimension.

A capability may be Experimental but still have a precise tested compatibility range.

Future public metadata may include:

- Node range;
- TypeScript range;
- browser support;
- framework adapter support;
- package manager support;
- SSR/runtime support.

Compatibility facts must come from tested/support metadata rather than design mockups.

## 20. Staleness policy

Public status drift is a product defect.

When a runtime change materially changes maturity, availability, package identity, support, or compatibility, the change should trigger a documentation impact assessment.

The future central registry should support `lastVerified` or equivalent traceability so stale claims can be found.

## 21. D1 non-goals

This document does not:

- create the capability registry file;
- define colors for every status;
- publish package versions;
- declare a capability Stable;
- replace internal roadmap statuses used for engineering management;
- guarantee release dates.
