import { batch, computed, createScope, state, type Scope } from "@vii-labs/core";
import { sanitizeParseIssue } from "../parsers/builtins.js";
import type { ParseIssue, ParseResult, ParseStatus } from "../parsers/types.js";
import type { ServerIssue } from "../submission/types.js";
import { createDependencyManager, executeDependencyWave } from "../validation/dependencies.js";
import type {
  AnyValidationRule,
  FieldIssue,
  ValidationIssue,
  ValidationStatus,
  ValidationTriggerMode,
} from "../validation/types.js";
import type { InternalFieldBaseline } from "./baseline-types.js";
import { createValidationRuntime, readSharedConfig } from "./field-validation-runtime.js";
import { attachInternalNode, type FormNodeInternal, type NodeOwnership } from "./internal.js";
import type {
  FieldDependenciesDeclaration,
  FieldEqualityFn,
  FieldState,
  ParserlessCreateFieldOptions,
} from "./types.js";

export interface CreateFieldCoreOptions<TValue, TRaw> {
  readonly initialValue: TValue;
  readonly initialRawValue: TRaw;
  readonly parser?: ((raw: TRaw) => ParseResult<TValue>) | undefined;
  readonly parseStatus: ParseStatus;
  readonly rules?: readonly AnyValidationRule<TValue>[] | undefined;
  readonly dependencies?: FieldDependenciesDeclaration<TValue, TRaw> | undefined;
  readonly debounceMs?: number | undefined;
  readonly scope?: Scope | undefined;
  readonly equality?: FieldEqualityFn<TValue> | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
}

