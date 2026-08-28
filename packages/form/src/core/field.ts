import { batch, computed, createScope, state } from "@vii-labs/core";
import type { CreateFieldOptions, FieldEqualityFn, FieldState } from "./types.js";

const defaultEquality: FieldEqualityFn<unknown> = (a, b) => Object.is(a, b);

/**
 * Creates a standalone reactive leaf field instance.
 *
 * Provides fine-grained reactive state for value, raw presentation value,
 * baseline tracking, dirty/touched flags, reset semantics, and deterministic
 * Scope lifecycle management.
 */
export function createField<TValue, TRaw = TValue>(
  options: CreateFieldOptions<TValue, TRaw>,
): FieldState<TValue, TRaw> {
  const { initialValue, scope } = options;
  const initialRawValue =
    options.initialRawValue !== undefined
      ? options.initialRawValue
      : (initialValue as unknown as TRaw);

  const equality: FieldEqualityFn<TValue> =
    (options.equality as FieldEqualityFn<TValue> | undefined) ??
    (defaultEquality as FieldEqualityFn<TValue>);

  let disposed = false;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Field is disposed");
    }
  };

  const fieldScope = scope ? scope.createChild({ name: "field" }) : createScope({ name: "field" });

  const valueState = state<TValue>(initialValue);
  const rawValueState = state<TRaw>(initialRawValue);
  const initialValueState = state<TValue>(initialValue);
  const initialRawValueState = state<TRaw>(initialRawValue);
  const touchedState = state<boolean>(false);

  const dirtyComputed = fieldScope.run(() =>
    computed(() => !equality(valueState.get(), initialValueState.get())),
  );

  let detachFromParent: (() => void) | undefined;

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    detachFromParent?.();
    fieldScope.dispose();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      dispose();
    });
  }

  const setValue = (next: TValue): void => {
    assertActive();
    batch(() => {
      valueState.set(next);
      rawValueState.set(next as unknown as TRaw);
    });
  };

  const setRawValue = (raw: TRaw): void => {
    assertActive();
    batch(() => {
      rawValueState.set(raw);
      valueState.set(raw as unknown as TValue);
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
      const initialRaw = initialRawValueState.get();
      valueState.set(initial);
      rawValueState.set(initialRaw);
      touchedState.set(false);
    });
  };

  return {
    kind: "field",
    value: valueState,
    rawValue: rawValueState,
    initialValue: initialValueState,
    initialRawValue: initialRawValueState,
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
}
