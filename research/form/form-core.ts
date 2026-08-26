import {
  type Computed,
  type Scope,
  type WritableState,
  batch,
  computed,
  createScope,
  state,
} from "../../packages/core/src/index.js";
import { getActiveDiagnostics } from "../../packages/core/src/diagnostics.js";
import type {
  FieldParser,
  FormIssueBase,
  IssueSource,
  NumberParserOptions,
  OutputTransform,
  ParseIssue,
  ParseResult,
  ParseStatus,
  ValidationIssue,
} from "./parser.js";
import {
  createBooleanParser,
  createNumberParser,
  createOptionalStringParser,
  sanitizeParseIssue,
} from "./parser.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import {
  isStandardSchema,
  normalizeStandardSchemaIssue,
  standardSchema,
} from "./standard-schema.js";
import type {
  ArraySnapshotMap,
  DuplicateSubmitPolicy,
  FormSubmitResult,
  ServerIssue,
  ServerIssueInput,
  SubmissionStatus,
  SubmitAction,
  SubmitActionResult,
  SubmitContext,
  SubmitOptions,
} from "./submission.js";
import { createArraySnapshotKey, deepCloneSnapshot, sanitizeServerIssue } from "./submission.js";

export type {
  ArraySnapshotMap,
  DuplicateSubmitPolicy,
  FieldParser,
  FormIssueBase,
  FormSubmitResult,
  IssueSource,
  NumberParserOptions,
  OutputTransform,
  ParseIssue,
  ParseResult,
  ParseStatus,
  ServerIssue,
  ServerIssueInput,
  StandardSchemaV1,
  SubmissionStatus,
  SubmitAction,
  SubmitActionResult,
  SubmitContext,
  SubmitOptions,
  ValidationIssue,
};
export {
  createArraySnapshotKey,
  createBooleanParser,
  createNumberParser,
  createOptionalStringParser,
  deepCloneSnapshot,
  isStandardSchema,
  normalizeStandardSchemaIssue,
  sanitizeParseIssue,
  sanitizeServerIssue,
  standardSchema,
};

// ---------------------------------------------------------------------------
// Equality & Basic Types
// ---------------------------------------------------------------------------

export type EqualityFn<T> = (a: T, b: T) => boolean;

export const defaultEquality: EqualityFn<unknown> = (a, b) => Object.is(a, b);

// ---------------------------------------------------------------------------
// Structured Issues & Validation Taxonomy (F3, F4, F5 & F6)
// ---------------------------------------------------------------------------

export type FieldPathSegment = string | number;

export interface ValidationIssueInput {
  readonly code: string;
  readonly message?: string | undefined;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly source?: IssueSource | undefined;
}

export type FieldIssue = ValidationIssue | ParseIssue | ServerIssue;

export type ValidationTriggerMode = "change" | "blur" | "submit" | "manual";

export type ValidationStatus = "unvalidated" | "valid" | "invalid";

export interface ValidationRuleContext {
  readonly trigger: ValidationTriggerMode;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly form?: FormInstance<any> | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type SyncValidationRule<T, Ctx extends ValidationRuleContext = ValidationRuleContext> = (
  value: T,
  context: Ctx,
) => ValidationIssueInput | readonly ValidationIssueInput[] | null | undefined;

export type AsyncValidationRule<T, Ctx extends ValidationRuleContext = ValidationRuleContext> = (
  value: T,
  context: Ctx & { readonly signal: AbortSignal },
) => Promise<ValidationIssueInput | readonly ValidationIssueInput[] | null | undefined>;

export type ValidationRule<T, Ctx extends ValidationRuleContext = ValidationRuleContext> = (
  value: T,
  context: Ctx & { readonly signal?: AbortSignal | undefined },
) =>
  | ValidationIssueInput
  | readonly ValidationIssueInput[]
  | null
  | undefined
  | Promise<ValidationIssueInput | readonly ValidationIssueInput[] | null | undefined>;

export type AnyValidationRule<T, Ctx extends ValidationRuleContext = ValidationRuleContext> =
  ValidationRule<T, Ctx> | AsyncValidationRule<T, Ctx> | SyncValidationRule<T, Ctx>;

// Defensive result validation & prototype pollution defense
function sanitizeIssue(raw: any, defaultPath?: readonly FieldPathSegment[]): FieldIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError(
      `Validation rule returned invalid issue shape: expected an object, received ${
        raw === null ? "null" : typeof raw
      }`,
    );
  }

  const rawCode = (raw as any).code;
  if (typeof rawCode !== "string" || rawCode.trim() === "") {
    throw new TypeError(
      `Validation rule returned invalid issue: missing or non-string "code" property`,
    );
  }

  if (rawCode === "__proto__" || rawCode === "constructor" || rawCode === "prototype") {
    throw new Error(
      `Security error: Prototype pollution attempt blocked on issue code "${rawCode}"`,
    );
  }

  let sanitizedPath: readonly FieldPathSegment[] | undefined = undefined;
  if (raw.path !== undefined && raw.path !== null) {
    if (!Array.isArray(raw.path)) {
      throw new TypeError(`Validation rule returned invalid issue: "path" must be an array`);
    }
    const segments: FieldPathSegment[] = [];
    for (const seg of raw.path) {
      if (typeof seg === "string" || typeof seg === "number") {
        segments.push(seg);
      } else {
        throw new TypeError(
          `Validation rule returned invalid issue path segment: must be string or number, received ${typeof seg}`,
        );
      }
    }
    sanitizedPath = Object.freeze(segments);
  } else if (defaultPath && defaultPath.length > 0) {
    sanitizedPath = defaultPath;
  }

  const issue: FieldIssue = {
    code: rawCode,
    message: typeof raw.message === "string" ? raw.message : undefined,
    path: sanitizedPath,
    source: (raw as any).source === "parse" ? "parse" : "validation",
    ruleId: typeof raw.ruleId === "string" ? raw.ruleId : undefined,
  };
  return Object.freeze(issue);
}

