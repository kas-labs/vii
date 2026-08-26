import type { FieldPathSegment } from "./form-core.js";
import type { FormIssueBase } from "./parser.js";

// ---------------------------------------------------------------------------
// Server Issue Taxonomy (F6)
// ---------------------------------------------------------------------------

export interface ServerIssue extends FormIssueBase {
  readonly source: "server";
}

export interface ServerIssueInput {
  readonly code: string;
  readonly message?: string | undefined;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly source?: "server" | undefined;
}

export function sanitizeServerIssue(
  raw: unknown,
  defaultPath?: readonly FieldPathSegment[],
): ServerIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError(
      `Server issue must be an object, received ${raw === null ? "null" : typeof raw}`,
    );
  }

  const rawObj = raw as any;
  const rawCode = rawObj.code;
  if (typeof rawCode !== "string" || rawCode.trim() === "") {
    throw new TypeError(`Server issue missing or non-string "code" property`);
  }

  if (rawCode === "__proto__" || rawCode === "constructor" || rawCode === "prototype") {
    throw new Error(
      `Security error: Prototype pollution attempt blocked on server issue code "${rawCode}"`,
    );
  }

  let sanitizedPath: readonly FieldPathSegment[] | undefined = defaultPath;
  if (rawObj.path !== undefined && rawObj.path !== null) {
    if (!Array.isArray(rawObj.path)) {
      throw new TypeError(`Server issue "path" must be an array`);
    }
    const segments: FieldPathSegment[] = [];
    for (const seg of rawObj.path) {
      if (typeof seg === "string" || typeof seg === "number") {
        segments.push(seg);
      } else {
        throw new TypeError(
          `Server issue path segment must be string or number, received ${typeof seg}`,
        );
      }
    }
    sanitizedPath = Object.freeze(segments);
  }

  return Object.freeze({
    code: rawCode,
    message: typeof rawObj.message === "string" ? rawObj.message : undefined,
    path: sanitizedPath,
    source: "server",
  });
}

// ---------------------------------------------------------------------------
// Submission Status & Action Types (F6)
// ---------------------------------------------------------------------------

export type SubmissionStatus =
  "idle" | "validating" | "submitting" | "succeeded" | "failed" | "cancelled";

export type DuplicateSubmitPolicy = "drop" | "reject" | "supersede";

export interface SubmitContext {
  readonly signal: AbortSignal;
}

export type SubmitActionResult<TResult> =
  | TResult
  | { readonly ok: true; readonly result: TResult }
  | { readonly ok: false; readonly issues: readonly (ServerIssueInput | string)[] };

export type SubmitAction<TOutput, TResult = void> = (
  output: TOutput,
  context: SubmitContext,
) => Promise<SubmitActionResult<TResult>> | SubmitActionResult<TResult>;

export type FormSubmitResult<TResult, TIssue = any> =
  | { readonly status: "succeeded"; readonly result: TResult }
  | { readonly status: "invalid"; readonly issues: readonly TIssue[] }
  | { readonly status: "server-invalid"; readonly issues: readonly ServerIssue[] }
  | { readonly status: "cancelled" };

export interface SubmitOptions {
  readonly duplicatePolicy?: DuplicateSubmitPolicy | undefined;
}

// ---------------------------------------------------------------------------
// Snapshot & Routing Utilities
// ---------------------------------------------------------------------------

export function deepCloneSnapshot<T>(val: T): T {
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (val instanceof Date) {
    return new Date(val.getTime()) as any;
  }
  if (val instanceof RegExp) {
    return new RegExp(val.source, val.flags) as any;
  }
  if (Array.isArray(val)) {
    const copy: any[] = [];
    for (let i = 0; i < val.length; i++) {
      copy[i] = deepCloneSnapshot(val[i]);
    }
    return Object.freeze(copy) as any;
  }
  const copy: any = {};
  for (const key of Object.keys(val)) {
    if (Object.prototype.hasOwnProperty.call(val, key) || Object.hasOwn(val, key)) {
      copy[key] = deepCloneSnapshot((val as any)[key]);
    }
  }
  return Object.freeze(copy);
}

export interface ArraySnapshotEntry {
  readonly path: readonly FieldPathSegment[];
  readonly itemIds: readonly (string | number)[];
}

export type ArraySnapshotMap = Map<string, readonly (string | number)[]>;

export function createArraySnapshotKey(path: readonly FieldPathSegment[]): string {
  return path.join(".");
}
