/**
 * Form Research F10 — Consumer B (React Task Board) Validation Tests
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  createTaskBoardForm,
  TaskBoardView,
  createRenderCounters,
  type RenderCounters,
} from "../consumers/consumer-b-react.js";
import {
  VALID_TASK_DATA,
  INITIAL_TASK_DATA,
} from "../fixtures/domain-data.js";
import { type FieldState, type FieldArray } from "../../form-core.js";

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe("Form Research F10: Consumer B (React Task Board)", () => {
  it("verifies render isolation during leaf field keystrokes (0 whole-form rerenders)", () => {
    const form = createTaskBoardForm({ initialValues: VALID_TASK_DATA });
    const counters = createRenderCounters();

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<TaskBoardView form={form} counters={counters} />);
    });

    const initialRootRenders = counters.formRoot;
    const initialTitleRenders = counters.titleField;
    const initialEstimateRenders = counters.estimateField;
    const initialChecklistRenders = counters.checklistArray;

    expect(initialRootRenders).toBe(1);
    expect(initialTitleRenders).toBe(1);

    // Edit Title field directly
    const titleNode = form.getNode("title") as FieldState<string>;
    act(() => {
      titleNode.setValue("Updated Task Title Here");
    });

    // Verify render isolation: only Title field re-rendered
    expect(counters.titleField).toBe(initialTitleRenders + 1);
    expect(counters.estimateField).toBe(initialEstimateRenders);
    expect(counters.checklistArray).toBe(initialChecklistRenders);

    act(() => {
      renderer.unmount();
    });
    form.dispose();
  });

  it("verifies checklist FieldArray dynamic mutations in React component tree", () => {
    const form = createTaskBoardForm({ initialValues: VALID_TASK_DATA });
    const counters = createRenderCounters();

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<TaskBoardView form={form} counters={counters} />);
    });

    const checklistArray = form.getNode("checklist") as FieldArray<any>;
    expect(checklistArray.items.get().length).toBe(4);

    const initialChecklistRenders = counters.checklistArray;

    // Push an item
    act(() => {
      checklistArray.push({ id: "chk_new_1", title: "New Item", done: false });
    });

    expect(checklistArray.items.get().length).toBe(5);
    expect(counters.checklistArray).toBe(initialChecklistRenders + 1);

    // Remove first item
    act(() => {
      checklistArray.remove(0);
    });

    expect(checklistArray.items.get().length).toBe(4);
    expect(counters.checklistArray).toBe(initialChecklistRenders + 2);

    act(() => {
      renderer.unmount();
    });
    form.dispose();
  });

  it("verifies async title uniqueness validation with cancellation under rapid edits", async () => {
    let callCount = 0;
    const asyncCheck = async (title: string, signal: AbortSignal) => {
      callCount++;
      return new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
          else resolve(title !== "Duplicate Task Title");
        }, 30);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    };

    const form = createTaskBoardForm({ asyncTitleCheck: asyncCheck });
    const titleNode = form.getNode("title") as FieldState<string>;

    // Rapid edits
    titleNode.setValue("Task A");
    titleNode.setValue("Task AB");
    titleNode.setValue("Duplicate Task Title");

    await new Promise((r) => setTimeout(r, 100));

    expect(titleNode.issues.get().length).toBe(1);
    expect(titleNode.issues.get()[0]?.code).toBe("title_conflict");

    // Fix title
    titleNode.setValue("Unique Task Title Guaranteed");
    await new Promise((r) => setTimeout(r, 100));

    expect(titleNode.issues.get().length).toBe(0);
    expect(titleNode.valid.get()).toBe(true);

    form.dispose();
  });

  it("verifies parser-backed controlled estimate input in React", () => {
    const form = createTaskBoardForm();
    const estimateNode = form.getNode("estimateStoryPoints") as FieldState<number, string>;

    estimateNode.setRawValue("08");
    expect(estimateNode.rawValue.get()).toBe("08");
    expect(estimateNode.value.get()).toBe(8);
    expect(estimateNode.valid.get()).toBe(true);

    // Non-numeric raw input -> parseStatus: "invalid"
    estimateNode.setRawValue("not-a-number");
    expect(estimateNode.rawValue.get()).toBe("not-a-number");
    expect(estimateNode.parseStatus.get()).toBe("invalid");
    expect(estimateNode.valid.get()).toBe(false);

    // Negative number string -> parses to number, but rejected by non-negative rule
    estimateNode.setRawValue("-5");
    expect(estimateNode.rawValue.get()).toBe("-5");
    expect(estimateNode.value.get()).toBe(-5);
    expect(estimateNode.parseStatus.get()).toBe("parsed");
    expect(estimateNode.valid.get()).toBe(false);
    expect(estimateNode.issues.get().length).toBe(1);
    expect(estimateNode.issues.get()[0]?.code).toBe("invalid_estimate");

    form.dispose();
  });

  it("verifies submission lifecycle and server issues in React Task Board", async () => {
    const form = createTaskBoardForm({ initialValues: VALID_TASK_DATA });

    let submitCalled = false;
    const handleSubmit = async (output: any) => {
      submitCalled = true;
      return {
        ok: false,
        issues: [
          { code: "title_exists", message: "Task title is in use on server.", path: ["title"] },
          { code: "quota_exceeded", message: "Project storage quota exceeded.", path: ["projectQuota"] },
        ],
      };
    };

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<TaskBoardView form={form} onSubmitAction={handleSubmit} />);
    });

    await act(async () => {
      await form.submit(async (output) => {
        return handleSubmit(output);
      });
    });

    expect(submitCalled).toBe(true);
    expect(form.submissionStatus.get()).toBe("failed");

    const titleNode = form.getNode("title") as FieldState<string>;
    expect(titleNode.serverIssues.get().length).toBe(1);
    expect(titleNode.serverIssues.get()[0]?.message).toBe("Task title is in use on server.");

    // Form level issues
    expect(form.serverIssues.get().length).toBe(1);
    expect(form.serverIssues.get()[0]?.code).toBe("quota_exceeded");

    act(() => {
      renderer.unmount();
    });
    form.dispose();
  });
});
