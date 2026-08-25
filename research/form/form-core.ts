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

// ---------------------------------------------------------------------------
// Equality & Basic Types
// ---------------------------------------------------------------------------

export type EqualityFn<T> = (a: T, b: T) => boolean;

export const defaultEquality: EqualityFn<unknown> = (a, b) => Object.is(a, b);

// ---------------------------------------------------------------------------
// Structured Issues & Validation Taxonomy (F3)
// ---------------------------------------------------------------------------

export type FieldPathSegment = string | number;

export interface FieldIssue {
  readonly code: string;
  readonly message?: string | undefined;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly source: "validation";
  readonly ruleId?: string | undefined;
}

export type ValidationTriggerMode = "change" | "blur" | "submit" | "manual";

export type ValidationStatus = "unvalidated" | "valid" | "invalid";

export interface ValidationRuleContext {
  readonly trigger: ValidationTriggerMode;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly form?: FormInstance<any> | undefined;
}

export type SyncValidationRule<T, Ctx extends ValidationRuleContext = ValidationRuleContext> = (
  value: T,
  context: Ctx,
) => FieldIssue | readonly FieldIssue[] | null | undefined;

// Defensive result validation & prototype pollution defense
function sanitizeIssue(raw: any, defaultPath?: readonly FieldPathSegment[]): FieldIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError(
      `Validation rule returned invalid issue shape: expected an object, received ${
        raw === null ? "null" : typeof raw
      }`,
    );
  }
  if (typeof raw.code !== "string" || raw.code.trim() === "") {
    throw new TypeError("Validation issue must have a non-empty string 'code'");
  }
  if (raw.code === "__proto__" || raw.code === "constructor" || raw.code === "prototype") {
    throw new Error(
      `Security error: Prototype pollution attempt blocked on issue code "${raw.code}"`,
    );
  }

  let issuePath: readonly FieldPathSegment[] | undefined = undefined;
  if (raw.path !== undefined) {
    if (!Array.isArray(raw.path)) {
      throw new TypeError("Validation issue 'path' must be an array of string | number segments");
    }
    for (const seg of raw.path) {
      if (typeof seg !== "string" && typeof seg !== "number") {
        throw new TypeError(
          `Validation issue path segment must be string or number, received ${typeof seg}`,
        );
      }
      if (
        typeof seg === "string" &&
        (seg === "__proto__" || seg === "constructor" || seg === "prototype")
      ) {
        throw new Error(
          `Security error: Prototype pollution attempt blocked on issue path segment "${seg}"`,
        );
      }
    }
    issuePath = Object.freeze([...raw.path]);
  } else if (defaultPath !== undefined) {
    issuePath = defaultPath;
  }

  const sanitized: FieldIssue = {
    code: String(raw.code),
    message: typeof raw.message === "string" ? raw.message : undefined,
    path: issuePath,
    source: "validation",
    ruleId: typeof raw.ruleId === "string" ? raw.ruleId : undefined,
  };
  return Object.freeze(sanitized);
}

// ---------------------------------------------------------------------------
// FieldState (Leaf Node)
// ---------------------------------------------------------------------------

export interface FieldState<T> {
  readonly kind: "field";
  readonly value: WritableState<T>;
  readonly initialValue: WritableState<T>;
  readonly touched: WritableState<boolean>;
  readonly dirty: Computed<boolean>;
  readonly pending: WritableState<boolean>;
  readonly errors: WritableState<readonly string[]>;
  readonly issues: WritableState<readonly FieldIssue[]>;
  readonly validationStatus: WritableState<ValidationStatus>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  setValue(next: T): void;
  setTouched(touched?: boolean): void;
  setPending(pending: boolean): void;
  setErrors(errors: readonly string[]): void;
  setIssues(issues: readonly FieldIssue[]): void;
  validate(trigger?: ValidationTriggerMode): readonly FieldIssue[];
  reset(...args: [nextInitial?: T]): void;
}

export interface CreateFieldOptions<T> {
  readonly initialValue: T;
  readonly equality?: EqualityFn<T> | undefined;
  readonly scope?: Scope | undefined;
  readonly rules?: readonly SyncValidationRule<T>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
}

