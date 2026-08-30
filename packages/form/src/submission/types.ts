import type { FormIssueBase } from "../parsers/types.js";
import type { FieldIssue, FieldPathSegment } from "../validation/types.js";

/**
 * Terminal and transient statuses in the Model A submission state machine.
 */
export type SubmissionStatus =
  "idle" | "validating" | "submitting" | "succeeded" | "failed" | "cancelled";

/**
 * Conflict resolution strategy when a submission is initiated while another is active.
 */
export type DuplicateSubmitPolicy = "supersede" | "drop" | "reject";

/**
 * Contextual payload passed to the application submit action.
 */
export interface SubmitContext {
  /**
   * AbortSignal tied to this submission generation.
   */
  readonly signal: AbortSignal;
}

/**
 * Structured issue originated by the backend/server.
 */
export interface ServerIssue extends FormIssueBase {
  readonly source: "server";
}

/**
 * Raw server issue input acceptable when returned from submit actions.
 */
export interface ServerIssueInput {
  readonly code: string;
  readonly message?: string | undefined;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly source?: "server" | undefined;
}

/**
 * Discriminated result returned by a submit action handler.
 */
export type SubmitActionResult<TResult> =
  | TResult
  | { readonly ok: true; readonly result: TResult }
  | { readonly ok: false; readonly issues: readonly (ServerIssueInput | string)[] };

/**
 * User-supplied asynchronous or synchronous submission handler function.
 */
export type SubmitAction<TOutput, TResult = void> = (
  output: TOutput,
  context: SubmitContext,
) => Promise<SubmitActionResult<TResult>> | SubmitActionResult<TResult>;

/**
 * Discriminated result returned by `form.submit()`.
 */
export type FormSubmitResult<TResult, TIssue = FieldIssue> =
  | { readonly status: "succeeded"; readonly result: TResult }
  | { readonly status: "invalid"; readonly issues: readonly TIssue[] }
  | { readonly status: "server-invalid"; readonly issues: readonly ServerIssue[] }
  | { readonly status: "cancelled" };

/**
 * Optional configuration passed to `form.submit()`.
 */
export interface SubmitOptions {
  /**
   * Policy to apply if another submit is currently validating or submitting.
   * Defaults to "supersede".
   */
  readonly duplicatePolicy?: DuplicateSubmitPolicy | undefined;
}

/**
 * Map of array tree paths to submitted item ID sequences.
 */
export type ArraySnapshotMap = Map<string, readonly (string | number)[]>;
