import { batch, computed, createScope, state } from "@vii-labs/core";
import { sanitizeParseIssue } from "../parsers/builtins.js";
import type { ParseIssue, ParseStatus } from "../parsers/types.js";
import { executeFieldValidation, type ValidationHostCallbacks } from "../validation/executor.js";
import { sanitizeValidationIssue, ValidationRevisionController } from "../validation/revision.js";
import type {
  FieldIssue,
  ValidationIssue,
  ValidationStatus,
  ValidationTriggerMode,
} from "../validation/types.js";
import { attachInternalNode, type FormNodeInternal, type NodeOwnership } from "./internal.js";
import type { CreateFieldOptions, FieldEqualityFn, FieldState } from "./types.js";

const defaultEquality: FieldEqualityFn<unknown> = (a, b) => Object.is(a, b);

export function createField<TValue, TRaw = TValue>(
  options: CreateFieldOptions<TValue, TRaw>,
): FieldState<TValue, TRaw> {
  const {
    initialValue,
    initialRawValue,
    parser,
    rules = [],
    validateOn,
    debounceMs = 0,
    scope,
  } = options;
  const equality: FieldEqualityFn<TValue> =
    (options.equality as FieldEqualityFn<TValue> | undefined) ??
    (defaultEquality as FieldEqualityFn<TValue>);

  let disposed = false;
  let ownership: NodeOwnership = scope ? "external-scope" : "standalone";
  const assertActive = (): void => {
    if (disposed) throw new Error("Field is disposed");
  };

  const fieldScope = scope ? scope.createChild({ name: "field" }) : createScope({ name: "field" });
  const rawDefault =
    initialRawValue !== undefined ? initialRawValue : (initialValue as unknown as TRaw);

  const valueState = state<TValue>(initialValue);
  const rawValueState = state<TRaw>(rawDefault);
  const initialValueState = state<TValue>(initialValue);
  const initialRawValueState = state<TRaw>(rawDefault);
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const issuesState = state<readonly FieldIssue[]>([]);
  const validationIssuesState = state<readonly ValidationIssue[]>([]);
  const parseIssueState = state<ParseIssue | null>(null);
  const parseStatusState = state<ParseStatus>(parser ? "parsed" : "unparsed");
  const validationStatusState = state<ValidationStatus>("unvalidated");

  const syncCombinedIssues = (
    validationIss: readonly ValidationIssue[] = validationIssuesState.get(),
    parseIss: ParseIssue | null = parseIssueState.get(),
  ): readonly FieldIssue[] => {
    const combined = parseIss ? Object.freeze([parseIss]) : Object.freeze([...validationIss]);
    issuesState.set(combined);
    return combined;
  };

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

  const revisionCtrl = new ValidationRevisionController();
  const dirtyComputed = fieldScope.run(() =>
    computed(() => !equality(valueState.get(), initialValueState.get())),
  );
  const validComputed = fieldScope.run(() =>
    computed(() => issuesState.get().length === 0 && parseStatusState.get() !== "invalid"),
  );
  const invalidComputed = fieldScope.run(() => computed(() => !validComputed.get()));

  let detachFromParent: (() => void) | undefined;
  const performDisposal = (): void => {
    if (disposed) return;
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    revisionCtrl.cancelActive();
    if (pendingState.get()) pendingState.set(false);
    detachFromParent?.();
    fieldScope.dispose();
  };

  const dispose = (): void => {
    if (internal.ownership === "tree") {
      throw new Error("Cannot dispose an adopted field directly; dispose its owning form or group");
    }
    performDisposal();
  };

  if (scope) {
    detachFromParent = scope.use(() => performDisposal());
  }

  const hostCallbacks: ValidationHostCallbacks = {
    isDisposed: () => disposed,
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
      rules,
      valueState.get(),
      trigger,
      revision,
      controller,
      revisionCtrl,
      hostCallbacks,
    );
  };

  const scheduleValidation = (trigger: ValidationTriggerMode): void => {
    if (disposed) return;
    const { revision, controller } = revisionCtrl.nextGeneration();
    if (debounceMs > 0 && trigger === "change") {
      const timer = setTimeout(() => {
        revisionCtrl.clearDebounceTimer();
        if (revisionCtrl.isCurrent(revision, controller.signal) && !disposed) {
          Promise.resolve(executeValidation(trigger, revision, controller)).catch(() => {});
        }
      }, debounceMs);
      revisionCtrl.setDebounceTimer(timer);
    } else {
      Promise.resolve(executeValidation(trigger, revision, controller)).catch(() => {});
    }
  };

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    assertActive();
    const { revision, controller } = revisionCtrl.nextGeneration();
    return executeValidation(trigger, revision, controller);
  };

  const setValue = (next: TValue): void => {
    assertActive();
    revisionCtrl.cancelActive();
    batch(() => {
      valueState.set(next);
      if (!parser) rawValueState.set(next as unknown as TRaw);
      parseIssueState.set(null);
      parseStatusState.set(parser ? "parsed" : "unparsed");
      syncCombinedIssues(validationIssuesState.get(), null);
      if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
    });
    if (!disposed && rules.length > 0 && triggerSet.has("change")) scheduleValidation("change");
  };

  const setRawValue = (raw: TRaw): void => {
    assertActive();
    rawValueState.set(raw);
    revisionCtrl.cancelActive();
    if (!parser) {
      batch(() => {
        valueState.set(raw as unknown as TValue);
        parseIssueState.set(null);
        parseStatusState.set("unparsed");
        syncCombinedIssues(validationIssuesState.get(), null);
        if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
      });
      if (!disposed && rules.length > 0 && triggerSet.has("change")) scheduleValidation("change");
      return;
    }

    const parseResult = parser(raw);
    if (
      parseResult === null ||
      typeof parseResult !== "object" ||
      typeof parseResult.ok !== "boolean"
    ) {
      throw new TypeError("Field parser returned invalid result shape: expected { ok: boolean }");
    }

    if (parseResult.ok) {
      batch(() => {
        valueState.set(parseResult.value);
        parseIssueState.set(null);
        parseStatusState.set("parsed");
        syncCombinedIssues(validationIssuesState.get(), null);
        if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
      });
      if (!disposed && rules.length > 0 && triggerSet.has("change")) scheduleValidation("change");
    } else {
      const issue = sanitizeParseIssue(parseResult.issue);
      batch(() => {
        parseIssueState.set(issue);
        parseStatusState.set("invalid");
        syncCombinedIssues([], issue);
        validationStatusState.set("invalid");
        pendingState.set(false);
      });
    }
  };

  const setTouched = (touched: boolean = true): void => {
    assertActive();
    touchedState.set(touched);
    if (!disposed && touched && rules.length > 0 && triggerSet.has("blur"))
      scheduleValidation("blur");
  };

  const reset = (...args: [nextInitial?: TValue, nextInitialRaw?: TRaw]): void => {
    assertActive();
    const hasNextInitial = args.length > 0;
    const hasNextRaw = args.length > 1;
    const nextInitial = args[0] as TValue;
    if (hasNextInitial && !hasNextRaw && parser) {
      throw new TypeError(
        "FieldState.reset(nextInitial) on a parsed field requires the matching raw value: " +
          "reset(nextInitial, nextInitialRaw). A raw input cannot be derived from a domain value " +
          "without an inverse of the parser.",
      );
    }
    revisionCtrl.cancelActive();
    batch(() => {
      const resetValue = hasNextInitial ? nextInitial : initialValueState.get();
      const resetRaw = hasNextRaw
        ? (args[1] as TRaw)
        : hasNextInitial
          ? (nextInitial as unknown as TRaw)
          : initialRawValueState.get();
      if (hasNextInitial) {
        initialValueState.set(nextInitial);
        initialRawValueState.set(resetRaw);
      }
      valueState.set(resetValue);
      rawValueState.set(resetRaw);
      parseIssueState.set(null);
      validationIssuesState.set([]);
      issuesState.set([]);
      parseStatusState.set(parser ? "parsed" : "unparsed");
      touchedState.set(false);
      pendingState.set(false);
      validationStatusState.set("unvalidated");
    });
  };

  const setIssues = (issues: readonly FieldIssue[]): void => {
    assertActive();
    const vIssues: ValidationIssue[] = [];
    for (let i = 0; i < issues.length; i++) {
      const iss = issues[i]!;
      if (iss.source === "validation") vIssues.push(sanitizeValidationIssue(iss));
    }
    batch(() => {
      validationIssuesState.set(Object.freeze(vIssues));
      syncCombinedIssues(vIssues, parseIssueState.get());
      validationStatusState.set(
        vIssues.length === 0 && parseIssueState.get() === null ? "valid" : "invalid",
      );
    });
  };

  const fieldState: FieldState<TValue, TRaw> = {
    kind: "field",
    value: valueState,
    rawValue: rawValueState,
    initialValue: initialValueState,
    initialRawValue: initialRawValueState,
    touched: touchedState,
    dirty: dirtyComputed,
    pending: pendingState,
    valid: validComputed,
    invalid: invalidComputed,
    issues: issuesState,
    parseIssue: parseIssueState,
    parseStatus: parseStatusState,
    validationStatus: validationStatusState,
    getValue: () => {
      assertActive();
      return valueState.get();
    },
    getRawValue: () => {
      assertActive();
      return rawValueState.get();
    },
    setValue,
    setRawValue,
    setTouched,
    markTouched: () => setTouched(true),
    setIssues,
    validate,
    reset,
    dispose,
  };

  const internal: FormNodeInternal<TValue> = {
    kind: "field",
    scope: fieldScope,
    ownership,
    assertActive,
    reinitialize: (nextBaseline: TValue) => {
      assertActive();
      revisionCtrl.cancelActive();
      batch(() => {
        initialValueState.set(nextBaseline);
        valueState.set(nextBaseline);
        if (!parser) {
          initialRawValueState.set(nextBaseline as unknown as TRaw);
          rawValueState.set(nextBaseline as unknown as TRaw);
        }
        parseIssueState.set(null);
        validationIssuesState.set([]);
        issuesState.set([]);
        parseStatusState.set(parser ? "parsed" : "unparsed");
        touchedState.set(false);
        pendingState.set(false);
        validationStatusState.set("unvalidated");
      });
    },
    getDirectChildNodes: () => [],
    disposeFromOwner: () => performDisposal(),
  };

  attachInternalNode(fieldState, internal);
  return fieldState;
}
