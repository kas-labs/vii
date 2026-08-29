import type { Computed, ReadableState, Scope } from "@vii-labs/core";
import type { FieldParser, ParseIssue, ParseStatus } from "../parsers/types.js";
import type {
  AnyValidationRule,
  FieldIssue,
  ValidationStatus,
  ValidationTriggerMode,
} from "../validation/types.js";

export type {
  CreateFieldGroupOptions,
  CreateFormOptions,
  FieldGroup,
  FormFieldsRecord,
  FormInstance,
  FormNode,
  FormRawValueFor,
  FormRawValues,
  FormValueFor,
  FormValues,
} from "./tree-types.js";

export type {
  FieldParser,
  FormIssueBase,
  IssueSource,
  NumberParserOptions,
  ParseIssue,
  ParseResult,
  ParseStatus,
  StringParserOptions,
} from "../parsers/types.js";

export type {
  AnyValidationRule,
  AsyncValidationRule,
  FieldIssue,
  FieldPathSegment,
  SyncValidationRule,
  ValidationIssue,
  ValidationIssueInput,
  ValidationRule,
  ValidationRuleContext,
  ValidationStatus,
  ValidationTriggerMode,
} from "../validation/types.js";

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
   * Optional initial raw presentation value.
   * If omitted on an unparsed field, defaults to initialValue.
   */
  readonly initialRawValue?: TRaw | undefined;

  /**
   * Optional synchronous parser converting raw presentation input into domain value.
   */
  readonly parser?: FieldParser<TRaw, TValue> | undefined;

  /**
   * Optional list of synchronous, asynchronous, or Standard Schema validation rules.
   */
  readonly rules?: readonly AnyValidationRule<TValue>[] | undefined;

  /**
   * Trigger mode(s) that initiate validation execution.
   * Defaults to "change".
   */
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;

  /**
   * Debounce duration in milliseconds for "change" trigger validations.
   * Defaults to 0 (no debounce).
   */
  readonly debounceMs?: number | undefined;

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
   * Reactive signal holding initial domain baseline value.
   */
  readonly initialValue: ReadableState<TValue>;

  /**
   * Reactive signal holding initial raw presentation baseline value.
   */
  readonly initialRawValue: ReadableState<TRaw>;

  /**
   * Reactive signal indicating whether the field has been touched by user interaction.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether current domain value differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Reactive signal indicating whether asynchronous validation is currently in flight.
   */
  readonly pending: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether the field is valid (no parse issues and no validation issues).
   */
  readonly valid: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether the field is invalid (has parse issue or validation issues).
   */
  readonly invalid: Computed<boolean>;

  /**
   * Reactive signal holding the combined list of active field issues (parse and validation).
   */
  readonly issues: ReadableState<readonly FieldIssue[]>;

  /**
   * Reactive signal holding the current active parse issue, or null if parsing succeeded.
   */
  readonly parseIssue: ReadableState<ParseIssue | null>;

  /**
   * Reactive signal holding the current parsing status ("unparsed" | "parsed" | "invalid").
   */
  readonly parseStatus: ReadableState<ParseStatus>;

  /**
   * Reactive signal holding the current validation status ("unvalidated" | "valid" | "invalid").
   */
  readonly validationStatus: ReadableState<ValidationStatus>;

  /**
   * Returns the current domain value synchronously.
   */
  getValue(): TValue;

  /**
   * Returns the current raw presentation value synchronously.
   */
  getRawValue(): TRaw;

  /**
   * Updates the domain value and triggers change validation.
   */
  setValue(next: TValue): void;

  /**
   * Updates the raw presentation value, runs parser if configured, and triggers validation.
   */
  setRawValue(raw: TRaw): void;

  /**
   * Sets the touched state of the field. Triggers "blur" validation if touched becomes true.
   */
  setTouched(touched?: boolean): void;

  /**
   * Convenience method to mark the field as touched.
   */
  markTouched(): void;

  /**
   * Sets explicit validation issues manually.
   */
  setIssues(issues: readonly FieldIssue[]): void;

  /**
   * Manually executes validation rules with trigger mode "manual" (or specified trigger).
   */
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];

  /**
   * Atomically restores the field to its initial baseline value, raw value, and untouched state.
   * On parsed fields, accepts optional new baseline (nextInitial, nextInitialRaw).
   */
  reset(nextInitial?: TValue, nextInitialRaw?: TRaw): void;

  /**
   * Disposes all internal field subscriptions, computeds, and resources idempotently.
   */
  dispose(): void;
}
