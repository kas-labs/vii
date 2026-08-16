# RFC 0016: Governance and Repository Operating Model

- Status: Proposed
- Authors: Kas Labs
- Created: 2026-08-05

## Summary

This RFC establishes the initial governance, contribution, decision-making, package lifecycle, and repository operating model for Vii.

## Motivation

Vii is expected to grow from a small TypeScript foundation into a modular ecosystem. Without explicit governance, package creation, public API decisions, release authority, and contributor permissions could become inconsistent or depend on undocumented conversation history.

The early project needs a lightweight model that preserves founder-led direction while making decisions reviewable and future delegation possible.

## Proposal

### Founder-led governance

Vii begins as a founder-led project. The project lead owns product direction, roadmap priority, repository administration, release authorization, and final decisions when consensus is unavailable.

### Documented decisions

Important decisions use one of three mechanisms:

- pull request review for local implementation decisions
- ADR for internal architecture decisions
- RFC for public architecture, product policy, compatibility, security, privacy, package, or migration decisions

### Package ownership

Every official package must have a purpose, lifecycle state, compatibility target, owner, quality plan, and exit strategy before promotion beyond experimentation.

### Earned responsibility

Contributor permissions grow with demonstrated contribution and maintenance capacity. Repository and publication access follow least privilege.

### Repository operation

`main` is the integration branch. Work proceeds through focused pull requests. Stacked pull requests are permitted when dependencies are documented. Required CI checks are introduced incrementally after they become reliable.

### Historical integrity

Accepted RFCs and ADRs are not silently rewritten. Superseding decisions create new records and link to the previous decision.

## Consequences

### Positive

- important decisions remain discoverable
- package growth receives explicit review
- future maintainers can understand decision rationale
- permissions match real responsibilities
- the project can delegate ownership gradually

### Costs

- architecture changes require more written work
- early contributors may need to prepare RFCs
- package proposals may be rejected for lack of maintenance capacity

## Alternatives considered

### Informal founder decisions only

Rejected because decisions would be difficult to audit, delegate, or revisit.

### Committee governance from the beginning

Rejected because the project does not yet have enough active maintainers to justify a committee structure.

### Fully automated approval based on checks

Rejected because passing automation does not establish product fit, architectural consistency, or maintenance ownership.

## Adoption plan

1. Merge the governance documents.
2. Add branch protection when CI becomes available.
3. Add CODEOWNERS only after real ownership areas exist.
4. Review the governance model after multiple external contributors or package owners become active.

## Unresolved questions

- final repository license (resolved: Apache-2.0)
- future organization-level governance across Kas Labs projects
- exact maintainer nomination process
- security response roles and private disclosure tooling
