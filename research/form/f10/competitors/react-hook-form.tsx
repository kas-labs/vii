/**
 * Form Research F10 — Competitor Implementation: React Hook Form (Stable v7.86.0)
 *
 * Idiomatic implementation of the Task Board workflow using react-hook-form 7.86.0.
 * Implements ref-based inputs, useFieldArray for checklist items, async validation,
 * and setError server error mapping.
 */

import React from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import {
  type TaskBoardFormValues,
  INITIAL_TASK_DATA,
} from "../fixtures/domain-data.js";
import { type RenderCounters } from "../consumers/consumer-b-react.js";

export interface ReactHookFormTaskBoardProps {
  initialValues?: TaskBoardFormValues;
  initialData?: TaskBoardFormValues;
  asyncTitleCheck?: (title: string, signal: AbortSignal) => Promise<boolean>;
  onSubmitAction?: (values: TaskBoardFormValues) => Promise<void>;
  onFormReady?: (methods: any) => void;
  counters?: RenderCounters;
}

export const ReactHookFormTaskBoard: React.FC<ReactHookFormTaskBoardProps> = ({
  initialValues,
  initialData,
  asyncTitleCheck,
  onSubmitAction,
  onFormReady,
  counters,
}) => {
  if (counters) counters.formRoot++;

  const effectiveInitial = initialValues || initialData || INITIAL_TASK_DATA;

  const methods = useForm<TaskBoardFormValues>({
    defaultValues: effectiveInitial,
    mode: "onChange",
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = methods;

  React.useEffect(() => {
    onFormReady?.(methods);
  }, [methods, onFormReady]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "checklist",
  });

  // Track async abort signal in consumer-owned ref since RHF does not pass AbortSignal into rules
  const asyncAbortRef = React.useRef<AbortController | null>(null);

  const onSubmit: SubmitHandler<TaskBoardFormValues> = async (data) => {
    try {
      clearErrors("root.serverError");
      if (onSubmitAction) {
        await onSubmitAction(data);
      }
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const issues = (err as { issues: Array<{ message: string; path?: string[] }> }).issues;
        issues.forEach((iss) => {
          setError("root.serverError", { type: "server", message: iss.message });
        });
      } else {
        setError("root.serverError", {
          type: "server",
          message: (err as Error).message || "Submission failed",
        });
      }
    }
  };

  return (
    <form data-testid="rhf-form" onSubmit={handleSubmit(onSubmit)}>
      <h2>React Hook Form Task Workflow</h2>

      {/* Title Field */}
      <div className="form-group" data-testid="rhf-title-group">
        <label htmlFor="rhf-title">Task Title</label>
        <input
          id="rhf-title"
          data-testid="rhf-input-title"
          {...register("title", {
            required: "Title is required.",
            minLength: { value: 5, message: "Title must be at least 5 chars." },
            validate: async (value) => {
              if (!value || value.length < 5 || !asyncTitleCheck) return true;
              if (asyncAbortRef.current) asyncAbortRef.current.abort();
              const ctrl = new AbortController();
              asyncAbortRef.current = ctrl;
              try {
                const isUnique = await asyncTitleCheck(value, ctrl.signal);
                return isUnique || `Task title '${value}' already exists.`;
              } catch (e) {
                if ((e as Error).name === "AbortError") return true;
                return "Validation failed.";
              }
            },
          })}
          aria-invalid={errors.title ? "true" : "false"}
        />
        {errors.title && (
          <span data-testid="rhf-title-error" className="error">
            {errors.title.message}
          </span>
        )}
      </div>

      {/* Story Points Estimate Field */}
      <div className="form-group" data-testid="rhf-estimate-group">
        <label htmlFor="rhf-estimate">Story Points</label>
        <input
          id="rhf-estimate"
          data-testid="rhf-input-estimate"
          type="number"
          {...register("estimateStoryPoints", {
            valueAsNumber: true,
            min: { value: 0, message: "Estimate must be non-negative." },
          })}
          aria-invalid={errors.estimateStoryPoints ? "true" : "false"}
        />
        {errors.estimateStoryPoints && (
          <span data-testid="rhf-estimate-error" className="error">
            {errors.estimateStoryPoints.message}
          </span>
        )}
      </div>

      {/* Checklist Field Array */}
      <div className="checklist-manager" data-testid="rhf-checklist-manager">
        <h4>Checklist ({fields.length} items)</h4>
        <ul>
          {fields.map((field, index) => (
            <li key={field.id} data-testid={`rhf-checklist-row-${index}`}>
              <input
                type="checkbox"
                data-testid={`rhf-chk-done-${index}`}
                {...register(`checklist.${index}.done` as const)}
              />
              <input
                data-testid={`rhf-chk-title-${index}`}
                {...register(`checklist.${index}.title` as const, {
                  required: "Item title required",
                })}
              />
              <button
                type="button"
                data-testid={`rhf-chk-remove-${index}`}
                onClick={() => remove(index)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          data-testid="rhf-chk-add-btn"
          onClick={() =>
            append({
              id: `chk_${Date.now()}`,
              title: "New Requirement",
              done: false,
            })
          }
        >
          Add Checklist Item
        </button>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          data-testid="rhf-submit-btn"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Task"}
        </button>
        <button type="button" data-testid="rhf-reset-btn" onClick={() => reset()}>
          Reset
        </button>
      </div>

      {errors.root && (errors.root as any)["serverError"] && (
        <div data-testid="rhf-server-issues" className="server-errors">
          <p>{(errors.root as any)["serverError"].message}</p>
        </div>
      )}
    </form>
  );
};
