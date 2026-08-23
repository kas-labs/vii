# Vii Form Research — F1 Prototype

> **Status**: Completed Slice (F1 Prototype & Evidence)
> **Governing Roadmap**: [`docs/roadmap/FORM_RESEARCH.md`](../../docs/roadmap/FORM_RESEARCH.md)
> **Package Authorization**: None (`@vii-labs/form` is NOT created or published)

---

## 1. Overview

This directory contains the throwaway research prototype for **F1 (Minimal Field and Form State Prototype)**.

The objectives of F1 are:

1. Research and validate the signal-first `FieldState` primitive backed by Vii Core (`state()`, `computed()`, `batch()`).
2. Verify **isolated subscription fan-out** in tested fixtures (e.g. mutating Field A produces 0 notifications to Field B subscribers and 1 notification to aggregate `form.values` subscribers).
3. Evaluate model ownership trade-offs:
   - **Form-Owned Model** (self-contained baseline).
   - **External State Binding** (research comparison fixture `bindFormToExternalState`).
   - **Controlled Hybrid Projection**.
4. Validate Scope ownership and deterministic teardown disposal (`form.dispose()`).

---

## 2. Implemented Capabilities in F1

1. **`createField<T>(options)`**:
   - Manages `value`, `initialValue`, `touched`, `pending`, `errors` as reactive States.
   - Derives `dirty`, `valid`, `invalid` as Computeds.
   - Provides `setValue`, `setTouched`, `setPending`, `setErrors`, and `reset(...args: [nextInitial?: T])` (with explicit `undefined` support when `T` permits).
   - Supports custom equality comparators for non-primitive or domain objects.
2. **`createForm<T>(config)`**:
   - Manages typed dictionary of fields `fields: Record<keyof T, FieldState<T[K]>>`.
   - Derives aggregate form-level Computeds: `values`, `dirty`, `touched`, `pending`, `valid`, `invalid`, and `errors`.
   - Provides batch atomic updater `setValues(partial)` and atomic form reset `reset(nextInitials?)`.
   - Integrates root Vii `createScope({ name: 'vii-form-root' })` for clean single-point disposal.
3. **`bindFormToExternalState<T>(options)` (Research Comparison Fixture)**:
   - Evaluates bidirectional synchronization with an external Vii `state<T>()` store for model-ownership comparison.
   - Demonstrates loop-free synchronization and idempotent teardown disconnection upon `form.dispose()`.
   - _(Note: this is a research comparison fixture, not selected public API or accepted architecture)_.

---

## 3. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers 19 assertions across 4 areas:

- **Field State Primitives & Reset Edge Cases**: pristine signal initialization, dirty equality tracking, custom comparators, touched/error toggles, same-value reset, explicit `undefined` new initial value, and post-reset comparator verification.
- **Subscription Granularity**: in the tested 2-field and 3-field fixtures, mutating Field A produced 0 notifications to Field B subscribers and 1 notification to aggregate `form.values` subscribers.
- **Batching**: multi-field `setValues` calls trigger only a single notification on aggregate computed subscribers.
- **Model Ownership & Lifecycle**: compares pure Form-Owned isolation against `bindFormToExternalState` fixture; verifies that post-disposal, external state and form state are completely decoupled and that disposal is idempotent.
- **Scope Disposal**: calling `form.dispose()` synchronously halts all downstream computed updates and event notifications.
