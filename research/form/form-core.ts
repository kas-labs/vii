import {
  type Computed,
  type Scope,
  type WritableState,
  batch,
  computed,
  createScope,
  state,
} from "../../packages/core/src/index.js";

export type EqualityFn<T> = (a: T, b: T) => boolean;

export const defaultEquality: EqualityFn<unknown> = (a, b) => Object.is(a, b);

export interface FieldState<T> {
  readonly kind: "field";
  readonly value: WritableState<T>;
  readonly initialValue: WritableState<T>;
  readonly touched: WritableState<boolean>;
  readonly dirty: Computed<boolean>;
  readonly pending: WritableState<boolean>;
  readonly errors: WritableState<readonly string[]>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  setValue(next: T): void;
  setTouched(touched?: boolean): void;
  setPending(pending: boolean): void;
  setErrors(errors: readonly string[]): void;
  reset(...args: [nextInitial?: T]): void;
}

export interface CreateFieldOptions<T> {
  readonly initialValue: T;
  readonly equality?: EqualityFn<T> | undefined;
  readonly scope?: Scope | undefined;
}

export function createField<T>(options: CreateFieldOptions<T>): FieldState<T> {
  const { initialValue, equality = defaultEquality as EqualityFn<T> } = options;

  const valueState = state<T>(initialValue);
  const initialValueState = state<T>(initialValue);
  const touchedState = state<boolean>(false);
  const pendingState = state<boolean>(false);
  const errorsState = state<readonly string[]>([]);

  const runInScope = <R>(fn: () => R): R => {
    return options.scope ? options.scope.run(fn) : fn();
  };

  const dirtyComputed = runInScope(() =>
    computed(() => !equality(valueState.get(), initialValueState.get())),
  );

  const validComputed = runInScope(() => computed(() => errorsState.get().length === 0));

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const setValue = (next: T): void => {
    valueState.set(next);
  };

  const setTouched = (touched = true): void => {
    touchedState.set(touched);
  };

  const setPending = (pending: boolean): void => {
    pendingState.set(pending);
  };

  const setErrors = (errors: readonly string[]): void => {
    errorsState.set(errors);
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
    valid: validComputed,
    invalid: invalidComputed,
    setValue,
    setTouched,
    setPending,
    setErrors,
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
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
}

export interface CreateFieldGroupOptions<T extends Record<string, any>> {
  readonly initialValues: T;
  readonly scope?: Scope | undefined;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
  readonly seenObjects?: Set<object> | undefined;
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
  const { initialValues, scope, keyExtractor, seenObjects = new Set<object>() } = options;

  if (seenObjects.has(initialValues)) {
    throw new Error("Cyclic input detected in form data");
  }
  const branchSeen = new Set(seenObjects);
  branchSeen.add(initialValues);

  const fields = {} as { [K in keyof T]: FormNodeFor<T[K]> };

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
      const res = {} as T;
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
    computed(() => keys.every((k) => (fields[k] as any).valid.get())),
  );

  const invalidComputed = runInScope(() => computed(() => !validComputed.get()));

  const errorsComputed = runInScope(() =>
    computed(() => {
      const res: Record<string, readonly string[]> = {};
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
              res[`${String(k)}.${nestedKey}`] = nestedErrors as readonly string[];
            }
          }
        }
      }
      return res;
    }),
  );

  const setValues = (partial: Partial<T>): void => {
    batch(() => {
      for (const [k, v] of Object.entries(partial) as Array<[keyof T, any]>) {
        if (fields[k]) {
          const node = fields[k] as any;
          if (node.kind === "field") {
            node.setValue(v);
          } else {
            node.setValues(v);
          }
        }
      }
    });
  };

  const reset = (nextInitials?: Partial<T>): void => {
    batch(() => {
      for (const k of keys) {
        const node = fields[k] as any;
        if (nextInitials !== undefined && k in nextInitials) {
          node.reset(nextInitials[k]);
        } else {
          node.reset();
        }
      }
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
    setValues,
    reset,
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
  push(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  move(from: number, to: number): void;
  setValues(next: T[]): void;
  reset(nextInitials?: T[]): void;
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

  const createItem = (val: T, assignedKey?: string | number): ArrayItem<T> => {
    const itemScope = scope
      ? scope.createChild({ name: "vii-array-item" })
      : createScope({ name: "vii-array-item" });
    activeScopes.add(itemScope);

    let id: string | number;
    if (assignedKey !== undefined) {
      id = assignedKey;
    } else if (keyExtractor) {
      id = keyExtractor(val);
    } else {
      id = generateInternalId();
    }

    let node: any;
    if (Array.isArray(val)) {
      node = createFieldArray({
        initialValues: val,
        scope: itemScope,
        seenObjects: branchSeen,
      });
    } else if (isPlainRecord(val)) {
      node = createFieldGroup({
        initialValues: val as Record<string, any>,
        scope: itemScope,
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

      // Identity-strict order/identity check:
      // Any item created after construction/reset has a new identity, and any reorder changes key order
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
              res[`[${i}].${nestedKey}`] = nestedErrors as readonly string[];
            }
          }
        }
      }
      return res;
    }),
  );

  const push = (value: T): void => {
    const item = createItem(value);
    const next = [...itemsState.get(), item];
    validateUniqueKeys(next);
    itemsState.set(next);
  };

  const insert = (index: number, value: T): void => {
    const current = [...itemsState.get()];
    const item = createItem(value);
    current.splice(index, 0, item);
    validateUniqueKeys(current);
    itemsState.set(current);
  };

  const remove = (index: number): void => {
    const current = [...itemsState.get()];
    if (index >= 0 && index < current.length) {
      const removed = current.splice(index, 1);
      if (removed[0]) {
        activeScopes.delete(removed[0].scope);
        removed[0].scope.dispose();
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
    batch(() => {
      const current = itemsState.get();

      if (keyExtractor) {
        // Keyed reconciliation: re-derive keys from incoming values
        // Index existing items by their CURRENT value-derived key and also by their item.id
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
        const usedOldKeys = new Set<string | number>();

        for (let i = 0; i < next.length; i++) {
          const nextVal = next[i];
          const derivedKey = keyExtractor(nextVal as T);
          const existingItem = currentByDerivedKey.get(derivedKey);

          if (existingItem) {
            usedOldKeys.add(derivedKey);
            const n = existingItem.node as any;
            if (n.kind === "field") {
              n.setValue(nextVal);
            } else {
              n.setValues(nextVal);
            }
            // Re-stamp item with derivedKey in case item.id was distinct
            newItems.push({
              id: derivedKey,
              node: existingItem.node,
              scope: existingItem.scope,
            });
          } else {
            newItems.push(createItem(nextVal as T, derivedKey));
          }
        }

        // Validate uniqueness of the newly derived keys
        validateUniqueKeys(newItems);

        // Dispose old items whose keys disappeared
        for (const [key, oldItem] of currentByDerivedKey.entries()) {
          if (!usedOldKeys.has(key)) {
            activeScopes.delete(oldItem.scope);
            oldItem.scope.dispose();
          }
        }

        itemsState.set(newItems);
      } else {
        // Unkeyed reconciliation: positional reuse for existing indices, fresh IDs for newly added items
        for (let i = next.length; i < current.length; i++) {
          const item = current[i];
          if (item) {
            activeScopes.delete(item.scope);
            item.scope.dispose();
          }
        }

        const newItems: ArrayItem<T>[] = [];
        for (let i = 0; i < next.length; i++) {
          const nextVal = next[i];
          if (i < current.length) {
            const item = current[i];
            if (item) {
              const n = item.node as any;
              if (n.kind === "field") {
                n.setValue(nextVal);
              } else {
                n.setValues(nextVal);
              }
              newItems.push(item);
            }
          } else {
            // New position -> fresh item with fresh internal ID
            newItems.push(createItem(nextVal as T));
          }
        }
        validateUniqueKeys(newItems);
        itemsState.set(newItems);
      }
    });
  };

  const reset = (nextInitials?: T[]): void => {
    batch(() => {
      const initials = nextInitials !== undefined ? nextInitials : initialValuesState.get();
      if (nextInitials !== undefined) {
        initialValuesState.set(nextInitials);
      }
      // dispose all current
      for (const item of itemsState.get()) {
        activeScopes.delete(item.scope);
        item.scope.dispose();
      }

      // Re-create items
      const newItems = initials.map((v) => createItem(v));
      validateUniqueKeys(newItems);

      // Re-establish initialKeysState baseline on EVERY reset
      initialKeysState.set(newItems.map((it) => it.id));
      itemsState.set(newItems);
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
    push,
    insert,
    remove,
    swap,
    move,
    setValues,
    reset,
  };
}

// ---------------------------------------------------------------------------
// FormInstance & Strict Path Parsing / Resolution
// ---------------------------------------------------------------------------

export type FieldValues = Record<string, any>;

export interface FormConfig<T extends FieldValues> {
  readonly initialValues: T;
  readonly keyExtractor?: ((item: any) => string | number) | undefined;
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
  getNode(path: string): FormNode | undefined;
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
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
  });

  const getNode = (path: string): FormNode | undefined => {
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

  let isDisposed = false;

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
    getNode,
    setValues: root.setValues,
    reset: root.reset,
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
}

export function bindFormToExternalState<T extends FieldValues>(
  options: ExternalBindingOptions<T>,
): FormInstance<T> {
  const { externalState, scope = createScope({ name: "vii-external-form" }) } = options;
  const initial = externalState.get();

  const form = createForm<T>({
    initialValues: initial,
  });

  let isSyncingToExternal = false;
  let isSyncingFromExternal = false;

  scope.run(() => {
    form.values.subscribe((nextValues: T) => {
      if (isSyncingFromExternal) return;
      isSyncingToExternal = true;
      try {
        externalState.set(nextValues);
      } finally {
        isSyncingToExternal = false;
      }
    });
  });

  scope.run(() => {
    externalState.subscribe((nextExternal: T) => {
      if (isSyncingToExternal) return;
      isSyncingFromExternal = true;
      try {
        form.setValues(nextExternal);
      } finally {
        isSyncingFromExternal = false;
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
