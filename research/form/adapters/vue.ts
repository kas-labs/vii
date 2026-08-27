/**
 * @file Vue adapter prototype for Vii Form.
 * Research only: not a public package API.
 *
 * Bridges Form Core State/Computed primitives to Vue ShallowRefs and EffectScope lifecycle.
 * Contains ZERO independent state stores; translates mutations directly to Form Core.
 */

import { getCurrentScope, onScopeDispose, shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type {
  ArrayItem,
  FieldArray,
  FieldIssue,
  FieldState,
  FormInstance,
  FormSubmitResult,
  ParseIssue,
  ParseStatus,
  ServerIssue,
  ServerIssueInput,
  SubmissionStatus,
  SubmitAction,
  SubmitOptions,
  ValidationStatus,
} from "../form-core.js";

export type VueReadonlyRef<T> = Readonly<ShallowRef<T>>;

export interface VueAdapterOptions {
  /**
   * Explicit scope or lifecycle callback hook if not using ambient getCurrentScope().
   */
  readonly onDispose?: ((callback: () => void) => void) | undefined;
}

// ============================================================================
// 1. Vue Field Adapter
// ============================================================================

export interface VueFieldRefs<Value, Raw, Output> {
  readonly value: VueReadonlyRef<Value>;
  readonly rawValue: VueReadonlyRef<Raw>;
  readonly dirty: VueReadonlyRef<boolean>;
  readonly touched: VueReadonlyRef<boolean>;
  readonly pending: VueReadonlyRef<boolean>;
  readonly valid: VueReadonlyRef<boolean>;
  readonly invalid: VueReadonlyRef<boolean>;
  readonly parseStatus: VueReadonlyRef<ParseStatus>;
  readonly parseIssue: VueReadonlyRef<ParseIssue | null>;
  readonly validationStatus: VueReadonlyRef<ValidationStatus>;
  readonly issues: VueReadonlyRef<readonly FieldIssue[]>;
  readonly serverIssues: VueReadonlyRef<readonly ServerIssue[]>;
  readonly output: VueReadonlyRef<Output>;
}

export interface VueFieldHandle<Value, Raw = Value, Output = Value> extends VueFieldRefs<
  Value,
  Raw,
  Output
> {
  setValue(value: Value): void;
  setRawValue(raw: Raw): void;
  setTouched(touched?: boolean): void;
  blur(): void;
  reset(...args: [nextInitial?: Value, nextInitialRaw?: Raw]): void;
  dispose(): void;
}

export function createVueField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
  options?: VueAdapterOptions,
): VueFieldHandle<Value, Raw, Output> {
  const valueRef = shallowRef(field.value.get());
  const rawValueRef = shallowRef(field.rawValue.get());
  const dirtyRef = shallowRef(field.dirty.get());
  const touchedRef = shallowRef(field.touched.get());
  const pendingRef = shallowRef(field.pending.get());
  const validRef = shallowRef(field.valid.get());
  const invalidRef = shallowRef(field.invalid.get());
  const parseStatusRef = shallowRef(field.parseStatus.get());
  const parseIssueRef = shallowRef(field.parseIssue.get());
  const validationStatusRef = shallowRef(field.validationStatus.get());
  const issuesRef = shallowRef(field.issues.get());
  const serverIssuesRef = shallowRef(field.serverIssues.get());
  const outputRef = shallowRef(field.output.get());

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) {
      u();
    }
  };

  const unsubs = [
    field.value.subscribe((v) => {
      if (!isDisposed) valueRef.value = v;
    }),
    field.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueRef.value = r;
    }),
    field.dirty.subscribe((d) => {
      if (!isDisposed) dirtyRef.value = d;
    }),
    field.touched.subscribe((t) => {
      if (!isDisposed) touchedRef.value = t;
    }),
    field.pending.subscribe((p) => {
      if (!isDisposed) pendingRef.value = p;
    }),
    field.valid.subscribe((v) => {
      if (!isDisposed) validRef.value = v;
    }),
    field.invalid.subscribe((iv) => {
      if (!isDisposed) invalidRef.value = iv;
    }),
    field.parseStatus.subscribe((ps) => {
      if (!isDisposed) parseStatusRef.value = ps;
    }),
    field.parseIssue.subscribe((pi) => {
      if (!isDisposed) parseIssueRef.value = pi;
    }),
    field.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusRef.value = vs;
    }),
    field.issues.subscribe((iss) => {
      if (!isDisposed) issuesRef.value = iss;
    }),
    field.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesRef.value = si;
    }),
    field.output.subscribe((o) => {
      if (!isDisposed) outputRef.value = o;
    }),
  ];

  if (options?.onDispose) {
    options.onDispose(dispose);
  } else if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  return {
    value: shallowReadonly(valueRef),
    rawValue: shallowReadonly(rawValueRef),
    dirty: shallowReadonly(dirtyRef),
    touched: shallowReadonly(touchedRef),
    pending: shallowReadonly(pendingRef),
    valid: shallowReadonly(validRef),
    invalid: shallowReadonly(invalidRef),
    parseStatus: shallowReadonly(parseStatusRef),
    parseIssue: shallowReadonly(parseIssueRef),
    validationStatus: shallowReadonly(validationStatusRef),
    issues: shallowReadonly(issuesRef),
    serverIssues: shallowReadonly(serverIssuesRef),
    output: shallowReadonly(outputRef),
    setValue: (v: Value) => {
      if (!isDisposed) field.setValue(v);
    },
    setRawValue: (r: Raw) => {
      if (!isDisposed) field.setRawValue(r);
    },
    setTouched: (t: boolean = true) => {
      if (!isDisposed) field.setTouched(t);
    },
    blur: () => {
      if (!isDisposed) field.setTouched(true);
    },
    reset: (...args) => {
      if (!isDisposed) field.reset(...args);
    },
    dispose,
  };
}

