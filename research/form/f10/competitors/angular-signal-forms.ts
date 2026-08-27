/**
 * Form Research F10 — Competitor Implementation: Angular Signal Forms (Angular 22.1.4)
 *
 * Official implementation of the Task Board workflow using stable Angular 22 Signal Forms
 * from `@angular/forms/signals` (`form()`, `schema()`, `required()`, `minLength()`, `min()`).
 *
 * Architectural Note on Submission:
 * Angular Signal Forms focuses on field tree reactivity, signal-backed dirty/touched states,
 * and declarative schema validation. It does not provide built-in server error path routing
 * or submission lifecycle state machines; submission orchestration is implemented as
 * application-owned glue.
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
import { form, schema, required, minLength, min, type FieldTree } from "@angular/forms/signals";
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
  }
}

export interface RealAngularSignalTaskBoard {
  appRef: ApplicationRef;
  injector: EnvironmentInjector;
  model: WritableSignal<TaskBoardFormValues>;
  fieldTree: FieldTree<TaskBoardFormValues>;
  serverErrors: WritableSignal<string[]>;
  isSubmitting: WritableSignal<boolean>;
  setTitle: (val: string) => void;
  setDescription: (val: string) => void;
  setEstimate: (val: number) => void;
  addChecklistItem: (item: ChecklistItem) => void;
  removeChecklistItem: (index: number) => void;
  swapChecklistItems: (indexA: number, indexB: number) => void;
  toggleChecklistItem: (index: number) => void;
  submitForm: (action?: (values: TaskBoardFormValues) => Promise<boolean>) => Promise<boolean>;
  resetForm: (newInitial?: TaskBoardFormValues) => void;
  dispose: () => void;
}

/**
 * Creates a real Angular 22 Signal Forms task board controller.
 */
export async function createRealAngularSignalTaskBoard(
  initialValues: TaskBoardFormValues = INITIAL_TASK_DATA,
): Promise<RealAngularSignalTaskBoard> {
  ensureDocumentEnvironment();

  // Create real Angular ApplicationRef and EnvironmentInjector
  const appRef = await createApplication({ providers: [] });
  const injector = appRef.injector;

  // Root model signal
  const model: WritableSignal<TaskBoardFormValues> = signal({
    ...initialValues,
    checklist: [...initialValues.checklist],
  });

  // Declarative validation schema using official Angular Signal Forms validators
  const taskSchema = schema<TaskBoardFormValues>((path) => {
    required(path.title, { message: "Title is required" });
    minLength(path.title, 5, { message: "Title must be at least 5 chars" });
    min(path.estimateStoryPoints, 0, { message: "Estimate must be non-negative" });
  });

  // Create official Angular Signal Forms FieldTree
  const fieldTree = form(model, taskSchema, { injector });

  // Application-owned submission and server error signals (Signal Forms leaves this to application glue)
  const serverErrors = signal<string[]>([]);
  const isSubmitting = signal<boolean>(false);

  const setTitle = (val: string) => {
    model.update((curr) => ({ ...curr, title: val }));
  };

  const setDescription = (val: string) => {
    model.update((curr) => ({ ...curr, description: val }));
  };

  const setEstimate = (val: number) => {
    model.update((curr) => ({ ...curr, estimateStoryPoints: val }));
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
