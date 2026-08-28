# @vii-labs/form

Experimental reactive headless form state and validation engine for the Vii ecosystem.

## Status

Internal development / experimental candidate (Phase 1 Baseline).

- **Current Implementation (P1c):** Standalone leaf `createField` primitive providing reactive `value`, `rawValue`, baseline-relative `dirty` tracking, independent `touched` state, batched `reset()`, and deterministic `@vii-labs/core` `Scope` lifecycle integration.
- **Subpaths (`/react`, `/vanilla`, `/angular`, `/vue`):** Skeleton infrastructure entrypoints (adapters deferred to P1h–P1j).
- **Deferred / Non-Goals for P1c:** No form tree/groups/arrays (`createForm`, `createFieldGroup`, `createFieldArray`), no validation engine, no parsers, no submission pipeline, and no framework adapter implementations.

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md` for architecture and roadmap details.