export function useViiField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
  options?: VueAdapterOptions,
): VueFieldHandle<Value, Raw, Output> {
  return createVueField(field, options);
}

// ============================================================================
// 2. Vue Form Adapter
// ============================================================================

export interface VueFormRefs<T extends Record<string, any>> {
  readonly values: VueReadonlyRef<T>;
  readonly output: VueReadonlyRef<T>;
  readonly dirty: VueReadonlyRef<boolean>;
  readonly touched: VueReadonlyRef<boolean>;
  readonly pending: VueReadonlyRef<boolean>;
  readonly valid: VueReadonlyRef<boolean>;
  readonly invalid: VueReadonlyRef<boolean>;
  readonly issues: VueReadonlyRef<readonly FieldIssue[]>;
  readonly serverIssues: VueReadonlyRef<readonly ServerIssue[]>;
  readonly validationStatus: VueReadonlyRef<ValidationStatus>;
  readonly submissionStatus: VueReadonlyRef<SubmissionStatus>;
  readonly submitting: VueReadonlyRef<boolean>;
}

export interface VueFormHandle<T extends Record<string, any>> extends VueFormRefs<T> {
  readonly form: FormInstance<T>;
  readonly fields: FormInstance<T>["fields"];
  submit<TResult = void>(
    action?: SubmitAction<T, TResult>,
    options?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>>;
  cancelSubmit(): void;
  reset(nextInitials?: Partial<T>): void;
  reinitialize(nextInitials: Partial<T>): void;
  setValues(partial: Partial<T>): void;
  setServerIssues(issues: readonly (ServerIssueInput | string)[]): void;
  clearServerIssues(): void;
  dispose(): void;
}

export function createVueForm<T extends Record<string, any>>(
  form: FormInstance<T>,
  options?: VueAdapterOptions,
): VueFormHandle<T> {
  const valuesRef = shallowRef(form.values.get());
  const outputRef = shallowRef(form.output.get());
  const dirtyRef = shallowRef(form.dirty.get());
  const touchedRef = shallowRef(form.touched.get());
  const pendingRef = shallowRef(form.pending.get());
  const validRef = shallowRef(form.valid.get());
  const invalidRef = shallowRef(form.invalid.get());
  const issuesRef = shallowRef(form.issues.get());
  const serverIssuesRef = shallowRef(form.serverIssues.get());
  const validationStatusRef = shallowRef(form.validationStatus.get());
  const submissionStatusRef = shallowRef(form.submissionStatus.get());
  const submittingRef = shallowRef(form.submitting.get());

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) {
      u();
    }
  };

  const unsubs = [
    form.values.subscribe((v) => {
      if (!isDisposed) valuesRef.value = v;
    }),
    form.output.subscribe((o) => {
      if (!isDisposed) outputRef.value = o;
    }),
    form.dirty.subscribe((d) => {
      if (!isDisposed) dirtyRef.value = d;
    }),
    form.touched.subscribe((t) => {
      if (!isDisposed) touchedRef.value = t;
    }),
    form.pending.subscribe((p) => {
      if (!isDisposed) pendingRef.value = p;
    }),
    form.valid.subscribe((v) => {
      if (!isDisposed) validRef.value = v;
    }),
    form.invalid.subscribe((iv) => {
      if (!isDisposed) invalidRef.value = iv;
    }),
    form.issues.subscribe((iss) => {
      if (!isDisposed) issuesRef.value = iss;
    }),
    form.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesRef.value = si;
    }),
    form.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusRef.value = vs;
    }),
    form.submissionStatus.subscribe((ss) => {
      if (!isDisposed) submissionStatusRef.value = ss;
    }),
    form.submitting.subscribe((sub) => {
      if (!isDisposed) submittingRef.value = sub;
    }),
  ];

  if (options?.onDispose) {
    options.onDispose(dispose);
  } else if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  return {
    values: shallowReadonly(valuesRef),
    output: shallowReadonly(outputRef),
    dirty: shallowReadonly(dirtyRef),
    touched: shallowReadonly(touchedRef),
    pending: shallowReadonly(pendingRef),
    valid: shallowReadonly(validRef),
    invalid: shallowReadonly(invalidRef),
    issues: shallowReadonly(issuesRef),
    serverIssues: shallowReadonly(serverIssuesRef),
    validationStatus: shallowReadonly(validationStatusRef),
    submissionStatus: shallowReadonly(submissionStatusRef),
    submitting: shallowReadonly(submittingRef),
    form,
    fields: form.fields,
    submit: (action, opt) => form.submit(action, opt),
    cancelSubmit: () => form.cancelSubmit(),
    reset: (nextInitials) => form.reset(nextInitials),
    reinitialize: (nextInitials) => form.reinitialize(nextInitials),
    setValues: (partial) => form.setValues(partial),
    setServerIssues: (issues) => form.setServerIssues(issues),
    clearServerIssues: () => form.clearServerIssues(),
    dispose,
  };
}

