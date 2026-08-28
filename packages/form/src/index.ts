/**
 * Vii Form public root entrypoint.
 *
 * Exposes core reactive primitives for building fine-grained form trees:
 * - createField (leaf state)
 * - createFieldGroup (nested object state)
 * - createForm (root form coordinator)
 */
export { createField } from "./core/field.js";
export { createFieldGroup } from "./core/group.js";
export { createForm } from "./core/form.js";

export type {
  CreateFieldGroupOptions,
  CreateFieldOptions,
  CreateFormOptions,
  FieldEqualityFn,
  FieldGroup,
  FieldState,
  FormFieldsRecord,
  FormInstance,
  FormNode,
  FormValueFor,
  FormValues,
} from "./core/types.js";