export function createFieldCore<TValue, TRaw>(
  options: CreateFieldCoreOptions<TValue, TRaw>,
): FieldState<TValue, TRaw> {
  const depManager = createDependencyManager(options.dependencies as never);
  const config = readSharedConfig(options, depManager.getDependencies);
  const parser = options.parser;

  let disposed = false;
  let ownership: NodeOwnership = config.scope ? "external-scope" : "standalone";
  const assertActive = (): void => {
    if (disposed) throw new Error("Field is disposed");
  };

  const fieldScope = config.scope
    ? config.scope.createChild({ name: "field" })
    : createScope({ name: "field" });

  const valueState = state<TValue>(options.initialValue);
  const rawValueState = state<TRaw>(options.initialRawValue);
  const baselineValueState = state<TValue>(options.initialValue);
  const baselineRawState = state<TRaw>(options.initialRawValue);
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const issuesState = state<readonly FieldIssue[]>([]);
  const validationIssuesState = state<readonly ValidationIssue[]>([]);
  const serverIssuesState = state<readonly ServerIssue[]>([]);
  const parseIssueState = state<ParseIssue | null>(null);
  const parseStatusState = state<ParseStatus>(options.parseStatus);
  const validationStatusState = state<ValidationStatus>("unvalidated");

  const syncCombinedIssues = (
    validationIss: readonly ValidationIssue[] = validationIssuesState.get(),
    parseIss: ParseIssue | null = parseIssueState.get(),
    serverIss: readonly ServerIssue[] = serverIssuesState.get(),
  ): readonly FieldIssue[] => {
    const combined = parseIss
      ? Object.freeze([parseIss])
      : Object.freeze([...validationIss, ...serverIss]);
    issuesState.set(combined);
    return combined;
  };

  const dirtyComputed = fieldScope.run(() =>
    computed(() => !config.equality(valueState.get(), baselineValueState.get())),
  );
  const validComputed = fieldScope.run(() =>
    computed(() => issuesState.get().length === 0 && parseStatusState.get() !== "invalid"),
  );
  const invalidComputed = fieldScope.run(() => computed(() => !validComputed.get()));

  const { revisionCtrl, scheduleValidation, scheduleDependentValidation, validate } =
    createValidationRuntime(
      config,
      valueState,
      parseStatusState,
      issuesState,
      validationIssuesState,
      validationStatusState,
      pendingState,
      syncCombinedIssues,
      () => disposed,
      depManager,
      () => fieldState,
    );

  let detachFromParent: (() => void) | undefined;
  const performDisposal = (): void => {
    if (disposed) return;
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    depManager.detachAll(fieldState);
    revisionCtrl.cancelActive();
    if (pendingState.get()) pendingState.set(false);
    detachFromParent?.();
    fieldScope.dispose();
  };

  if (config.scope) {
    detachFromParent = config.scope.use(() => performDisposal());
  }

  const triggerPostMutation = (): void => {
    internal.notifyMutation?.();
    if (!disposed && config.rules.length > 0 && config.triggerSet.has("change")) {
      scheduleValidation("change");
    }
    if (!disposed && internal.dependents && internal.dependents.size > 0) {
      executeDependencyWave(fieldState);
    }
  };

  const setValue = (next: TValue): void => {
    assertActive();
    revisionCtrl.cancelActive();
    batch(() => {
      valueState.set(next);
      if (!parser) {
        rawValueState.set(next as unknown as TRaw);
        parseStatusState.set("unparsed");
      } else {
        parseStatusState.set("parsed");
      }
      parseIssueState.set(null);
      serverIssuesState.set([]);
      syncCombinedIssues(validationIssuesState.get(), null, []);
      if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
    });
    triggerPostMutation();
  };

  const setRawValue = (raw: TRaw): void => {
    assertActive();
    revisionCtrl.cancelActive();
    if (!parser) {
      batch(() => {
        rawValueState.set(raw);
        valueState.set(raw as unknown as TValue);
        parseIssueState.set(null);
        parseStatusState.set("unparsed");
        serverIssuesState.set([]);
        syncCombinedIssues(validationIssuesState.get(), null, []);
        if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
      });
      triggerPostMutation();
      return;
    }

    const result = parser(raw);
    if (result.ok) {
      batch(() => {
        rawValueState.set(raw);
        valueState.set(result.value);
        parseIssueState.set(null);
        parseStatusState.set("parsed");
        serverIssuesState.set([]);
        syncCombinedIssues(validationIssuesState.get(), null, []);
        if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
      });
      triggerPostMutation();
    } else {
      const issue = sanitizeParseIssue(result.issue);
      batch(() => {
        rawValueState.set(raw);
        parseIssueState.set(issue);
        parseStatusState.set("invalid");
        validationIssuesState.set([]);
        serverIssuesState.set([]);
        syncCombinedIssues([], issue, []);
        validationStatusState.set("invalid");
        pendingState.set(false);
      });
      internal.notifyMutation?.();
      if (!disposed && internal.dependents && internal.dependents.size > 0) {
        executeDependencyWave(fieldState);
      }
    }
  };

  const reset = (): void => {
    assertActive();
    revisionCtrl.cancelActive();
    batch(() => {
      valueState.set(baselineValueState.get());
      rawValueState.set(baselineRawState.get());
      parseIssueState.set(null);
      validationIssuesState.set([]);
      serverIssuesState.set([]);
      issuesState.set([]);
      parseStatusState.set(options.parseStatus);
      touchedState.set(false);
      pendingState.set(false);
      validationStatusState.set("unvalidated");
    });
  };

  const fieldState: FieldState<TValue, TRaw> = {
    kind: "field",
    value: valueState,
    rawValue: rawValueState,
    touched: touchedState,
    dirty: dirtyComputed,
    pending: pendingState,
    valid: validComputed,
    invalid: invalidComputed,
    issues: issuesState,
    serverIssues: serverIssuesState,
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
    setTouched: (touched = true) => {
      assertActive();
      touchedState.set(touched);
      if (!disposed && touched && config.rules.length > 0 && config.triggerSet.has("blur")) {
        scheduleValidation("blur");
      }
    },
    markTouched: () => fieldState.setTouched(true),
    validate: (trigger) => {
      assertActive();
      return validate(trigger);
    },
    reset,
    dispose: () => {
      if (internal.ownership === "tree") {
        throw new Error(
          "Cannot dispose an adopted field directly; dispose its owning form or group",
        );
      }
      performDisposal();
    },
  };

  if (typeof options.dependencies === "function") {
    const eager = options.dependencies(fieldState as never);
    if (eager && eager.length > 0) {
      depManager.resolveWith(fieldState, eager);
    }
  } else if (options.dependencies !== undefined) {
    depManager.resolveOnce(fieldState);
  }

  const internal: FormNodeInternal<InternalFieldBaseline<TValue, TRaw>> = {
    kind: "field",
    scope: fieldScope,
    ownership,
    assertActive,
    dependencies: depManager.dependencies,
    dependents: new Set(),
    scheduleDependentValidation,
    cancelActiveValidation: () => {
      revisionCtrl.cancelActive();
      if (pendingState.get()) pendingState.set(false);
    },
    reinitialize: (nextBaseline) => {
      assertActive();
      revisionCtrl.cancelActive();
      if (
        nextBaseline === null ||
        typeof nextBaseline !== "object" ||
        !("value" in nextBaseline) ||
        !("rawValue" in nextBaseline)
      ) {
        throw new TypeError(
          "Invalid field reinitialize baseline: expected { value, rawValue } from parent traversal",
        );
      }
      batch(() => {
        baselineValueState.set(nextBaseline.value);
        baselineRawState.set(nextBaseline.rawValue);
        valueState.set(nextBaseline.value);
        rawValueState.set(nextBaseline.rawValue);
        parseIssueState.set(null);
        validationIssuesState.set([]);
        serverIssuesState.set([]);
        issuesState.set([]);
        parseStatusState.set(options.parseStatus);
        touchedState.set(false);
        pendingState.set(false);
        validationStatusState.set("unvalidated");
      });
    },
    getDirectChildNodes: () => [],
    disposeFromOwner: () => performDisposal(),
    clearServerIssues: () => {
      batch(() => {
        serverIssuesState.set([]);
        syncCombinedIssues(validationIssuesState.get(), parseIssueState.get(), []);
      });
    },
    setServerIssues: (sIssues) => {
      batch(() => {
        serverIssuesState.set(Object.freeze(sIssues));
        syncCombinedIssues(validationIssuesState.get(), parseIssueState.get(), sIssues);
      });
    },
    notifyMutation: () => {
      internal.onMutation?.();
    },
  };

  attachInternalNode(fieldState, internal);
  return fieldState;
}

export function createParserlessField<TValue>(
  options: ParserlessCreateFieldOptions<TValue>,
): FieldState<TValue, TValue> {
  return createFieldCore<TValue, TValue>({
    ...options,
    initialRawValue: options.initialValue,
    parseStatus: "unparsed",
    parser: undefined,
  });
}
