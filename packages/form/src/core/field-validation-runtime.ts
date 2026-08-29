import { batch, type Scope } from "@vii-labs/core";
import type { ParseIssue, ParseStatus } from "../parsers/types.js";
import { executeFieldValidation, type ValidationHostCallbacks } from "../validation/executor.js";
import { ValidationRevisionController } from "../validation/revision.js";
import type {
  AnyValidationRule,
  FieldIssue,
  ValidationIssue,
  ValidationStatus,
  ValidationTriggerMode,
} from "../validation/types.js";
import type {
  FieldEqualityFn,
  ParsedCreateFieldOptions,
  ParserlessCreateFieldOptions,
} from "./types.js";

export const defaultFieldEquality: FieldEqualityFn<unknown> = (a, b) => Object.is(a, b);
const EXECUTION_ERROR_CODE = "validation.execution_error";

export interface SharedFieldConfig<TValue> {
  readonly rules: readonly AnyValidationRule<TValue>[];
  readonly debounceMs: number;
  readonly scope: Scope | undefined;
  readonly equality: FieldEqualityFn<TValue>;
  readonly triggerSet: Set<ValidationTriggerMode>;
}

export function isParsedOptions<TRaw, TValue>(
  options: ParserlessCreateFieldOptions<TValue> | ParsedCreateFieldOptions<TRaw, TValue>,
): options is ParsedCreateFieldOptions<TRaw, TValue> {
  return "parser" in options && options.parser !== undefined;
}

export function resolveValidationTriggers(
  validateOn: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined,
): Set<ValidationTriggerMode> {
  const triggerSet = new Set<ValidationTriggerMode>();
  if (validateOn !== undefined) {
    if (Array.isArray(validateOn)) {
      for (let i = 0; i < validateOn.length; i++) triggerSet.add(validateOn[i]!);
    } else {
      triggerSet.add(validateOn as ValidationTriggerMode);
    }
  } else {
    triggerSet.add("change");
  }
  return triggerSet;
}

export function readSharedConfig<TRaw, TValue>(
  options: ParserlessCreateFieldOptions<TValue> | ParsedCreateFieldOptions<TRaw, TValue>,
): SharedFieldConfig<TValue> {
  return {
    rules: options.rules ?? [],
    debounceMs: options.debounceMs ?? 0,
    scope: options.scope,
    equality: options.equality ?? (defaultFieldEquality as FieldEqualityFn<TValue>),
    triggerSet: resolveValidationTriggers(options.validateOn),
  };
}

function commitAutoValidationFailure(hostCallbacks: ValidationHostCallbacks, err: unknown): void {
  const message = err instanceof Error ? err.message : "Validation execution failed";
  hostCallbacks.commitResults(
    [
      Object.freeze({
        code: EXECUTION_ERROR_CODE,
        message,
        source: "validation" as const,
      }),
    ],
    "invalid",
  );
  hostCallbacks.setPending(false);
}

function isPromiseLike(value: unknown): value is Promise<readonly FieldIssue[]> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

export function createValidationRuntime<TValue>(
  config: SharedFieldConfig<TValue>,
  valueState: { get(): TValue },
  parseStatusState: { get(): ParseStatus },
  issuesState: { get(): readonly FieldIssue[] },
  validationIssuesState: {
    get(): readonly ValidationIssue[];
    set(v: readonly ValidationIssue[]): void;
  },
  validationStatusState: { set(v: ValidationStatus): void },
  pendingState: { set(v: boolean): void },
  syncCombinedIssues: (
    validationIss?: readonly ValidationIssue[],
    parseIss?: ParseIssue | null,
  ) => readonly FieldIssue[],
  isDisposed: () => boolean,
) {
  const revisionCtrl = new ValidationRevisionController();
  const hostCallbacks: ValidationHostCallbacks = {
    isDisposed,
    getIssues: () => issuesState.get(),
    setPending: (p) => pendingState.set(p),
    commitResults: (vIssues, status) => {
      batch(() => {
        validationIssuesState.set(Object.freeze(vIssues));
        syncCombinedIssues(vIssues, null);
        validationStatusState.set(status);
      });
    },
  };

  const executeValidation = (
    trigger: ValidationTriggerMode,
    revision: number,
    controller: AbortController,
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    if (parseStatusState.get() === "invalid") return issuesState.get();
    return executeFieldValidation(
      config.rules,
      valueState.get(),
      trigger,
      revision,
      controller,
      revisionCtrl,
      hostCallbacks,
    );
  };

  const scheduleValidation = (trigger: ValidationTriggerMode): void => {
    if (isDisposed()) return;
    const { revision, controller } = revisionCtrl.nextGeneration();
    const run = (): void => {
      if (!revisionCtrl.isCurrent(revision, controller.signal) || isDisposed()) return;
      try {
        const result = executeValidation(trigger, revision, controller);
        if (isPromiseLike(result)) {
          result.catch((err) => {
            if (
              controller.signal.aborted ||
              !revisionCtrl.isCurrent(revision, controller.signal) ||
              isDisposed()
            ) {
              return;
            }
            if (err && typeof err === "object" && (err as Error).name === "AbortError") {
              return;
            }
            commitAutoValidationFailure(hostCallbacks, err);
          });
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          !revisionCtrl.isCurrent(revision, controller.signal) ||
          isDisposed()
        ) {
          return;
        }
        if (err && typeof err === "object" && (err as Error).name === "AbortError") {
          return;
        }
        commitAutoValidationFailure(hostCallbacks, err);
      }
    };

    if (config.debounceMs > 0 && trigger === "change") {
      const timer = setTimeout(() => {
        revisionCtrl.clearDebounceTimer();
        run();
      }, config.debounceMs);
      revisionCtrl.setDebounceTimer(timer);
    } else {
      run();
    }
  };

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    const { revision, controller } = revisionCtrl.nextGeneration();
    return executeValidation(trigger, revision, controller);
  };

  return { revisionCtrl, scheduleValidation, validate };
}
