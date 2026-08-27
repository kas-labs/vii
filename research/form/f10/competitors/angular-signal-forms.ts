/**
 * Form Research F10 — Competitor Implementation: Angular Signal Forms (Angular 22.1.4)
 *
 * Official implementation of the Task Board workflow using stable Angular 22 Signal Forms
 * from `@angular/forms/signals` (`form()`, `schema()`, `required()`, `minLength()`, `min()`, `submit()`).
 *
 * Evaluates real Signal Forms FieldTree reactivity, schema validation, array synchronization,
 * and submission integration.
 */

import "@angular/compiler";
import "../../../../packages/angular/node_modules/zone.js/bundles/zone.umd.js";
import {
  signal,
  type WritableSignal,
  type ApplicationRef,
  type EnvironmentInjector,
} from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import {
  form,
  schema,
  required,
  minLength,
  min,
  submit,
  type FieldTree,
} from "@angular/forms/signals";
import {
  type TaskBoardFormValues,
  type ChecklistItem,
  INITIAL_TASK_DATA,
} from "../fixtures/domain-data.js";

// Minimal mock DOM for headless Node execution
function ensureDocumentEnvironment() {
  if (typeof globalThis.document === "undefined" || !globalThis.document.createElement) {
    globalThis.document = {
      createElement() {
        return {
          setAttribute() {},
          appendChild() {},
          style: {},
        } as any;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [] as any;
      },
      addEventListener() {},
      removeEventListener() {},
      body: {
        querySelector() {
          return null;
        },
      } as any,
      documentElement: {} as any,
    } as any;
    globalThis.window = globalThis as any;
  }
}

export interface RealAngularSignalTaskBoardInstance {
  appRef: ApplicationRef;
  injector: EnvironmentInjector;
  model: WritableSignal<TaskBoardFormValues>;
  fieldTree: FieldTree<TaskBoardFormValues>;
  serverErrors: WritableSignal<string[]>;
  isSubmitting: WritableSignal<boolean>;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setEstimate: (estimate: number) => void;
  addChecklistItem: (item: ChecklistItem) => void;
  removeChecklistItem: (index: number) => void;
  swapChecklistItems: (indexA: number, indexB: number) => void;
  toggleChecklistItem: (index: number) => void;
  submitForm: (action?: (values: TaskBoardFormValues) => Promise<boolean>) => Promise<boolean>;
  resetForm: (newInitial?: TaskBoardFormValues) => void;
  dispose: () => void;
}

export async function createRealAngularSignalTaskBoard(
  initialValues: TaskBoardFormValues = INITIAL_TASK_DATA,
): Promise<RealAngularSignalTaskBoardInstance> {
  ensureDocumentEnvironment();

  const appRef = await createApplication({ providers: [] });
  const injector = appRef.injector;

  const model = signal<TaskBoardFormValues>({
    ...initialValues,
    checklist: [...initialValues.checklist],
  });

  const serverErrors = signal<string[]>([]);
  const isSubmitting = signal<boolean>(false);

  // Official Angular 22 Signal Forms schema
  const taskSchema = schema<TaskBoardFormValues>((path) => {
    required(path.title, { message: "Title is required" });
    minLength(path.title, 5, { message: "Title must be at least 5 chars." });
    required(path.description, { message: "Description is required" });
    min(path.estimateStoryPoints, 0, { message: "Estimate must be non-negative." });
  });

  const fieldTree = form(model, taskSchema, { injector });

  const setTitle = (title: string) => {
    model.update((curr) => ({ ...curr, title }));
  };

  const setDescription = (description: string) => {
    model.update((curr) => ({ ...curr, description }));
  };

  const setEstimate = (estimateStoryPoints: number) => {
    model.update((curr) => ({ ...curr, estimateStoryPoints }));
  };

  const addChecklistItem = (item: ChecklistItem) => {
    model.update((curr) => ({
      ...curr,
      checklist: [...curr.checklist, item],
    }));
  };

  const removeChecklistItem = (index: number) => {
    model.update((curr) => ({
      ...curr,
      checklist: curr.checklist.filter((_, i) => i !== index),
    }));
  };

  const swapChecklistItems = (indexA: number, indexB: number) => {
    model.update((curr) => {
      const copy = [...curr.checklist];
      const temp = copy[indexA]!;
      copy[indexA] = copy[indexB]!;
      copy[indexB] = temp;
      return { ...curr, checklist: copy };
    });
  };

  const toggleChecklistItem = (index: number) => {
    model.update((curr) => {
      const copy = [...curr.checklist];
      const item = copy[index]!;
      copy[index] = { ...item, done: !item.done };
      return { ...curr, checklist: copy };
    });
  };

  const submitForm = async (
    action?: (values: TaskBoardFormValues) => Promise<boolean>,
  ): Promise<boolean> => {
    isSubmitting.set(true);
    try {
      if (!fieldTree.title().valid() || !fieldTree.estimateStoryPoints().valid()) {
        return false;
      }
      if (action) {
        const ok = await action(model());
        if (!ok) {
          serverErrors.set(["Server rejected submission."]);
          return false;
        }
      }
      serverErrors.set([]);
      return true;
    } finally {
      isSubmitting.set(false);
    }
  };

  const resetForm = (newInitial: TaskBoardFormValues = initialValues) => {
    model.set({
      ...newInitial,
      checklist: [...newInitial.checklist],
    });
    serverErrors.set([]);
  };

  const dispose = () => {
    appRef.destroy();
  };

  return {
    appRef,
    injector,
    model,
    fieldTree,
    serverErrors,
    isSubmitting,
    setTitle,
    setDescription,
    setEstimate,
    addChecklistItem,
    removeChecklistItem,
    swapChecklistItems,
    toggleChecklistItem,
    submitForm,
    resetForm,
    dispose,
  };
}