// Terminal handler for validations started by a trigger rather than by a caller
// (setValue / setTouched / setValues / a debounce timer). Nobody holds the
// returned promise, so a rejecting async rule would otherwise surface as an
// unhandled rejection and, under Node's default policy, kill the process.
// The rejection is recorded structurally and swallowed here; explicit
// validate() callers still receive the rejection.
function settleDetachedValidation(
  result: Promise<readonly FieldIssue[]> | readonly FieldIssue[],
  eventType: string,
): void {
  if (result === null || typeof result !== "object" || typeof (result as any).then !== "function") {
    return;
  }
  void (result as Promise<readonly FieldIssue[]>).catch((err: unknown) => {
    const diag = getActiveDiagnostics();
    if (diag) {
      // Name only: rule error messages may embed field values.
      diag.record(eventType, {
        reason: err instanceof Error ? err.name : typeof err,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// FieldState (Leaf Node)
// ---------------------------------------------------------------------------

export interface FieldState<Value, Raw = Value, Output = Value> {
  readonly kind: "field";
  readonly value: WritableState<Value>;
  readonly rawValue: WritableState<Raw>;
  readonly initialValue: WritableState<Value>;
  readonly initialRawValue: WritableState<Raw>;
  readonly touched: WritableState<boolean>;
  readonly dirty: Computed<boolean>;
  readonly pending: WritableState<boolean>;
  readonly errors: WritableState<readonly string[]>;
  readonly issues: WritableState<readonly FieldIssue[]>;
  readonly serverIssues: WritableState<readonly ServerIssue[]>;
  readonly parseIssue: WritableState<ParseIssue | null>;
  readonly parseStatus: WritableState<ParseStatus>;
  readonly validationStatus: WritableState<ValidationStatus>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly output: Computed<Output>;
  setValue(next: Value): void;
  setRawValue(raw: Raw): void;
  setTouched(touched?: boolean): void;
  setPending(pending: boolean): void;
  setErrors(errors: readonly string[]): void;
  setIssues(issues: readonly FieldIssue[]): void;
  setServerIssues(issues: readonly (ServerIssueInput | string)[]): void;
  clearServerIssues(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(...args: [nextInitial?: Value, nextInitialRaw?: Raw]): void;
  getOutput(): Output;
}

export interface CreateFieldOptions<Value, Raw = Value, Output = Value> {
  readonly initialValue: Value;
  readonly initialRawValue?: Raw | undefined;
  readonly parser?: FieldParser<Raw, Value> | undefined;
  readonly transform?: OutputTransform<Value, Output> | undefined;
  readonly equality?: EqualityFn<Value> | undefined;
  readonly scope?: Scope | undefined;
  readonly rules?: readonly AnyValidationRule<Value>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
  readonly debounceMs?: number | undefined;
}

export function createField<Value, Raw = Value, Output = Value>(
  options: CreateFieldOptions<Value, Raw, Output>,
): FieldState<Value, Raw, Output> {
  const {
    initialValue,
    initialRawValue,
    parser,
    transform,
    equality = defaultEquality as EqualityFn<Value>,
    rules = [],
    validateOn,
    debounceMs = 0,
    scope,
  } = options;

  const valueState = state<Value>(initialValue);
  const rawValueState = state<Raw>(
    initialRawValue !== undefined ? initialRawValue : (initialValue as unknown as Raw),
  );
  const initialValueState = state<Value>(initialValue);
  const initialRawValueState = state<Raw>(
    initialRawValue !== undefined ? initialRawValue : (initialValue as unknown as Raw),
  );
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const errorsState = state<readonly string[]>([]);
  const issuesState = state<readonly FieldIssue[]>([]);
  const validationIssuesState = state<readonly ValidationIssue[]>([]);
  const serverIssuesState = state<readonly ServerIssue[]>([]);
  const parseIssueState = state<ParseIssue | null>(null);
  const parseStatusState = state<ParseStatus>(parser ? "parsed" : "unparsed");
  const validationStatusState = state<ValidationStatus>("unvalidated");

  const syncCombinedIssues = (
    validationIss: readonly ValidationIssue[] = validationIssuesState.get(),
    serverIss: readonly ServerIssue[] = serverIssuesState.get(),
    parseIss: ParseIssue | null = parseIssueState.get(),
  ): readonly FieldIssue[] => {
    let combined: readonly FieldIssue[];
    if (parseIss) {
      combined = Object.freeze([parseIss]);
    } else if (validationIss.length === 0 && serverIss.length === 0) {
      combined = Object.freeze([]);
    } else {
      combined = Object.freeze([...validationIss, ...serverIss]);
    }
    issuesState.set(combined);
    errorsState.set(Object.freeze(combined.map((iss) => iss.message ?? iss.code)));
    return combined;
  };

  // Determine trigger set
  const triggerSet = new Set<ValidationTriggerMode>();
  if (validateOn !== undefined) {
    if (Array.isArray(validateOn)) {
      for (const t of validateOn) triggerSet.add(t);
    } else {
      triggerSet.add(validateOn as ValidationTriggerMode);
    }
  } else {
    // Default trigger is change
    triggerSet.add("change");
  }

  let isValidatingSync = false;
  let activeAbortController: AbortController | null = null;
  let currentRevision = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isDisposed = false;

  const cancelActiveAsync = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  };

  if (scope) {
    scope.use(() => {
      isDisposed = true;
      cancelActiveAsync();
      currentRevision++;
      if (pendingState.get()) {
        pendingState.set(false);
      }
    });
  }

  const runInScope = <R>(fn: () => R): R => {
    return options.scope ? options.scope.run(fn) : fn();
  };

  const dirtyComputed = runInScope(() =>
    computed(() => !equality(valueState.get(), initialValueState.get())),
  );

  const validComputed = runInScope(() =>
    computed(() => {
      return (
        errorsState.get().length === 0 &&
        issuesState.get().length === 0 &&
        parseStatusState.get() !== "invalid"
      );
    }),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const transformFn: OutputTransform<Value, Output> =
    transform !== undefined ? transform : (v: Value) => v as unknown as Output;

  const outputComputed = runInScope(() =>
    computed(() => {
      return transformFn(valueState.get());
    }),
  );

  const executeValidation = (
    trigger: ValidationTriggerMode,
    revision: number,
    abortController: AbortController,
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    if (isValidatingSync) {
      throw new Error("Reentrant validation detected in form field");
    }
    isValidatingSync = true;

    const diag = getActiveDiagnostics();
    if (diag) {
      diag.record("field.validation.started", { trigger });
    }

    try {
      if (parseStatusState.get() === "invalid") {
        return issuesState.get();
      }

      const currentVal = valueState.get();
      const collectedSyncIssues: ValidationIssue[] = [];
      const pendingAsyncCalls: Array<Promise<any>> = [];

      // Step 1: Run all rules. If a rule returns a Promise/thenable, collect it.
      // If it returns issues synchronously, collect them.
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]!;
        let res: any;
        try {
          const ctx: ValidationRuleContext = {
            trigger,
            signal: abortController.signal,
          };
          res = rule(currentVal, ctx as any);
        } catch (ruleErr) {
          throw ruleErr;
        }

        if (
          res !== null &&
          (typeof res === "object" || typeof res === "function") &&
          typeof (res as any).then === "function"
        ) {
          pendingAsyncCalls.push(
            Promise.resolve(res).catch((err) => {
              if (
                abortController.signal.aborted ||
                (err && (err.name === "AbortError" || err.code === "ABORT_ERR"))
              ) {
                return null;
              }
              throw err;
            }),
          );
        } else if (res !== null && res !== undefined) {
          if (Array.isArray(res)) {
            for (const item of res) {
              collectedSyncIssues.push(sanitizeIssue(item) as ValidationIssue);
            }
          } else {
            collectedSyncIssues.push(sanitizeIssue(res) as ValidationIssue);
          }
        }
      }

      // If sync issues exist or there are no async rules in flight, commit sync result immediately
      if (collectedSyncIssues.length > 0 || pendingAsyncCalls.length === 0) {
        cancelActiveAsync();
        const sIssues = serverIssuesState.get();
        const nextStatus: ValidationStatus =
          collectedSyncIssues.length === 0 && sIssues.length === 0 ? "valid" : "invalid";

        batch(() => {
          validationIssuesState.set(Object.freeze(collectedSyncIssues));
          syncCombinedIssues(collectedSyncIssues, sIssues);
          validationStatusState.set(nextStatus);
          pendingState.set(false);
        });

        if (diag) {
          diag.record("field.validation.completed", {
            issueCount: collectedSyncIssues.length,
            status: nextStatus,
          });
        }

        return issuesState.get();
      }

      // Step 2: Sync passed and async calls in flight -> transition to pending
      activeAbortController = abortController;
      pendingState.set(true);

      if (diag) {
        diag.record("field.validation.async.started", { trigger, revision });
      }

      const asyncPromise = (async (): Promise<readonly FieldIssue[]> => {
        try {
          const asyncResults = await Promise.all(pendingAsyncCalls);

          // Revision & cancellation check: only commit if revision matches and not aborted
          if (revision !== currentRevision || abortController.signal.aborted || isDisposed) {
            return issuesState.get();
          }

          const collectedAsyncIssues: ValidationIssue[] = [...collectedSyncIssues];
          for (const res of asyncResults) {
            if (res !== null && res !== undefined) {
              if (Array.isArray(res)) {
                for (const item of res)
                  collectedAsyncIssues.push(sanitizeIssue(item) as ValidationIssue);
              } else {
                collectedAsyncIssues.push(sanitizeIssue(res) as ValidationIssue);
              }
            }
          }

          const sIssues = serverIssuesState.get();
          const nextStatus: ValidationStatus =
            collectedAsyncIssues.length === 0 && sIssues.length === 0 ? "valid" : "invalid";

          batch(() => {
            validationIssuesState.set(Object.freeze(collectedAsyncIssues));
            syncCombinedIssues(collectedAsyncIssues, sIssues);
            validationStatusState.set(nextStatus);
            pendingState.set(false);
          });

          if (diag) {
            diag.record("field.validation.async.completed", {
              issueCount: collectedAsyncIssues.length,
              status: nextStatus,
              revision,
            });
          }

          return issuesState.get();
        } catch (asyncErr) {
          if (revision === currentRevision && !abortController.signal.aborted && !isDisposed) {
            pendingState.set(false);
          }
          throw asyncErr;
        } finally {
          if (activeAbortController === abortController) {
            activeAbortController = null;
          }
        }
      })();

      return asyncPromise;
    } finally {
      isValidatingSync = false;
    }
  };

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    if (isDisposed) {
      throw new Error("Form node is disposed");
    }
    cancelActiveAsync();
    const revision = ++currentRevision;
    const ac = new AbortController();
    activeAbortController = ac;
    return executeValidation(trigger, revision, ac);
  };

  const scheduleValidation = (trigger: ValidationTriggerMode): void => {
    cancelActiveAsync();
    const revision = ++currentRevision;
    const ac = new AbortController();
    activeAbortController = ac;

    if (debounceMs > 0 && trigger === "change") {
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (revision === currentRevision && !ac.signal.aborted && !isDisposed) {
          settleDetachedValidation(
            executeValidation(trigger, revision, ac),
            "field.validation.async.failed",
          );
        }
      }, debounceMs);
    } else {
      settleDetachedValidation(
        executeValidation(trigger, revision, ac),
        "field.validation.async.failed",
      );
    }
  };

  const setValue = (next: Value): void => {
    cancelActiveAsync();
    batch(() => {
      valueState.set(next);
      parseIssueState.set(null);
      serverIssuesState.set([]);
      // A field with no parser never enters a parsed state: setValue writes the
      // domain value directly, so there is nothing to have parsed.
      parseStatusState.set(parser ? "parsed" : "unparsed");
      if (issuesState.get().some((iss) => iss.source === "parse" || iss.source === "server")) {
        syncCombinedIssues(validationIssuesState.get(), [], null);
        if (validationIssuesState.get().length === 0) {
          validationStatusState.set("unvalidated");
        }
      }
    });
    if (!isDisposed && rules.length > 0 && triggerSet.has("change")) {
      scheduleValidation("change");
    }
  };

  const setRawValue = (raw: Raw): void => {
    rawValueState.set(raw);
    cancelActiveAsync();
    const revision = ++currentRevision;

    if (!parser) {
      batch(() => {
        parseIssueState.set(null);
        serverIssuesState.set([]);
        parseStatusState.set("unparsed");
        valueState.set(raw as unknown as Value);
        syncCombinedIssues(validationIssuesState.get(), [], null);
        if (validationIssuesState.get().length === 0) {
          validationStatusState.set("unvalidated");
        }
      });
      if (!isDisposed && rules.length > 0 && triggerSet.has("change")) {
        scheduleValidation("change");
      }
      return;
    }

    let parseResult: ParseResult<Value>;
    try {
      parseResult = parser(raw);
    } catch (parseErr) {
      const diag = getActiveDiagnostics();
      if (diag) {
        diag.record("field.parse.failed", {
          reason: parseErr instanceof Error ? parseErr.name : typeof parseErr,
        });
      }
      throw parseErr;
    }

    if (parseResult.ok) {
      const parsedVal = parseResult.value;
      const diag = getActiveDiagnostics();
      if (diag) {
        diag.record("field.parse.completed", { status: "parsed" });
      }
      batch(() => {
        parseIssueState.set(null);
        serverIssuesState.set([]);
        parseStatusState.set("parsed");
        valueState.set(parsedVal);
        syncCombinedIssues(validationIssuesState.get(), [], null);
        if (validationIssuesState.get().length === 0) {
          validationStatusState.set("unvalidated");
        }
      });

      if (!isDisposed && rules.length > 0 && triggerSet.has("change")) {
        scheduleValidation("change");
      }
    } else {
      const parseIssue = sanitizeParseIssue(parseResult.issue);
      const diag = getActiveDiagnostics();
      if (diag) {
        diag.record("field.parse.failed", { code: parseIssue.code });
      }

      batch(() => {
        parseIssueState.set(parseIssue);
        serverIssuesState.set([]);
        parseStatusState.set("invalid");
        syncCombinedIssues([], [], parseIssue);
        validationStatusState.set("invalid");
        pendingState.set(false);
      });
    }
  };

  const setTouched = (touched = true): void => {
    touchedState.set(touched);
    if (!isDisposed && touched && rules.length > 0 && triggerSet.has("blur")) {
      scheduleValidation("blur");
    }
  };

  const setPending = (pending: boolean): void => {
    pendingState.set(pending);
  };

  const setIssues = (issues: readonly FieldIssue[]): void => {
    const sanitized = issues.map((iss) => sanitizeIssue(iss));
    const vIssues: ValidationIssue[] = [];
    const sIssues: ServerIssue[] = [];
    for (const iss of sanitized) {
      if (iss.source === "server") {
        sIssues.push(iss as ServerIssue);
      } else if (iss.source === "validation") {
        vIssues.push(iss as ValidationIssue);
      }
    }
    batch(() => {
      validationIssuesState.set(Object.freeze(vIssues));
      serverIssuesState.set(Object.freeze(sIssues));
      syncCombinedIssues(vIssues, sIssues, parseIssueState.get());
      validationStatusState.set(sanitized.length === 0 ? "valid" : "invalid");
    });
  };

  const setServerIssues = (issues: readonly (ServerIssueInput | string)[]): void => {
    const sanitized: ServerIssue[] = issues.map((iss) =>
      typeof iss === "string"
        ? sanitizeServerIssue({ code: "server.error", message: iss })
        : sanitizeServerIssue(iss),
    );
    batch(() => {
      serverIssuesState.set(Object.freeze(sanitized));
      syncCombinedIssues(validationIssuesState.get(), sanitized, parseIssueState.get());
      if (sanitized.length > 0) {
        validationStatusState.set("invalid");
      }
    });
  };

  const clearServerIssues = (): void => {
    batch(() => {
      serverIssuesState.set([]);
      syncCombinedIssues(validationIssuesState.get(), [], parseIssueState.get());
      if (parseIssueState.get() === null && validationIssuesState.get().length === 0) {
        if (validationStatusState.get() === "invalid") {
          validationStatusState.set("unvalidated");
        }
      }
    });
  };

  const setErrors = (errors: readonly string[]): void => {
    const syntheticIssues: readonly ValidationIssue[] = Object.freeze(
      errors.map((err) =>
        Object.freeze({
          code: "legacy.error",
          message: String(err),
          path: undefined,
          source: "validation",
          ruleId: undefined,
        } as ValidationIssue),
      ),
    );
    batch(() => {
      errorsState.set(errors);
      validationIssuesState.set(syntheticIssues);
      syncCombinedIssues(syntheticIssues, serverIssuesState.get(), parseIssueState.get());
      validationStatusState.set(
        errors.length === 0 && serverIssuesState.get().length === 0 ? "valid" : "invalid",
      );
    });
  };

  const reset = (...args: [nextInitial?: Value, nextInitialRaw?: Raw]): void => {
    const hasNextInitial = args.length > 0;
    const hasNextRaw = args.length > 1;
    const nextInitial = args[0] as Value;

    // Raw is only interchangeable with Value when no parser is configured. A
    // parser has no inverse, so a new domain baseline cannot be cast into a raw
    // one: that silently stored a number in a `Raw = string` slot. Demand the
    // matching raw instead of corrupting the stage.
    if (hasNextInitial && !hasNextRaw && parser) {
      throw new TypeError(
        "FieldState.reset(nextInitial) on a parsed field requires the matching raw value: " +
          "reset(nextInitial, nextInitialRaw). A raw input cannot be derived from a domain value " +
          "without an inverse of the parser.",
      );
    }

    cancelActiveAsync();
    currentRevision++;

    batch(() => {
      const resetValue = hasNextInitial ? nextInitial : initialValueState.get();
      const resetRaw = hasNextRaw
        ? (args[1] as Raw)
        : hasNextInitial
          ? (nextInitial as unknown as Raw)
          : initialRawValueState.get();

      if (hasNextInitial) {
        initialValueState.set(nextInitial);
        initialRawValueState.set(resetRaw);
      }
      valueState.set(resetValue);
      rawValueState.set(resetRaw);
      parseIssueState.set(null);
      serverIssuesState.set([]);
      validationIssuesState.set([]);
      parseStatusState.set(parser ? "parsed" : "unparsed");
      touchedState.set(false);
      pendingState.set(false);
      errorsState.set([]);
      issuesState.set([]);
      validationStatusState.set("unvalidated");
    });
  };

  const getOutput = (): Output => {
    return outputComputed.get();
  };

  return {
    kind: "field",
    value: valueState,
    rawValue: rawValueState,
    initialValue: initialValueState,
    initialRawValue: initialRawValueState,
    touched: touchedState,
    dirty: dirtyComputed,
    pending: pendingState,
    errors: errorsState,
    issues: issuesState,
    serverIssues: serverIssuesState,
    parseIssue: parseIssueState,
    parseStatus: parseStatusState,
    validationStatus: validationStatusState,
    valid: validComputed,
    invalid: invalidComputed,
    output: outputComputed,
    setValue,
    setRawValue,
    setTouched,
    setPending,
    setErrors,
    setIssues,
    setServerIssues,
    clearServerIssues,
    validate,
    reset,
    getOutput,
  };
}

// ---------------------------------------------------------------------------
// Plain Record Detection & Cycle Defense
// ---------------------------------------------------------------------------

export function isPlainRecord(value: unknown): value is Record<string, any> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// ---------------------------------------------------------------------------
// FieldGroup: nested object structure
// ---------------------------------------------------------------------------

export type FormNode = FieldState<any> | FieldGroup<any> | FieldArray<any>;

export type FormNodeMap = Record<string, FormNode>;

export interface FieldGroup<T extends Record<string, any>> {
  readonly kind: "group";
  readonly fields: { [K in keyof T]: FormNodeFor<T[K]> };
  readonly values: Computed<T>;
  readonly output: Computed<T>;
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<string, readonly string[]>>;
  readonly issues: Computed<readonly FieldIssue[]>;
  readonly groupIssues: WritableState<readonly FieldIssue[]>;
  readonly serverIssues: WritableState<readonly ServerIssue[]>;
  readonly validationStatus: Computed<ValidationStatus>;
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  setServerIssues(issues: readonly (ServerIssueInput | string)[]): void;
  clearServerIssues(): void;
  getOutput(): T;
}

export interface CreateFieldGroupOptions<T extends Record<string, any>> {
  readonly initialValues: T;
  readonly scope?: Scope | undefined;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
  readonly seenObjects?: Set<object> | undefined;
  readonly rules?: readonly AnyValidationRule<T>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
  readonly debounceMs?: number | undefined;
}

export type FormNodeFor<T> =
  T extends Array<infer U>
    ? FieldArray<U>
    : T extends Record<string, any>
      ? T extends Date | RegExp | Map<any, any> | Set<any> | Function
        ? FieldState<T>
        : FieldGroup<T>
      : FieldState<T>;

export function createFieldGroup<T extends Record<string, any>>(
  options: CreateFieldGroupOptions<T>,
): FieldGroup<T> {
  const {
    initialValues,
    scope,
    keyExtractor,
    seenObjects = new Set<object>(),
    rules = [],
    validateOn,
    debounceMs = 0,
  } = options;

  if (seenObjects.has(initialValues)) {
    throw new Error("Cyclic input detected in form data");
  }
  const branchSeen = new Set(seenObjects);
  branchSeen.add(initialValues);

  const fields = Object.create(null) as { [K in keyof T]: FormNodeFor<T[K]> };
  const groupIssuesState = state<readonly FieldIssue[]>([]);
  const serverIssuesState = state<readonly ServerIssue[]>([]);
  const groupValidationStatusState = state<ValidationStatus>("unvalidated");
  const groupPendingState = state<boolean>(false);

  for (const key of Object.keys(initialValues) as Array<keyof T>) {
    const val = initialValues[key];
    if (Array.isArray(val)) {
      fields[key] = createFieldArray({
        initialValues: val,
        scope,
        keyExtractor,
        seenObjects: branchSeen,
      }) as unknown as FormNodeFor<T[keyof T]>;
    } else if (isPlainRecord(val)) {
      fields[key] = createFieldGroup({
        initialValues: val,
        scope,
        keyExtractor,
        seenObjects: branchSeen,
      }) as unknown as FormNodeFor<T[keyof T]>;
    } else {
      fields[key] = createField({
        initialValue: val,
        scope,
      }) as unknown as FormNodeFor<T[keyof T]>;
    }
  }

  const keys = Object.keys(fields) as Array<keyof T>;
  const runInScope = <R>(fn: () => R): R => (scope ? scope.run(fn) : fn());

  const valuesComputed = runInScope(() =>
    computed(() => {
      const res = Object.create(null) as T;
      for (const k of keys) {
        const node = fields[k] as any;
        res[k] = node.kind === "field" ? node.value.get() : node.values.get();
      }
      return res;
    }),
  );

  const outputComputed = runInScope(() =>
    computed(() => {
      const res = Object.create(null) as T;
      for (const k of keys) {
        const node = fields[k] as any;
        res[k] = node.output
          ? node.output.get()
          : node.kind === "field"
            ? node.value.get()
            : node.values.get();
      }
      return res;
    }),
  );

  const dirtyComputed = runInScope(() =>
    computed(() => keys.some((k) => (fields[k] as any).dirty.get())),
  );

  const touchedComputed = runInScope(() =>
    computed(() => keys.some((k) => (fields[k] as any).touched.get())),
  );

  const pendingComputed = runInScope(() =>
    computed(() => groupPendingState.get() || keys.some((k) => (fields[k] as any).pending.get())),
  );

  const validComputed = runInScope(() =>
    computed(() => {
      const groupValid =
        groupValidationStatusState.get() !== "invalid" &&
        groupIssuesState.get().length === 0 &&
        serverIssuesState.get().length === 0;
      const childrenValid = keys.every((k) => (fields[k] as any).valid.get());
      return groupValid && childrenValid;
    }),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const issuesComputed = runInScope(() =>
    computed(() => {
      const res: FieldIssue[] = [...groupIssuesState.get(), ...serverIssuesState.get()];
      for (const k of keys) {
        const node = fields[k] as any;
        const childIssues: readonly FieldIssue[] = node.issues.get();
        for (const iss of childIssues) {
          const prefix = [k as string, ...(iss.path ?? [])];
          res.push({
            ...iss,
            path: Object.freeze(prefix),
          });
        }
      }
      return Object.freeze(res);
    }),
  );

  const errorsComputed = runInScope(() =>
    computed(() => {
      const res: Record<string, readonly string[]> = Object.create(null);
      const gIssues = [...groupIssuesState.get(), ...serverIssuesState.get()];
      if (gIssues.length > 0) {
        res[""] = gIssues.map((iss) => iss.message ?? iss.code);
      }
      for (const k of keys) {
        const node = fields[k] as any;
        if (node.kind === "field") {
          const errs = node.errors.get();
          if (errs.length > 0) {
            res[k as string] = errs;
          }
        } else {
          const nested = node.errors.get();
          for (const [nestedKey, nestedErrors] of Object.entries(nested)) {
            if ((nestedErrors as readonly string[]).length > 0) {
              const prefix = nestedKey === "" ? String(k) : `${String(k)}.${nestedKey}`;
              res[prefix] = nestedErrors as readonly string[];
            }
          }
        }
      }
      return res;
    }),
  );

  const validationStatusComputed = runInScope(() =>
    computed(() => {
      const allIssues = issuesComputed.get();
      if (allIssues.length > 0) return "invalid";
      const hasUnvalidatedChild = keys.some(
        (k) => (fields[k] as any).validationStatus.get() === "unvalidated",
      );
      if (groupValidationStatusState.get() === "unvalidated" || hasUnvalidatedChild) {
        return "unvalidated";
      }
      return "valid";
    }),
  );

  const groupTriggerSet = new Set<ValidationTriggerMode>();
  if (validateOn !== undefined) {
    if (Array.isArray(validateOn)) {
      for (const t of validateOn) groupTriggerSet.add(t);
    } else {
      groupTriggerSet.add(validateOn as ValidationTriggerMode);
    }
  } else {
    groupTriggerSet.add("change");
  }

  let isValidatingGroupSync = false;
  let activeGroupAbortController: AbortController | null = null;
  let groupRevision = 0;
  let groupDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isDisposed = false;

  const cancelActiveGroupAsync = (): void => {
    if (groupDebounceTimer !== null) {
      clearTimeout(groupDebounceTimer);
      groupDebounceTimer = null;
    }
    if (activeGroupAbortController) {
      activeGroupAbortController.abort();
      activeGroupAbortController = null;
    }
  };

  if (scope) {
    scope.use(() => {
      isDisposed = true;
      cancelActiveGroupAsync();
      groupRevision++;
      if (groupPendingState.get()) {
        groupPendingState.set(false);
      }
    });
  }

  const executeGroupValidation = (
    currentVals: T,
    trigger: ValidationTriggerMode,
    revision: number,
    abortController: AbortController,
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    if (isValidatingGroupSync) {
      throw new Error("Reentrant validation detected in form group");
    }
    isValidatingGroupSync = true;

    try {
      const collectedSyncIssues: FieldIssue[] = [];
      const pendingAsyncCalls: Array<Promise<any>> = [];

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]!;
        let res: any;
        try {
          res = rule(currentVals, {
            trigger,
            signal: abortController.signal,
          } as any);
        } catch (err) {
          throw err;
        }

        if (
          res !== null &&
          (typeof res === "object" || typeof res === "function") &&
          typeof (res as any).then === "function"
        ) {
          pendingAsyncCalls.push(
            Promise.resolve(res).catch((err) => {
              if (
                abortController.signal.aborted ||
                (err && (err.name === "AbortError" || err.code === "ABORT_ERR"))
              ) {
                return null;
              }
              throw err;
            }),
          );
        } else if (res !== null && res !== undefined) {
          if (Array.isArray(res)) {
            for (const item of res) collectedSyncIssues.push(sanitizeIssue(item));
          } else {
            collectedSyncIssues.push(sanitizeIssue(res));
          }
        }
      }

      if (collectedSyncIssues.length > 0 || pendingAsyncCalls.length === 0) {
        cancelActiveGroupAsync();
        batch(() => {
          groupIssuesState.set(Object.freeze([...collectedSyncIssues]));
          groupValidationStatusState.set(collectedSyncIssues.length === 0 ? "valid" : "invalid");
          groupPendingState.set(false);
        });
        return collectedSyncIssues;
      }

      activeGroupAbortController = abortController;
      groupPendingState.set(true);

      const asyncPromise = (async (): Promise<readonly FieldIssue[]> => {
        try {
          const asyncResults = await Promise.all(pendingAsyncCalls);

          if (revision !== groupRevision || abortController.signal.aborted || isDisposed) {
            return groupIssuesState.get();
          }

          const collectedAsyncIssues: FieldIssue[] = [...collectedSyncIssues];
          for (const res of asyncResults) {
            if (res !== null && res !== undefined) {
              if (Array.isArray(res)) {
                for (const item of res) collectedAsyncIssues.push(sanitizeIssue(item));
              } else {
                collectedAsyncIssues.push(sanitizeIssue(res));
              }
            }
          }

          batch(() => {
            groupIssuesState.set(Object.freeze([...collectedAsyncIssues]));
            groupValidationStatusState.set(collectedAsyncIssues.length === 0 ? "valid" : "invalid");
            groupPendingState.set(false);
          });

          return collectedAsyncIssues;
        } catch (err) {
          if (revision === groupRevision && !abortController.signal.aborted && !isDisposed) {
            groupPendingState.set(false);
          }
          throw err;
        } finally {
          if (activeGroupAbortController === abortController) {
            activeGroupAbortController = null;
          }
        }
      })();

      return asyncPromise;
    } finally {
      isValidatingGroupSync = false;
    }
  };

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    if (isDisposed) {
      throw new Error("Form node is disposed");
    }
    cancelActiveGroupAsync();
    const revision = ++groupRevision;
    const ac = new AbortController();
    activeGroupAbortController = ac;

    // Validate all children
    const childPromises: Promise<any>[] = [];
    for (const k of keys) {
      const childRes = (fields[k] as any).validate(trigger);
      if (childRes && typeof childRes.then === "function") {
        childPromises.push(childRes);
      }
    }

    const groupRes = executeGroupValidation(valuesComputed.get(), trigger, revision, ac);
    const hasGroupPromise = groupRes && typeof (groupRes as any).then === "function";

    if (childPromises.length > 0 || hasGroupPromise) {
      return Promise.all([
        hasGroupPromise ? groupRes : Promise.resolve(groupRes),
        ...childPromises,
      ]).then(() => issuesComputed.get());
    }

    return issuesComputed.get();
  };

  const setValues = (partial: Partial<T>): void => {
    if (partial === null || typeof partial !== "object" || Array.isArray(partial)) {
      throw new TypeError(
        `FieldGroup.setValues expected an object, received ${
          partial === null ? "null" : Array.isArray(partial) ? "array" : typeof partial
        }`,
      );
    }
    batch(() => {
      for (const [k, v] of Object.entries(partial) as Array<[keyof T, any]>) {
        if (Object.prototype.hasOwnProperty.call(fields, k)) {
          const node = fields[k] as any;
          if (node.kind === "field") {
            node.setValue(v);
          } else {
            node.setValues(v);
          }
        }
      }
      if (rules.length > 0 && groupTriggerSet.has("change")) {
        const currentVals = Object.create(null) as T;
        for (const k of keys) {
          const node = fields[k] as any;
          currentVals[k] = node.kind === "field" ? node.value.get() : node.values.get();
        }
        cancelActiveGroupAsync();
        const revision = ++groupRevision;
        const ac = new AbortController();
        activeGroupAbortController = ac;
        settleDetachedValidation(
          executeGroupValidation(currentVals, "change", revision, ac),
          "group.validation.async.failed",
        );
      }
    });
  };

  const reset = (nextInitials?: Partial<T>): void => {
    if (
      nextInitials !== undefined &&
      (typeof nextInitials !== "object" || nextInitials === null || Array.isArray(nextInitials))
    ) {
      throw new TypeError(
        `FieldGroup.reset expected an object, received ${
          nextInitials === null
            ? "null"
            : Array.isArray(nextInitials)
              ? "array"
              : typeof nextInitials
        }`,
      );
    }
    cancelActiveGroupAsync();
    groupRevision++;

    batch(() => {
      for (const k of keys) {
        const node = fields[k] as any;
        if (nextInitials !== undefined && Object.prototype.hasOwnProperty.call(nextInitials, k)) {
          node.reset((nextInitials as any)[k]);
        } else {
          node.reset();
        }
      }
      groupIssuesState.set([]);
      serverIssuesState.set([]);
      groupValidationStatusState.set("unvalidated");
      groupPendingState.set(false);
    });
  };

  const setServerIssues = (issues: readonly (ServerIssueInput | string)[]): void => {
    const sanitized: ServerIssue[] = issues.map((iss) =>
      typeof iss === "string"
        ? sanitizeServerIssue({ code: "server.error", message: iss })
        : sanitizeServerIssue(iss),
    );
    serverIssuesState.set(Object.freeze(sanitized));
  };

  const clearServerIssues = (): void => {
    serverIssuesState.set([]);
  };

  return {
    kind: "group",
    fields,
    values: valuesComputed,
    output: outputComputed,
    dirty: dirtyComputed,
    touched: touchedComputed,
    pending: pendingComputed,
    valid: validComputed,
    invalid: invalidComputed,
    errors: errorsComputed,
    issues: issuesComputed,
    groupIssues: groupIssuesState,
    serverIssues: serverIssuesState,
    validationStatus: validationStatusComputed,
    setValues,
    reset,
    setServerIssues,
    clearServerIssues,
    validate,
    getOutput: () => outputComputed.get(),
  };
}

