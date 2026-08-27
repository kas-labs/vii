/**
 * @file Angular adapter prototype for Vii Form.
 * Research only: not a public package API.
 *
 * Bridges Form Core State/Computed primitives to Angular Signals and DestroyRef lifecycle.
 * Contains ZERO independent state stores; translates mutations directly to Form Core.
 */

import { DestroyRef, inject, signal, type Signal } from "@angular/core";
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

export interface DestroyRefLike {
  readonly destroyed?: boolean;
  onDestroy(callback: () => void): () => void;
}

export interface AngularAdapterOptions {
  readonly destroyRef?: DestroyRefLike | undefined;
}

// ============================================================================
// 1. Angular Field Adapter
// ============================================================================

export interface AngularFieldSignals<Value, Raw, Output> {
  readonly value: Signal<Value>;
  readonly rawValue: Signal<Raw>;
  readonly dirty: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly parseStatus: Signal<ParseStatus>;
  readonly parseIssue: Signal<ParseIssue | null>;
  readonly validationStatus: Signal<ValidationStatus>;
  readonly issues: Signal<readonly FieldIssue[]>;
  readonly serverIssues: Signal<readonly ServerIssue[]>;
  readonly output: Signal<Output>;
}

export interface AngularFieldHandle<Value, Raw = Value, Output = Value> extends AngularFieldSignals<
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

export function createAngularField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
  options?: AngularAdapterOptions,
): AngularFieldHandle<Value, Raw, Output> {
  const valueSig = signal(field.value.get());
  const rawValueSig = signal(field.rawValue.get());
  const dirtySig = signal(field.dirty.get());
  const touchedSig = signal(field.touched.get());
  const pendingSig = signal(field.pending.get());
  const validSig = signal(field.valid.get());
  const invalidSig = signal(field.invalid.get());
  const parseStatusSig = signal(field.parseStatus.get());
  const parseIssueSig = signal(field.parseIssue.get());
  const validationStatusSig = signal(field.validationStatus.get());
  const issuesSig = signal(field.issues.get());
  const serverIssuesSig = signal(field.serverIssues.get());
  const outputSig = signal(field.output.get());

  let isDisposed = false;
  let unregisterDestroy: (() => void) | undefined;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) {
      u();
    }
    unregisterDestroy?.();
  };

  const unsubs = [
    field.value.subscribe((v) => {
      if (!isDisposed) valueSig.set(v);
    }),
    field.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueSig.set(r);
    }),
    field.dirty.subscribe((d) => {
      if (!isDisposed) dirtySig.set(d);
    }),
    field.touched.subscribe((t) => {
      if (!isDisposed) touchedSig.set(t);
    }),
    field.pending.subscribe((p) => {
      if (!isDisposed) pendingSig.set(p);
    }),
    field.valid.subscribe((v) => {
      if (!isDisposed) validSig.set(v);
    }),
    field.invalid.subscribe((iv) => {
      if (!isDisposed) invalidSig.set(iv);
    }),
    field.parseStatus.subscribe((ps) => {
      if (!isDisposed) parseStatusSig.set(ps);
    }),
    field.parseIssue.subscribe((pi) => {
      if (!isDisposed) parseIssueSig.set(pi);
    }),
    field.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusSig.set(vs);
    }),
    field.issues.subscribe((iss) => {
      if (!isDisposed) issuesSig.set(iss);
    }),
    field.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesSig.set(si);
    }),
    field.output.subscribe((o) => {
      if (!isDisposed) outputSig.set(o);
    }),
  ];

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = options.destroyRef.onDestroy(dispose);
    }
  }

  return {
    value: valueSig.asReadonly(),
    rawValue: rawValueSig.asReadonly(),
    dirty: dirtySig.asReadonly(),
    touched: touchedSig.asReadonly(),
    pending: pendingSig.asReadonly(),
    valid: validSig.asReadonly(),
    invalid: invalidSig.asReadonly(),
    parseStatus: parseStatusSig.asReadonly(),
    parseIssue: parseIssueSig.asReadonly(),
    validationStatus: validationStatusSig.asReadonly(),
    issues: issuesSig.asReadonly(),
    serverIssues: serverIssuesSig.asReadonly(),
    output: outputSig.asReadonly(),
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

export function toAngularField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
  options?: AngularAdapterOptions,
): AngularFieldHandle<Value, Raw, Output> {
  const destroyRef = options?.destroyRef ?? tryInjectDestroyRef();
  return createAngularField(field, { ...options, destroyRef });
}

