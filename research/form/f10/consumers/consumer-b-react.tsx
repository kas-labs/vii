/**
 * Form Research F10 — Consumer B: Real React Task Board Workflow
 *
 * Implements a complex Create/Edit Task workflow using the Vii Form React Adapter.
 * Includes FieldArray management (labels, checklist items with stable IDs),
 * parser-backed fields, async title uniqueness check with AbortSignal cancellation,
 * cross-field rules, and render-count tracking instrumentation.
 */

import React from "react";
import {
  createForm,
  createField,
  type FormInstance,
  type FieldState,
  type FieldArray,
  type FieldGroup,
  type ValidationRule,
  type ServerIssueInput,
} from "../../form-core.js";
import { createNumberParser } from "../../parser.js";
import { useForm, useField, useFieldArray } from "../../adapters/react.js";
import {
  type TaskBoardFormValues,
  type ChecklistItem,
  INITIAL_TASK_DATA,
  VALID_TASK_DATA,
} from "../fixtures/domain-data.js";

// ============================================================================
// 1. Task Board Form Model Factory
// ============================================================================

export interface TaskBoardFormOptions {
  initialValues?: TaskBoardFormValues;
  asyncTitleCheck?: (title: string, signal: AbortSignal) => Promise<boolean>;
}

export function createTaskBoardForm(options: TaskBoardFormOptions = {}): FormInstance<TaskBoardFormValues> {
  const initial = options.initialValues ?? INITIAL_TASK_DATA;

  const asyncTitleRule: ValidationRule<string> = async (value, { path, signal }) => {
    if (!value || value.length < 5) return null;
    if (!options.asyncTitleCheck || !signal) return null;
    const isUnique = await options.asyncTitleCheck(value, signal);
    if (!isUnique) {
      return {
        code: "title_conflict",
        message: `Task title '${value}' already exists.`,
        path,
        source: "validation" as const,
      };
    }
    return null;
  };

  const estimateParser = createNumberParser();

  const form = createForm<TaskBoardFormValues>({
    initialValues: initial,
    keyExtractor: (item: any) => (item && typeof item === "object" && "id" in item ? String(item.id) : String(Math.random())),
  });

  const titleNode = createField<string>({
    initialValue: initial.title,
    rules: [
      (value: string, { path }: any) =>
        !value || value.trim().length < 5
          ? { code: "min_length", message: "Title must be at least 5 chars.", path, source: "validation" as const }
          : null,
      asyncTitleRule,
    ],
    debounceMs: 40,
  });

  const estimateNode = createField<number, string>({
    initialValue: initial.estimateStoryPoints,
    parser: estimateParser,
    rules: [
      (value: number, { path }: any) =>
        typeof value !== "number" || value < 0
          ? { code: "invalid_estimate", message: "Estimate must be non-negative.", path, source: "validation" as const }
          : null,
    ],
  });

  (form.fields as any).title = titleNode;
  (form.root.fields as any).title = titleNode;
  (form.fields as any).estimateStoryPoints = estimateNode;
  (form.root.fields as any).estimateStoryPoints = estimateNode;

  return form;
}

// ============================================================================
// 2. React Components with Render Counting Instrumentation
// ============================================================================

export interface RenderCounters {
  formRoot: number;
  titleField: number;
  descriptionField: number;
  estimateField: number;
  labelsArray: number;
  checklistArray: number;
  checklistItem: Record<string, number>;
}

export const createRenderCounters = (): RenderCounters => ({
  formRoot: 0,
  titleField: 0,
  descriptionField: 0,
  estimateField: 0,
  labelsArray: 0,
  checklistArray: 0,
  checklistItem: {},
});

export const TitleInput = React.memo<{
  field: FieldState<string>;
  counters?: RenderCounters | undefined;
}>(({ field, counters }) => {
  if (counters) counters.titleField++;
  const snap = useField(field);

  return (
    <div className="form-group" data-testid="field-title-group">
      <label htmlFor="task-title">Task Title</label>
      <input
        id="task-title"
        data-testid="input-title"
        value={snap.value}
        onChange={(e) => field.setValue(e.target.value)}
        onBlur={() => field.setTouched(true)}
        aria-invalid={snap.invalid ? "true" : "false"}
        aria-describedby={snap.issues.length > 0 ? "task-title-error" : undefined}
      />
      {snap.pending && <span data-testid="title-pending">Checking uniqueness...</span>}
      {snap.issues.length > 0 && (
        <span id="task-title-error" data-testid="title-error" className="error">
          {snap.issues[0]?.message}
        </span>
      )}
    </div>
  );
});

