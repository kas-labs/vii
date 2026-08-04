# Decision-Making Model

Vii decisions should be proportional to their impact.

## Decision levels

### Level 1: local implementation

Examples:

- internal refactoring
- test organization
- private helper naming

Handled in pull request review.

### Level 2: package implementation

Examples:

- internal data structure
- build configuration
- benchmark methodology

Requires package-owner review and may require an ADR.

### Level 3: public architecture

Examples:

- public API changes
- new packages
- protocol changes
- adapter contracts
- registry schemas
- compatibility tiers

Requires an RFC.

### Level 4: project policy

Examples:

- governance
- licensing
- security defaults
- release authority
- privacy policy

Requires an RFC and project-lead approval.

## Evaluation criteria

Decisions should consider:

- user value
- consistency with product boundaries
- implementation complexity
- runtime and framework neutrality
- performance and memory cost
- TypeScript cost
- migration burden
- security and privacy impact
- maintenance capacity
- reversibility

## Reversibility

Prefer reversible decisions during early development. Irreversible or ecosystem-wide decisions require stronger evidence and narrower initial scope.

## Decision log

Accepted RFCs and ADRs form the permanent decision log. Pull request discussion may provide context but should not be the only record of an important decision.
