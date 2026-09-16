import { getCurrentScope, onScopeDispose, shallowReadonly, shallowRef } from "vue";
import type {
  FormFieldsRecord,
  FormInstance,
  FormReinitializeInput,
  FormValues,
  SubmitAction,
  SubmitOptions,
  ValidationTriggerMode,
} from "../../core/types.js";
import type { VueAdapterOptions, VueFormHandle } from "./types.js";

/**
 * Creates a Vue shallowRef projection over a root FormInstance coordinator.
 *
 * Exposes readonly shallow refs for aggregate form state and stable submission actions.
 * Preserves canonical Model A submission lifecycle without state duplication.
 */
export function createVueForm<TFields extends FormFieldsRecord = FormFieldsRecord>(
  form: FormInstance<TFields>,
  options?: VueAdapterOptions,
): VueFormHandle<TFields> {
  const valueRef = shallowRef(form.value.get());
  const rawValueRef = shallowRef(form.rawValue.get());
  const dirtyRef = shallowRef(form.dirty.get());
  const touchedRef = shallowRef(form.touched.get());
  const pendingRef = shallowRef(form.pending.get());
  const validRef = shallowRef(form.valid.get());
  const invalidRef = shallowRef(form.invalid.get());
  const issuesRef = shallowRef(form.issues.get());
  const serverIssuesRef = shallowRef(form.serverIssues.get());
  const submissionStatusRef = shallowRef(form.submissionStatus.get());
  const submittingRef = shallowRef(form.submitting.get());

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const unsubscribe of unsubs) {
      unsubscribe();
    }
  };

  const unsubs = [
    form.value.subscribe((v) => {
      if (!isDisposed) valueRef.value = v;
    }),
    form.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueRef.value = r;
    }),
    form.dirty.subscribe((d) => {
      if (!isDisposed) dirtyRef.value = d;
    }),
    form.touched.subscribe((t) => {
      if (!isDisposed) touchedRef.value = t;
    }),
    form.pending.subscribe((p) => {
      if (!isDisposed) pendingRef.value = p;
    }),
    form.valid.subscribe((v) => {
      if (!isDisposed) validRef.value = v;
    }),
    form.invalid.subscribe((iv) => {
      if (!isDisposed) invalidRef.value = iv;
    }),
    form.issues.subscribe((iss) => {
      if (!isDisposed) issuesRef.value = iss;
    }),
    form.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesRef.value = si;
    }),
    form.submissionStatus.subscribe((ss) => {
      if (!isDisposed) submissionStatusRef.value = ss;
    }),
    form.submitting.subscribe((sub) => {
      if (!isDisposed) submittingRef.value = sub;
    }),
  ];

  if (options?.onDispose) {
    options.onDispose(dispose);
  } else if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  return {
    value: shallowReadonly(valueRef),
    rawValue: shallowReadonly(rawValueRef),
    dirty: shallowReadonly(dirtyRef),
    touched: shallowReadonly(touchedRef),
    pending: shallowReadonly(pendingRef),
    valid: shallowReadonly(validRef),
    invalid: shallowReadonly(invalidRef),
    issues: shallowReadonly(issuesRef),
    serverIssues: shallowReadonly(serverIssuesRef),
    submissionStatus: shallowReadonly(submissionStatusRef),
    submitting: shallowReadonly(submittingRef),
    form,
    fields: form.fields,
    validate: (trigger?: ValidationTriggerMode) => form.validate(trigger),
    submit: <TResult = void>(
      action?: SubmitAction<FormValues<TFields>, TResult>,
      submitOptions?: SubmitOptions,
    ) => form.submit(action, submitOptions),
    cancelSubmit: () => form.cancelSubmit(),
    reset: () => form.reset(),
    reinitialize: (newBaseline: FormReinitializeInput<TFields>) => form.reinitialize(newBaseline),
    dispose,
  };
}

/**
 * Idiomatic Vue 3 composable alias for createVueForm.
 */
export const useViiForm = createVueForm;