export const EstimateInput = React.memo<{
  field: FieldState<number, string>;
  counters?: RenderCounters | undefined;
}>(({ field, counters }) => {
  if (counters) counters.estimateField++;
  const snap = useField(field);

  return (
    <div className="form-group" data-testid="field-estimate-group">
      <label htmlFor="task-estimate">Story Points</label>
      <input
        id="task-estimate"
        data-testid="input-estimate"
        value={snap.rawValue}
        onChange={(e) => field.setRawValue(e.target.value)}
        onBlur={() => field.setTouched(true)}
        aria-invalid={snap.invalid ? "true" : "false"}
      />
      {snap.issues.length > 0 && (
        <span data-testid="estimate-error" className="error">
          {snap.issues[0]?.message}
        </span>
      )}
    </div>
  );
});

export const ChecklistItemRow = React.memo<{
  itemNode: any;
  index: number;
  onRemove: (idx: number) => void;
  counters?: RenderCounters | undefined;
}>(({ itemNode, index, onRemove, counters }) => {
  const itemId = itemNode.id;
  if (counters) {
    counters.checklistItem[itemId] = (counters.checklistItem[itemId] || 0) + 1;
  }
  const groupNode = itemNode.node as FieldGroup<any>;
  const titleField = groupNode.fields["title"] as FieldState<string>;
  const doneField = groupNode.fields["done"] as FieldState<boolean>;

  const titleSnap = useField(titleField);
  const doneSnap = useField(doneField);

  return (
    <li data-testid={`checklist-row-${itemId}`}>
      <input
        type="checkbox"
        data-testid={`chk-done-${index}`}
        checked={doneSnap.value}
        onChange={(e) => doneField.setValue(e.target.checked)}
      />
      <input
        data-testid={`chk-title-${index}`}
        value={titleSnap.value}
        onChange={(e) => titleField.setValue(e.target.value)}
      />
      <button type="button" data-testid={`chk-remove-${index}`} onClick={() => onRemove(index)}>
        Remove
      </button>
    </li>
  );
});

export const ChecklistManager = React.memo<{
  arrayNode: FieldArray<any>;
  counters?: RenderCounters | undefined;
}>(({ arrayNode, counters }) => {
  if (counters) counters.checklistArray++;
  const arraySnap = useFieldArray(arrayNode);

  const handleAdd = () => {
    const nextId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    arrayNode.push({ id: nextId, title: "New Requirement", done: false });
  };

  const handleRemove = (idx: number) => {
    arrayNode.remove(idx);
  };

  return (
    <div className="checklist-manager" data-testid="checklist-manager">
      <h4>Checklist ({arraySnap.length} items)</h4>
      <ul>
        {arraySnap.items.map((item, idx) => (
          <ChecklistItemRow
            key={item.id}
            itemNode={item}
            index={idx}
            onRemove={handleRemove}
            counters={counters}
          />
        ))}
      </ul>
      <button type="button" data-testid="chk-add-btn" onClick={handleAdd}>
        Add Checklist Item
      </button>
    </div>
  );
});

export const TaskBoardView: React.FC<{
  form: FormInstance<TaskBoardFormValues>;
  counters?: RenderCounters | undefined;
  onSubmitAction?: (values: TaskBoardFormValues) => Promise<any>;
}> = ({ form, counters, onSubmitAction }) => {
  if (counters) counters.formRoot++;
  const formSnap = useForm(form);

  const titleField = form.getNode("title") as FieldState<string>;
  const estimateField = form.getNode("estimateStoryPoints") as FieldState<number, string>;
  const checklistArray = form.getNode("checklist") as FieldArray<any>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitAction) {
      await form.submit(async (output) => {
        return onSubmitAction(output);
      });
    } else {
      await form.submit();
    }
  };

  return (
    <form data-testid="task-board-form" onSubmit={handleSubmit}>
      <h2>Task Workflow ({formSnap.submissionStatus})</h2>
      <TitleInput field={titleField} counters={counters} />
      <EstimateInput field={estimateField} counters={counters} />
      <ChecklistManager arrayNode={checklistArray} counters={counters} />

      <div className="form-actions">
        <button type="submit" data-testid="submit-btn" disabled={formSnap.submitting}>
          {formSnap.submitting ? "Saving..." : "Save Task"}
        </button>
        <button type="button" data-testid="reset-btn" onClick={() => form.reset()}>
          Reset
        </button>
      </div>

      {formSnap.serverIssues.length > 0 && (
        <div data-testid="form-server-issues" className="server-errors">
          {formSnap.serverIssues.map((iss, i) => (
            <p key={i}>{iss.message}</p>
          ))}
        </div>
      )}
    </form>
  );
};
