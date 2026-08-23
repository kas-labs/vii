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

export type FieldValues = Record<string, unknown>;

export interface FormConfig<T extends FieldValues> {
  readonly initialValues: T;
  readonly equality?: { [K in keyof T]?: EqualityFn<T[K]> | undefined };
}

export type FormFields<T extends FieldValues> = {
  readonly [K in keyof T]: FieldState<T[K]>;
};

export interface FormInstance<T extends FieldValues> {
  readonly fields: FormFields<T>;
  readonly values: Computed<T>;
  readonly dirty: Computed<boolean>;
  readonly touched: Computed<boolean>;
  readonly pending: Computed<boolean>;
  readonly valid: Computed<boolean>;
  readonly invalid: Computed<boolean>;
  readonly errors: Computed<Record<keyof T, readonly string[]>>;
  setValues(partial: Partial<T>): void;
  reset(nextInitials?: Partial<T>): void;
  dispose(): void;
}

export function createForm<T extends FieldValues>(config: FormConfig<T>): FormInstance<T> {
  const scope = createScope({ name: "vii-form-root" });

  const fields = {} as { [K in keyof T]: FieldState<T[K]> };

  for (const key of Object.keys(config.initialValues) as Array<keyof T>) {
    fields[key] = createField<T[keyof T]>({
      initialValue: config.initialValues[key],
      equality: config.equality?.[key] as EqualityFn<T[keyof T]> | undefined,
      scope,
    }) as unknown as FieldState<T[typeof key]>;
  }

  const keys = Object.keys(fields) as Array<keyof T>;

  const valuesComputed = scope.run(() =>
    computed(() => {
      const result = {} as T;
      for (const k of keys) {
        result[k] = fields[k].value.get();
      }
      return result;
    }),
  );

  const dirtyComputed = scope.run(() => computed(() => keys.some((k) => fields[k].dirty.get())));

  const touchedComputed = scope.run(() =>
    computed(() => keys.some((k) => fields[k].touched.get())),
  );

  const pendingComputed = scope.run(() =>
    computed(() => keys.some((k) => fields[k].pending.get())),
  );

  const validComputed = scope.run(() => computed(() => keys.every((k) => fields[k].valid.get())));

  const invalidComputed = scope.run(() => computed(() => !validComputed.get()));

  const errorsComputed = scope.run(() =>
    computed(() => {
      const res = {} as Record<keyof T, readonly string[]>;
      for (const k of keys) {
        res[k] = fields[k].errors.get();
      }
      return res;
    }),
  );

  const setValues = (partial: Partial<T>): void => {
    batch(() => {
      for (const [k, v] of Object.entries(partial) as Array<[keyof T, T[keyof T]]>) {
        if (fields[k]) {
          fields[k].setValue(v);
        }
      }
    });
  };

  const reset = (nextInitials?: Partial<T>): void => {
    batch(() => {
      for (const k of keys) {
        if (nextInitials !== undefined && k in nextInitials) {
          fields[k].reset(nextInitials[k]);
        } else {
          fields[k].reset();
        }
      }
    });
  };

  return {
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
