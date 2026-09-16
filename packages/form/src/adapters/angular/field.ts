import type { FieldState } from "../../core/types.js";
import { bridgeSignal, createTeardown } from "./destroy.js";
import type { AngularAdapterOptions, AngularFieldHandle } from "./types.js";

/**
 * Creates an Angular Signals projection over a standalone canonical Vii Form leaf field.
 *
 * Exposes readonly Angular Signals for all state dimensions and stable delegate actions.
 * Operates purely as a reactive bridge with zero duplicated state ownership.
 * Can be used outside Angular injection context with manual lifecycle via `.dispose()`.
 */
export function createAngularField<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  options?: AngularAdapterOptions,
): AngularFieldHandle<TValue, TRaw> {
  const { isDisposed, unsubs, dispose } = createTeardown(options);

  return {
    value: bridgeSignal(field.value, unsubs, isDisposed),
    rawValue: bridgeSignal(field.rawValue, unsubs, isDisposed),
    dirty: bridgeSignal(field.dirty, unsubs, isDisposed),
    touched: bridgeSignal(field.touched, unsubs, isDisposed),
    pending: bridgeSignal(field.pending, unsubs, isDisposed),
    valid: bridgeSignal(field.valid, unsubs, isDisposed),
    invalid: bridgeSignal(field.invalid, unsubs, isDisposed),
    parseStatus: bridgeSignal(field.parseStatus, unsubs, isDisposed),
    parseIssue: bridgeSignal(field.parseIssue, unsubs, isDisposed),
    validationStatus: bridgeSignal(field.validationStatus, unsubs, isDisposed),
    issues: bridgeSignal(field.issues, unsubs, isDisposed),
    serverIssues: bridgeSignal(field.serverIssues, unsubs, isDisposed),
    setValue: (next) => field.setValue(next),
    setRawValue: (raw) => field.setRawValue(raw),
    setTouched: (t = true) => field.setTouched(t),
    blur: () => field.setTouched(true),
    validate: (trigger) => field.validate(trigger),
    reset: () => field.reset(),
    dispose,
  };
}
