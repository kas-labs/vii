# Vii design records

For new work, store editable diagrams and the design record under `docs/designs/<task-slug>/`. This directory remains an index for existing architecture design records; do not duplicate legacy decisions. Use the canonical [System Design First policy](../SYSTEM_DESIGN_GUIDELINES.md) and existing RFC/ADR governance. An accepted RFC or architecture document may serve as the design record if it contains equivalent evidence; link it rather than duplicating it.

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

Use Excalidraw, draw.io and/or Mermaid as appropriate. Commit native editable files and SVG previews for Excalidraw/draw.io. See the canonical policy for storage and review requirements. Label proposed and implemented elements explicitly.
