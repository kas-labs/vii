/**
 * Vii Form Angular adapter entrypoint (`@vii-labs/form/angular`).
 *
 * Exposes native Angular Signals projections over Vii Form reactive nodes:
 * - createAngularField (fine-grained leaf field signals & actions)
 * - createAngularForm (root form aggregate signals & Model A submission lifecycle)
 * - createAngularFieldArray (repeatable collection signals & stable identity actions)
 */

export { createAngularField } from "./field.js";
export { createAngularForm } from "./form.js";
export { createAngularFieldArray } from "./array.js";
export { ViiFieldDirective } from "./directive.js";
export { createViiControlValueAccessor, ViiControlValueAccessor } from "./cva.js";
export { VII_FORM_TOKEN, injectViiForm, provideViiForm } from "./context.js";

export type {
  AngularAdapterOptions,
  AngularArrayHandle,
  AngularArraySignals,
  AngularFieldHandle,
  AngularFieldSignals,
  AngularFormHandle,
  AngularFormSignals,
  SupportedAngularFieldElement,
  SupportedAngularFieldState,
} from "./types.js";
