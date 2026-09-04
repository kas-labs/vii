import { signal } from "@angular/core";
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
import type { AngularAdapterOptions, AngularFormHandle } from "./types.js";

/**
 * Creates an Angular Signals projection over a root FormInstance coordinator.
 *
 * Exposes readonly Angular Signals for aggregate form state and stable submission actions.
 * Preserves canonical Model A submission lifecycle without state duplication.
 */
export function createAngularForm<TFields extends FormFieldsRecord = FormFieldsRecord>(
  form: FormInstance<TFields>,
  options?: AngularAdapterOptions,
): AngularFormHandle<TFields> {
  const valueSig = signal(form.value.get());
  const rawValueSig = signal(form.rawValue.get());
  const dirtySig = signal(form.dirty.get());
  const touchedSig = signal(form.touched.get());
  const pendingSig = signal(form.pending.get());
  const validSig = signal(form.valid.get());
  const invalidSig = signal(form.invalid.get());
  const issuesSig = signal(form.issues.get());
  const serverIssuesSig = signal(form.serverIssues.get());
  const submissionStatusSig = signal(form.submissionStatus.get());
  const submittingSig = signal(form.submitting.get());

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
    form.value.subscribe((v) => {
      if (!isDisposed) valueSig.set(v);
    }),
    form.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueSig.set(r);
    }),
    form.dirty.subscribe((d) => {
      if (!isDisposed) dirtySig.set(d);
    }),
    form.touched.subscribe((t) => {
      if (!isDisposed) touchedSig.set(t);
    }),
    form.pending.subscribe((p) => {
      if (!isDisposed) pendingSig.set(p);
    }),
    form.valid.subscribe((v) => {
      if (!isDisposed) validSig.set(v);
    }),
    form.invalid.subscribe((iv) => {
      if (!isDisposed) invalidSig.set(iv);
    }),
    form.issues.subscribe((iss) => {
      if (!isDisposed) issuesSig.set(iss);
    }),
    form.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesSig.set(si);
    }),
    form.submissionStatus.subscribe((ss) => {
      if (!isDisposed) submissionStatusSig.set(ss);
    }),
    form.submitting.subscribe((sub) => {
      if (!isDisposed) submittingSig.set(sub);
    }),
  ];

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = options.destroyRef.onDestroy(dispose);
    }
  }

  const validate = (
    trigger?: ValidationTriggerMode,
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    return form.validate(trigger);
  };

  const submit = <TResult = void>(
    action?: SubmitAction<FormValues<TFields>, TResult>,
    submitOptions?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>> => {
    return form.submit(action, submitOptions);
  };

  const cancelSubmit = (): void => {
    form.cancelSubmit();
  };

  const reset = (): void => {
    form.reset();
  };

  const reinitialize = (newBaseline: FormReinitializeInput<TFields>): void => {
    form.reinitialize(newBaseline);
  };

  return {
    value: valueSig.asReadonly(),
    rawValue: rawValueSig.asReadonly(),
    dirty: dirtySig.asReadonly(),
    touched: touchedSig.asReadonly(),
    pending: pendingSig.asReadonly(),
    valid: validSig.asReadonly(),
    invalid: invalidSig.asReadonly(),
    issues: issuesSig.asReadonly(),
    serverIssues: serverIssuesSig.asReadonly(),
    submissionStatus: submissionStatusSig.asReadonly(),
    submitting: submittingSig.asReadonly(),
    form,
    fields: form.fields,
    validate,
    submit,
    cancelSubmit,
    reset,
    reinitialize,
    dispose,
  };
}
