/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Computed, Diagnostics, ReadableState, Scope } from "@vii-labs/core";
import type { CreateFieldArrayOptions, FieldArray, FieldArrayItem } from "./array-types.js";
import type { FormReinitializeInput } from "./baseline-types.js";
import type { FieldState } from "./types.js";
import type {
  FormSubmitResult,
  ServerIssue,
  SubmissionStatus,
  SubmitAction,
  SubmitOptions,
} from "../submission/types.js";
import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";

export type { CreateFieldArrayOptions, FieldArray, FieldArrayItem };

/**
 * Union of supported node types in a composable form tree.
 */
export type FormNode = FieldState<any, any> | FieldGroup<any> | FieldArray<any> | FormInstance<any>;

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
    : T extends { readonly kind: "array"; getValue(): infer A }
      ? A
      : never;

/**
 * Recursively maps a form node type to its corresponding materialized raw presentation value type.
 */
export type FormRawValueFor<T> = T extends { readonly kind: "field"; getRawValue(): infer R }
  ? R
  : T extends { readonly kind: "group"; fields: infer F }
    ? { [K in keyof F]: FormRawValueFor<F[K]> }
    : T extends { readonly kind: "array"; getRawValue(): infer A }
      ? A
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
   * Reactive state signal returning server issues owned directly by this group node.
   */
  readonly serverIssues: ReadableState<readonly ServerIssue[]>;

  /**
   * Returns current aggregate domain values synchronously.
   */
  getValue(): FormValues<TFields>;

  /**
   * Returns current aggregate raw presentation values synchronously.
   */
  getRawValue(): FormRawValues<TFields>;

  /**
   * Explicitly triggers validation recursively on all descendant nodes.
   */
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];

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

  /**
   * Optional diagnostics collector for value-free structural lifecycle tracing.
   */
  readonly diagnostics?: Diagnostics | undefined;
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
   * Reactive state signal returning server issues owned at the root form level.
   */
  readonly serverIssues: ReadableState<readonly ServerIssue[]>;

  /**
   * Reactive state signal reflecting the latest submission lifecycle status under Model A.
   */
  readonly submissionStatus: ReadableState<SubmissionStatus>;

  /**
   * Lazy computed signal indicating whether the form is currently validating for submission or submitting.
   */
  readonly submitting: Computed<boolean>;

  /**
   * Returns current aggregate domain values synchronously.
   */
  getValue(): FormValues<TFields>;

  /**
   * Returns current aggregate raw presentation values synchronously.
   */
  getRawValue(): FormRawValues<TFields>;

  /**
   * Explicitly triggers validation recursively on all descendant nodes.
   */
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];

  /**
   * Submits the form by validating all fields, capturing an immutable snapshot, and invoking the submit action.
   */
  submit<TResult = void>(
    action?: SubmitAction<FormValues<TFields>, TResult>,
    options?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>>;

  /**
   * Cancels the active submission attempt if validating or submitting.
   */
  cancelSubmit(): void;

  /**
   * Atomically resets all descendant fields and groups to their current baseline.
   */
  reset(): void;

  /**
   * Atomically replaces the whole-form baseline with separate domain and raw presentation trees.
   * Resets touched to false and marks dirty as false.
   */
  reinitialize(newBaseline: FormReinitializeInput<TFields>): void;

  /**
   * Disposes the form and all owned descendant resources idempotently.
   */
  dispose(): void;
}
