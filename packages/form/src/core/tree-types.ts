import type { Computed, ReadableState, Scope } from "@vii-labs/core";
import type { FieldState } from "./types.js";

/**
 * Record of child form nodes keyed by property names.
 */
export type FormFieldsRecord = Record<string, FormNode>;

/**
 * Union of supported node types in a composable form tree.
 */
export type FormNode = FieldState<unknown> | FieldGroup<FormFieldsRecord>;

/**
 * Recursively maps a form node type to its corresponding materialized domain/raw value type.
 */
export type FormValueFor<T> =
  T extends FieldState<infer V> ? V : T extends FieldGroup<infer F> ? FormValues<F> : never;

/**
 * Materialized object value shape for a collection of form fields.
 */
export type FormValues<TFields extends FormFieldsRecord> = {
  [K in keyof TFields]: FormValueFor<TFields[K]>;
};

/**
 * Configuration options for creating a nested field group.
 */
export interface CreateFieldGroupOptions<TFields extends FormFieldsRecord = FormFieldsRecord> {
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
export interface FieldGroup<TFields extends FormFieldsRecord = FormFieldsRecord> {
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
  readonly rawValue: ReadableState<FormValues<TFields>>;

  /**
   * Lazy computed signal indicating whether any descendant field has been touched.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Returns current aggregate domain values synchronously.
   */
  getValue(): FormValues<TFields>;

  /**
   * Returns current aggregate raw presentation values synchronously.
   */
  getRawValue(): FormValues<TFields>;

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
export interface CreateFormOptions<TFields extends FormFieldsRecord = FormFieldsRecord> {
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
export interface FormInstance<TFields extends FormFieldsRecord = FormFieldsRecord> {
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
  readonly rawValue: ReadableState<FormValues<TFields>>;

  /**
   * Lazy computed signal indicating whether any descendant field has been touched.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Returns current aggregate domain values synchronously.
   */
  getValue(): FormValues<TFields>;

  /**
   * Returns current aggregate raw presentation values synchronously.
   */
  getRawValue(): FormValues<TFields>;

  /**
   * Atomically resets all descendant fields and groups to their current baseline.
   */
  reset(): void;

  /**
   * Atomically replaces the whole-form baseline with newBaseline, resets touched to false, and marks dirty as false.
   */
  reinitialize(newBaseline: FormValues<TFields>): void;

  /**
   * Disposes the form and all owned descendant resources idempotently.
   */
  dispose(): void;
}
