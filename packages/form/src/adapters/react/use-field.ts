import { useMemo, useSyncExternalStore } from "react";
import type { FieldState, ValidationTriggerMode } from "../../core/types.js";
import { createMemoizedSnapshotReader, subscribeSignals } from "./external-store.js";
import type { ReactFieldBinding, ReactFieldSnapshot } from "./types.js";

/**
 * Subscribes a React component to a fine-grained Vii Form leaf field node.
 * Uses React's useSyncExternalStore for concurrent rendering safety, live snapshot reads,
 * and 0 sibling re-renders on independent leaf mutations.
 */
export function useField<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
): ReactFieldBinding<TValue, TRaw> {
  const bridge = useMemo(() => {
    const readSnapshot = (): ReactFieldSnapshot<TValue, TRaw> => ({
      value: field.value.get(),
      rawValue: field.rawValue.get(),
      dirty: field.dirty.get(),
      touched: field.touched.get(),
      pending: field.pending.get(),
      valid: field.valid.get(),
      invalid: field.invalid.get(),
      parseStatus: field.parseStatus.get(),
      parseIssue: field.parseIssue.get(),
      validationStatus: field.validationStatus.get(),
      issues: field.issues.get(),
      serverIssues: field.serverIssues.get(),
    });

    const getSnapshot = createMemoizedSnapshotReader(readSnapshot);

    const subscribe = (onStoreChange: () => void): (() => void) =>
      subscribeSignals(
        [
          field.value,
          field.rawValue,
          field.touched,
          field.dirty,
          field.pending,
          field.valid,
          field.invalid,
          field.issues,
          field.serverIssues,
          field.parseStatus,
          field.parseIssue,
          field.validationStatus,
        ],
        onStoreChange,
      );

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
      setValue: (next: TValue): void => {
        field.setValue(next);
      },
      setRawValue: (raw: TRaw): void => {
        field.setRawValue(raw);
      },
      setTouched: (touched?: boolean): void => {
        field.setTouched(touched);
      },
      blur: (): void => {
        field.markTouched();
      },
      validate: (trigger?: ValidationTriggerMode) => field.validate(trigger),
      reset: (): void => {
        field.reset();
      },
    };
  }, [field]);

  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      setValue: bridge.setValue,
      setRawValue: bridge.setRawValue,
      setTouched: bridge.setTouched,
      blur: bridge.blur,
      validate: bridge.validate,
      reset: bridge.reset,
    }),
    [snapshot, bridge],
  );
}
