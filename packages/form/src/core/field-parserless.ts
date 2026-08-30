import { batch, computed, createScope, state } from "@vii-labs/core";
import type { ParseIssue, ParseStatus } from "../parsers/types.js";
import type { ServerIssue } from "../submission/types.js";
import type { FieldIssue, ValidationIssue, ValidationStatus } from "../validation/types.js";
import type { InternalFieldBaseline } from "./baseline-types.js";
import { createValidationRuntime, readSharedConfig } from "./field-validation-runtime.js";
import { attachInternalNode, type FormNodeInternal, type NodeOwnership } from "./internal.js";
import type { FieldState, ParserlessCreateFieldOptions } from "./types.js";

export function createParserlessField<TValue>(
  options: ParserlessCreateFieldOptions<TValue>,
): FieldState<TValue, TValue> {
  const config = readSharedConfig(options);
  const initialValue = options.initialValue;

  let disposed = false;
  let ownership: NodeOwnership = config.scope ? "external-scope" : "standalone";
  const assertActive = (): void => {
    if (disposed) throw new Error("Field is disposed");
  };

  const fieldScope = config.scope
    ? config.scope.createChild({ name: "field" })
    : createScope({ name: "field" });

  const valueState = state<TValue>(initialValue);
  const rawValueState = state<TValue>(initialValue);
  const baselineValueState = state<TValue>(initialValue);
  const baselineRawState = state<TValue>(initialValue);
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const issuesState = state<readonly FieldIssue[]>([]);
  const validationIssuesState = state<readonly ValidationIssue[]>([]);
  const serverIssuesState = state<readonly ServerIssue[]>([]);
  const parseIssueState = state<ParseIssue | null>(null);
  const parseStatusState = state<ParseStatus>("unparsed");
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

  const { revisionCtrl, scheduleValidation, validate } = createValidationRuntime(
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
      rawValueState.set(next);
      parseIssueState.set(null);
      parseStatusState.set("unparsed");
      serverIssuesState.set([]);
      syncCombinedIssues(validationIssuesState.get(), null, []);
      if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
    });
    internal.notifyMutation?.();
    if (!disposed && config.rules.length > 0 && config.triggerSet.has("change"))
      scheduleValidation("change");
  };

  const setRawValue = (raw: TValue): void => {
    assertActive();
    revisionCtrl.cancelActive();
    batch(() => {
      rawValueState.set(raw);
      valueState.set(raw);
      parseIssueState.set(null);
      parseStatusState.set("unparsed");
      serverIssuesState.set([]);
      syncCombinedIssues(validationIssuesState.get(), null, []);
      if (validationIssuesState.get().length === 0) validationStatusState.set("unvalidated");
    });
    internal.notifyMutation?.();
    if (!disposed && config.rules.length > 0 && config.triggerSet.has("change"))
      scheduleValidation("change");
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
      parseStatusState.set("unparsed");
      touchedState.set(false);
      pendingState.set(false);
      validationStatusState.set("unvalidated");
    });
  };

  const fieldState: FieldState<TValue, TValue> = {
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

  const internal: FormNodeInternal<InternalFieldBaseline<TValue, TValue>> = {
    kind: "field",
    scope: fieldScope,
    ownership,
    assertActive,
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
        parseStatusState.set("unparsed");
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
