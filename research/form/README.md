# Vii Form Research — F1 & F2 Prototypes

> **Status**: Completed Slices (F1 & F2 Prototypes & Evidence)
> **Governing Roadmap**: [`docs/roadmap/FORM_RESEARCH.md`](../../docs/roadmap/FORM_RESEARCH.md)
> **Package Authorization**: None (`@vii-labs/form` is NOT created or published)

---

## 1. Overview

This directory contains the throwaway research prototypes for **F1 (Minimal Field and Form State Prototype)** and **F2 (Nested Objects + Arrays + Identity)**.

The objectives of F2 are:

1. Research and validate nested object group structures (`FieldGroup`) with lazy aggregate computeds (`values`, `dirty`, `touched`, `pending`, `valid`, `invalid`, `errors`).
2. Research and validate dynamic repeatable collections (`FieldArray`) supporting `push`, `insert`, `remove`, `swap`, and `move`.
3. Research stable item identity (`id` generation / application `keyExtractor`) across reorder operations, ensuring `touched`, `dirty`, and validation error signals stay attached to their conceptual identity rather than their array index.
4. Verify sub-tree child `Scope` disposal when items are removed or reset.
5. Provide prototype-pollution defense in path resolution (`parsePath` and `getNode`).

---

## 2. Implemented Capabilities

1. **`FieldState<T>` (F1/F2)**:
   - Manages `value`, `initialValue`, `touched`, `pending`, `errors` as reactive States.
   - Derives `dirty`, `valid`, `invalid` as Computeds.
   - Provides `setValue`, `setTouched`, `setPending`, `setErrors`, and `reset(...args: [nextInitial?: T])`.
   - Supports custom equality comparators for non-primitive or domain objects.
2. **`FieldGroup<T>` (F2)**:
   - Manages composite dictionary of `FormNodeFor<T>` (leaves, child groups, child arrays).
   - Derives aggregate form-level Computeds: `values`, `dirty`, `touched`, `pending`, `valid`, `invalid`, and `errors` with dot-notated paths.
   - Provides batch atomic updater `setValues(partial)` and atomic form reset `reset(nextInitials?)`.
3. **`FieldArray<T>` (F2)**:
   - Dynamic collection of `ArrayItem<T>` nodes with stable identifier mapping (`id`).
   - Supports atomic list mutations: `push`, `insert`, `remove`, `swap`, `move`.
   - Preserves state across `swap` and `move` operations.
   - Encapsulates per-item child `Scope` instances, synchronously disposing them upon `remove()` or `reset()`.
4. **Unified Form Root & Path Resolution (`createForm`, `parsePath`, `getNode`)**:
   - Parses dot and bracket paths (`user.addresses[0].street`).
   - Hardens against prototype-pollution attacks (`__proto__`, `prototype`, `constructor`).
   - Retrieves leaf or sub-tree nodes via `form.getNode(path)`.
5. **`bindFormToExternalState<T>(options)` (Research Comparison Fixture)**:
   - Evaluates bidirectional synchronization with an external Vii `state<T>()` store for model-ownership comparison.
   - Demonstrates loop-free synchronization and idempotent teardown disconnection upon `form.dispose()`.

---

## 3. Test Coverage & Empirical Observations

The test suite in [`research/form/form-core.test.ts`](./form-core.test.ts) covers 16 assertions across:

- **F1 Regression Baseline**: pristine signals, custom equality, explicit `undefined` reset, and external store binding lifecycle.
- **Path Resolution & Security**: parsing of dot and bracket paths, and blocking of prototype-pollution attempts.
- **Nested Groups**: hierarchical tree evaluation, deep leaf mutation triggering only affected ancestor computeds, and aggregate dot-path error collection.
- **Repeatable Arrays & Stable Identity**: stable item ID tracking, application `keyExtractor`, array mutations (`push`, `insert`, `remove`), state preservation across `swap` and `move`, child `Scope` disposal, and indexed error path aggregation.
- **Subscription Isolation**: deep leaf mutation in Branch A triggers 0 notifications to sibling Branch B subscribers.
