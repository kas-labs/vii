# Vii Form Research — F1 Prototype

> **Status**: Completed Slice (F1 Prototype & Evidence)
> **Governing Roadmap**: [`docs/roadmap/FORM_RESEARCH.md`](../../docs/roadmap/FORM_RESEARCH.md)
> **Package Authorization**: None (`@vii-labs/form` is NOT created or published)

---

## 1. Overview

This directory contains the throwaway research prototype for **F1 (Minimal Field and Form State Prototype)**.

The objectives of F1 are:

1. Research and validate the signal-first `FieldState` primitive backed by Vii Core (`state()`, `computed()`, `batch()`).
2. Measure and demonstrate **isolated subscription fan-out** ($O(1)$ updates where mutating Field A emits 0 notifications to Field B subscribers).
3. Evaluate model ownership trade-offs:
   - **Form-Owned Model** (self-contained baseline).
   - **External State Binding** (`bindFormToExternalState` bidirectional synchronization).
   - **Controlled Hybrid Projection**.
4. Validate Scope ownership and deterministic teardown disposal (`form.dispose()`).

---

## 2. Implemented Capabilities in F1

1. **`createField<T>(options)`**:
   - Manages `value`, `initialValue`, `touched`, `pending`, `errors` as reactive States.
   - Derives `dirty`, `valid`, `invalid` as Computeds.
   - Provides `setValue`, `setTouched`, `setPending`, `setErrors`, and `reset(nextInitial?)`.
   - Supports custom equality comparators for non-primitive or domain objects.
2. **`createForm<T>(config)`**:
   - Manages typed dictionary of fields `fields: Record<keyof T, FieldState<T[K]>>`.
   - Derives aggregate form-level Computeds: `values`, `dirty`, `touched`, `pending`, `valid`, `invalid`, and `errors`.
   - Provides batch atomic updater `setValues(partial)` and atomic form reset `reset(nextInitials?)`.
   - Integrates root Vii `createScope({ name: 'vii-form-root' })` for clean single-point disposal.
3. **`bindFormToExternalState<T>(options)`**:
   - Provides non-circular, synchronized lens over an external Vii `state<T>()` store for external application state binding.

---

## 3. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers 12 assertions across 4 areas:

- **Field State Primitives**: pristine signal initialization, dirty equality tracking, custom comparators, touched/error toggles, pristine and re-baselined resets.
- **Subscription Granularity**: mutating one field notifies only direct field subscribers and aggregate form subscribers; zero extra notifications are emitted to sibling fields.
- **Batching**: multi-field `setValues` calls trigger only a single notification on aggregate computed subscribers.
- **Model Ownership**: compares pure Form-Owned isolation against bidirectional `bindFormToExternalState`.
- **Scope Disposal**: calling `form.dispose()` synchronously halts all downstream computed updates and event notifications.
