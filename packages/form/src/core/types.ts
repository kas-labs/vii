import type { Computed, ReadableState, Scope } from "@vii-labs/core";

/**
 * Equality comparison function used for baseline dirty comparison.
 */
export type FieldEqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Configuration options for creating a standalone leaf field.
 */
export interface CreateFieldOptions<TValue, TRaw = TValue> {
  /**
   * Initial domain value of the field.
   */
  readonly initialValue: TValue;

  /**
   * Optional initial raw presentation value. Defaults to `initialValue` when unparsed.
   */
  readonly initialRawValue?: TRaw | undefined;

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
export interface FieldState<TValue, TRaw = TValue> {
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
   */
  readonly rawValue: ReadableState<TRaw>;

  /**
   * Reactive signal holding initial baseline domain value.
   */
  readonly initialValue: ReadableState<TValue>;

  /**
   * Reactive signal holding initial baseline raw presentation value.
   */
  readonly initialRawValue: ReadableState<TRaw>;

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
  getRawValue(): TRaw;

  /**
   * Updates the domain value (and corresponding raw presentation value for unparsed fields).
   */
  setValue(next: TValue): void;

  /**
   * Updates the raw presentation value (and corresponding domain value for unparsed fields).
   */
  setRawValue(raw: TRaw): void;

  /**
   * Sets or toggles the touched state of the field.
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
