import type { FormFieldsRecord, FormInstance } from "../../core/types.js";
import { bridgeSignal, createTeardown } from "./destroy.js";
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
  const { isDisposed, unsubs, dispose } = createTeardown(options);

  return {
    value: bridgeSignal(form.value, unsubs, isDisposed),
    rawValue: bridgeSignal(form.rawValue, unsubs, isDisposed),
    dirty: bridgeSignal(form.dirty, unsubs, isDisposed),
    touched: bridgeSignal(form.touched, unsubs, isDisposed),
    pending: bridgeSignal(form.pending, unsubs, isDisposed),
    valid: bridgeSignal(form.valid, unsubs, isDisposed),
    invalid: bridgeSignal(form.invalid, unsubs, isDisposed),
    issues: bridgeSignal(form.issues, unsubs, isDisposed),
    serverIssues: bridgeSignal(form.serverIssues, unsubs, isDisposed),
    submissionStatus: bridgeSignal(form.submissionStatus, unsubs, isDisposed),
    submitting: bridgeSignal(form.submitting, unsubs, isDisposed),
    form,
    fields: form.fields,
    validate: (trigger) => form.validate(trigger),
    submit: (action, submitOptions) => form.submit(action, submitOptions),
    cancelSubmit: () => form.cancelSubmit(),
    reset: () => form.reset(),
    reinitialize: (newBaseline) => form.reinitialize(newBaseline),
    dispose,
  };
}
