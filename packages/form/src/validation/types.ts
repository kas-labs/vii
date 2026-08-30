import type { FormIssueBase, IssueSource, ParseIssue } from "../parsers/types.js";
import type { ServerIssue } from "../submission/types.js";

/**
 * Structural segment in a field issue path (property key or array index).
 */
export type FieldPathSegment = string | number;

/**
 * Trigger event that initiates validation execution.
 */
export type ValidationTriggerMode = "change" | "blur" | "submit" | "manual";

/**
 * Current validation status of a form node.
 * - "unvalidated": no validation has executed yet or state was reset.
 * - "valid": all validation rules passed cleanly.
 * - "invalid": at least one validation or parse issue exists.
 */
export type ValidationStatus = "unvalidated" | "valid" | "invalid";

/**
 * Structured issue produced by a synchronous or asynchronous validation rule.
 */
export interface ValidationIssue extends FormIssueBase {
  readonly source: "validation";
  readonly ruleId?: string | undefined;
}

/**
 * Union of all structured issues that can attach to a form field.
 */
export type FieldIssue = ValidationIssue | ParseIssue | ServerIssue;

/**
 * Raw input shape acceptable when returning issues from validation rules.
 */
export interface ValidationIssueInput {
  readonly code: string;
  readonly message?: string | undefined;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly source?: IssueSource | undefined;
  readonly ruleId?: string | undefined;
}

/**
 * Context provided to validation rules during execution.
 */
export interface ValidationRuleContext {
  /**
   * The trigger mode that initiated this validation run.
   */
  readonly trigger: ValidationTriggerMode;

  /**
   * Optional structural path of the node being validated.
   */
  readonly path?: readonly FieldPathSegment[] | undefined;

  /**
   * AbortSignal tied to this validation revision for async cancellation.
   */
  readonly signal?: AbortSignal | undefined;
}

/**
 * Synchronous validation rule function.
 */
export type SyncValidationRule<T> = (
  value: T,
  context: ValidationRuleContext,
) => ValidationIssueInput | readonly ValidationIssueInput[] | null | undefined;

/**
 * Asynchronous validation rule function receiving an AbortSignal.
 */
export type AsyncValidationRule<T> = (
  value: T,
  context: ValidationRuleContext & { readonly signal: AbortSignal },
) => Promise<ValidationIssueInput | readonly ValidationIssueInput[] | null | undefined>;

/**
 * General validation rule function that can return sync or async issues.
 */
export type ValidationRule<T> = (
  value: T,
  context: ValidationRuleContext & { readonly signal?: AbortSignal | undefined },
) =>
  | ValidationIssueInput
  | readonly ValidationIssueInput[]
  | null
  | undefined
  | Promise<ValidationIssueInput | readonly ValidationIssueInput[] | null | undefined>;

/**
 * Union of all accepted validation rule signatures.
 */
export type AnyValidationRule<T> =
  ValidationRule<T> | AsyncValidationRule<T> | SyncValidationRule<T>;
