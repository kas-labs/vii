# Vii design records

Store a design in `<topic>/DESIGN.md` for each non-trivial feature or architecture change. Use the canonical [System Design First policy](../SYSTEM_DESIGN_GUIDELINES.md) and existing RFC/ADR governance. An accepted RFC or architecture document may serve as the design record if it contains equivalent evidence; link it rather than duplicating it.

A design record starts as **proposed**. No implementation starts until its scope has explicit approval. Keep diagrams and approval evidence current when scope changes.

## Template

```markdown
# <Feature>: System Design
Status: proposed
Owner:
Date:
Related RFC/ADR/issue:
Approval evidence: pending

## Problem, users, scope and non-goals
## Repository discovery and existing behavior
## Ubiquitous language and DDD boundaries
## C4 context / container / component diagrams (as relevant)
## Sequence, data flow and lifecycle (as relevant)
## Contracts, error handling and invariants
## Alternatives, risks and compatibility
## Verification matrix and acceptance criteria
## Implementation slices and stop conditions
## Decision and approval record
```

Mermaid diagrams are preferred for reviewable diffs. Label proposed and implemented elements explicitly.
