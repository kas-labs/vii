/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Computed, ReadableState, Scope } from "@vii-labs/core";
import type { FormReinitializeBaseline } from "./baseline-types.js";
import type { FieldState } from "./types.js";
import type { FieldIssue } from "../validation/types.js";

/**
 * Union of supported node types in a composable form tree.
 */
export type FormNode = FieldState<any, any> | FieldGroup<any>;

/**
 * Record of child form nodes keyed by property names.
 */
export type FormFieldsRecord = Record<string, any>;

/**
 * Recursively maps a form node type to its corresponding materialized domain value type.
 */
export type FormValueFor<T> = T extends { readonly kind: "field"; getValue(): infer V }
  ? V
  : T extends { readonly kind: "group"; fields: infer F }
    ? { [K in keyof F]: FormValueFor<F[K]> }
    : never;

/**
 * Recursively maps a form node type to its corresponding materialized raw presentation value type.
 */
export type FormRawValueFor<T> = T extends { readonly kind: "field"; getRawValue(): infer R }
  ? R
  : T extends { readonly kind: "group"; fields: infer F }
    ? { [K in keyof F]: FormRawValueFor<F[K]> }
    : never;

/**
 * Materialized domain object value shape for a collection of form fields.
 */
export type FormValues<TFields extends FormFieldsRecord> = {
  [K in keyof TFields]: FormValueFor<TFields[K]>;
};

/**
 * Materialized raw presentation object value shape for a collection of form fields.
 */
export type FormRawValues<TFields extends FormFieldsRecord> = {
  [K in keyof TFields]: FormRawValueFor<TFields[K]>;
};

/**
 * Configuration options for creating a nested field group.
 */
export interface CreateFieldGroupOptions<
  TFields extends Record<string, any> = Record<string, any>,
> {
  /**
   * Child field or group nodes that comprise this group.
   */
  readonly fields: TFields;

  /**
   * Optional parent Scope that deterministically owns the group lifecycle.
   */
  readonly scope?: Scope | undefined;
}

/**
 * Reactive state and interaction contract for a nested field group.
 */
export interface FieldGroup<TFields extends Record<string, any> = Record<string, any>> {
  /**
   * Node kind discriminator.
   */
  readonly kind: "group";

  /**
   * Direct child field/group nodes.
   */
  readonly fields: TFields;

  /**
   * Lazy computed signal returning aggregate domain values object.
   */
  readonly value: ReadableState<FormValues<TFields>>;

  /**
   * Lazy computed signal returning aggregate raw presentation values object.
   */
  readonly rawValue: ReadableState<FormRawValues<TFields>>;

  /**
   * Lazy computed signal indicating whether any descendant field has been touched.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field is currently validating asynchronously.
   */
  readonly pending: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether all descendant fields are valid.
   */
  readonly valid: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field is invalid.
   */
  readonly invalid: Computed<boolean>;

  /**
   * Lazy computed signal returning aggregate issues from all descendant nodes with prefixed paths.
   */
  readonly issues: Computed<readonly FieldIssue[]>;

  /**
   * Returns current aggregate domain values synchronously.
   */
  getValue(): FormValues<TFields>;

  /**
   * Returns current aggregate raw presentation values synchronously.
   */
  getRawValue(): FormRawValues<TFields>;

  /**
   * Atomically resets all descendant fields and groups to their original baseline.
   */
  reset(): void;

  /**
   * Disposes the group and all owned descendant resources idempotently.
   */
  dispose(): void;
}

/**
 * Configuration options for creating a root form instance.
 */
export interface CreateFormOptions<TFields extends Record<string, any> = Record<string, any>> {
  /**
   * Child field or group nodes that comprise this form.
   */
  readonly fields: TFields;

  /**
   * Optional parent Scope that deterministically owns the form lifecycle.
   */
  readonly scope?: Scope | undefined;
}

/**
 * Root form coordinator managing tree composition, aggregate signals, reset, and whole-form baseline replacement.
 */
export interface FormInstance<TFields extends Record<string, any> = Record<string, any>> {
  /**
   * Node kind discriminator.
   */
  readonly kind: "form";

  /**
   * Direct child field/group nodes.
   */
  readonly fields: TFields;

  /**
   * Lazy computed signal returning aggregate domain values object.
   */
  readonly value: ReadableState<FormValues<TFields>>;

  /**
   * Lazy computed signal returning aggregate raw presentation values object.
   */
  readonly rawValue: ReadableState<FormRawValues<TFields>>;

  /**
   * Lazy computed signal indicating whether any descendant field has been touched.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field is currently validating asynchronously.
   */
  readonly pending: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether all descendant fields are valid.
   */
  readonly valid: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field is invalid.
   */
  readonly invalid: Computed<boolean>;

  /**
   * Lazy computed signal returning aggregate issues from all descendant nodes with prefixed paths.
   */
  readonly issues: Computed<readonly FieldIssue[]>;

  /**
   * Returns current aggregate domain values synchronously.
   */
  getValue(): FormValues<TFields>;

  /**
   * Returns current aggregate raw presentation values synchronously.
   */
  getRawValue(): FormRawValues<TFields>;

  /**
   * Atomically resets all descendant fields and groups to their current baseline.
   */
  reset(): void;

  /**
   * Atomically replaces the whole-form baseline with newBaseline, resets touched to false, and marks dirty as false.
   * Parser-aware fields with distinct Raw/Value types require `{ value, rawValue }` baselines per field.
   */
  reinitialize(newBaseline: FormReinitializeBaseline<TFields>): void;

  /**
   * Disposes the form and all owned descendant resources idempotently.
   */
  dispose(): void;
}
