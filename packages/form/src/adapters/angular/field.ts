import { signal } from "@angular/core";
import type { FieldState, ValidationTriggerMode } from "../../core/types.js";
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
  const valueSig = signal(field.value.get());
  const rawValueSig = signal(field.rawValue.get());
  const dirtySig = signal(field.dirty.get());
  const touchedSig = signal(field.touched.get());
  const pendingSig = signal(field.pending.get());
  const validSig = signal(field.valid.get());
  const invalidSig = signal(field.invalid.get());
  const parseStatusSig = signal(field.parseStatus.get());
  const parseIssueSig = signal(field.parseIssue.get());
  const validationStatusSig = signal(field.validationStatus.get());
  const issuesSig = signal(field.issues.get());
  const serverIssuesSig = signal(field.serverIssues.get());

  let isDisposed = false;
  let unregisterDestroy: (() => void) | undefined;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const unsubscribe of unsubs) {
      unsubscribe();
    }
    if (unregisterDestroy) {
      const clean = unregisterDestroy;
      unregisterDestroy = undefined;
      clean();
    }
  };

  const unsubs = [
    field.value.subscribe((v) => {
      if (!isDisposed) valueSig.set(v);
    }),
    field.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueSig.set(r);
    }),
    field.dirty.subscribe((d) => {
      if (!isDisposed) dirtySig.set(d);
    }),
    field.touched.subscribe((t) => {
      if (!isDisposed) touchedSig.set(t);
    }),
    field.pending.subscribe((p) => {
      if (!isDisposed) pendingSig.set(p);
    }),
    field.valid.subscribe((v) => {
      if (!isDisposed) validSig.set(v);
    }),
    field.invalid.subscribe((iv) => {
      if (!isDisposed) invalidSig.set(iv);
    }),
    field.parseStatus.subscribe((ps) => {
      if (!isDisposed) parseStatusSig.set(ps);
    }),
    field.parseIssue.subscribe((pi) => {
      if (!isDisposed) parseIssueSig.set(pi);
    }),
    field.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusSig.set(vs);
    }),
    field.issues.subscribe((iss) => {
      if (!isDisposed) issuesSig.set(iss);
    }),
    field.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesSig.set(si);
    }),
  ];

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = options.destroyRef.onDestroy(dispose);
    }
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
    value: valueSig.asReadonly(),
    rawValue: rawValueSig.asReadonly(),
    dirty: dirtySig.asReadonly(),
    touched: touchedSig.asReadonly(),
    pending: pendingSig.asReadonly(),
    valid: validSig.asReadonly(),
    invalid: invalidSig.asReadonly(),
    parseStatus: parseStatusSig.asReadonly(),
    parseIssue: parseIssueSig.asReadonly(),
    validationStatus: validationStatusSig.asReadonly(),
    issues: issuesSig.asReadonly(),
    serverIssues: serverIssuesSig.asReadonly(),
    setValue,
    setRawValue,
    setTouched,
    blur,
    validate,
    reset,
    dispose,
  };
}
