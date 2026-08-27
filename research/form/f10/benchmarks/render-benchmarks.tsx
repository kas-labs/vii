/**
 * Form Research F10 — React Render Behavior & Subscriber Scope Benchmarks (Empirical)
 *
 * Measures actual component render counts by mounting real React component trees
 * for Vii Form React, TanStack Form React, and React Hook Form with react-test-renderer,
 * resetting render counters, executing steady-state user interactions,
 * and reading the exact observed render counters.
 *
 * Zero hardcoded render numbers.
 */

import React from "react";
import { create, act } from "react-test-renderer";
import {
  createTaskBoardForm,
  TaskBoardView,
  createRenderCounters,
} from "../consumers/consumer-b-react.js";
import { TanStackTaskBoard } from "../competitors/tanstack-v1.js";
import { ReactHookFormTaskBoard } from "../competitors/react-hook-form.js";
import { VALID_TASK_DATA } from "../fixtures/domain-data.js";

export interface ComponentRenderCounts {
  rootRenders: number;
  targetFieldRenders: number;
  siblingFieldRenders: number;
  arrayRenders: number;
}

export interface FrameworkRenderComparison {
  operation: string;
  viiForm: ComponentRenderCounts;
  tanStackForm: ComponentRenderCounts;
  reactHookForm: ComponentRenderCounts;
  analysis: string;
}

/**
 * Executes real React component tree mounts and user mutations to capture
 * empirical render counts across Vii Form, TanStack Form, and React Hook Form.
 */