export function useViiForm<T extends Record<string, any>>(
  form: FormInstance<T>,
  options?: VueAdapterOptions,
): VueFormHandle<T> {
  return createVueForm(form, options);
}

// ============================================================================
// 3. Vue FieldArray Adapter
// ============================================================================

export interface VueArrayRefs<T> {
  readonly items: VueReadonlyRef<readonly ArrayItem<T>[]>;
  readonly values: VueReadonlyRef<readonly T[]>;
  readonly output: VueReadonlyRef<readonly T[]>;
  readonly dirty: VueReadonlyRef<boolean>;
  readonly touched: VueReadonlyRef<boolean>;
  readonly pending: VueReadonlyRef<boolean>;
  readonly valid: VueReadonlyRef<boolean>;
  readonly invalid: VueReadonlyRef<boolean>;
  readonly issues: VueReadonlyRef<readonly FieldIssue[]>;
  readonly serverIssues: VueReadonlyRef<readonly ServerIssue[]>;
  readonly validationStatus: VueReadonlyRef<ValidationStatus>;
  readonly length: VueReadonlyRef<number>;
}

export interface VueArrayHandle<T> extends VueArrayRefs<T> {
  push(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  move(from: number, to: number): void;
  setValues(next: T[]): void;
  reset(nextInitials?: T[]): void;
  dispose(): void;
}

export function createVueFieldArray<T>(
  arrayNode: FieldArray<T>,
  options?: VueAdapterOptions,
): VueArrayHandle<T> {
  const itemsRef = shallowRef(arrayNode.items.get());
  const valuesRef = shallowRef(arrayNode.values.get());
  const outputRef = shallowRef(arrayNode.output.get());
  const dirtyRef = shallowRef(arrayNode.dirty.get());
  const touchedRef = shallowRef(arrayNode.touched.get());
  const pendingRef = shallowRef(arrayNode.pending.get());
  const validRef = shallowRef(arrayNode.valid.get());
  const invalidRef = shallowRef(arrayNode.invalid.get());
  const issuesRef = shallowRef(arrayNode.issues.get());
  const serverIssuesRef = shallowRef(arrayNode.serverIssues.get());
  const validationStatusRef = shallowRef(arrayNode.validationStatus.get());
  const lengthRef = shallowRef(arrayNode.items.get().length);

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) {
      u();
    }
  };

  const unsubs = [
    arrayNode.items.subscribe((it) => {
      if (!isDisposed) {
        itemsRef.value = it;
        lengthRef.value = it.length;
      }
    }),
    arrayNode.values.subscribe((v) => {
      if (!isDisposed) valuesRef.value = v;
    }),
    arrayNode.output.subscribe((o) => {
      if (!isDisposed) outputRef.value = o;
    }),
    arrayNode.dirty.subscribe((d) => {
      if (!isDisposed) dirtyRef.value = d;
    }),
    arrayNode.touched.subscribe((t) => {
      if (!isDisposed) touchedRef.value = t;
    }),
    arrayNode.pending.subscribe((p) => {
      if (!isDisposed) pendingRef.value = p;
    }),
    arrayNode.valid.subscribe((v) => {
      if (!isDisposed) validRef.value = v;
    }),
    arrayNode.invalid.subscribe((iv) => {
      if (!isDisposed) invalidRef.value = iv;
    }),
    arrayNode.issues.subscribe((iss) => {
      if (!isDisposed) issuesRef.value = iss;
    }),
    arrayNode.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesRef.value = si;
    }),
    arrayNode.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusRef.value = vs;
    }),
  ];

  if (options?.onDispose) {
    options.onDispose(dispose);
  } else if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  return {
    items: shallowReadonly(itemsRef),
    values: shallowReadonly(valuesRef),
    output: shallowReadonly(outputRef),
    dirty: shallowReadonly(dirtyRef),
    touched: shallowReadonly(touchedRef),
    pending: shallowReadonly(pendingRef),
    valid: shallowReadonly(validRef),
    invalid: shallowReadonly(invalidRef),
    issues: shallowReadonly(issuesRef),
    serverIssues: shallowReadonly(serverIssuesRef),
    validationStatus: shallowReadonly(validationStatusRef),
    length: shallowReadonly(lengthRef),
    push: (v) => {
      if (!isDisposed) arrayNode.push(v);
    },
    insert: (i, v) => {
      if (!isDisposed) arrayNode.insert(i, v);
    },
    remove: (i) => {
      if (!isDisposed) arrayNode.remove(i);
    },
    swap: (a, b) => {
      if (!isDisposed) arrayNode.swap(a, b);
    },
    move: (from, to) => {
      if (!isDisposed) arrayNode.move(from, to);
    },
    setValues: (next) => {
      if (!isDisposed) arrayNode.setValues(next);
    },
    reset: (nextInitials) => {
      if (!isDisposed) arrayNode.reset(nextInitials);
    },
    dispose,
  };
}

export function useViiFieldArray<T>(
  arrayNode: FieldArray<T>,
  options?: VueAdapterOptions,
): VueArrayHandle<T> {
  return createVueFieldArray(arrayNode, options);
}
