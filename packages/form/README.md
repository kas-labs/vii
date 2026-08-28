# @vii-labs/form

Experimental reactive headless form state and validation engine for the Vii ecosystem.

## Status

Internal development / experimental candidate (Phase 1 Baseline).

- **Current Implementation (P1d):**
  - Standalone unparsed leaf `createField<TValue>` primitive providing reactive `value`, `rawValue` (enforcing invariant `Raw === Value === TValue`), baseline-relative `dirty` tracking, independent `touched` state, batched `reset()`, and deterministic `@vii-labs/core` `Scope` lifecycle integration.
  - Composable nested object state `createFieldGroup<TFields>` (canonical options shape `{ fields, scope? }`) aggregating child domain values, raw values, dirty flags, touched flags, batched reset, and parent/child Scope lifecycle.
  - Root form coordinator `createForm<TFields>` managing tree composition, aggregate signals, reset, whole-form baseline replacement (`form.reinitialize(newBaseline)`), and deterministic root Scope disposal.
- **Disposal & Observation Contract:**
  - Standalone nodes and root forms may be disposed directly and idempotently via `dispose()`.
  - Calling methods after disposal throws descriptive `Error` (`"Field is disposed"`, `"Group is disposed"`, `"Form is disposed"`); `dirty` computed throws `Error("Computed is disposed")`.
- **Field Ownership & Adoption Policy:**
  - Nodes adopted into a group or form have their lifecycle owned by the tree. Direct public disposal on an adopted child (`form.fields.name.dispose()`) throws `Error("Cannot dispose an adopted field directly; dispose its owning form or group")` without corrupting tree consistency.
  - A node with an external owner Scope cannot be adopted into a form/group tree; attempting to do so throws `Error("Cannot adopt node at \"<key>\": node already has an external Scope owner")`.
  - Re-adopting an already-adopted or disposed node throws deterministically.
  - Adoption is transactional: two-phase validation ensures failed form construction causes zero partial mutations to standalone child nodes.
- **Subpaths (`/react`, `/vanilla`, `/angular`, `/vue`):** Skeleton infrastructure entrypoints (adapters deferred to P1h–P1j).
- **Deferred / Non-Goals for P1d:** No dynamic array collections (`createFieldArray` deferred to P1f), no validation engine (rules, async rules, debounce, AbortSignal, Standard Schema bridge deferred to P1e), no parsers (parser-backed `TRaw !== TValue` divergence deferred to P1e), no submission pipeline or server issue routing (deferred to P1g), and no framework adapter implementations.

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md` for architecture and roadmap details.
