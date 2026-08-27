/**
 * @file React adapter prototype for Vii Form.
 * Research only: not a public package API.
 *
 * Implements thin React hooks over Form Core using useSyncExternalStore.
 * Provides referentially stable snapshots to prevent unnecessary re-renders,
 * stable mutation/lifecycle handlers, SSR compatibility, and clean unmount cleanup.
 */

import { useMemo, useSyncExternalStore } from "react";
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

// ============================================================================
// 1. useField Hook
// ============================================================================

export interface ReactFieldSnapshot<Value, Raw, Output> {
  readonly value: Value;
  readonly rawValue: Raw;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly parseStatus: ParseStatus;
  readonly parseIssue: ParseIssue | null;
  readonly validationStatus: ValidationStatus;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
  readonly output: Output;
}

export interface ReactFieldBinding<Value, Raw = Value, Output = Value> extends ReactFieldSnapshot<
  Value,
  Raw,
  Output
> {
  setValue(value: Value): void;
  setRawValue(raw: Raw): void;
  setTouched(touched?: boolean): void;
  blur(): void;
  reset(...args: [nextInitial?: Value, nextInitialRaw?: Raw]): void;
}

export function useField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
): ReactFieldBinding<Value, Raw, Output> {
  const bridge = useMemo(() => {
    let cachedSnapshot: ReactFieldSnapshot<Value, Raw, Output> = {
      value: field.value.get(),
      rawValue: field.rawValue.get(),
      dirty: field.dirty.get(),
      touched: field.touched.get(),
      pending: field.pending.get(),
      valid: field.valid.get(),
      invalid: field.invalid.get(),
      parseStatus: field.parseStatus.get(),
      parseIssue: field.parseIssue.get(),
      validationStatus: field.validationStatus.get(),
      issues: field.issues.get(),
      serverIssues: field.serverIssues.get(),
      output: field.output.get(),
    };

    const updateSnapshot = (): void => {
      cachedSnapshot = {
        value: field.value.get(),
        rawValue: field.rawValue.get(),
        dirty: field.dirty.get(),
        touched: field.touched.get(),
        pending: field.pending.get(),
        valid: field.valid.get(),
        invalid: field.invalid.get(),
        parseStatus: field.parseStatus.get(),
        parseIssue: field.parseIssue.get(),
        validationStatus: field.validationStatus.get(),
        issues: field.issues.get(),
        serverIssues: field.serverIssues.get(),
        output: field.output.get(),
      };
    };

    const subscribe = (onStoreChange: () => void): (() => void) => {
      const notify = () => {
        updateSnapshot();
        onStoreChange();
      };

      const unsubs = [
        field.value.subscribe(notify),
        field.rawValue.subscribe(notify),
        field.touched.subscribe(notify),
        field.pending.subscribe(notify),
        field.parseStatus.subscribe(notify),
        field.parseIssue.subscribe(notify),
        field.validationStatus.subscribe(notify),
        field.issues.subscribe(notify),
        field.serverIssues.subscribe(notify),
      ];

      return () => {
        for (const u of unsubs) u();
      };
    };

    const getSnapshot = () => cachedSnapshot;

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
      setValue: (v: Value) => field.setValue(v),
      setRawValue: (r: Raw) => field.setRawValue(r),
      setTouched: (t: boolean = true) => field.setTouched(t),
      blur: () => field.setTouched(true),
      reset: (...args: [nextInitial?: Value, nextInitialRaw?: Raw]) => field.reset(...args),
    };
  }, [field]);

  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      setValue: bridge.setValue,
      setRawValue: bridge.setRawValue,
      setTouched: bridge.setTouched,
      blur: bridge.blur,
      reset: bridge.reset,
    }),
    [snapshot, bridge],
  );
}

// ============================================================================
// 2. useForm Hook
// ============================================================================

export interface ReactFormSnapshot<T extends Record<string, any>> {
  readonly values: T;
  readonly output: T;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
  readonly validationStatus: ValidationStatus;
  readonly submissionStatus: SubmissionStatus;
  readonly submitting: boolean;
}

export interface ReactFormBinding<T extends Record<string, any>> extends ReactFormSnapshot<T> {
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
}

