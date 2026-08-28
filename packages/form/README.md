# @vii-labs/form

Experimental reactive headless form state and validation engine for the Vii ecosystem.

## Status

Internal development / experimental candidate (Phase 1 Baseline).

- **Current Implementation (P1c):** Standalone unparsed leaf `createField<TValue>` primitive providing reactive `value`, `rawValue` (enforcing invariant `Raw === Value === TValue`), baseline-relative `dirty` tracking, independent `touched` state, batched `reset()`, and deterministic `@vii-labs/core` `Scope` lifecycle integration.
- **Disposal & Observation Contract:** Calling field methods (`getValue`, `setValue`, `reset`, etc.) after disposal throws `Error("Field is disposed")`; `dirty` computed throws `Error("Computed is disposed")`; underlying State references remain quiescent snapshots under Core State semantics.
- **Subpaths (`/react`, `/vanilla`, `/angular`, `/vue`):** Skeleton infrastructure entrypoints (adapters deferred to P1h–P1j).
- **Deferred / Non-Goals for P1c:** No form tree/groups/arrays (`createForm`, `createFieldGroup`, `createFieldArray`), no validation engine, no parsers (parser-backed `TRaw !== TValue` divergence deferred to P1e), no submission pipeline, and no framework adapter implementations.

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md` for architecture and roadmap details.
