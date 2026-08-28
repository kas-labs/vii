import type { Computed, ReadableState, Scope } from "@vii-labs/core";

/**
 * Equality comparison function used for baseline dirty comparison.
 */
export type FieldEqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Configuration options for creating a standalone leaf field.
 */
export interface CreateFieldOptions<TValue> {
  /**
   * Initial domain value of the field, also used as the initial unparsed raw presentation value.
   */
  readonly initialValue: TValue;

  /**
   * Optional equality function for baseline-relative dirty calculation.
   * Defaults to `Object.is`.
   */
  readonly equality?: FieldEqualityFn<TValue> | undefined;

  /**
   * Optional parent Scope that deterministically owns the field lifecycle.
   */
  readonly scope?: Scope | undefined;
}

/**
 * Reactive state and interaction contract for a standalone leaf field.
 */
export interface FieldState<TValue> {
  /**
   * Node kind discriminator.
   */
  readonly kind: "field";

  /**
   * Reactive signal holding current domain value.
   */
  readonly value: ReadableState<TValue>;

  /**
   * Reactive signal holding current raw presentation value.
   * For unparsed P1c fields, rawValue always has the same type and value as domain value.
   */
  readonly rawValue: ReadableState<TValue>;

  /**
   * Reactive signal indicating whether the field has been touched by user interaction.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether current value differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Returns the current domain value synchronously.
   */
  getValue(): TValue;

  /**
   * Returns the current raw presentation value synchronously.
   */
  getRawValue(): TValue;

  /**
   * Updates the domain value and raw presentation value.
   */
  setValue(next: TValue): void;

  /**
   * Updates the raw presentation value and domain value.
   */
  setRawValue(raw: TValue): void;

  /**
   * Sets the touched state of the field.
   */
  setTouched(touched?: boolean): void;

  /**
   * Convenience method to mark the field as touched.
   */
  markTouched(): void;

  /**
   * Atomically restores the field to its initial baseline value, raw value, and untouched state.
   */
  reset(): void;

  /**
   * Disposes all internal field subscriptions, computeds, and resources idempotently.
   */
  dispose(): void;
}
