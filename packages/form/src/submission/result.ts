import { sanitizeServerIssue } from "./server-issues.js";
import type { ServerIssue } from "./types.js";

/**
 * Parsed discrimination of user submit action outcome.
 */
export type ParsedSubmitActionResult<TResult> =
  | { readonly ok: true; readonly result: TResult }
  | { readonly ok: false; readonly sanitizedIssues: readonly ServerIssue[] };

/**
 * Validates and discriminates the submit action return value with fail-closed boundary enforcement.
 *
 * If the result explicitly declares `ok === false`, it requires an `issues` array where every
 * issue sanitizes successfully; otherwise throws TypeError and fails closed.
 */
export function parseSubmitActionResult<TResult>(raw: unknown): ParsedSubmitActionResult<TResult> {
  if (raw !== null && typeof raw === "object") {
    const candidate = raw as Record<string, unknown>;

    if (candidate["ok"] === false) {
      const rawIssues = candidate["issues"];
      if (!Array.isArray(rawIssues)) {
        throw new TypeError(
          "Invalid submit action failure result: expected an 'issues' array when 'ok' is false",
        );
      }

      // Atomic sanitization: map all issues; if any is malformed, throws before returning/routing
      const sanitized = rawIssues.map((iss) => sanitizeServerIssue(iss));
      return {
        ok: false,
        sanitizedIssues: Object.freeze(sanitized),
      };
    }

    if (candidate["ok"] === true) {
      if ("result" in candidate) {
        return {
          ok: true,
          result: candidate["result"] as TResult,
        };
      }
      return {
        ok: true,
        result: candidate as unknown as TResult,
      };
    }
  }

  return {
    ok: true,
    result: raw as TResult,
  };
}

/**
 * Authoritatively determines whether an action rejection represents intentional cancellation.
 * Does not inspect arbitrary human-readable error message strings.
 */
export function isAbortCancellation(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) {
    return true;
  }
  if (err !== null && typeof err === "object") {
    const name = (err as Error).name;
    const code = (err as { code?: string }).code;
    return name === "AbortError" || code === "ABORT_ERR";
  }
  return false;
}
