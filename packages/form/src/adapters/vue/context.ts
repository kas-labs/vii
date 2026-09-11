import { inject, provide, type InjectionKey } from "vue";
import type { FormFieldsRecord, FormInstance } from "../../core/types.js";

/**
 * Vue InjectionKey for canonical FormInstance reference transport.
 */
export const VII_FORM_KEY: InjectionKey<FormInstance<FormFieldsRecord>> =
  Symbol("vii-form-instance");

/**
 * Provides a canonical FormInstance reference to descendant components via Vue's provide/inject.
 * Implements pure reference transport with zero duplicated state or reactive overhead.
 */
export function provideForm<TFields extends FormFieldsRecord = FormFieldsRecord>(
  form: FormInstance<TFields>,
): void {
  provide(VII_FORM_KEY, form as unknown as FormInstance<FormFieldsRecord>);
}

/**
 * Injects the nearest canonical FormInstance provided by provideForm.
 */
export function useFormContext<
  TFields extends FormFieldsRecord = FormFieldsRecord,
>(): FormInstance<TFields> {
  const form = inject(VII_FORM_KEY);
  if (!form) {
    throw new Error("useFormContext must be used within a component tree with provideForm");
  }
  return form as FormInstance<TFields>;
}
