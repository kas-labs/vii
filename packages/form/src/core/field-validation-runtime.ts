import { batch, type Scope } from "@vii-labs/core";
import type { ParseIssue, ParseStatus } from "../parsers/types.js";
import type { DependencyManager } from "../validation/dependencies.js";
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
  FieldState,
  ParsedCreateFieldOptions,
  ParserlessCreateFieldOptions,
} from "./types.js";

export const defaultFieldEquality: FieldEqualityFn<unknown> = (a, b) => Object.is(a, b);
const EXECUTION_ERROR_CODE = "validation.execution_error";

export interface SharedFieldConfig<TValue> {
  readonly rules: readonly AnyValidationRule<TValue>[];
  readonly getDependencies: () => readonly FieldState<unknown, unknown>[];
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

export interface SharedOptionsInput<TValue> {
  readonly rules?: readonly AnyValidationRule<TValue>[] | undefined;
  readonly debounceMs?: number | undefined;
  readonly scope?: Scope | undefined;
  readonly equality?: FieldEqualityFn<TValue> | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
}

export function readSharedConfig<TValue>(
  options: SharedOptionsInput<TValue>,
  getDependencies?: () => readonly FieldState<unknown, unknown>[],
): SharedFieldConfig<TValue> {
  return {
    rules: options.rules ?? [],
    getDependencies: getDependencies ?? (() => []),
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
  validationStatusState: { get(): ValidationStatus; set(v: ValidationStatus): void },
  pendingState: { set(v: boolean): void },
  syncCombinedIssues: (
    validationIss?: readonly ValidationIssue[],
    parseIss?: ParseIssue | null,
  ) => readonly FieldIssue[],
  isDisposed: () => boolean,
  depManager?: DependencyManager,
  hostField?: () => FieldState<unknown, unknown>,
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
    if (depManager && hostField) {
      depManager.resolveOnce(hostField());
    }
    const dependencySnapshots = depManager ? depManager.getSnapshot() : undefined;
    const declaredDeps = depManager ? depManager.declaredDeps : undefined;
    return executeFieldValidation(
      config.rules,
      valueState.get(),
      trigger,
      revision,
      controller,
      revisionCtrl,
      hostCallbacks,
      dependencySnapshots,
      declaredDeps,
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

  const scheduleDependentValidation = (trigger: ValidationTriggerMode): void => {
    if (isDisposed()) return;
    if (config.triggerSet.has("change") || validationStatusState.get() !== "unvalidated") {
      scheduleValidation(trigger);
    }
  };

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    const { revision, controller } = revisionCtrl.nextGeneration();
    return executeValidation(trigger, revision, controller);
  };

  return { revisionCtrl, scheduleValidation, scheduleDependentValidation, validate };
}
