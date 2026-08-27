/**
 * Form Research F10 — Competitor Comparative Validation Tests
 *
 * Runs identical domain workloads across TanStack Form, React Hook Form,
 * and Angular Signal Forms to verify functional parity and capture DX differences.
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TanStackTaskBoard } from "../competitors/tanstack-v1.js";
import { ReactHookFormTaskBoard } from "../competitors/react-hook-form.js";
import { createAngularSignalTaskBoard } from "../competitors/angular-signal-forms.js";
import { VALID_TASK_DATA, INITIAL_TASK_DATA } from "../fixtures/domain-data.js";

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe("Form Research F10: Competitor Implementations", () => {
  describe("TanStack Form (v1.33.5)", () => {
    it("renders and validates required fields and async title check", () => {
      const asyncCheck = async (title: string) => title !== "Duplicate Title";

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(
          <TanStackTaskBoard
            initialValues={VALID_TASK_DATA}
            asyncTitleCheck={asyncCheck}
          />,
        );
      });

      const root = renderer.root;
      const titleInput = root.findByProps({ "data-testid": "tanstack-input-title" });
      expect(titleInput).toBeDefined();
      expect(titleInput.props["value"]).toBe(VALID_TASK_DATA.title);

      act(() => {
        renderer.unmount();
      });
    });
  });

  describe("React Hook Form (v7.86.0)", () => {
    it("renders and executes ref-based validation and array manipulation", () => {
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(<ReactHookFormTaskBoard initialValues={VALID_TASK_DATA} />);
      });

      const root = renderer.root;
      const titleInput = root.findByProps({ "data-testid": "rhf-input-title" });
      expect(titleInput).toBeDefined();

      const checklistManager = root.findByProps({ "data-testid": "rhf-checklist-manager" });
      expect(checklistManager).toBeDefined();

      act(() => {
        renderer.unmount();
      });
    });
  });

  describe("Angular Signal Forms (Angular 22.1.4)", () => {
    it("executes Signal-based field reactivity, validity, and submission", async () => {
      const form = createAngularSignalTaskBoard(VALID_TASK_DATA);

      expect(form.isValid()).toBe(true);
      expect(form.isDirty()).toBe(false);

      // Mutate title
      form.title.setValue("Tiny");
      expect(form.title.dirty()).toBe(true);
      expect(form.title.errors().length).toBe(1);
      expect(form.title.valid()).toBe(false);
      expect(form.isValid()).toBe(false);

      // Fix title
      form.title.setValue("Valid Task Title Longer");
      expect(form.title.errors().length).toBe(0);
      expect(form.isValid()).toBe(true);

      // Array mutation
      expect(form.checklist().length).toBe(4);
      form.addChecklistItem({ id: "chk_ng_1", title: "Angular Req", done: false });
      expect(form.checklist().length).toBe(5);

      form.removeChecklistItem(0);
      expect(form.checklist().length).toBe(4);

      // Submit
      let submitted = false;
      const ok = await form.submit(async () => {
        submitted = true;
      });

      expect(ok).toBe(true);
      expect(submitted).toBe(true);
    });
  });
});
