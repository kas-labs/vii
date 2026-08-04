# Vii Governance

Vii is currently founder-led and evolves through documented decisions, reviewable evidence, and incremental delivery.

## Principles

- architecture is documented before broad implementation
- accepted decisions are recorded in RFCs or ADRs
- public APIs require stronger review than internal code
- security and privacy defaults cannot be weakened casually
- package creation requires a clear owner and lifecycle plan
- implementation evidence may supersede earlier assumptions

## Roles

### Founder and project lead

The project lead is responsible for final product direction, roadmap prioritization, repository administration, release authorization, and resolving decisions that cannot reach consensus.

### Maintainer

A maintainer may review and merge changes within assigned areas, triage issues, participate in RFC decisions, and help operate releases.

### Package owner

A package owner is responsible for the quality, compatibility, documentation, and maintenance of a specific package or package group.

### Contributor

A contributor submits code, tests, documentation, benchmarks, issues, or proposals. Contribution does not automatically grant merge or release authority.

## Decision classes

### Routine implementation decision

Handled in pull request review when it follows accepted architecture and does not change public contracts.

### Architecture decision

Recorded as an ADR when the decision is primarily internal and implementation-specific.

### Product or public API decision

Requires an RFC when it affects users, package boundaries, protocols, compatibility, security, or migration.

### Emergency security decision

May be handled privately and released before full public discussion. The rationale should be documented after disclosure is safe.

## Consensus and final authority

Vii aims for informed consensus, not unanimity. When consensus is unavailable, the project lead makes the final decision and records the rationale.

## Conflicts of interest

Reviewers should disclose material conflicts, including commercial relationships or ownership interests that may affect a decision.

## Governance evolution

This model is intentionally simple for the early project stage. It may evolve when Vii has multiple active maintainers, external package owners, or independent release responsibilities. Changes to this document require an RFC.
