import { useMemo, useSyncExternalStore } from "react";
import type {
  FieldIssue,
  FormFieldsRecord,
  FormInstance,
  FormReinitializeInput,
  FormSubmitResult,
  FormValues,
  SubmitAction,
  SubmitOptions,
  ValidationTriggerMode,
} from "../../core/types.js";
import { createMemoizedSnapshotReader, subscribeSignals } from "./external-store.js";
import type { ReactFormBinding, ReactFormSnapshot } from "./types.js";

/**
 * Subscribes a React component to root form aggregate state and lifecycle coordinator.
 * Uses React's useSyncExternalStore for concurrent rendering safety and live aggregate state observation.
 */
export function useForm<TFields extends FormFieldsRecord = FormFieldsRecord>(
  form: FormInstance<TFields>,
): ReactFormBinding<TFields> {
  const bridge = useMemo(() => {
    const readSnapshot = (): ReactFormSnapshot<TFields> => ({
      value: form.value.get(),
      rawValue: form.rawValue.get(),
      dirty: form.dirty.get(),
      touched: form.touched.get(),
      pending: form.pending.get(),
      valid: form.valid.get(),
      invalid: form.invalid.get(),
      issues: form.issues.get(),
      serverIssues: form.serverIssues.get(),
      submissionStatus: form.submissionStatus.get(),
      submitting: form.submitting.get(),
    });

    const getSnapshot = createMemoizedSnapshotReader(readSnapshot);

    const subscribe = (onStoreChange: () => void): (() => void) =>
      subscribeSignals(
        [
          form.value,
          form.rawValue,
          form.dirty,
          form.touched,
          form.pending,
          form.valid,
          form.invalid,
          form.issues,
          form.serverIssues,
          form.submissionStatus,
          form.submitting,
        ],
        onStoreChange,
      );

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
      validate: (trigger?: ValidationTriggerMode) => form.validate(trigger),
      submit: <TResult = void>(
        action?: SubmitAction<FormValues<TFields>, TResult>,
        options?: SubmitOptions,
      ): Promise<FormSubmitResult<TResult, FieldIssue>> => form.submit(action, options),
      cancelSubmit: (): void => {
        form.cancelSubmit();
      },
      reset: (): void => {
        form.reset();
      },
      reinitialize: (newBaseline: FormReinitializeInput<TFields>): void => {
        form.reinitialize(newBaseline);
      },
    };
  }, [form]);

  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      form,
      fields: form.fields,
      validate: bridge.validate,
      submit: bridge.submit,
      cancelSubmit: bridge.cancelSubmit,
      reset: bridge.reset,
      reinitialize: bridge.reinitialize,
    }),
    [snapshot, bridge, form],
  );
}
