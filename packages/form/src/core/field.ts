import { batch, computed, createScope, state } from "@vii-labs/core";
import { attachInternalNode, type FormNodeInternal, type NodeOwnership } from "./internal.js";
import type { CreateFieldOptions, FieldEqualityFn, FieldState } from "./types.js";

const defaultEquality: FieldEqualityFn<unknown> = (a, b) => Object.is(a, b);

/**
 * Creates a standalone reactive leaf field instance.
 *
 * Provides fine-grained reactive state for unparsed value, raw presentation value
 * (guaranteed Raw === Value in P1c/P1d), baseline tracking, dirty/touched flags,
 * reset semantics, internal reinitialize baseline replacement, and deterministic Scope lifecycle management.
 */
export function createField<TValue>(options: CreateFieldOptions<TValue>): FieldState<TValue> {
  const { initialValue, scope } = options;

  const equality: FieldEqualityFn<TValue> =
    (options.equality as FieldEqualityFn<TValue> | undefined) ??
    (defaultEquality as FieldEqualityFn<TValue>);

  let disposed = false;
  let ownership: NodeOwnership = scope ? "external-scope" : "standalone";

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Field is disposed");
    }
  };

  const fieldScope = scope ? scope.createChild({ name: "field" }) : createScope({ name: "field" });

  const valueState = state<TValue>(initialValue);
  const rawValueState = state<TValue>(initialValue);
  const initialValueState = state<TValue>(initialValue);
  const touchedState = state<boolean>(false);

  const dirtyComputed = fieldScope.run(() =>
    computed(() => !equality(valueState.get(), initialValueState.get())),
  );

  let detachFromParent: (() => void) | undefined;

  const performDisposal = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    detachFromParent?.();
    fieldScope.dispose();
  };

  const dispose = (): void => {
    if (internal.ownership === "tree") {
      throw new Error("Cannot dispose an adopted field directly; dispose its owning form or group");
    }
    performDisposal();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      performDisposal();
    });
  }

  const setValue = (next: TValue): void => {
    assertActive();
    batch(() => {
      valueState.set(next);
      rawValueState.set(next);
    });
  };

  const setRawValue = (raw: TValue): void => {
    assertActive();
    batch(() => {
      rawValueState.set(raw);
      valueState.set(raw);
    });
  };

  const setTouched = (touched: boolean = true): void => {
    assertActive();
    touchedState.set(touched);
  };

  const markTouched = (): void => {
    setTouched(true);
  };

  const reset = (): void => {
    assertActive();
    batch(() => {
      const initial = initialValueState.get();
      valueState.set(initial);
      rawValueState.set(initial);
      touchedState.set(false);
    });
  };

  const fieldState: FieldState<TValue> = {
    kind: "field",
    value: valueState,
    rawValue: rawValueState,
    touched: touchedState,
    dirty: dirtyComputed,
    getValue: () => {
      assertActive();
      return valueState.get();
    },
    getRawValue: () => {
      assertActive();
      return rawValueState.get();
    },
    setValue,
    setRawValue,
    setTouched,
    markTouched,
    reset,
    dispose,
  };

  const internal: FormNodeInternal<TValue> = {
    kind: "field",
    scope: fieldScope,
    ownership,
    assertActive,
    reinitialize: (nextBaseline: TValue) => {
      assertActive();
      batch(() => {
        initialValueState.set(nextBaseline);
        valueState.set(nextBaseline);
        rawValueState.set(nextBaseline);
        touchedState.set(false);
      });
    },
    getDirectChildNodes: () => [],
    disposeFromOwner: () => {
      performDisposal();
    },
  };

  attachInternalNode(fieldState, internal);

  return fieldState;
}