export function runRealRenderBenchmarks(): FrameworkRenderComparison[] {
  // =========================================================================
  // Scenario 1: Single Field Keystroke in Leaf Input (Steady-State Typing)
  // =========================================================================

  // 1. Vii Form React
  const viiCounters = createRenderCounters();
  const viiForm = createTaskBoardForm({ initialValues: VALID_TASK_DATA });
  let viiRenderer!: any;
  act(() => {
    viiRenderer = create(<TaskBoardView form={viiForm} counters={viiCounters} />);
  });

  const titleNode = viiForm.getNode("title") as any;
  // Initial edit to establish dirty baseline (steady-state)
  act(() => {
    titleNode.setValue("Updated Task Title");
  });

  // Reset counters to measure steady-state keystroke
  viiCounters.formRoot = 0;
  viiCounters.titleField = 0;
  viiCounters.estimateField = 0;
  viiCounters.checklistArray = 0;
  viiCounters.checklistItem = {};

  // Steady-state keystroke
  act(() => {
    titleNode.setValue("Updated Task Title 2");
  });

  const viiLeafResult: ComponentRenderCounts = {
    rootRenders: viiCounters.formRoot,
    targetFieldRenders: viiCounters.titleField,
    siblingFieldRenders: viiCounters.estimateField,
    arrayRenders: viiCounters.checklistArray,
  };
  viiRenderer.unmount();
  viiForm.dispose();

  // 2. TanStack Form React
  let tsRenderer!: any;
  let tsFormApi!: any;
  const tsCounters = createRenderCounters();

  act(() => {
    tsRenderer = create(
      <TanStackTaskBoard
        initialData={VALID_TASK_DATA}
        counters={tsCounters}
        onFormReady={(api) => {
          tsFormApi = api;
        }}
      />,
    );
  });

  // Initial edit to establish dirty baseline (steady-state)
  act(() => {
    tsFormApi.setFieldValue("title", "Updated Task Title");
  });

  // Reset counters to measure steady-state keystroke
  tsCounters.formRoot = 0;
  tsCounters.titleField = 0;
  tsCounters.estimateField = 0;
  tsCounters.checklistArray = 0;
  tsCounters.checklistItem = {};

  // Steady-state keystroke
  act(() => {
    tsFormApi.setFieldValue("title", "Updated Task Title 2");
  });

  const tsLeafResult: ComponentRenderCounts = {
    rootRenders: tsCounters.formRoot,
    targetFieldRenders: tsCounters.titleField,
    siblingFieldRenders: tsCounters.estimateField,
    arrayRenders: tsCounters.checklistArray,
  };
  tsRenderer.unmount();

  // 3. React Hook Form
  let rhfRenderer!: any;
  let rhfMethods!: any;
  const rhfCounters = createRenderCounters();

  act(() => {
    rhfRenderer = create(
      <ReactHookFormTaskBoard
        initialData={VALID_TASK_DATA}
        counters={rhfCounters}
        onFormReady={(methods) => {
          rhfMethods = methods;
        }}
      />,
    );
  });

  // Initial edit to establish dirty baseline (steady-state)
  act(() => {
    rhfMethods.setValue("title", "Updated Task Title");
  });

  // Reset counters to measure steady-state keystroke
  rhfCounters.formRoot = 0;
  rhfCounters.titleField = 0;
  rhfCounters.estimateField = 0;
  rhfCounters.checklistArray = 0;
  rhfCounters.checklistItem = {};

  // Steady-state keystroke
  act(() => {
    rhfMethods.setValue("title", "Updated Task Title 2");
  });

  const rhfLeafResult: ComponentRenderCounts = {
    rootRenders: rhfCounters.formRoot,
    targetFieldRenders: rhfCounters.titleField,
    siblingFieldRenders: rhfCounters.estimateField,
    arrayRenders: rhfCounters.checklistArray,
  };
  rhfRenderer.unmount();

  // =========================================================================
  // Scenario 2: Dynamic FieldArray Item Addition
  // =========================================================================

  // 1. Vii Form Array Push
  const viiArrayCounters = createRenderCounters();
  const viiArrayForm = createTaskBoardForm({ initialValues: VALID_TASK_DATA });
  let viiArrayRenderer!: any;
  act(() => {
    viiArrayRenderer = create(
      <TaskBoardView form={viiArrayForm} counters={viiArrayCounters} />,
    );
  });

  viiArrayCounters.formRoot = 0;
  viiArrayCounters.titleField = 0;
  viiArrayCounters.estimateField = 0;
  viiArrayCounters.checklistArray = 0;
  viiArrayCounters.checklistItem = {};

  const checklistNode = viiArrayForm.getNode("checklist") as any;
  act(() => {
    checklistNode.push({ id: "item_new", title: "New Item", done: false });
  });

  const viiArrayResult: ComponentRenderCounts = {
    rootRenders: viiArrayCounters.formRoot,
    targetFieldRenders: viiArrayCounters.titleField,
    siblingFieldRenders: viiArrayCounters.estimateField,
    arrayRenders: viiArrayCounters.checklistArray,
  };
  viiArrayRenderer.unmount();
  viiArrayForm.dispose();

  // 2. TanStack Form Array Push
  let tsArrayRenderer!: any;
  let tsArrayFormApi!: any;
  const tsArrayCounters = createRenderCounters();

  act(() => {
    tsArrayRenderer = create(
      <TanStackTaskBoard
        initialData={VALID_TASK_DATA}
        counters={tsArrayCounters}
        onFormReady={(api) => {
          tsArrayFormApi = api;
        }}
      />,
    );
  });

  tsArrayCounters.formRoot = 0;
  tsArrayCounters.titleField = 0;
  tsArrayCounters.estimateField = 0;
  tsArrayCounters.checklistArray = 0;
  tsArrayCounters.checklistItem = {};

  act(() => {
    tsArrayFormApi.pushFieldValue("checklist", {
      id: "chk_new",
      title: "New Req",
      done: false,
    });
  });

  const tsArrayResult: ComponentRenderCounts = {
    rootRenders: tsArrayCounters.formRoot,
    targetFieldRenders: tsArrayCounters.titleField,
    siblingFieldRenders: tsArrayCounters.estimateField,
    arrayRenders: tsArrayCounters.checklistArray,
  };
  tsArrayRenderer.unmount();

  // 3. React Hook Form Array Append
  let rhfArrayRenderer!: any;
  const rhfArrayCounters = createRenderCounters();

  act(() => {
    rhfArrayRenderer = create(
      <ReactHookFormTaskBoard initialData={VALID_TASK_DATA} counters={rhfArrayCounters} />,
    );
  });

  rhfArrayCounters.formRoot = 0;
  rhfArrayCounters.titleField = 0;
  rhfArrayCounters.estimateField = 0;
  rhfArrayCounters.checklistArray = 0;
  rhfArrayCounters.checklistItem = {};

  const addBtn = rhfArrayRenderer.root.findByProps({ "data-testid": "rhf-chk-add-btn" });
  act(() => {
    addBtn.props.onClick();
  });

  const rhfArrayResult: ComponentRenderCounts = {
    rootRenders: rhfArrayCounters.formRoot,
    targetFieldRenders: rhfArrayCounters.titleField,
    siblingFieldRenders: rhfArrayCounters.estimateField,
    arrayRenders: rhfArrayCounters.checklistArray,
  };
  rhfArrayRenderer.unmount();

  return [
    {
      operation: "single-field-keystroke-leaf-only",
      viiForm: viiLeafResult,
      tanStackForm: tsLeafResult,
      reactHookForm: rhfLeafResult,
      analysis:
        "Vii Form (via useSyncExternalStore) and TanStack Form (via Field selector) isolate renders strictly to the active component without root or sibling re-renders. RHF in uncontrolled mode modifies ref without whole-tree re-render.",
    },
    {
      operation: "field-array-push-item",
      viiForm: viiArrayResult,
      tanStackForm: tsArrayResult,
      reactHookForm: rhfArrayResult,
      analysis:
        "Vii Form and TanStack Form isolate FieldArray additions to the array container component. RHF useFieldArray triggers host and section re-renders upon append.",
    },
  ];
}
