/**
 * Vii Form Vue adapter entrypoint (`@vii-labs/form/vue`).
 *
 * Exposes readonly shallowRef projections over Vii Form reactive nodes:
 * - createVueField (fine-grained leaf field refs & actions)
 * - createVueForm (root form aggregate refs & Model A submission lifecycle)
 * - createVueFieldArray (repeatable collection refs & stable identity actions)
 */

export { createVueField, useViiField } from "./field.js";
export { createVueForm, useViiForm } from "./form.js";
export { createVueFieldArray, useViiFieldArray } from "./array.js";
export { provideForm, useFormContext } from "./context.js";
export { vViiField } from "./directive.js";

export type {
  VueAdapterOptions,
  VueArrayHandle,
  VueArrayRefs,
  VueFieldBindProps,
  VueFieldComposable,
  VueFieldHandle,
  VueFieldRefs,
  VueFormHandle,
  VueFormRefs,
  VueReadonlyRef,
} from "./types.js";