export function useForm<T extends Record<string, any>>(form: FormInstance<T>): ReactFormBinding<T> {
  const bridge = useMemo(() => {
    let cachedSnapshot: ReactFormSnapshot<T> = {
      values: form.values.get(),
      output: form.output.get(),
      dirty: form.dirty.get(),
      touched: form.touched.get(),
      pending: form.pending.get(),
      valid: form.valid.get(),
      invalid: form.invalid.get(),
      issues: form.issues.get(),
      serverIssues: form.serverIssues.get(),
      validationStatus: form.validationStatus.get(),
      submissionStatus: form.submissionStatus.get(),
      submitting: form.submitting.get(),
    };

    const updateSnapshot = (): void => {
      cachedSnapshot = {
        values: form.values.get(),
        output: form.output.get(),
        dirty: form.dirty.get(),
        touched: form.touched.get(),
        pending: form.pending.get(),
        valid: form.valid.get(),
        invalid: form.invalid.get(),
        issues: form.issues.get(),
        serverIssues: form.serverIssues.get(),
        validationStatus: form.validationStatus.get(),
        submissionStatus: form.submissionStatus.get(),
        submitting: form.submitting.get(),
      };
    };

    const subscribe = (onStoreChange: () => void): (() => void) => {
      const notify = () => {
        updateSnapshot();
        onStoreChange();
      };

      const unsubs = [
        form.values.subscribe(notify),
        form.dirty.subscribe(notify),
        form.touched.subscribe(notify),
        form.pending.subscribe(notify),
        form.valid.subscribe(notify),
        form.issues.subscribe(notify),
        form.serverIssues.subscribe(notify),
        form.submissionStatus.subscribe(notify),
      ];

      return () => {
        for (const u of unsubs) u();
      };
    };

    const getSnapshot = () => cachedSnapshot;

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
      submit: <TResult = void>(action?: SubmitAction<T, TResult>, options?: SubmitOptions) =>
        form.submit(action, options),
      cancelSubmit: () => form.cancelSubmit(),
      reset: (nextInitials?: Partial<T>) => form.reset(nextInitials),
      reinitialize: (nextInitials: Partial<T>) => form.reinitialize(nextInitials),
      setValues: (partial: Partial<T>) => form.setValues(partial),
      setServerIssues: (issues: readonly (ServerIssueInput | string)[]) =>
        form.setServerIssues(issues),
      clearServerIssues: () => form.clearServerIssues(),
    };
  }, [form]);

  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      form,
      fields: form.fields,
      submit: bridge.submit,
      cancelSubmit: bridge.cancelSubmit,
      reset: bridge.reset,
      reinitialize: bridge.reinitialize,
      setValues: bridge.setValues,
      setServerIssues: bridge.setServerIssues,
      clearServerIssues: bridge.clearServerIssues,
    }),
    [snapshot, bridge, form],
  );
}

// ============================================================================
// 3. useFieldArray Hook
// ============================================================================

export interface ReactArraySnapshot<T> {
  readonly items: readonly ArrayItem<T>[];
  readonly values: readonly T[];
  readonly output: readonly T[];
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
  readonly validationStatus: ValidationStatus;
  readonly length: number;
}

export interface ReactArrayBinding<T> extends ReactArraySnapshot<T> {
  push(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  swap(indexA: number, indexB: number): void;
  move(from: number, to: number): void;
  setValues(next: T[]): void;
  reset(nextInitials?: T[]): void;
}

export function useFieldArray<T>(arrayNode: FieldArray<T>): ReactArrayBinding<T> {
  const bridge = useMemo(() => {
    let cachedSnapshot: ReactArraySnapshot<T> = {
      items: arrayNode.items.get(),
      values: arrayNode.values.get(),
      output: arrayNode.output.get(),
      dirty: arrayNode.dirty.get(),
      touched: arrayNode.touched.get(),
      pending: arrayNode.pending.get(),
      valid: arrayNode.valid.get(),
      invalid: arrayNode.invalid.get(),
      issues: arrayNode.issues.get(),
      serverIssues: arrayNode.serverIssues.get(),
      validationStatus: arrayNode.validationStatus.get(),
      length: arrayNode.items.get().length,
    };

    const updateSnapshot = (): void => {
      cachedSnapshot = {
        items: arrayNode.items.get(),
        values: arrayNode.values.get(),
        output: arrayNode.output.get(),
        dirty: arrayNode.dirty.get(),
        touched: arrayNode.touched.get(),
        pending: arrayNode.pending.get(),
        valid: arrayNode.valid.get(),
        invalid: arrayNode.invalid.get(),
        issues: arrayNode.issues.get(),
        serverIssues: arrayNode.serverIssues.get(),
        validationStatus: arrayNode.validationStatus.get(),
        length: arrayNode.items.get().length,
      };
    };

    const subscribe = (onStoreChange: () => void): (() => void) => {
      const notify = () => {
        updateSnapshot();
        onStoreChange();
      };

      const unsubs = [
        arrayNode.items.subscribe(notify),
        arrayNode.values.subscribe(notify),
        arrayNode.dirty.subscribe(notify),
        arrayNode.touched.subscribe(notify),
        arrayNode.pending.subscribe(notify),
        arrayNode.valid.subscribe(notify),
        arrayNode.issues.subscribe(notify),
        arrayNode.serverIssues.subscribe(notify),
      ];

      return () => {
        for (const u of unsubs) u();
      };
    };

    const getSnapshot = () => cachedSnapshot;

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
      push: (v: T) => arrayNode.push(v),
      insert: (index: number, v: T) => arrayNode.insert(index, v),
      remove: (index: number) => arrayNode.remove(index),
      swap: (a: number, b: number) => arrayNode.swap(a, b),
      move: (from: number, to: number) => arrayNode.move(from, to),
      setValues: (next: T[]) => arrayNode.setValues(next),
      reset: (nextInitials?: T[]) => arrayNode.reset(nextInitials),
    };
  }, [arrayNode]);

  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      push: bridge.push,
      insert: bridge.insert,
      remove: bridge.remove,
      swap: bridge.swap,
      move: bridge.move,
      setValues: bridge.setValues,
      reset: bridge.reset,
    }),
    [snapshot, bridge],
  );
}