// ---------------------------------------------------------------------------
// FieldArray: repeatable collection with stable identity & child Scope management
// ---------------------------------------------------------------------------

let idCounter = 0;
function generateInternalId(): string {
  return `vii_item_${++idCounter}`;
}

export interface ArrayItem<T> {
  readonly id: string | number;
  readonly node: FormNodeFor<T>;
  readonly scope: Scope;
}

export interface FieldArray<T> {
  readonly kind: "array";
  readonly items: WritableState<readonly ArrayItem<T>[]>;
  readonly values: Computed<T[]>;
  readonly output: Computed<T[]>;
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<string, readonly string[]>>;
  readonly issues: Computed<readonly FieldIssue[]>;
  readonly serverIssues: WritableState<readonly ServerIssue[]>;
  readonly validationStatus: Computed<ValidationStatus>;
  push(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  move(from: number, to: number): void;
  setValues(next: T[]): void;
  reset(nextInitials?: T[]): void;
  setServerIssues(issues: readonly (ServerIssueInput | string)[]): void;
  clearServerIssues(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  getOutput(): T[];
}

export interface CreateFieldArrayOptions<T> {
  readonly initialValues: T[];
  readonly scope?: Scope | undefined;
  readonly keyExtractor?: ((item: T) => string | number) | undefined;
  readonly seenObjects?: Set<object> | undefined;
}

export function createFieldArray<T>(options: CreateFieldArrayOptions<T>): FieldArray<T> {
  const { initialValues, scope, keyExtractor, seenObjects = new Set<object>() } = options;

  if (seenObjects.has(initialValues)) {
    throw new Error("Cyclic input detected in form data");
  }
  const branchSeen = new Set(seenObjects);
  branchSeen.add(initialValues);

  const activeScopes = new Set<Scope>();

  const disposeItem = (item: ArrayItem<T>): void => {
    activeScopes.delete(item.scope);
    item.scope.dispose();
  };

  const createItem = (val: T, assignedKey?: string | number): ArrayItem<T> => {
    const itemScope = scope
      ? scope.createChild({ name: "vii-array-item" })
      : createScope({ name: "vii-array-item" });
    activeScopes.add(itemScope);

    let id: string | number;
    if (assignedKey !== undefined) {
      id = assignedKey;
    } else if (keyExtractor) {
      const extracted = keyExtractor(val);
      if (extracted !== undefined && extracted !== null) {
        id = extracted;
      } else {
        id = generateInternalId();
      }
    } else {
      id = generateInternalId();
    }

    let node: any;
    if (Array.isArray(val)) {
      node = createFieldArray({
        initialValues: val,
        scope: itemScope,
        keyExtractor,
        seenObjects: branchSeen,
      });
    } else if (isPlainRecord(val)) {
      node = createFieldGroup({
        initialValues: val as Record<string, any>,
        scope: itemScope,
        keyExtractor,
        seenObjects: branchSeen,
      });
    } else {
      node = createField({
        initialValue: val,
        scope: itemScope,
      });
    }
    return { id, node, scope: itemScope };
  };

  const validateUniqueKeys = (items: readonly ArrayItem<T>[]): void => {
    const seen = new Set<string | number>();
    for (const item of items) {
      if (seen.has(item.id)) {
        throw new Error(`Duplicate key "${item.id}" detected in FieldArray`);
      }
      seen.add(item.id);
    }
  };

  const initialItems = initialValues.map((v) => createItem(v));
  validateUniqueKeys(initialItems);

  const initialKeys = initialItems.map((it) => it.id);

  const itemsState = state<readonly ArrayItem<T>[]>(initialItems);
  const serverIssuesState = state<readonly ServerIssue[]>([]);
  const initialValuesState = state<T[]>(initialValues);
  const initialKeysState = state<readonly (string | number)[]>(initialKeys);

  let isDisposed = false;

  // Register array cleanup in parent scope
  if (scope) {
    scope.use(() => {
      isDisposed = true;
      for (const s of activeScopes) {
        s.dispose();
      }
      activeScopes.clear();
    });
  }

  const runInScope = <R>(fn: () => R): R => (scope ? scope.run(fn) : fn());

  const valuesComputed = runInScope(() =>
    computed(() => {
      return itemsState.get().map((item) => {
        const n = item.node as any;
        return n.kind === "field" ? n.value.get() : n.values.get();
      });
    }),
  );

  const outputComputed = runInScope(() =>
    computed(() => {
      return itemsState.get().map((item) => {
        const n = item.node as any;
        return n.output ? n.output.get() : n.kind === "field" ? n.value.get() : n.values.get();
      });
    }),
  );

  const dirtyComputed = runInScope(() =>
    computed(() => {
      const current = itemsState.get();
      const initials = initialValuesState.get();
      const initKeys = initialKeysState.get();

      // Length change = dirty
      if (current.length !== initials.length) return true;

      // Identity-strict order/identity check
      for (let i = 0; i < current.length; i++) {
        if (current[i]?.id !== initKeys[i]) {
          return true;
        }
      }

      // Any child field edited = dirty
      return current.some((item) => (item.node as any).dirty.get());
    }),
  );

  const touchedComputed = runInScope(() =>
    computed(() => itemsState.get().some((item) => (item.node as any).touched.get())),
  );

  const pendingComputed = runInScope(() =>
    computed(() => itemsState.get().some((item) => (item.node as any).pending.get())),
  );

  const validComputed = runInScope(() =>
    computed(
      () =>
        serverIssuesState.get().length === 0 &&
        itemsState.get().every((item) => (item.node as any).valid.get()),
    ),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const errorsComputed = runInScope(() =>
    computed(() => {
      const res: Record<string, readonly string[]> = {};
      const sIssues = serverIssuesState.get();
      if (sIssues.length > 0) {
        res[""] = sIssues.map((iss) => iss.message ?? iss.code);
      }
      const items = itemsState.get();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const n = item.node as any;
        if (n.kind === "field") {
          const errs = n.errors.get();
          if (errs.length > 0) {
            res[`[${i}]`] = errs;
          }
        } else {
          const nested = n.errors.get();
          for (const [nestedKey, nestedErrors] of Object.entries(nested)) {
            if ((nestedErrors as readonly string[]).length > 0) {
              const prefix = nestedKey === "" ? `[${i}]` : `[${i}].${nestedKey}`;
              res[prefix] = nestedErrors as readonly string[];
            }
          }
        }
      }
      return res;
    }),
  );

  const getIssues = (): readonly FieldIssue[] => {
    const res: FieldIssue[] = [...serverIssuesState.get()];
    const items = itemsState.get();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const n = item.node as any;
      const childIssues: readonly FieldIssue[] = n.issues.get();
      for (const iss of childIssues) {
        const prefix = [i, ...(iss.path ?? [])];
        res.push({
          ...iss,
          path: Object.freeze(prefix),
        });
      }
    }
    return Object.freeze(res);
  };

  const getValidationStatus = (): ValidationStatus => {
    if (serverIssuesState.get().length > 0) {
      return "invalid";
    }
    const items = itemsState.get();
    if (items.some((it) => (it.node as any).validationStatus.get() === "invalid")) {
      return "invalid";
    }
    if (items.some((it) => (it.node as any).validationStatus.get() === "unvalidated")) {
      return "unvalidated";
    }
    return "valid";
  };

  const issuesComputed = runInScope(() => computed(() => getIssues()));
  const validationStatusComputed = runInScope(() => computed(() => getValidationStatus()));

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    if (isDisposed) {
      throw new Error("Form node is disposed");
    }
    const items = itemsState.get();
    const childPromises: Promise<any>[] = [];

    for (const it of items) {
      const childRes = (it.node as any).validate(trigger);
      if (childRes && typeof childRes.then === "function") {
        childPromises.push(childRes);
      }
    }

    if (childPromises.length > 0) {
      return Promise.all(childPromises).then(() => issuesComputed.get());
    }

    return issuesComputed.get();
  };

