import { sanitizeValidationIssue, type ValidationRevisionController } from "./revision.js";
import type {
  AnyValidationRule,
  FieldIssue,
  ValidationIssue,
  ValidationRuleContext,
  ValidationStatus,
  ValidationTriggerMode,
} from "./types.js";

/**
 * Callbacks allowing the validation executor to atomically update host field state.
 */
export interface ValidationHostCallbacks {
  readonly isDisposed: () => boolean;
  readonly getIssues: () => readonly FieldIssue[];
  readonly setPending: (pending: boolean) => void;
  readonly commitResults: (issues: readonly ValidationIssue[], status: ValidationStatus) => void;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

/**
 * Executes synchronous and asynchronous validation rules against a domain value.
 *
 * Mixed-rule contract (FORM_ARCHITECTURE §8.1, F4 Fixture 9):
 * - Sync issues from every synchronously-returning rule are aggregated.
 * - If any sync issue exists, active async work is cancelled and async results are not committed.
 * - Async rules may still be invoked when listed after sync rules that pass; if a later sync rule
 *   fails, already-started async work is cancelled without commit (F4 Fixture 9).
 */
export function executeFieldValidation<TValue>(
  rules: readonly AnyValidationRule<TValue>[],
  value: TValue,
  trigger: ValidationTriggerMode,
  revision: number,
  controller: AbortController,
  revisionCtrl: ValidationRevisionController,
  callbacks: ValidationHostCallbacks,
): Promise<readonly FieldIssue[]> | readonly FieldIssue[] {
  if (rules.length === 0) {
    revisionCtrl.cancelActive();
    callbacks.commitResults([], "valid");
    callbacks.setPending(false);
    return callbacks.getIssues();
  }

  const collectedSyncIssues: ValidationIssue[] = [];
  const pendingAsyncCalls: Array<Promise<unknown>> = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]!;
    const ctx: ValidationRuleContext = { trigger, signal: controller.signal };
    const res = rule(value, ctx as never);

    if (isPromiseLike(res)) {
      pendingAsyncCalls.push(
        Promise.resolve(res).catch((err) => {
          if (controller.signal.aborted || (err && (err as Error).name === "AbortError")) {
            return null;
          }
          throw err;
        }),
      );
    } else if (res !== null && res !== undefined) {
      if (Array.isArray(res)) {
        for (let j = 0; j < res.length; j++) {
          collectedSyncIssues.push(sanitizeValidationIssue(res[j]));
        }
      } else {
        collectedSyncIssues.push(sanitizeValidationIssue(res));
      }
    }
  }

  if (collectedSyncIssues.length > 0 || pendingAsyncCalls.length === 0) {
    revisionCtrl.cancelActive();
    callbacks.commitResults(
      collectedSyncIssues,
      collectedSyncIssues.length === 0 ? "valid" : "invalid",
    );
    callbacks.setPending(false);
    return callbacks.getIssues();
  }

  callbacks.setPending(true);
  return (async (): Promise<readonly FieldIssue[]> => {
    try {
      const asyncResults = await Promise.all(pendingAsyncCalls);
      if (!revisionCtrl.isCurrent(revision, controller.signal) || callbacks.isDisposed()) {
        return callbacks.getIssues();
      }

      const collectedAsyncIssues: ValidationIssue[] = [...collectedSyncIssues];
      for (let i = 0; i < asyncResults.length; i++) {
        const r = asyncResults[i];
        if (r !== null && r !== undefined) {
          if (Array.isArray(r)) {
            for (let j = 0; j < r.length; j++) {
              collectedAsyncIssues.push(sanitizeValidationIssue(r[j]));
            }
          } else {
            collectedAsyncIssues.push(sanitizeValidationIssue(r));
          }
        }
      }

      callbacks.commitResults(
        collectedAsyncIssues,
        collectedAsyncIssues.length === 0 ? "valid" : "invalid",
      );
      callbacks.setPending(false);
      return callbacks.getIssues();
    } catch (asyncErr) {
      if (revisionCtrl.isCurrent(revision, controller.signal) && !callbacks.isDisposed()) {
        callbacks.setPending(false);
      }
      throw asyncErr;
    } finally {
      revisionCtrl.releaseController(controller);
    }
  })();
}
