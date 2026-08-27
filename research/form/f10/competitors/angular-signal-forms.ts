/**
 * Form Research F10 — Competitor Implementation: Angular Signal Forms (Angular 22.1.4)
 *
 * Idiomatic implementation of the Task Board workflow using Angular Signal-first
 * form primitives (@angular/core signals + @angular/forms contracts).
 * Evaluates Signal-based field reactivity, computed validity, array management,
 * and server error handling.
 */

import { signal, computed, type Signal, type WritableSignal } from "@angular/core";
import {
  type TaskBoardFormValues,
  type ChecklistItem,
  INITIAL_TASK_DATA,
} from "../fixtures/domain-data.js";

export interface AngularSignalField<T> {
  value: WritableSignal<T>;
  touched: WritableSignal<boolean>;
  dirty: Signal<boolean>;
  errors: WritableSignal<string[]>;
  pending: WritableSignal<boolean>;
  valid: Signal<boolean>;
  setValue: (val: T) => void;
  setTouched: (touched: boolean) => void;
}

export interface AngularSignalFormInstance {
  title: AngularSignalField<string>;
  description: AngularSignalField<string>;
  estimateStoryPoints: AngularSignalField<number>;
  checklist: WritableSignal<ChecklistItem[]>;
  serverErrors: WritableSignal<string[]>;
  isSubmitting: WritableSignal<boolean>;
  isValid: Signal<boolean>;
  isDirty: Signal<boolean>;
  submit: (action?: (values: TaskBoardFormValues) => Promise<void>) => Promise<boolean>;
  reset: (newInitial?: TaskBoardFormValues) => void;
  addChecklistItem: (item: ChecklistItem) => void;
  removeChecklistItem: (index: number) => void;
  updateChecklistItem: (index: number, patch: Partial<ChecklistItem>) => void;
}

function createField<T>(initialValue: T): AngularSignalField<T> {
  const value = signal<T>(initialValue);
  const initial = signal<T>(initialValue);
  const touched = signal<boolean>(false);
  const errors = signal<string[]>([]);
  const pending = signal<boolean>(false);

  const dirty = computed(() => !Object.is(value(), initial()));
  const valid = computed(() => errors().length === 0 && !pending());

  const setValue = (val: T) => {
    value.set(val);
  };

  const setTouched = (t: boolean) => {
    touched.set(t);
  };

  return {
    value,
    touched,
    dirty,
    errors,
    pending,
    valid,
    setValue,
    setTouched,
  };
}

export function createAngularSignalTaskBoard(
  initialValues: TaskBoardFormValues = INITIAL_TASK_DATA,
  asyncTitleCheck?: (title: string, signal: AbortSignal) => Promise<boolean>,
): AngularSignalFormInstance {
  const title = createField<string>(initialValues.title);
  const description = createField<string>(initialValues.description);
  const estimateStoryPoints = createField<number>(initialValues.estimateStoryPoints);
  const checklist = signal<ChecklistItem[]>([...initialValues.checklist]);
  const serverErrors = signal<string[]>([]);
  const isSubmitting = signal<boolean>(false);

  let asyncAbortCtrl: AbortController | null = null;

  // Title validation trigger
  const validateTitle = async (val: string) => {
    const errs: string[] = [];
    if (!val || val.trim().length < 5) {
      errs.push("Title must be at least 5 chars.");
      title.errors.set(errs);
      return;
    }

    if (asyncTitleCheck) {
      if (asyncAbortCtrl) asyncAbortCtrl.abort();
      asyncAbortCtrl = new AbortController();
      title.pending.set(true);
      try {
        const isUnique = await asyncTitleCheck(val, asyncAbortCtrl.signal);
        if (!isUnique) {
          errs.push(`Task title '${val}' already exists.`);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          errs.push("Validation error.");
        }
      } finally {
        title.pending.set(false);
      }
    }
    title.errors.set(errs);
  };

  // Wrapped setValue with validation
  const originalSetTitle = title.setValue;
  title.setValue = (val: string) => {
    originalSetTitle(val);
    validateTitle(val);
  };

  const validateEstimate = (val: number) => {
    if (typeof val !== "number" || val < 0) {
      estimateStoryPoints.errors.set(["Estimate must be non-negative."]);
    } else {
      estimateStoryPoints.errors.set([]);
    }
  };

  const originalSetEstimate = estimateStoryPoints.setValue;
  estimateStoryPoints.setValue = (val: number) => {
    originalSetEstimate(val);
    validateEstimate(val);
  };

  const isValid = computed(() => {
    return title.valid() && description.valid() && estimateStoryPoints.valid();
  });

  const isDirty = computed(() => {
    return title.dirty() || description.dirty() || estimateStoryPoints.dirty();
  });

  const addChecklistItem = (item: ChecklistItem) => {
    checklist.update((items) => [...items, item]);
  };

  const removeChecklistItem = (index: number) => {
    checklist.update((items) => items.filter((_, i) => i !== index));
  };

  const updateChecklistItem = (index: number, patch: Partial<ChecklistItem>) => {
    checklist.update((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const submit = async (
    action?: (values: TaskBoardFormValues) => Promise<void>,
  ): Promise<boolean> => {
    serverErrors.set([]);
    if (!isValid()) return false;

    isSubmitting.set(true);
    try {
      const outputValues: TaskBoardFormValues = {
        title: title.value(),
        description: description.value(),
        project: "Default Project",
        assignee: "",
        priority: "medium",
        estimateStoryPoints: estimateStoryPoints.value(),
        dueDate: "",
        labels: [],
        checklist: checklist(),
        settings: { notifyAssignee: true, isMilestone: false },
        taskType: "feature",
      };

      if (action) {
        await action(outputValues);
      }
      return true;
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const issues = (err as { issues: Array<{ message: string }> }).issues;
        serverErrors.set(issues.map((i) => i.message));
      } else {
        serverErrors.set([(err as Error).message || "Submission failed"]);
      }
      return false;
    } finally {
      isSubmitting.set(false);
    }
  };

  const reset = (newInitial?: TaskBoardFormValues) => {
    const base = newInitial ?? initialValues;
    title.setValue(base.title);
    title.touched.set(false);
    title.errors.set([]);
    description.setValue(base.description);
    description.touched.set(false);
    description.errors.set([]);
    estimateStoryPoints.setValue(base.estimateStoryPoints);
    estimateStoryPoints.touched.set(false);
    estimateStoryPoints.errors.set([]);
    checklist.set([...base.checklist]);
    serverErrors.set([]);
    isSubmitting.set(false);
  };

  return {
    title,
    description,
    estimateStoryPoints,
    checklist,
    serverErrors,
    isSubmitting,
    isValid,
    isDirty,
    submit,
    reset,
    addChecklistItem,
    removeChecklistItem,
    updateChecklistItem,
  };
}
