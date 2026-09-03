/**
 * Vii Form Vue adapter entrypoint (`@vii-labs/form/vue`).
 *
 * Exposes readonly shallowRef projections over Vii Form reactive nodes:
 * - createVueField / useViiField (fine-grained leaf field refs & actions)
 * - createVueForm (root form aggregate refs & Model A submission lifecycle)
 * - createVueFieldArray (repeatable collection refs & stable identity actions)
 */

export { createVueField, useViiField } from "./field.js";
export { createVueForm } from "./form.js";
export { createVueFieldArray } from "./array.js";

export type {
  VueAdapterOptions,
  VueArrayHandle,
  VueArrayRefs,
  VueFieldHandle,
  VueFieldRefs,
  VueFormHandle,
  VueFormRefs,
  VueReadonlyRef,
} from "./types.js";
