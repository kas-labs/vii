import { batch, computed, createScope, state } from "@vii-labs/core";
import { sanitizeParseIssue } from "../parsers/builtins.js";
import type { ParseIssue, ParseStatus } from "../parsers/types.js";
import type { ServerIssue } from "../submission/types.js";
import {
  executeDependencyWave,
  validateAndDeduplicateDependencies,
} from "../validation/dependencies.js";
import type { FieldIssue, ValidationIssue, ValidationStatus } from "../validation/types.js";
import type { InternalFieldBaseline } from "./baseline-types.js";
import { createValidationRuntime, readSharedConfig } from "./field-validation-runtime.js";
import {
  attachInternalNode,
  getInternalNode,
  type FormNodeInternal,
  type NodeOwnership,
} from "./internal.js";
import type { FieldState, ParsedCreateFieldOptions } from "./types.js";

export function createParsedField<TRaw, TValue>(
  options: ParsedCreateFieldOptions<TRaw, TValue>,
): FieldState<TValue, TRaw> {
  let validatedDependencies: readonly FieldState<unknown, unknown>[] = [];
  const getDependencies = (): readonly FieldState<unknown, unknown>[] => {
    if (typeof options.dependencies === "function") {
      const rawDeps = options.dependencies(fieldState);
      validatedDependencies = validateAndDeduplicateDependencies(fieldState, rawDeps);
    }
    return validatedDependencies;
  };
  const config = readSharedConfig(options, getDependencies);
  const parser = options.parser;
  const initialValue = options.initialValue;
  const initialRawValue = options.initialRawValue;

  let disposed = false;
  let ownership: NodeOwnership = config.scope ? "external-scope" : "standalone";
  const assertActive = (): void => {
    if (disposed) throw new Error("Field is disposed");
  };

  const fieldScope = config.scope
    ? config.scope.createChild({ name: "field" })
    : createScope({ name: "field" });

  const valueState = state<TValue>(initialValue);
  const rawValueState = state<TRaw>(initialRawValue);
  const baselineValueState = state<TValue>(initialValue);
  const baselineRawState = state<TRaw>(initialRawValue);
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const issuesState = state<readonly FieldIssue[]>([]);
  const validationIssuesState = state<readonly ValidationIssue[]>([]);
  const serverIssuesState = state<readonly ServerIssue[]>([]);
  const parseIssueState = state<ParseIssue | null>(null);
  const parseStatusState = state<ParseStatus>("parsed");
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
    );

  let detachFromParent: (() => void) | undefined;
  const performDisposal = (): void => {
    if (disposed) return;
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    if (internal.dependencies) {
      for (let i = 0; i < internal.dependencies.length; i++) {
        const dep = internal.dependencies[i]!;
        const depInternal = getInternalNode(dep);
        depInternal?.dependents?.delete(fieldState);
      }
      internal.dependencies = [];
    }
    if (internal.dependents) {
      internal.dependents.clear();
    }
    revisionCtrl.cancelActive();
    if (pendingState.get()) pendingState.set(false);
    detachFromParent?.();
    fieldScope.dispose();
  };

  if (config.scope) {
    detachFromParent = config.scope.use(() => performDisposal());
  }

  const setValue = (next: TValue): void => {
    assertActive();
    revisionCtrl.cancelActive();
    batch(() => {
      valueState.set(next);
      parseIssueState.set(null);
      parseStatusState.set("parsed");
      serverIssuesState.set([]);
      syncCombinedIssues(validationIssuesState.get(), null, []);
      if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
    });
    internal.notifyMutation?.();
    if (!disposed && config.rules.length > 0 && config.triggerSet.has("change"))
      scheduleValidation("change");
    if (!disposed) {
      executeDependencyWave(fieldState);
    }
  };

  const setRawValue = (raw: TRaw): void => {
    assertActive();
    revisionCtrl.cancelActive();

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
        rawValueState.set(raw);
        valueState.set(parseResult.value);
        parseIssueState.set(null);
        parseStatusState.set("parsed");
        serverIssuesState.set([]);
        syncCombinedIssues(validationIssuesState.get(), null, []);
        if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
      });
      internal.notifyMutation?.();
      if (!disposed && config.rules.length > 0 && config.triggerSet.has("change"))
        scheduleValidation("change");
      if (!disposed) {
        executeDependencyWave(fieldState);
      }
    } else {
      const issue = sanitizeParseIssue(parseResult.issue);
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
      if (!disposed) {
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
      parseStatusState.set("parsed");
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
      if (!disposed && touched && config.rules.length > 0 && config.triggerSet.has("blur"))
        scheduleValidation("blur");
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
    try {
      const eagerDeps = options.dependencies(fieldState);
      validatedDependencies = validateAndDeduplicateDependencies(fieldState, eagerDeps);
      for (let i = 0; i < validatedDependencies.length; i++) {
        const dep = validatedDependencies[i]!;
        const depInternal = getInternalNode(dep);
        if (depInternal) {
          if (!depInternal.dependents) depInternal.dependents = new Set();
          depInternal.dependents.add(fieldState);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Validation self-dependency is not allowed")) {
        throw e;
      }
    }
  } else {
    validatedDependencies = validateAndDeduplicateDependencies(fieldState, options.dependencies);
    for (let i = 0; i < validatedDependencies.length; i++) {
      const dep = validatedDependencies[i]!;
      const depInternal = getInternalNode(dep);
      if (depInternal) {
        if (!depInternal.dependents) depInternal.dependents = new Set();
        depInternal.dependents.add(fieldState);
      }
    }
  }

  const internal: FormNodeInternal<InternalFieldBaseline<TValue, TRaw>> = {
    kind: "field",
    scope: fieldScope,
    ownership,
    assertActive,
    dependencies: validatedDependencies,
    dependents: new Set(),
    scheduleDependentValidation,
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
        parseStatusState.set("parsed");
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
