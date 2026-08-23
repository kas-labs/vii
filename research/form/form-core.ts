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
}

// Helper to determine node type
export type FormNodeFor<T> =
  T extends Array<infer U>
    ? FieldArray<U>
    : T extends Record<string, any>
      ? FieldGroup<T>
      : FieldState<T>;

export function createFieldGroup<T extends Record<string, any>>(
  options: CreateFieldGroupOptions<T>,
): FieldGroup<T> {
  const { initialValues, scope, keyExtractor } = options;
  const fields = {} as { [K in keyof T]: FormNodeFor<T[K]> };

  for (const key of Object.keys(initialValues) as Array<keyof T>) {
    const val = initialValues[key];
    if (Array.isArray(val)) {
      fields[key] = createFieldArray({
        initialValues: val,
        scope,
        keyExtractor,
      }) as unknown as FormNodeFor<T[keyof T]>;
    } else if (val !== null && typeof val === "object") {
      fields[key] = createFieldGroup({
        initialValues: val,
        scope,
        keyExtractor,
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
// FieldArray: repeatable collection with stable identity
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
}

export function createFieldArray<T>(options: CreateFieldArrayOptions<T>): FieldArray<T> {
  const { initialValues, scope, keyExtractor } = options;

  const createItem = (val: T): ArrayItem<T> => {
    const itemScope = createScope({ name: "vii-array-item" });
    const id = keyExtractor ? keyExtractor(val) : generateInternalId();
    let node: any;
    if (Array.isArray(val)) {
      node = createFieldArray({
        initialValues: val,
        scope: itemScope,
        keyExtractor: keyExtractor as any,
      });
    } else if (val !== null && typeof val === "object") {
      node = createFieldGroup({
        initialValues: val as Record<string, any>,
        scope: itemScope,
        keyExtractor: keyExtractor as any,
      });
    } else {
      node = createField({
        initialValue: val,
        scope: itemScope,
      });
    }
    return { id, node, scope: itemScope };
  };

  const initialItems = initialValues.map(createItem);
  const itemsState = state<readonly ArrayItem<T>[]>(initialItems);
  const initialValuesState = state<T[]>(initialValues);

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
      if (current.length !== initials.length) return true;
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
    itemsState.set([...itemsState.get(), item]);
  };

  const insert = (index: number, value: T): void => {
    const current = [...itemsState.get()];
    const item = createItem(value);
    current.splice(index, 0, item);
    itemsState.set(current);
  };

  const remove = (index: number): void => {
    const current = [...itemsState.get()];
    if (index >= 0 && index < current.length) {
      const removed = current.splice(index, 1);
      if (removed[0]) {
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
      // dispose removed items
      for (let i = next.length; i < current.length; i++) {
        const item = current[i];
        if (item) {
          item.scope.dispose();
        }
      }
      const newItems: ArrayItem<T>[] = [];
      for (let i = 0; i < next.length; i++) {
        const nextVal = next[i];
        if (i < current.length) {
          const item = current[i];
          if (item && nextVal !== undefined) {
            const n = item.node as any;
            if (n.kind === "field") {
              n.setValue(nextVal);
            } else {
              n.setValues(nextVal);
            }
            newItems.push(item);
          }
        } else if (nextVal !== undefined) {
          newItems.push(createItem(nextVal));
        }
      }
      itemsState.set(newItems);
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
        item.scope.dispose();
      }
      itemsState.set(initials.map(createItem));
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
// FormInstance & Flat Index Registry / Path Resolution
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
  const parts: Array<string | number> = [];
  const regex = /[^.\[\]]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    const segment = match[0];
    // Prototype pollution defense
    if (segment === "__proto__" || segment === "prototype" || segment === "constructor") {
      throw new Error(
        `Security error: Prototype pollution attempt blocked on path segment "${segment}"`,
      );
    }
    const num = Number(segment);
    if (!isNaN(num) && segment.trim() !== "") {
      parts.push(num);
    } else {
      parts.push(segment);
    }
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
    const segments = parsePath(path);
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
    dispose: () => scope.dispose(),
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
