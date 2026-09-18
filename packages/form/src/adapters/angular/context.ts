import { inject, InjectionToken, type Provider } from "@angular/core";
import type { FormFieldsRecord, FormInstance } from "../../core/types.js";

/**
 * Angular InjectionToken used for scoped FormInstance reference transport.
 */
export const VII_FORM_TOKEN = new InjectionToken<FormInstance<FormFieldsRecord>>("VII_FORM");

/**
 * Creates an Angular Provider binding the given FormInstance to VII_FORM_TOKEN.
 *
 * Provides scoped reference transport without global mutable state or singletons.
 */
export function provideViiForm<TFields extends FormFieldsRecord = FormFieldsRecord>(
  form: FormInstance<TFields>,
): Provider {
  return {
    provide: VII_FORM_TOKEN,
    useValue: form,
  };
}

/**
 * Injects the nearest scoped FormInstance from the current Angular injector hierarchy.
 *
 * Throws a descriptive error if no FormInstance is provided in the current injector tree.
 */
export function injectViiForm<
  TFields extends FormFieldsRecord = FormFieldsRecord,
>(): FormInstance<TFields> {
  const form = inject(VII_FORM_TOKEN, { optional: true });
  if (!form) {
    throw new Error("ViiForm not found. Use provideViiForm() upstream.");
  }
  return form as FormInstance<TFields>;
}
