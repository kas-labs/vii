/**
 * Form Research F10 — Consumer B (React Task Board) Validation Tests
 *
 * Includes comprehensive coverage of:
 * - Leaf render isolation
 * - FieldArray dynamic mutations
 * - Async title validation with cancellation
 * - Parser-backed controlled inputs
 * - Submission lifecycle & server error routing
 * - 10 Mandatory React Historical Regression Scenarios (StrictMode, useSyncExternalStore timing, unmount while pending, reinitialize, etc.)
 */

import { describe, expect, it, vi } from "vitest";
import React, { StrictMode, useEffect, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  createTaskBoardForm,
  TaskBoardView,
  createRenderCounters,
  type RenderCounters,
} from "../consumers/consumer-b-react.js";
import { useField, useForm, useFieldArray } from "../../adapters/react.js";
import {
  VALID_TASK_DATA,
  INITIAL_TASK_DATA,
} from "../fixtures/domain-data.js";
import { createField, createForm, type FieldState, type FieldArray } from "../../form-core.js";

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

  // ---------------------------------------------------------------------------
  // 10 Mandatory React Historical Regression Scenarios
  // ---------------------------------------------------------------------------

  describe("10 Mandatory React Historical Regression Scenarios", () => {
    it("1. React StrictMode mount/cleanup handles double-mount without stale subscriptions", () => {
      const field = createField<string>({ initialValue: "initial_val" });

      function StrictFieldComp() {
        const snap = useField(field);
        return <div data-testid="strict-field">{snap.value}</div>;
      }

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(
          <StrictMode>
            <StrictFieldComp />
          </StrictMode>,
        );
      });

      expect(renderer.root.findByProps({ "data-testid": "strict-field" }).children[0]).toBe(
        "initial_val",
      );

      act(() => {
        field.setValue("strict_updated");
      });

      expect(renderer.root.findByProps({ "data-testid": "strict-field" }).children[0]).toBe(
        "strict_updated",
      );

      act(() => {
        renderer.unmount();
      });
    });

    it("2. Mutation before subscription installation does not lose snapshot freshness", () => {
      const field = createField<string>({ initialValue: "v1" });

      function TestComp() {
        // Mutate field during render phase before useSyncExternalStore subscription
        if (field.value.get() === "v1") {
          field.setValue("v2_during_render");
        }
        const snap = useField(field);
        return <div>{snap.value}</div>;
      }

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(<TestComp />);
      });

      expect(renderer.root.findByType("div").children[0]).toBe("v2_during_render");
      act(() => {
        renderer.unmount();
      });
    });

    it("3. Parent effect seeding form values after child initial render updates child safely", () => {
      const form = createForm({ initialValues: { name: "default" } });

      function Child() {
        const nameField = form.getNode("name") as FieldState<string>;
        const snap = useField(nameField);
        return <span data-testid="child-name">{snap.value}</span>;
      }

      function Parent() {
        useEffect(() => {
          const nameField = form.getNode("name") as FieldState<string>;
          nameField.setValue("seeded_by_parent");
        }, []);
        return <Child />;
      }

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(<Parent />);
      });

      expect(renderer.root.findByProps({ "data-testid": "child-name" }).children[0]).toBe(
        "seeded_by_parent",
      );
      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("4. Async data load completing during mount updates component tree cleanly", async () => {
      const form = createForm({ initialValues: { data: "loading..." } });

      function AsyncFormComp() {
        const dataField = form.getNode("data") as FieldState<string>;
        const snap = useField(dataField);
        useEffect(() => {
          Promise.resolve("loaded_payload").then((res) => {
            dataField.setValue(res);
          });
        }, []);
        return <div data-testid="async-data">{snap.value}</div>;
      }

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(<AsyncFormComp />);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(renderer.root.findByProps({ "data-testid": "async-data" }).children[0]).toBe(
        "loaded_payload",
      );
      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("5. Async validation in-flight during unmount aborts cleanly with 0 unhandled rejections", async () => {
      const unhandledRejections: any[] = [];
      const onUnhandled = (err: any) => {
        unhandledRejections.push(err);
      };
      process.on("unhandledRejection", onUnhandled);

      try {
        let aborted = false;
        const asyncCheck = vi.fn(async (_title: string, signal?: AbortSignal) => {
          return new Promise<boolean>((resolve, reject) => {
            if (signal) {
              signal.addEventListener("abort", () => {
                aborted = true;
                const err = new Error("Aborted");
                err.name = "AbortError";
                reject(err);
              });
            }
            setTimeout(() => resolve(true), 200);
          });
        });

        const form = createTaskBoardForm({ asyncTitleCheck: asyncCheck });
        const titleField = form.getNode("title") as FieldState<string>;

        function PendingComp() {
          const snap = useField(titleField);
          return <div>{snap.pending ? "validating" : "idle"}</div>;
        }

        let renderer!: ReactTestRenderer;
        act(() => {
          renderer = create(<PendingComp />);
        });

        // Trigger first async validation
        act(() => {
          titleField.setValue("Long Task Title Initial Check");
        });

        // Wait for debounce timer to fire and async rule to execute
        await new Promise((r) => setTimeout(r, 50));

        // Trigger second edit superseding the first
        act(() => {
          titleField.setValue("Long Task Title Superseding Check");
        });

        // Unmount while validation is in flight
        act(() => {
          renderer.unmount();
        });

        form.dispose();

        // Allow microtask queue / event loop to flush
        await new Promise((r) => setTimeout(r, 60));

        expect(aborted).toBe(true);
        expect(unhandledRejections).toHaveLength(0);
      } finally {
        process.removeListener("unhandledRejection", onUnhandled);
      }
    });

    it("6. Repeated mount and unmount cycles preserve reactivity without memory leaks", () => {
      const field = createField<string>({ initialValue: "cycle_init" });

      function CycleComp() {
        const snap = useField(field);
        return <div>{snap.value}</div>;
      }

      for (let i = 0; i < 5; i++) {
        let renderer!: ReactTestRenderer;
        act(() => {
          renderer = create(<CycleComp />);
        });
        expect(renderer.root.findByType("div").children[0]).toBe(field.value.get());

        act(() => {
          field.setValue(`cycle_val_${i}`);
        });

        expect(renderer.root.findByType("div").children[0]).toBe(`cycle_val_${i}`);

        act(() => {
          renderer.unmount();
        });
      }
    });

    it("7. form.reset() restores pristine values and updates React component tree", () => {
      const form = createForm({ initialValues: { task: "initial_task" } });
      const taskField = form.getNode("task") as FieldState<string>;

      function FormComp() {
        const snap = useForm(form);
        const fieldSnap = useField(taskField);
        return (
          <div>
            <span data-testid="dirty">{snap.dirty ? "dirty" : "pristine"}</span>
            <span data-testid="val">{fieldSnap.value}</span>
          </div>
        );
      }

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(<FormComp />);
      });

      act(() => {
        taskField.setValue("edited_task");
      });
      expect(renderer.root.findByProps({ "data-testid": "dirty" }).children[0]).toBe("dirty");
      expect(renderer.root.findByProps({ "data-testid": "val" }).children[0]).toBe("edited_task");

      act(() => {
        form.reset();
      });
      expect(renderer.root.findByProps({ "data-testid": "dirty" }).children[0]).toBe("pristine");
      expect(renderer.root.findByProps({ "data-testid": "val" }).children[0]).toBe("initial_task");

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("8. Reinitializing form with a new baseline updates values and marks pristine", () => {
      const form = createForm({ initialValues: { setting: "A" } });
      const settingField = form.getNode("setting") as FieldState<string>;

      function ReinitComp() {
        const snap = useForm(form);
        const fieldSnap = useField(settingField);
        return (
          <div>
            <span data-testid="is-dirty">{snap.dirty ? "true" : "false"}</span>
            <span data-testid="setting-val">{fieldSnap.value}</span>
          </div>
        );
      }

      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = create(<ReinitComp />);
      });

      act(() => {
        form.reset({ setting: "B" });
      });

      expect(renderer.root.findByProps({ "data-testid": "is-dirty" }).children[0]).toBe("false");
      expect(renderer.root.findByProps({ "data-testid": "setting-val" }).children[0]).toBe("B");

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("9. Submission cancellation via cancelSubmit halts submission state cleanly", async () => {
      const form = createForm({ initialValues: { title: "Test" } });

      let aborted = false;
      const submitPromise = form.submit(async (values, { signal }: any) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            resolve({ ok: false, issues: [] });
          });
        });
      });

      form.cancelSubmit();

      const result = await submitPromise;
      expect(aborted).toBe(true);
      expect(result.status).toBe("cancelled");
      expect(form.submissionStatus.get()).toBe("cancelled");
      form.dispose();
    });

    it("10. FieldArray reorder with server response routes issues by submitted item identity snapshot across array reorder", async () => {
      const form = createForm({
        initialValues: {
          items: [
            { id: "item_alpha", name: "Alpha" },
            { id: "item_beta", name: "Beta" },
          ],
        },
        keyExtractor: (item: any) => item.id,
      });

      const arrayNode = form.getNode("items") as FieldArray<any>;

      let resolveSubmitAction!: (val: any) => void;
      const submitPromise = form.submit(
        () =>
          new Promise((resolve) => {
            resolveSubmitAction = resolve;
          }),
      );

      expect(form.submissionStatus.get()).toBe("submitting");

      // While submission is in-flight on the server, user reorders array:
      // Swap items so Beta is at index 0 and Alpha is at index 1
      arrayNode.swap(0, 1);
      expect(arrayNode.items.get()[0]?.id).toBe("item_beta");
      expect(arrayNode.items.get()[1]?.id).toBe("item_alpha");

      // Server responds with an error targeting submitted index 0 (which was Alpha at submit time)
      resolveSubmitAction({
        ok: false,
        issues: [
          {
            path: ["items", 0, "name"],
            code: "alpha_rejected",
            message: "Alpha item rejected by server",
          },
        ],
      });

      const submitResult = await submitPromise;
      expect(submitResult.status).toBe("server-invalid");

      // Identity-aware routing verification:
      // The error for submitted index 0 MUST attach to Alpha (now at live index 1)
      const currentItems = arrayNode.items.get();
      const liveBetaNode = currentItems[0]!.node as any;
      const liveAlphaNode = currentItems[1]!.node as any;

      expect(liveBetaNode.fields["name"].serverIssues.get()).toEqual([]);
      expect(liveAlphaNode.fields["name"].serverIssues.get()).toHaveLength(1);
      expect(liveAlphaNode.fields["name"].serverIssues.get()[0]?.message).toBe(
        "Alpha item rejected by server",
      );

      form.dispose();
    });
  });
});
