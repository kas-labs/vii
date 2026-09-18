/** `@vii-labs/form/angular` adapter entrypoint. */

export { createAngularField } from "./field.js";
export { createAngularForm } from "./form.js";
export { createAngularFieldArray } from "./array.js";
export { ViiFieldDirective } from "./directive.js";
export { ViiControlValueAccessor } from "./cva.js";
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