  const push = (value: T): void => {
    const current = itemsState.get();
    if (keyExtractor) {
      const key = keyExtractor(value);
      if (key !== undefined && key !== null && current.some((it) => it.id === key)) {
        throw new Error(`Duplicate key "${key}" detected in FieldArray`);
      }
    }
    const item = createItem(value);
    try {
      const next = [...current, item];
      validateUniqueKeys(next);
      itemsState.set(next);
    } catch (err) {
      disposeItem(item);
      throw err;
    }
  };

  const insert = (index: number, value: T): void => {
    const current = [...itemsState.get()];
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > current.length
    ) {
      throw new RangeError(
        `Index ${index} is out of bounds for FieldArray of length ${current.length}`,
      );
    }
    if (keyExtractor) {
      const key = keyExtractor(value);
      if (key !== undefined && key !== null && current.some((it) => it.id === key)) {
        throw new Error(`Duplicate key "${key}" detected in FieldArray`);
      }
    }
    const item = createItem(value);
    try {
      current.splice(index, 0, item);
      validateUniqueKeys(current);
      itemsState.set(current);
    } catch (err) {
      disposeItem(item);
      throw err;
    }
  };

  const remove = (index: number): void => {
    const current = [...itemsState.get()];
    if (index >= 0 && index < current.length) {
      const removed = current.splice(index, 1);
      if (removed[0]) {
        disposeItem(removed[0]);
      }
      itemsState.set(current);
    }
  };

  const swap = (indexA: number, indexB: number): void => {
    const current = [...itemsState.get()];
    if (
      indexA >= 0 &&
      indexA < current.length &&
      indexB >= 0 &&
      indexB < current.length &&
      indexA !== indexB
    ) {
      const itemA = current[indexA];
      const itemB = current[indexB];
      if (itemA && itemB) {
        current[indexA] = itemB;
        current[indexB] = itemA;
        itemsState.set(current);
      }
    }
  };

  const move = (from: number, to: number): void => {
    const current = [...itemsState.get()];
    if (from >= 0 && from < current.length && to >= 0 && to < current.length && from !== to) {
      const removed = current.splice(from, 1);
      if (removed[0]) {
        current.splice(to, 0, removed[0]);
        itemsState.set(current);
      }
    }
  };

  const setValues = (next: T[]): void => {
    if (!Array.isArray(next)) {
      throw new TypeError(
        `FieldArray.setValues expected an array, received ${next === null ? "null" : typeof next}`,
      );
    }
    batch(() => {
      const current = itemsState.get();

      if (keyExtractor) {
        const derivedKeys = next.map((v) => keyExtractor(v));
        const seenKeys = new Set<string | number>();
        for (const key of derivedKeys) {
          if (seenKeys.has(key)) {
            throw new Error(`Duplicate key "${key}" detected in FieldArray`);
          }
          seenKeys.add(key);
        }

        const currentByDerivedKey = new Map<string | number, ArrayItem<T>>();
        for (const item of current) {
          const currentDerivedKey = keyExtractor(
            (item.node as any).kind === "field"
              ? (item.node as any).value.get()
              : (item.node as any).values.get(),
          );
          currentByDerivedKey.set(currentDerivedKey, item);
        }

        const newItems: ArrayItem<T>[] = [];
        const createdThisRun: ArrayItem<T>[] = [];
        const usedOldKeys = new Set<string | number>();

        try {
          for (let i = 0; i < next.length; i++) {
            const nextVal = next[i];
            const derivedKey = derivedKeys[i]!;
            const existingItem = currentByDerivedKey.get(derivedKey);

            if (existingItem) {
              usedOldKeys.add(derivedKey);
              if (existingItem.id === derivedKey) {
                newItems.push(existingItem);
              } else {
                newItems.push({
                  id: derivedKey,
                  node: existingItem.node,
                  scope: existingItem.scope,
                });
              }
            } else {
              const item = createItem(nextVal as T, derivedKey);
              createdThisRun.push(item);
              newItems.push(item);
            }
          }
        } catch (err) {
          for (const item of createdThisRun) {
            disposeItem(item);
          }
          throw err;
        }

        for (let i = 0; i < next.length; i++) {
          const nextVal = next[i];
          const derivedKey = derivedKeys[i]!;
          const existingItem = currentByDerivedKey.get(derivedKey);
          if (existingItem) {
            const n = existingItem.node as any;
            if (n.kind === "field") {
              n.setValue(nextVal);
            } else {
              n.setValues(nextVal);
            }
          }
        }

        for (const [key, oldItem] of currentByDerivedKey.entries()) {
          if (!usedOldKeys.has(key)) {
            disposeItem(oldItem);
          }
        }

        let hasStructuralChange = current.length !== newItems.length;
        if (!hasStructuralChange) {
          for (let i = 0; i < current.length; i++) {
            if (current[i] !== newItems[i]) {
              hasStructuralChange = true;
              break;
            }
          }
        }

        if (hasStructuralChange) {
          itemsState.set(newItems);
        }
      } else {
        const createdThisRun: ArrayItem<T>[] = [];
        const newItems: ArrayItem<T>[] = [];

        try {
          for (let i = 0; i < next.length; i++) {
            const nextVal = next[i];
            if (i < current.length) {
              newItems.push(current[i]!);
            } else {
              const item = createItem(nextVal as T);
              createdThisRun.push(item);
              newItems.push(item);
            }
          }
        } catch (err) {
          for (const item of createdThisRun) {
            disposeItem(item);
          }
          throw err;
        }

        for (let i = 0; i < Math.min(current.length, next.length); i++) {
          const nextVal = next[i];
          const item = current[i]!;
          const n = item.node as any;
          if (n.kind === "field") {
            n.setValue(nextVal);
          } else {
            n.setValues(nextVal);
          }
        }

        for (let i = next.length; i < current.length; i++) {
          const item = current[i];
          if (item) {
            disposeItem(item);
          }
        }

        let hasStructuralChange = current.length !== next.length;
        if (hasStructuralChange) {
          itemsState.set(newItems);
        }
      }
    });
  };

  const reset = (nextInitials?: T[]): void => {
    if (nextInitials !== undefined && !Array.isArray(nextInitials)) {
      throw new TypeError(
        `FieldArray.reset expected an array, received ${
          nextInitials === null ? "null" : typeof nextInitials
        }`,
      );
    }
    batch(() => {
      const initials = nextInitials !== undefined ? nextInitials : initialValuesState.get();
      const currentItems = itemsState.get();

      const createdItems: ArrayItem<T>[] = [];
      try {
        for (const v of initials) {
          createdItems.push(createItem(v));
        }
        validateUniqueKeys(createdItems);
      } catch (err) {
        for (const item of createdItems) {
          disposeItem(item);
        }
        throw err;
      }

      if (nextInitials !== undefined) {
        initialValuesState.set(nextInitials);
      }

      for (const item of currentItems) {
        disposeItem(item);
      }

      initialKeysState.set(createdItems.map((it) => it.id));
      serverIssuesState.set([]);
      itemsState.set(createdItems);
    });
  };

  const setServerIssues = (issues: readonly (ServerIssueInput | string)[]): void => {
    const sanitized: ServerIssue[] = issues.map((iss) =>
      typeof iss === "string"
        ? sanitizeServerIssue({ code: "server.error", message: iss })
        : sanitizeServerIssue(iss),
    );
    serverIssuesState.set(Object.freeze(sanitized));
  };

  const clearServerIssues = (): void => {
    serverIssuesState.set([]);
  };

  return {
    kind: "array",
    items: itemsState,
    values: valuesComputed,
    output: outputComputed,
    dirty: dirtyComputed,
    touched: touchedComputed,
    pending: pendingComputed,
    valid: validComputed,
    invalid: invalidComputed,
    errors: errorsComputed,
    issues: issuesComputed,
    serverIssues: serverIssuesState,
    validationStatus: validationStatusComputed,
    push,
    insert,
    remove,
    swap,
    move,
    setValues,
    reset,
    setServerIssues,
    clearServerIssues,
    validate,
    getOutput: () => outputComputed.get(),
  };
}

