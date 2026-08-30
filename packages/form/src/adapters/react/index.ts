/**
 * Vii Form React adapter entrypoint (`@vii-labs/form/react`).
 *
 * Exposes React hooks over Vii Form reactive nodes using useSyncExternalStore:
 * - useField (fine-grained leaf field state & actions)
 * - useForm (root form aggregate state & submission lifecycle)
 * - useFieldArray (repeatable collection state & stable identity actions)
 */

export { useField } from "./use-field.js";
export { useForm } from "./use-form.js";
export { useFieldArray } from "./use-field-array.js";

export type {
  ReactArrayBinding,
  ReactArraySnapshot,
  ReactFieldBinding,
  ReactFieldSnapshot,
  ReactFormBinding,
  ReactFormSnapshot,
} from "./types.js";