// ============================================================================
// 2. Angular Form Adapter
// ============================================================================

export interface AngularFormSignals<T extends Record<string, any>> {
  readonly values: Signal<T>;
  readonly output: Signal<T>;
  readonly dirty: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly issues: Signal<readonly FieldIssue[]>;
  readonly serverIssues: Signal<readonly ServerIssue[]>;
  readonly validationStatus: Signal<ValidationStatus>;
  readonly submissionStatus: Signal<SubmissionStatus>;
  readonly submitting: Signal<boolean>;
}

export interface AngularFormHandle<T extends Record<string, any>> extends AngularFormSignals<T> {
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

export function createAngularForm<T extends Record<string, any>>(
  form: FormInstance<T>,
  options?: AngularAdapterOptions,
): AngularFormHandle<T> {
  const valuesSig = signal(form.values.get());
  const outputSig = signal(form.output.get());
  const dirtySig = signal(form.dirty.get());
  const touchedSig = signal(form.touched.get());
  const pendingSig = signal(form.pending.get());
  const validSig = signal(form.valid.get());
  const invalidSig = signal(form.invalid.get());
  const issuesSig = signal(form.issues.get());
  const serverIssuesSig = signal(form.serverIssues.get());
  const validationStatusSig = signal(form.validationStatus.get());
  const submissionStatusSig = signal(form.submissionStatus.get());
  const submittingSig = signal(form.submitting.get());

  let isDisposed = false;
  let unregisterDestroy: (() => void) | undefined;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) {
      u();
    }
    unregisterDestroy?.();
  };

  const unsubs = [
    form.values.subscribe((v) => {
      if (!isDisposed) valuesSig.set(v);
    }),
    form.output.subscribe((o) => {
      if (!isDisposed) outputSig.set(o);
    }),
    form.dirty.subscribe((d) => {
      if (!isDisposed) dirtySig.set(d);
    }),
    form.touched.subscribe((t) => {
      if (!isDisposed) touchedSig.set(t);
    }),
    form.pending.subscribe((p) => {
      if (!isDisposed) pendingSig.set(p);
    }),
    form.valid.subscribe((v) => {
      if (!isDisposed) validSig.set(v);
    }),
    form.invalid.subscribe((iv) => {
      if (!isDisposed) invalidSig.set(iv);
    }),
    form.issues.subscribe((iss) => {
      if (!isDisposed) issuesSig.set(iss);
    }),
    form.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesSig.set(si);
    }),
    form.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusSig.set(vs);
    }),
    form.submissionStatus.subscribe((ss) => {
      if (!isDisposed) submissionStatusSig.set(ss);
    }),
    form.submitting.subscribe((sub) => {
      if (!isDisposed) submittingSig.set(sub);
    }),
  ];

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = options.destroyRef.onDestroy(dispose);
    }
  }

  return {
    values: valuesSig.asReadonly(),
    output: outputSig.asReadonly(),
    dirty: dirtySig.asReadonly(),
    touched: touchedSig.asReadonly(),
    pending: pendingSig.asReadonly(),
    valid: validSig.asReadonly(),
    invalid: invalidSig.asReadonly(),
    issues: issuesSig.asReadonly(),
    serverIssues: serverIssuesSig.asReadonly(),
    validationStatus: validationStatusSig.asReadonly(),
    submissionStatus: submissionStatusSig.asReadonly(),
    submitting: submittingSig.asReadonly(),
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

export function toAngularForm<T extends Record<string, any>>(
  form: FormInstance<T>,
  options?: AngularAdapterOptions,
): AngularFormHandle<T> {
  const destroyRef = options?.destroyRef ?? tryInjectDestroyRef();
  return createAngularForm(form, { ...options, destroyRef });
}

// ============================================================================
// 3. Angular FieldArray Adapter
// ============================================================================

export interface AngularArraySignals<T> {
  readonly items: Signal<readonly ArrayItem<T>[]>;
  readonly values: Signal<readonly T[]>;
  readonly output: Signal<readonly T[]>;
  readonly dirty: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly issues: Signal<readonly FieldIssue[]>;
  readonly serverIssues: Signal<readonly ServerIssue[]>;
  readonly validationStatus: Signal<ValidationStatus>;
  readonly length: Signal<number>;
}

export interface AngularArrayHandle<T> extends AngularArraySignals<T> {
  push(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  move(from: number, to: number): void;
  setValues(next: T[]): void;
  reset(nextInitials?: T[]): void;
  dispose(): void;
}

export function createAngularFieldArray<T>(
  arrayNode: FieldArray<T>,
  options?: AngularAdapterOptions,
): AngularArrayHandle<T> {
  const itemsSig = signal(arrayNode.items.get());
  const valuesSig = signal(arrayNode.values.get());
  const outputSig = signal(arrayNode.output.get());
  const dirtySig = signal(arrayNode.dirty.get());
  const touchedSig = signal(arrayNode.touched.get());
  const pendingSig = signal(arrayNode.pending.get());
  const validSig = signal(arrayNode.valid.get());
  const invalidSig = signal(arrayNode.invalid.get());
  const issuesSig = signal(arrayNode.issues.get());
  const serverIssuesSig = signal(arrayNode.serverIssues.get());
  const validationStatusSig = signal(arrayNode.validationStatus.get());
  const lengthSig = signal(arrayNode.items.get().length);

  let isDisposed = false;
  let unregisterDestroy: (() => void) | undefined;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) {
      u();
    }
    unregisterDestroy?.();
  };

  const unsubs = [
    arrayNode.items.subscribe((it) => {
      if (!isDisposed) {
        itemsSig.set(it);
        lengthSig.set(it.length);
      }
    }),
    arrayNode.values.subscribe((v) => {
      if (!isDisposed) valuesSig.set(v);
    }),
    arrayNode.output.subscribe((o) => {
      if (!isDisposed) outputSig.set(o);
    }),
    arrayNode.dirty.subscribe((d) => {
      if (!isDisposed) dirtySig.set(d);
    }),
    arrayNode.touched.subscribe((t) => {
      if (!isDisposed) touchedSig.set(t);
    }),
    arrayNode.pending.subscribe((p) => {
      if (!isDisposed) pendingSig.set(p);
    }),
    arrayNode.valid.subscribe((v) => {
      if (!isDisposed) validSig.set(v);
    }),
    arrayNode.invalid.subscribe((iv) => {
      if (!isDisposed) invalidSig.set(iv);
    }),
    arrayNode.issues.subscribe((iss) => {
      if (!isDisposed) issuesSig.set(iss);
    }),
    arrayNode.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesSig.set(si);
    }),
    arrayNode.validationStatus.subscribe((vs) => {
      if (!isDisposed) validationStatusSig.set(vs);
    }),
  ];

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = options.destroyRef.onDestroy(dispose);
    }
  }

  return {
    items: itemsSig.asReadonly(),
    values: valuesSig.asReadonly(),
    output: outputSig.asReadonly(),
    dirty: dirtySig.asReadonly(),
    touched: touchedSig.asReadonly(),
    pending: pendingSig.asReadonly(),
    valid: validSig.asReadonly(),
    invalid: invalidSig.asReadonly(),
    issues: issuesSig.asReadonly(),
    serverIssues: serverIssuesSig.asReadonly(),
    validationStatus: validationStatusSig.asReadonly(),
    length: lengthSig.asReadonly(),
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

function tryInjectDestroyRef(): DestroyRefLike | undefined {
  try {
    return inject(DestroyRef);
  } catch {
    return undefined;
  }
}