// ---------------------------------------------------------------------------
// FormInstance & Strict Path Parsing / Resolution
// ---------------------------------------------------------------------------

export type FieldValues = Record<string, any>;

export interface FormConfig<T extends FieldValues> {
  readonly initialValues: T;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
  readonly rules?: readonly AnyValidationRule<T>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
  readonly debounceMs?: number | undefined;
  readonly submitAction?: SubmitAction<T, any> | undefined;
  readonly duplicatePolicy?: DuplicateSubmitPolicy | undefined;
}

export interface FormInstance<T extends FieldValues> {
  readonly root: FieldGroup<T>;
  readonly fields: { [K in keyof T]: FormNodeFor<T[K]> };
  readonly values: Computed<T>;
  readonly output: Computed<T>;
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<string, readonly string[]>>;
  readonly issues: Computed<readonly FieldIssue[]>;
  readonly serverIssues: WritableState<readonly ServerIssue[]>;
  readonly validationStatus: Computed<ValidationStatus>;
  readonly submissionStatus: WritableState<SubmissionStatus>;
  readonly submitting: Computed<boolean>;
  getNode(path: string): FormNode | undefined;
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
  reinitialize(nextInitials: Partial<T>): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  setServerIssues(issues: readonly (ServerIssueInput | string)[]): void;
  clearServerIssues(): void;
  submit<TResult = void>(
    action?: SubmitAction<T, TResult>,
    options?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>>;
  cancelSubmit(): void;
  getOutput(): T;
  dispose(): void;
}

export function parsePath(path: string): Array<string | number> {
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error(`Invalid path: path cannot be empty`);
  }

