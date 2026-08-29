import type { FormFieldsRecord, FormRawValues, FormValues } from "./tree-types.js";

/**
 * Internal explicit domain/raw baseline slice created by parent tree traversal.
 * Never inferred from application field values.
 */
export type InternalFieldBaseline<TValue, TRaw> = {
  readonly value: TValue;
  readonly rawValue: TRaw;
};

/**
 * Whole-form (or internal group) reinitialize input with separate domain and raw trees.
 * Baseline metadata lives outside any field TValue namespace.
 */
export type FormReinitializeInput<TFields extends FormFieldsRecord> = {
  readonly value: FormValues<TFields>;
  readonly rawValue: FormRawValues<TFields>;
};

/**
 * Internal group reinitialize receives matching value/raw subtree slices.
 */
export type InternalGroupReinitializeInput<TFields extends FormFieldsRecord> =
  FormReinitializeInput<TFields>;
