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

/**
 * Executes a list of synchronous and asynchronous validation rules against a domain value.
 * Handles monotonic revision checking, AbortSignal propagation, debounce cancellation, and atomic result commit.
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

    if (
      res !== null &&
      typeof res === "object" &&
      typeof (res as Promise<unknown>).then === "function"
    ) {
      pendingAsyncCalls.push(
        Promise.resolve(res).catch((err) => {
          if (
            controller.signal.aborted ||
            (err && (err.name === "AbortError" || err.code === "ABORT_ERR"))
          ) {
            return null;
          }
          throw err;
        }),
      );
    } else if (res !== null && res !== undefined) {
      if (Array.isArray(res)) {
        for (let j = 0; j < res.length; j++)
          collectedSyncIssues.push(sanitizeValidationIssue(res[j]));
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
            for (let j = 0; j < r.length; j++)
              collectedAsyncIssues.push(sanitizeValidationIssue(r[j]));
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