  const parts: Array<string | number> = [];
  let i = 0;
  const len = path.length;

  while (i < len) {
    const char = path[i];

    if (char === ".") {
      if (i === 0 || i === len - 1 || path[i - 1] === "." || path[i - 1] === "[") {
        throw new Error(`Invalid path syntax: unexpected dot at index ${i} in "${path}"`);
      }
      if (i + 1 < len && path[i + 1] === "[") {
        throw new Error(`Invalid path syntax: dot before bracket at index ${i} in "${path}"`);
      }
      i++;
      continue;
    }

    if (char === "[") {
      const closeIdx = path.indexOf("]", i);
      if (closeIdx === -1) {
        throw new Error(`Invalid path syntax: unclosed bracket in "${path}"`);
      }
      const rawIndex = path.slice(i + 1, closeIdx);
      if (rawIndex.trim() === "" || !/^\d+$/.test(rawIndex)) {
        throw new Error(
          `Invalid path syntax: array index must be a non-negative integer, received "${rawIndex}" in "${path}"`,
        );
      }
      if (rawIndex.length > 1 && rawIndex.startsWith("0")) {
        throw new Error(
          `Invalid path syntax: leading zeros not allowed in array index "${rawIndex}" in "${path}"`,
        );
      }
      parts.push(parseInt(rawIndex, 10));
      i = closeIdx + 1;
      if (i < len && path[i] !== "." && path[i] !== "[") {
        throw new Error(
          `Invalid path syntax: bracket segment must be followed by '.', '[', or end of path, found "${path[i]}" at index ${i} in "${path}"`,
        );
      }
      continue;
    }

    // Property name segment
    let propEnd = i;
    while (propEnd < len && path[propEnd] !== "." && path[propEnd] !== "[") {
      if (path[propEnd] === "]") {
        throw new Error(
          `Invalid path syntax: unexpected closing bracket at index ${propEnd} in "${path}"`,
        );
      }
      propEnd++;
    }
    const segment = path.slice(i, propEnd);
    if (segment.trim() === "") {
      throw new Error(`Invalid path syntax: empty property segment in "${path}"`);
    }

    // Prototype pollution defense
    if (segment === "__proto__" || segment === "prototype" || segment === "constructor") {
      throw new Error(
        `Security error: Prototype pollution attempt blocked on path segment "${segment}"`,
      );
    }

    parts.push(segment);
    i = propEnd;
  }

