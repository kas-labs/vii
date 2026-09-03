import { getCurrentScope, onScopeDispose, shallowReadonly, shallowRef } from "vue";
import type { FieldState, ValidationTriggerMode } from "../../core/types.js";
import type { VueAdapterOptions, VueFieldHandle } from "./types.js";

/**
 * Creates a Vue shallowRef projection over a standalone canonical Vii Form leaf field.
 *
 * Exposes readonly shallow refs for all state dimensions and stable delegate actions.
 * Operates purely as a reactive bridge without deep proxying or duplicated state.
 * Automatically hooks onScopeDispose if invoked inside an active Vue effectScope,
 * or allows manual lifecycle management via `.dispose()`.
 */
export function createVueField<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  options?: VueAdapterOptions,
): VueFieldHandle<TValue, TRaw> {
  const valueRef = shallowRef(field.value.get());
  const rawValueRef = shallowRef(field.rawValue.get());
  const dirtyRef = shallowRef(field.dirty.get());
  const touchedRef = shallowRef(field.touched.get());
  const pendingRef = shallowRef(field.pending.get());
  const validRef = shallowRef(field.valid.get());
  const invalidRef = shallowRef(field.invalid.get());
  const parseStatusRef = shallowRef(field.parseStatus.get());
  const parseIssueRef = shallowRef(field.parseIssue.get());
  const validationStatusRef = shallowRef(field.validationStatus.get());
  const issuesRef = shallowRef(field.issues.get());
  const serverIssuesRef = shallowRef(field.serverIssues.get());

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const unsubscribe of unsubs) {
      unsubscribe();
    }
  };

  const unsubs = [
    field.value.subscribe((v) => {
      if (!isDisposed) valueRef.value = v;
    }),
    field.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueRef.value = r;
    }),
    field.dirty.subscribe((d) => {
      if (!isDisposed) dirtyRef.value = d;
    }),
    field.touched.subscribe((t) => {
      if (!isDisposed) touchedRef.value = t;
    }),
    field.pending.subscribe((p) => {
      if (!isDisposed) pendingRef.value = p;
    }),
    field.valid.subscribe((v) => {
      if (!isDisposed) validRef.value = v;
    }),
    field.invalid.subscribe((iv) => {
      if (!isDisposed) invalidRef.value = iv;
    }),
    field.parseStatus.subscribe((ps) => {
      if (!isDisposed) parseStatusRef.value = ps;
    }),
    field.parseIssue.subscribe((pi) => {
      if (!isDisposed) parseIssueRef.value = pi;
    }),
    field.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusRef.value = vs;
    }),
    field.issues.subscribe((iss) => {
      if (!isDisposed) issuesRef.value = iss;
    }),
    field.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesRef.value = si;
    }),
  ];

  if (options?.onDispose) {
    options.onDispose(dispose);
  } else if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  const setValue = (next: TValue): void => {
    field.setValue(next);
  };

  const setRawValue = (raw: TRaw): void => {
    field.setRawValue(raw);
  };

  const setTouched = (touched: boolean = true): void => {
    field.setTouched(touched);
  };

  const blur = (): void => {
    field.setTouched(true);
  };

  const validate = (
    trigger?: ValidationTriggerMode,
  ): ReturnType<FieldState<TValue, TRaw>["validate"]> => {
    return field.validate(trigger);
  };

  const reset = (): void => {
    field.reset();
  };

  return {
    value: shallowReadonly(valueRef),
    rawValue: shallowReadonly(rawValueRef),
    dirty: shallowReadonly(dirtyRef),
    touched: shallowReadonly(touchedRef),
    pending: shallowReadonly(pendingRef),
    valid: shallowReadonly(validRef),
    invalid: shallowReadonly(invalidRef),
    parseStatus: shallowReadonly(parseStatusRef),
    parseIssue: shallowReadonly(parseIssueRef),
    validationStatus: shallowReadonly(validationStatusRef),
    issues: shallowReadonly(issuesRef),
    serverIssues: shallowReadonly(serverIssuesRef),
    setValue,
    setRawValue,
    setTouched,
    blur,
    validate,
    reset,
    dispose,
  };
}

/**
 * Idiomatic Vue composable projection over a canonical Vii Form leaf field.
 *
 * Strictly requires an active Vue effectScope (or explicit options.onDispose) to prevent
 * subscription leaks. Fails deterministically outside a reactive scope.
 */
export function useViiField<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  options?: VueAdapterOptions,
): VueFieldHandle<TValue, TRaw> {
  const scope = getCurrentScope();
  if (scope === undefined && options?.onDispose === undefined) {
    throw new Error(
      "useViiField must be called within an active Vue effectScope or provide an explicit options.onDispose callback.",
    );
  }
  return createVueField(field, options);
}