export function createField<T>(options: CreateFieldOptions<T>): FieldState<T> {
  const {
    initialValue,
    equality = defaultEquality as EqualityFn<T>,
    rules = [],
    validateOn,
  } = options;

  const valueState = state<T>(initialValue);
  const initialValueState = state<T>(initialValue);
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const errorsState = state<readonly string[]>([]);
  const issuesState = state<readonly FieldIssue[]>([]);
  const validationStatusState = state<ValidationStatus>("unvalidated");

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

  let isValidating = false;

  const runInScope = <R>(fn: () => R): R => {
    return options.scope ? options.scope.run(fn) : fn();
  };

  const dirtyComputed = runInScope(() =>
    computed(() => !equality(valueState.get(), initialValueState.get())),
  );

  const validComputed = runInScope(() =>
    computed(() => {
      // Retain full backward compatibility with F1/F2: errorsState.get().length === 0
      // while also checking issuesState
      return errorsState.get().length === 0 && issuesState.get().length === 0;
    }),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const validate = (trigger: ValidationTriggerMode = "manual"): readonly FieldIssue[] => {
    if (isValidating) {
      throw new Error("Reentrant validation detected in form field");
    }
    isValidating = true;

    const diag = getActiveDiagnostics();
    if (diag) {
      diag.record("field.validation.started", { trigger });
    }

    try {
      const currentVal = valueState.get();
      const collectedIssues: FieldIssue[] = [];
      const ctx: ValidationRuleContext = { trigger };

      for (const rule of rules) {
        let res: any;
        try {
          res = rule(currentVal, ctx);
        } catch (ruleErr) {
          throw ruleErr;
        }

        // Fast fail on Promise / Thenable
        if (
          res !== null &&
          (typeof res === "object" || typeof res === "function") &&
          typeof (res as any).then === "function"
        ) {
          throw new TypeError(
            "Synchronous validation rule returned a Promise or thenable. Async validation is not supported in F3.",
          );
        }

        if (res !== null && res !== undefined) {
          if (Array.isArray(res)) {
            for (const item of res) {
              collectedIssues.push(sanitizeIssue(item));
            }
          } else {
            collectedIssues.push(sanitizeIssue(res));
          }
        }
      }

      const nextStatus: ValidationStatus = collectedIssues.length === 0 ? "valid" : "invalid";
      const errorStrings = collectedIssues.map((iss) => iss.message ?? iss.code);

      batch(() => {
        issuesState.set(Object.freeze(collectedIssues));
        errorsState.set(Object.freeze(errorStrings));
        validationStatusState.set(nextStatus);
      });

      if (diag) {
        diag.record("field.validation.completed", {
          issueCount: collectedIssues.length,
          status: nextStatus,
        });
      }

      return collectedIssues;
    } finally {
      isValidating = false;
    }
  };

  const setValue = (next: T): void => {
    valueState.set(next);
    if (rules.length > 0 && triggerSet.has("change")) {
      validate("change");
    }
  };

  const setTouched = (touched = true): void => {
    touchedState.set(touched);
    if (touched && rules.length > 0 && triggerSet.has("blur")) {
      validate("blur");
    }
  };

  const setPending = (pending: boolean): void => {
    pendingState.set(pending);
  };

  const setIssues = (issues: readonly FieldIssue[]): void => {
    const sanitized = issues.map((iss) => sanitizeIssue(iss));
    const errorStrings = sanitized.map((iss) => iss.message ?? iss.code);
    batch(() => {
      issuesState.set(Object.freeze(sanitized));
      errorsState.set(Object.freeze(errorStrings));
      validationStatusState.set(sanitized.length === 0 ? "valid" : "invalid");
    });
  };

  const setErrors = (errors: readonly string[]): void => {
    // Legacy F1/F2 surface: the strings are opaque messages, never keys, so they
    // are wrapped directly instead of going through sanitizeIssue. Routing them
    // through the rule sanitizer rejected "" and the reserved-key names, which
    // are both legal error messages here.
    const syntheticIssues: readonly FieldIssue[] = Object.freeze(
      errors.map((err) =>
        Object.freeze({
          code: "legacy.error",
          message: String(err),
          path: undefined,
          source: "validation",
          ruleId: undefined,
        } as FieldIssue),
      ),
    );
    batch(() => {
      errorsState.set(errors);
      issuesState.set(syntheticIssues);
      validationStatusState.set(errors.length === 0 ? "valid" : "invalid");
    });
  };

  const reset = (...args: [nextInitial?: T]): void => {
    const hasNextInitial = args.length > 0;
    const nextInitial = args[0] as T;

    batch(() => {
      const resetValue = hasNextInitial ? nextInitial : initialValueState.get();
      if (hasNextInitial) {
        initialValueState.set(nextInitial);
      }
      valueState.set(resetValue);
      touchedState.set(false);
      pendingState.set(false);
      errorsState.set([]);
      issuesState.set([]);
      validationStatusState.set("unvalidated");
    });
  };

  return {
    kind: "field",
    value: valueState,
    initialValue: initialValueState,
    touched: touchedState,
    dirty: dirtyComputed,
    pending: pendingState,
    errors: errorsState,
    issues: issuesState,
    validationStatus: validationStatusState,
    valid: validComputed,
    invalid: invalidComputed,
    setValue,
    setTouched,
    setPending,
    setErrors,
    setIssues,
    validate,
    reset,
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
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<string, readonly string[]>>;
  readonly issues: Computed<readonly FieldIssue[]>;
  readonly groupIssues: WritableState<readonly FieldIssue[]>;
  readonly validationStatus: Computed<ValidationStatus>;
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
  validate(trigger?: ValidationTriggerMode): readonly FieldIssue[];
}

export interface CreateFieldGroupOptions<T extends Record<string, any>> {
  readonly initialValues: T;
  readonly scope?: Scope | undefined;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
  readonly seenObjects?: Set<object> | undefined;
  readonly rules?: readonly SyncValidationRule<T>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
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
  } = options;

  if (seenObjects.has(initialValues)) {
    throw new Error("Cyclic input detected in form data");
  }
  const branchSeen = new Set(seenObjects);
  branchSeen.add(initialValues);

  const fields = Object.create(null) as { [K in keyof T]: FormNodeFor<T[K]> };
  const groupIssuesState = state<readonly FieldIssue[]>([]);
  const groupValidationStatusState = state<ValidationStatus>("unvalidated");

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

  const dirtyComputed = runInScope(() =>
    computed(() => keys.some((k) => (fields[k] as any).dirty.get())),
  );

  const touchedComputed = runInScope(() =>
    computed(() => keys.some((k) => (fields[k] as any).touched.get())),
  );

  const pendingComputed = runInScope(() =>
    computed(() => keys.some((k) => (fields[k] as any).pending.get())),
  );

  const validComputed = runInScope(() =>
    computed(() => {
      const groupValid =
        groupValidationStatusState.get() !== "invalid" && groupIssuesState.get().length === 0;
      const childrenValid = keys.every((k) => (fields[k] as any).valid.get());
      return groupValid && childrenValid;
    }),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const issuesComputed = runInScope(() =>
    computed(() => {
      const res: FieldIssue[] = [...groupIssuesState.get()];
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
      const gIssues = groupIssuesState.get();
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

  let isValidating = false;

  // Single implementation of group-rule execution, shared by validate() and the
  // change-triggered run in setValues.
  const runGroupRules = (currentVals: T, trigger: ValidationTriggerMode): readonly FieldIssue[] => {
    const collectedGroupIssues: FieldIssue[] = [];
    const ctx: ValidationRuleContext = { trigger };

    for (const rule of rules) {
      const res: any = rule(currentVals, ctx);

      if (
        res !== null &&
        (typeof res === "object" || typeof res === "function") &&
        typeof (res as any).then === "function"
      ) {
        throw new TypeError(
          "Synchronous validation rule returned a Promise or thenable. Async validation is not supported in F3.",
        );
      }

      if (res !== null && res !== undefined) {
        if (Array.isArray(res)) {
          for (const item of res) {
            collectedGroupIssues.push(sanitizeIssue(item));
          }
        } else {
          collectedGroupIssues.push(sanitizeIssue(res));
        }
      }
    }

    return collectedGroupIssues;
  };

  const validate = (trigger: ValidationTriggerMode = "manual"): readonly FieldIssue[] => {
    if (isValidating) {
      throw new Error("Reentrant validation detected in form group");
    }
    isValidating = true;

    try {
      const collectedGroupIssues = runGroupRules(valuesComputed.get(), trigger);

      // Validate all children
      for (const k of keys) {
        (fields[k] as any).validate(trigger);
      }

      batch(() => {
        groupIssuesState.set(Object.freeze([...collectedGroupIssues]));
        groupValidationStatusState.set(collectedGroupIssues.length === 0 ? "valid" : "invalid");
      });

      return issuesComputed.get();
    } finally {
      isValidating = false;
    }
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
        const collectedGroupIssues = runGroupRules(currentVals, "change");
        groupIssuesState.set(Object.freeze([...collectedGroupIssues]));
        groupValidationStatusState.set(collectedGroupIssues.length === 0 ? "valid" : "invalid");
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
      groupValidationStatusState.set("unvalidated");
    });
  };

  return {
    kind: "group",
    fields,
    values: valuesComputed,
    dirty: dirtyComputed,
    touched: touchedComputed,
    pending: pendingComputed,
    valid: validComputed,
    invalid: invalidComputed,
    errors: errorsComputed,
    issues: issuesComputed,
    groupIssues: groupIssuesState,
    validationStatus: validationStatusComputed,
    setValues,
    reset,
    validate,
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
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<string, readonly string[]>>;
  readonly issues: Computed<readonly FieldIssue[]>;
  readonly validationStatus: Computed<ValidationStatus>;
  push(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  move(from: number, to: number): void;
  setValues(next: T[]): void;
  reset(nextInitials?: T[]): void;
  validate(trigger?: ValidationTriggerMode): readonly FieldIssue[];
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
  const initialValuesState = state<T[]>(initialValues);
  const initialKeysState = state<readonly (string | number)[]>(initialKeys);

  // Register array cleanup in parent scope
  if (scope) {
    scope.use(() => {
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
    computed(() => itemsState.get().every((item) => (item.node as any).valid.get())),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const errorsComputed = runInScope(() =>
    computed(() => {
      const res: Record<string, readonly string[]> = {};
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
    const res: FieldIssue[] = [];
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
    const items = itemsState.get();
    if (items.some((it) => (it.node as any).validationStatus.get() === "invalid")) {
      return "invalid";
    }
    if (items.some((it) => (it.node as any).validationStatus.get() === "unvalidated")) {
      return "unvalidated";
    }
    return "valid";
  };

  // Memoized once per array instance and owned by the scope: creating a fresh
  // computed on every property access leaked a dependency subscription on
  // itemsState for each read and broke reference identity for consumers.
  const issuesComputed = runInScope(() => computed(() => getIssues()));
  const validationStatusComputed = runInScope(() => computed(() => getValidationStatus()));

  const validate = (trigger: ValidationTriggerMode = "manual"): readonly FieldIssue[] => {
    const items = itemsState.get();
    for (const it of items) {
      (it.node as any).validate(trigger);
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
      itemsState.set(createdItems);
    });
  };

  return {
    kind: "array",
    items: itemsState,
    values: valuesComputed,
    dirty: dirtyComputed,
    touched: touchedComputed,
    pending: pendingComputed,
    valid: validComputed,
    invalid: invalidComputed,
    errors: errorsComputed,
    issues: issuesComputed,
    validationStatus: validationStatusComputed,
    push,
    insert,
    remove,
    swap,
    move,
    setValues,
    reset,
    validate,
  };
}

// ---------------------------------------------------------------------------
// FormInstance & Strict Path Parsing / Resolution
// ---------------------------------------------------------------------------

export type FieldValues = Record<string, any>;

export interface FormConfig<T extends FieldValues> {
  readonly initialValues: T;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
  readonly rules?: readonly SyncValidationRule<T>[] | undefined;
  readonly validateOn?: ValidationTriggerMode | readonly ValidationTriggerMode[] | undefined;
}

export interface FormInstance<T extends FieldValues> {
  readonly root: FieldGroup<T>;
  readonly fields: { [K in keyof T]: FormNodeFor<T[K]> };
  readonly values: Computed<T>;
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<string, readonly string[]>>;
  readonly issues: Computed<readonly FieldIssue[]>;
  readonly validationStatus: Computed<ValidationStatus>;
  getNode(path: string): FormNode | undefined;
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
  validate(trigger?: ValidationTriggerMode): readonly FieldIssue[];
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

export function createForm<T extends FieldValues>(config: FormConfig<T>): FormInstance<T> {
  const scope = createScope({ name: "vii-form-root" });

  const root = createFieldGroup<T>({
    initialValues: config.initialValues,
    scope,
    keyExtractor: config.keyExtractor,
    rules: config.rules,
    validateOn: config.validateOn,
  });

  let isDisposed = false;
  const assertActive = (): void => {
    if (isDisposed) {
      throw new Error("Form is disposed");
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

  return {
    root,
    fields: root.fields,
    values: root.values,
    dirty: root.dirty,
    touched: root.touched,
    pending: root.pending,
    valid: root.valid,
    invalid: root.invalid,
    errors: root.errors,
    issues: root.issues,
    validationStatus: root.validationStatus,
    getNode,
    setValues: (partial: Partial<T>): void => {
      assertActive();
      root.setValues(partial);
    },
    reset: (nextInitials?: Partial<T>): void => {
      assertActive();
      root.reset(nextInitials);
    },
    validate: (trigger: ValidationTriggerMode = "manual"): readonly FieldIssue[] => {
      assertActive();
      return root.validate(trigger);
    },
    dispose: () => {
      if (isDisposed) return;
      isDisposed = true;
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
