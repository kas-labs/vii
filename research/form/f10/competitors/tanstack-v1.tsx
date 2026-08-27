/**
 * Form Research F10 — Competitor Implementation: TanStack Form (Stable v1.33.5)
 *
 * Idiomatic implementation of the Task Board workflow using @tanstack/react-form 1.33.5.
 * Implements fields, async uniqueness validation with AbortSignal/debounce,
 * array fields for checklist items, and server error handling.
 */

import React from "react";
import { useForm } from "@tanstack/react-form";
import {
  type TaskBoardFormValues,
  INITIAL_TASK_DATA,
} from "../fixtures/domain-data.js";
import { type RenderCounters } from "../consumers/consumer-b-react.js";

export interface TanStackTaskBoardProps {
  initialValues?: TaskBoardFormValues;
  asyncTitleCheck?: (title: string, signal: AbortSignal) => Promise<boolean>;
  onSubmitAction?: (values: TaskBoardFormValues) => Promise<void>;
  counters?: RenderCounters;
}

export const TanStackTaskBoard: React.FC<TanStackTaskBoardProps> = ({
  initialValues = INITIAL_TASK_DATA,
  asyncTitleCheck,
  onSubmitAction,
  counters,
}) => {
  if (counters) counters.formRoot++;

  const [serverErrors, setServerErrors] = React.useState<string[]>([]);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      try {
        setServerErrors([]);
        if (onSubmitAction) {
          await onSubmitAction(value);
        }
      } catch (err) {
        if (err && typeof err === "object" && "issues" in err) {
          const issues = (err as { issues: Array<{ message: string }> }).issues;
          setServerErrors(issues.map((i) => i.message));
        } else {
          setServerErrors([(err as Error).message || "Submission failed"]);
        }
      }
    },
  });

  return (
    <form
      data-testid="tanstack-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <h2>TanStack Form Task Workflow</h2>

      {/* Title Field */}
      <form.Field
        name="title"
        validators={{
          onChange: ({ value }) =>
            !value || value.trim().length < 5 ? "Title must be at least 5 chars." : undefined,
          onChangeAsyncDebounceMs: 40,
          onChangeAsync: async ({ value, signal }) => {
            if (!value || value.length < 5 || !asyncTitleCheck) return undefined;
            const isUnique = await asyncTitleCheck(value, signal);
            return !isUnique ? `Task title '${value}' already exists.` : undefined;
          },
        }}
      >
        {(field) => {
          if (counters) counters.titleField++;
          return (
            <div className="form-group" data-testid="tanstack-title-group">
              <label htmlFor="tanstack-title">Task Title</label>
              <input
                id="tanstack-title"
                data-testid="tanstack-input-title"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0 ? "true" : "false"}
              />
              {field.state.meta.isValidating && (
                <span data-testid="tanstack-title-pending">Validating...</span>
              )}
              {field.state.meta.errors.length > 0 && (
                <span data-testid="tanstack-title-error" className="error">
                  {field.state.meta.errors[0]}
                </span>
              )}
            </div>
          );
        }}
      </form.Field>

      {/* Story Points Estimate Field (Numeric parse logic in consumer change handler) */}
      <form.Field
        name="estimateStoryPoints"
        validators={{
          onChange: ({ value }) => (value < 0 ? "Estimate must be non-negative." : undefined),
        }}
      >
        {(field) => {
          if (counters) counters.estimateField++;
          return (
            <div className="form-group" data-testid="tanstack-estimate-group">
              <label htmlFor="tanstack-estimate">Story Points</label>
              <input
                id="tanstack-estimate"
                data-testid="tanstack-input-estimate"
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                aria-invalid={field.state.meta.errors.length > 0 ? "true" : "false"}
              />
              {field.state.meta.errors.length > 0 && (
                <span data-testid="tanstack-estimate-error" className="error">
                  {field.state.meta.errors[0]}
                </span>
              )}
            </div>
          );
        }}
      </form.Field>

      {/* Checklist Field Array */}
      <form.Field name="checklist" mode="array">
        {(field) => {
          if (counters) counters.checklistArray++;
          return (
            <div className="checklist-manager" data-testid="tanstack-checklist-manager">
              <h4>Checklist ({field.state.value.length} items)</h4>
              <ul>
                {field.state.value.map((item, index) => (
                  <li key={item.id ?? index} data-testid={`tanstack-checklist-row-${index}`}>
                    <form.Field name={`checklist[${index}].done`}>
                      {(doneField) => (
                        <input
                          type="checkbox"
                          data-testid={`tanstack-chk-done-${index}`}
                          checked={doneField.state.value}
                          onChange={(e) => doneField.handleChange(e.target.checked)}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`checklist[${index}].title`}>
                      {(titleField) => (
                        <input
                          data-testid={`tanstack-chk-title-${index}`}
                          value={titleField.state.value}
                          onChange={(e) => titleField.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <button
                      type="button"
                      data-testid={`tanstack-chk-remove-${index}`}
                      onClick={() => field.removeValue(index)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                data-testid="tanstack-chk-add-btn"
                onClick={() =>
                  field.pushValue({
                    id: `chk_${Date.now()}`,
                    title: "New Requirement",
                    done: false,
                  })
                }
              >
                Add Checklist Item
              </button>
            </div>
          );
        }}
      </form.Field>

      <div className="form-actions">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              data-testid="tanstack-submit-btn"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Task"}
            </button>
          )}
        </form.Subscribe>
        <button type="button" data-testid="tanstack-reset-btn" onClick={() => form.reset()}>
          Reset
        </button>
      </div>

      {serverErrors.length > 0 && (
        <div data-testid="tanstack-server-issues" className="server-errors">
          {serverErrors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}
    </form>
  );
};