  return parts;
}

function collectArraySnapshots(root: FieldGroup<any>): ArraySnapshotMap {
  const map: ArraySnapshotMap = new Map();

  function traverse(node: any, currentPath: readonly FieldPathSegment[]) {
    if (!node) return;
    if (node.kind === "array") {
      const items = node.items.get();
      const itemIds = items.map((it: any) => it.id);
      map.set(createArraySnapshotKey(currentPath), Object.freeze(itemIds));
      for (let i = 0; i < items.length; i++) {
        traverse(items[i].node, [...currentPath, i]);
      }
    } else if (node.kind === "group") {
      for (const [key, child] of Object.entries(node.fields)) {
        traverse(child, [...currentPath, key]);
      }
    }
  }

  for (const [key, child] of Object.entries(root.fields)) {
    traverse(child, [key]);
  }

  return map;
}

export function createForm<T extends FieldValues>(config: FormConfig<T>): FormInstance<T> {
  const scope = createScope({ name: "vii-form-root" });

  const root = createFieldGroup<T>({
    initialValues: config.initialValues,
    scope,
    keyExtractor: config.keyExtractor,
    rules: config.rules,
    validateOn: config.validateOn,
    debounceMs: config.debounceMs,
  });

  const submissionStatusState = state<SubmissionStatus>("idle");
  const formServerIssuesState = state<readonly ServerIssue[]>([]);
  let activeSubmissionAbortController: AbortController | null = null;
  let currentSubmissionRevision = 0;
  let isDisposed = false;

  const assertActive = (): void => {
    if (isDisposed) {
      throw new Error("Form is disposed");
    }
  };

  const submittingComputed = scope.run(() =>
    computed(() => {
      const status = submissionStatusState.get();
      return status === "validating" || status === "submitting";
    }),
  );

  const validComputed = scope.run(() =>
    computed(() => {
      return root.valid.get() && formServerIssuesState.get().length === 0;
    }),
  );

  const invalidComputed = scope.run(() => computed(() => !validComputed.get()));

  const issuesComputed = scope.run(() =>
    computed(() => {
      const rootIssues = root.issues.get();
      const sIssues = formServerIssuesState.get();
      if (sIssues.length === 0) return rootIssues;
      return Object.freeze([...rootIssues, ...sIssues]);
    }),
  );

  const errorsComputed = scope.run(() =>
    computed(() => {
      const base = root.errors.get();
      const sIssues = formServerIssuesState.get();
      if (sIssues.length === 0) return base;
      const res: Record<string, readonly string[]> = Object.create(null);
      for (const [k, v] of Object.entries(base)) {
        res[k] = v;
      }
      const rootServerErrs = sIssues.map((iss) => iss.message ?? iss.code);
      if (rootServerErrs.length > 0) {
        res[""] = Object.freeze([...(res[""] ?? []), ...rootServerErrs]);
      }
      return Object.freeze(res);
    }),
  );

  const validationStatusComputed = scope.run(() =>
    computed(() => {
      if (formServerIssuesState.get().length > 0) return "invalid";
      return root.validationStatus.get();
    }),
  );

  const clearFormServerIssues = (): void => {
    formServerIssuesState.set([]);
    function clearNode(node: any) {
      if (!node) return;
      if (typeof node.clearServerIssues === "function") {
        node.clearServerIssues();
      }
      if (node.kind === "group") {
        for (const child of Object.values(node.fields)) {
          clearNode(child);
        }
      } else if (node.kind === "array") {
        for (const item of node.items.get()) {
          clearNode((item as any).node);
        }
      }
    }
    clearNode(root);
  };

  const routeServerIssuesToTree = (
    issues: readonly ServerIssue[],
    arraySnapshots?: ArraySnapshotMap,
  ): void => {
    batch(() => {
      for (const issue of issues) {
        if (!issue.path || issue.path.length === 0) {
          formServerIssuesState.set(Object.freeze([...formServerIssuesState.get(), issue]));
          continue;
        }

        let curr: any = root;
        let i = 0;
        const pathSegments = issue.path;
        const traversedSegments: FieldPathSegment[] = [];

        while (i < pathSegments.length) {
          const seg = pathSegments[i]!;
          traversedSegments.push(seg);
          if (!curr) break;

          if (curr.kind === "group") {
            if (
              typeof seg !== "string" ||
              !Object.prototype.hasOwnProperty.call(curr.fields, seg)
            ) {
              curr = null;
              break;
            }
            curr = curr.fields[seg];
            i++;
          } else if (curr.kind === "array") {
            if (typeof seg !== "number") {
              curr = null;
              break;
            }
            const arrayPathKey = traversedSegments.slice(0, -1).join(".");
            const snapshotItemIds = arraySnapshots?.get(arrayPathKey);
            let targetItem: any = null;

            if (snapshotItemIds && seg in snapshotItemIds) {
              const targetItemId = snapshotItemIds[seg];
              const currentItems = curr.items.get();
              targetItem = currentItems.find((it: any) => it.id === targetItemId);
            } else {
              const currentItems = curr.items.get();
              targetItem = currentItems[seg];
            }

            if (!targetItem) {
              curr = null;
              break;
            }
            curr = targetItem.node;
            i++;
          } else if (curr.kind === "field") {
            curr = null;
            break;
          } else {
            curr = null;
            break;
          }
        }

        if (curr && typeof curr.setServerIssues === "function") {
          const remainingPath = pathSegments.slice(i);
          const localizedIssue = {
            ...issue,
            path: remainingPath.length > 0 ? Object.freeze(remainingPath) : undefined,
          };
          curr.setServerIssues([...curr.serverIssues.get(), localizedIssue]);
        } else {
          // Unresolvable or removed item or unknown path: preserve at form level
          formServerIssuesState.set(Object.freeze([...formServerIssuesState.get(), issue]));
        }
      }
    });
  };

  const cancelSubmit = (): void => {
    const currentStatus = submissionStatusState.get();
    if (currentStatus === "validating" || currentStatus === "submitting") {
      if (activeSubmissionAbortController) {
        activeSubmissionAbortController.abort();
        activeSubmissionAbortController = null;
      }
      currentSubmissionRevision++;
      submissionStatusState.set("cancelled");
      const diag = getActiveDiagnostics();
      if (diag) {
        diag.record("form.submission.cancelled", { revision: currentSubmissionRevision });
      }
    }
  };

  const submit = async <TResult = void>(
    action?: SubmitAction<T, TResult>,
    options?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>> => {
    assertActive();

    const duplicatePolicy = options?.duplicatePolicy ?? config.duplicatePolicy ?? "drop";
    const effectiveAction = action ?? (config.submitAction as SubmitAction<T, TResult> | undefined);

    const currentStatus = submissionStatusState.get();
    if (currentStatus === "validating" || currentStatus === "submitting") {
      if (duplicatePolicy === "reject") {
        throw new Error("Submission is already in progress");
      }
      if (duplicatePolicy === "drop") {
        return { status: "cancelled" };
      }
      if (duplicatePolicy === "supersede") {
        if (activeSubmissionAbortController) {
          activeSubmissionAbortController.abort();
          activeSubmissionAbortController = null;
        }
      }
    }

    const revision = ++currentSubmissionRevision;
    const ac = new AbortController();
    activeSubmissionAbortController = ac;
    submissionStatusState.set("validating");

    const diag = getActiveDiagnostics();
    if (diag) {
      diag.record("form.submission.started", { revision });
    }

    const arraySnapshots = collectArraySnapshots(root);

    let outputSnapshot: T;
    try {
      outputSnapshot = deepCloneSnapshot(root.getOutput());
    } catch (outputErr) {
      if (activeSubmissionAbortController === ac) {
        activeSubmissionAbortController = null;
      }
      submissionStatusState.set("failed");
      if (diag) {
        diag.record("form.submission.failed", {
          reason: outputErr instanceof Error ? outputErr.name : typeof outputErr,
        });
      }
      throw outputErr;
    }

    clearFormServerIssues();

    let valIssues: readonly FieldIssue[];
    try {
      const valResult = root.validate("submit");
      if (valResult !== null && typeof (valResult as any).then === "function") {
        valIssues = await valResult;
      } else {
        valIssues = valResult as readonly FieldIssue[];
      }
    } catch (valErr) {
      if (revision === currentSubmissionRevision && !ac.signal.aborted && !isDisposed) {
        submissionStatusState.set("failed");
        if (activeSubmissionAbortController === ac) {
          activeSubmissionAbortController = null;
        }
        if (diag) {
          diag.record("form.submission.failed", {
            reason: valErr instanceof Error ? valErr.name : typeof valErr,
          });
        }
      }
      throw valErr;
    }

    if (revision !== currentSubmissionRevision || ac.signal.aborted || isDisposed) {
      return { status: "cancelled" };
    }

    if (
      valIssues.length > 0 ||
      root.invalid.get() ||
      root.issues.get().length > 0 ||
      root.validationStatus.get() === "invalid"
    ) {
      submissionStatusState.set("idle");
      if (activeSubmissionAbortController === ac) {
        activeSubmissionAbortController = null;
      }
      if (diag) {
        diag.record("form.submission.validation_blocked", {
          issueCount: root.issues.get().length,
        });
      }
      return { status: "invalid", issues: root.issues.get() };
    }

    submissionStatusState.set("submitting");
    if (diag) {
      diag.record("form.submission.submitting", { revision });
    }

    if (!effectiveAction) {
      if (activeSubmissionAbortController === ac) {
        activeSubmissionAbortController = null;
      }
      submissionStatusState.set("succeeded");
      if (diag) {
        diag.record("form.submission.succeeded", { revision });
      }
      return { status: "succeeded", result: undefined as unknown as TResult };
    }

    try {
      const actionResult = await effectiveAction(outputSnapshot, { signal: ac.signal });

      if (revision !== currentSubmissionRevision || ac.signal.aborted || isDisposed) {
        return { status: "cancelled" };
      }

      if (
        actionResult !== null &&
        typeof actionResult === "object" &&
        (actionResult as any).ok === false &&
        Array.isArray((actionResult as any).issues)
      ) {
        const rawIssues = (actionResult as any).issues;
        const sanitizedServerIssues = rawIssues.map((iss: any) =>
          typeof iss === "string"
            ? sanitizeServerIssue({ code: "server.error", message: iss })
            : sanitizeServerIssue(iss),
        );

        routeServerIssuesToTree(sanitizedServerIssues, arraySnapshots);

        submissionStatusState.set("failed");
        if (diag) {
          diag.record("form.submission.failed", {
            reason: "server_validation",
            issueCount: sanitizedServerIssues.length,
          });
        }
        return { status: "server-invalid", issues: sanitizedServerIssues };
      }

      const finalResult =
        actionResult !== null &&
        typeof actionResult === "object" &&
        (actionResult as any).ok === true &&
        "result" in actionResult
          ? (actionResult as any).result
          : actionResult;

      submissionStatusState.set("succeeded");
      if (diag) {
        diag.record("form.submission.succeeded", { revision });
      }
      return { status: "succeeded", result: finalResult as TResult };
    } catch (actionErr: any) {
      if (revision !== currentSubmissionRevision || ac.signal.aborted || isDisposed) {
        return { status: "cancelled" };
      }

      if (
        actionErr &&
        (actionErr.name === "AbortError" ||
          actionErr.code === "ABORT_ERR" ||
          actionErr.message?.includes("aborted"))
      ) {
        submissionStatusState.set("cancelled");
        if (diag) {
          diag.record("form.submission.cancelled", { revision });
        }
        return { status: "cancelled" };
      }

      submissionStatusState.set("failed");
      if (diag) {
        diag.record("form.submission.failed", {
          reason: actionErr instanceof Error ? actionErr.name : typeof actionErr,
        });
      }
      throw actionErr;
    } finally {
      if (activeSubmissionAbortController === ac) {
        activeSubmissionAbortController = null;
      }
    }
  };

  const getNode = (path: string): FormNode | undefined => {
    assertActive();
    let segments: Array<string | number>;
    try {
      segments = parsePath(path);
    } catch {
      return undefined;
    }

    let curr: any = root;
    for (const seg of segments) {
      if (!curr) return undefined;
      if (curr.kind === "group") {
        if (!Object.prototype.hasOwnProperty.call(curr.fields, seg)) return undefined;
        curr = curr.fields[seg];
      } else if (curr.kind === "array") {
        if (typeof seg === "number") {
          const items = curr.items.get();
          curr = items[seg]?.node;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    return curr;
  };

  const setServerIssues = (issues: readonly (ServerIssueInput | string)[]): void => {
    assertActive();
    const sanitized: ServerIssue[] = issues.map((iss) =>
      typeof iss === "string"
        ? sanitizeServerIssue({ code: "server.error", message: iss })
        : sanitizeServerIssue(iss),
    );
    routeServerIssuesToTree(sanitized);
  };

  const clearServerIssues = (): void => {
    assertActive();
    clearFormServerIssues();
  };

  const setValues = (partial: Partial<T>): void => {
    assertActive();
    root.setValues(partial);
  };

  const reset = (nextInitials?: Partial<T>): void => {
    assertActive();
    cancelSubmit();
    submissionStatusState.set("idle");
    clearFormServerIssues();
    root.reset(nextInitials);
  };

  const reinitialize = (nextInitials: Partial<T>): void => {
    reset(nextInitials);
  };

  return {
    root,
    fields: root.fields,
    values: root.values,
    output: root.output,
    dirty: root.dirty,
    touched: root.touched,
    pending: root.pending,
    valid: validComputed,
    invalid: invalidComputed,
    errors: errorsComputed,
    issues: issuesComputed,
    serverIssues: formServerIssuesState,
    validationStatus: validationStatusComputed,
    submissionStatus: submissionStatusState,
    submitting: submittingComputed,
    getNode,
    setValues,
    reset,
    reinitialize,
    setServerIssues,
    clearServerIssues,
    validate: (
      trigger: ValidationTriggerMode = "manual",
    ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
      assertActive();
      return root.validate(trigger);
    },
    submit,
    cancelSubmit,
    getOutput: (): T => {
      assertActive();
      return root.getOutput();
    },
    dispose: () => {
      if (isDisposed) return;
      isDisposed = true;
      if (activeSubmissionAbortController) {
        activeSubmissionAbortController.abort();
        activeSubmissionAbortController = null;
      }
      scope.dispose();
    },
  };
}

export interface ExternalBindingOptions<T extends FieldValues> {
  readonly externalState: WritableState<T>;
  readonly scope?: Scope | undefined;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
}

const MAX_EXTERNAL_SYNC_DEPTH = 50;

export function bindFormToExternalState<T extends FieldValues>(
  options: ExternalBindingOptions<T>,
): FormInstance<T> {
  const {
    externalState,
    scope = createScope({ name: "vii-external-form" }),
    keyExtractor,
  } = options;
  const initial = externalState.get();

  const form = createForm<T>({
    initialValues: initial,
    keyExtractor,
  });

  let isSyncingToExternal = false;
  let isSyncingFromExternal = false;
  let syncDepth = 0;
  let consecutiveSyncCount = 0;
  let lastPushedOutward: T | undefined = undefined;
  let lastAppliedInward: T | undefined = undefined;

  const enterSyncDepth = (): void => {
    if (++syncDepth > MAX_EXTERNAL_SYNC_DEPTH || consecutiveSyncCount > MAX_EXTERNAL_SYNC_DEPTH) {
      syncDepth = 0;
      consecutiveSyncCount = 0;
      lastPushedOutward = undefined;
      lastAppliedInward = undefined;
      throw new Error("Cyclic synchronisation detected in bindFormToExternalState");
    }
  };

  const exitSyncDepth = (): void => {
    if (syncDepth > 0) {
      syncDepth--;
    }
  };

  scope.run(() => {
    form.values.subscribe((nextValues: T) => {
      if (nextValues === lastAppliedInward) {
        lastAppliedInward = undefined;
        consecutiveSyncCount = 0;
        return;
      }
      if (isSyncingFromExternal) return;
      if (lastAppliedInward !== undefined) {
        consecutiveSyncCount++;
      } else {
        consecutiveSyncCount = 1;
      }
      enterSyncDepth();
      lastPushedOutward = nextValues;
      lastAppliedInward = undefined;
      isSyncingToExternal = true;
      try {
        externalState.set(nextValues);
      } finally {
        isSyncingToExternal = false;
        exitSyncDepth();
      }
    });
  });

  scope.run(() => {
    externalState.subscribe((nextExternal: T) => {
      if (nextExternal === lastPushedOutward) {
        lastPushedOutward = undefined;
        consecutiveSyncCount = 0;
        return;
      }
      if (isSyncingToExternal) return;
      if (lastPushedOutward !== undefined) {
        consecutiveSyncCount++;
      } else {
        consecutiveSyncCount = 1;
      }
      enterSyncDepth();
      lastAppliedInward = nextExternal;
      lastPushedOutward = undefined;
      isSyncingFromExternal = true;
      try {
        form.setValues(nextExternal);
      } finally {
        isSyncingFromExternal = false;
        exitSyncDepth();
      }
    });
  });

  let isDisposed = false;

  return {
    ...form,
    dispose: () => {
      if (isDisposed) return;
      isDisposed = true;
      form.dispose();
      scope.dispose();
    },
  };
}
