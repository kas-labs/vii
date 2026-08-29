# @vii-labs/form

Experimental reactive headless form state and validation engine for the Vii ecosystem.

## Status

Internal development / experimental candidate (Phase 1 Baseline).

- **Current Implementation (P1e — Validation, Parsers & Standard Schema):**
  - **Leaf Field Primitive (`createField`):**
    - Raw vs Value separation: supports synchronous parsers (`FieldParser<TRaw, TValue>`) where raw presentation input (`"05"`) is preserved in `rawValue` without mutating domain `value` (e.g. `5`), and parse failures retain raw presentation input while preserving the last good domain value.
    - Synchronous validation rules (`SyncValidationRule<TValue>`) and asynchronous validation rules (`AsyncValidationRule<TValue>`).
    - Standard Schema v1 validation bridge (`standardSchema`) providing provider-neutral support for any `@standard-schema/spec` schema (e.g., Zod 4, Valibot, ArkType) with fail-closed boundary enforcement and zero vendor runtime dependencies.
    - Validation execution controls: trigger modes (`change`, `blur`, `submit`, `manual`), debounce duration (`debounceMs`), monotonic validation revision counters, AbortSignal cancellation, and stale-result protection.
    - Reactive state signals: `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, `issues`, `parseIssue`, `parseStatus`, `validationStatus`.
    - Parser-aware baselines: parsed fields require explicit `initialRawValue`; cross-type fields cannot synthesize raw from domain value on `setValue` or `reinitialize`.
    - `field.reset()` restores the current canonical baseline only; baseline replacement belongs to `form.reinitialize`.
    - Domain dirty semantics: `dirty` compares parsed domain `value` to baseline domain value (presentation-only raw edits with equivalent value stay pristine).
  - **Built-in Parsers (public):**
    - `createNumberParser`: strict decimal grammar parser with options for empty handling, whitespace trimming, and raw input preservation.
    - `createStringParser`: optional whitespace trimming without silent data loss by default.
  - **Nested Groups (`createFieldGroup`) & Root Forms (`createForm`):**
    - Hierarchical aggregation of `value`, `rawValue`, `touched`, `dirty`, `pending`, `valid`, `invalid`, and `issues` (with recursive path prefixing).
    - Granular reactivity: field mutation in one branch does not notify un-mutated branches.
    - Whole-form parser-aware baseline reinitialization (`form.reinitialize`) using `FormReinitializeBaseline` (cross-type parsed fields require `{ value, rawValue }` per field).
    - Transactional node adoption and deterministic Scope lifecycle ownership.
- **Subpaths (`/react`, `/vanilla`, `/angular`, `/vue`):** Skeleton infrastructure entrypoints (adapters deferred to P1h–P1j).
- **Deferred / Non-Goals for P1e:** No dynamic array collections (`createFieldArray` deferred to P1f), no submission pipeline or server issue routing (deferred to P1g), and no framework adapter implementations.

See `docs/architecture/FORM_ARCHITECTURE.md` and `docs/roadmap/FORM_RESEARCH.md` for architecture and roadmap details.
