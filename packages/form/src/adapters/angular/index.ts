/**
 * Vii Form Angular adapter entrypoint (`@vii-labs/form/angular`).
 *
 * Exposes native Angular Signals projections over Vii Form reactive nodes:
 * - createAngularField / toAngularField (fine-grained leaf field signals & actions)
 * - createAngularForm (root form aggregate signals & Model A submission lifecycle)
 * - createAngularFieldArray (repeatable collection signals & stable identity actions)
 */

export { createAngularField, toAngularField } from "./field.js";
export { createAngularForm } from "./form.js";
export { createAngularFieldArray } from "./array.js";

export type {
  AngularAdapterOptions,
  AngularArrayHandle,
  AngularArraySignals,
  AngularFieldHandle,
  AngularFieldSignals,
  AngularFormHandle,
  AngularFormSignals,
  DestroyRefLike,
} from "./types.js";
