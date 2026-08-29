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

export type { FormReinitializeInput } from "./baseline-types.js";

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
 * Parserless field configuration: Raw === Value with no parser.
 */
export interface ParserlessCreateFieldOptions<TValue> {
  readonly initialValue: TValue;
  readonly parser?: undefined;
  readonly initialRawValue?: undefined;
  readonly rules?: readonly AnyValidationRule<TValue>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
  readonly debounceMs?: number | undefined;
  readonly equality?: FieldEqualityFn<TValue> | undefined;
  readonly scope?: Scope | undefined;
}

/**
 * Parser-aware field configuration: explicit domain and raw baselines are required.
 */
export interface ParsedCreateFieldOptions<TRaw, TValue> {
  readonly initialValue: TValue;
  readonly initialRawValue: TRaw;
  readonly parser: FieldParser<TRaw, TValue>;
  readonly rules?: readonly AnyValidationRule<TValue>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
  readonly debounceMs?: number | undefined;
  readonly equality?: FieldEqualityFn<TValue> | undefined;
  readonly scope?: Scope | undefined;
}

/**
 * Discriminated union for type-safe parserless vs parser-aware field creation.
 */
export type CreateFieldOptions<TValue, TRaw = TValue> =
  ParserlessCreateFieldOptions<TValue> | ParsedCreateFieldOptions<TRaw, TValue>;

/**
 * Reactive state and interaction contract for a standalone leaf field.
 */
export interface FieldState<TValue, TRaw = TValue> {
  readonly kind: "field";
  readonly value: ReadableState<TValue>;
  readonly rawValue: ReadableState<TRaw>;
  readonly touched: ReadableState<boolean>;
  readonly dirty: Computed<boolean>;
  readonly pending: ReadableState<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly issues: ReadableState<readonly FieldIssue[]>;
  readonly parseIssue: ReadableState<ParseIssue | null>;
  readonly parseStatus: ReadableState<ParseStatus>;
  readonly validationStatus: ReadableState<ValidationStatus>;
  getValue(): TValue;
  getRawValue(): TRaw;
  setValue(next: TValue): void;
  setRawValue(raw: TRaw): void;
  setTouched(touched?: boolean): void;
  markTouched(): void;
  setIssues(issues: readonly FieldIssue[]): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(): void;
  dispose(): void;
}
