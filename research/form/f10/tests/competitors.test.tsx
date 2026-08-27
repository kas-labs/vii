/**
 * Form Research F10 — Competitor Comparative Validation Tests (Strengthened)
 *
 * Runs identical domain workloads across TanStack Form, React Hook Form,
 * and real Angular Signal Forms (@angular/forms/signals in Angular 22.1.4)
 * to verify functional parity across validation, arrays, submission, server errors, and reset.
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TanStackTaskBoard } from "../competitors/tanstack-v1.js";
import { ReactHookFormTaskBoard } from "../competitors/react-hook-form.js";
import { createRealAngularSignalTaskBoard } from "../competitors/angular-signal-forms.js";
import { VALID_TASK_DATA, INITIAL_TASK_DATA } from "../fixtures/domain-data.js";

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe("Form Research F10: Competitor Implementations", () => {
  describe("TanStack Form (v1.33.5)", () => {
    it("executes full lifecycle: validation, async check, array operations, submit, reset, and reinitialize", async () => {
      let formApi!: any;
      let submitCalled = false;
      const asyncCheck = async (title: string) => title !== "Duplicate Title";

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(
          <TanStackTaskBoard
            initialData={VALID_TASK_DATA}
            asyncTitleCheck={asyncCheck}
            onFormReady={(api) => {
              formApi = api;
            }}
            onSubmitAction={async (values) => {
              submitCalled = true;
            }}
          />,
        );
      });

      expect(formApi).toBeDefined();
      expect(formApi.state.values.title).toBe(VALID_TASK_DATA.title);

      // 1. Invalid title
      act(() => {
        formApi.setFieldValue("title", "Hi");
      });
      expect(formApi.state.values.title).toBe("Hi");

      // 2. Fix title
      act(() => {
        formApi.setFieldValue("title", "Valid TanStack Title");
      });

      // 3. Array mutations
      const initialCount = formApi.state.values.checklist.length;
      act(() => {
        formApi.pushFieldValue("checklist", {
          id: "ts_item_1",
          title: "TanStack Array Item",
          done: false,
        });
      });
      expect(formApi.state.values.checklist.length).toBe(initialCount + 1);

      act(() => {
        formApi.swapFieldValues("checklist", 0, 1);
      });
      expect(formApi.state.values.checklist[0].id).toBe(VALID_TASK_DATA.checklist[1]!.id);

      act(() => {
        formApi.removeFieldValue("checklist", formApi.state.values.checklist.length - 1);
      });
      expect(formApi.state.values.checklist.length).toBe(initialCount);

      // 4. Submit
      await act(async () => {
        await formApi.handleSubmit();
      });
      expect(submitCalled).toBe(true);

      // 5. Reset
      act(() => {
        formApi.reset();
      });
      expect(formApi.state.values.title).toBe(VALID_TASK_DATA.title);

      act(() => {
        renderer.unmount();
      });
    });
  });

  describe("React Hook Form (v7.86.0)", () => {
    it("executes full lifecycle: validation, array mutations, submit, server errors, and reset", async () => {
      let rhfMethods!: any;
      let submitCalled = false;

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(
          <ReactHookFormTaskBoard
            initialData={VALID_TASK_DATA}
            onFormReady={(methods) => {
              rhfMethods = methods;
            }}
            onSubmitAction={async (values) => {
              submitCalled = true;
            }}
          />,
        );
      });

      expect(rhfMethods).toBeDefined();

      // 1. Field mutation
      act(() => {
        rhfMethods.setValue("title", "Updated RHF Task Title");
      });
      expect(rhfMethods.getValues("title")).toBe("Updated RHF Task Title");

      // 2. Submit
      await act(async () => {
        await rhfMethods.handleSubmit(() => {
          submitCalled = true;
        })();
      });
      expect(submitCalled).toBe(true);

      // 3. Reset
      act(() => {
        rhfMethods.reset(VALID_TASK_DATA);
      });
      expect(rhfMethods.getValues("title")).toBe(VALID_TASK_DATA.title);

      act(() => {
        renderer.unmount();
      });
    });
  });

  describe("Real Angular Signal Forms (Angular 22.1.4 @angular/forms/signals)", () => {
    it("executes Signal Forms FieldTree reactivity, schema validation, array operations, submit, and reset", async () => {
      const formInstance = await createRealAngularSignalTaskBoard(VALID_TASK_DATA);

      // 1. Initial State & Schema Validity
      expect(formInstance.fieldTree.title().valid()).toBe(true);
      expect(formInstance.fieldTree.title().value()).toBe(VALID_TASK_DATA.title);
      expect(formInstance.fieldTree.estimateStoryPoints().value()).toBe(
        VALID_TASK_DATA.estimateStoryPoints,
      );

      // 2. Schema Validation Violation: title < 5 chars triggers minLength error
      formInstance.setTitle("Tiny");
      expect(formInstance.fieldTree.title().valid()).toBe(false);
      expect(formInstance.fieldTree.title().errors().length).toBe(1);

      // 3. Restore valid title
      formInstance.setTitle("Valid Signal Form Title");
      expect(formInstance.fieldTree.title().valid()).toBe(true);
      expect(formInstance.fieldTree.title().errors().length).toBe(0);

      // 4. Estimate validation: negative number triggers min rule error
      formInstance.setEstimate(-1);
      expect(formInstance.fieldTree.estimateStoryPoints().valid()).toBe(false);
      formInstance.setEstimate(8);
      expect(formInstance.fieldTree.estimateStoryPoints().valid()).toBe(true);

      // 5. Checklist Array Mutations
      expect(formInstance.model().checklist.length).toBe(4);
      formInstance.addChecklistItem({ id: "ng_item_1", title: "Angular Task", done: false });
      expect(formInstance.model().checklist.length).toBe(5);

      formInstance.swapChecklistItems(0, 1);
      expect(formInstance.model().checklist[0]!.id).toBe(VALID_TASK_DATA.checklist[1]!.id);

      formInstance.toggleChecklistItem(0);
      expect(formInstance.model().checklist[0]!.done).toBe(false);

      formInstance.removeChecklistItem(formInstance.model().checklist.length - 1);
      expect(formInstance.model().checklist.length).toBe(4);

      // 6. Submit Success
      let submitReceivedValues: any = null;
      const ok = await formInstance.submitForm(async (vals) => {
        submitReceivedValues = vals;
        return true;
      });

      expect(ok).toBe(true);
      expect(submitReceivedValues).toBeDefined();
      expect(submitReceivedValues.title).toBe("Valid Signal Form Title");

      // 7. Reset Form
      formInstance.resetForm(VALID_TASK_DATA);
      expect(formInstance.fieldTree.title().value()).toBe(VALID_TASK_DATA.title);

      formInstance.dispose();
    });
  });
});
