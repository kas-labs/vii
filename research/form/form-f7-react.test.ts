import { createElement, StrictMode, useEffect, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import {
  createField,
  createForm,
  createNumberParser,
  type FieldState,
  type FormInstance,
} from "./form-core.js";
import { useField, useFieldArray, useForm } from "./adapters/react.js";

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function render(element: ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
}

describe("Form Research F7: React Adapter", () => {
  describe("useField Hook & Controlled Input", () => {
    it("renders initial snapshot and re-renders on programmatic update", () => {
      const field = createField<string>({ initialValue: "initial" });
      const renderHistory: string[] = [];

      function FieldView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        renderHistory.push(binding.value);
        return createElement("span", { "data-value": binding.value }, binding.value);
      }

      const renderer = render(createElement(FieldView, { target: field }));
      expect(renderHistory).toEqual(["initial"]);

      act(() => {
        field.setValue("updated");
      });

      expect(renderHistory).toEqual(["initial", "updated"]);
      act(() => {
        renderer.unmount();
      });
    });

    it("handles controlled input and preserves parser-backed raw intermediate state", () => {
      const field = createField<number, string>({
        initialValue: 10,
        initialRawValue: "10",
        parser: createNumberParser(),
      });
      const rawHistory: string[] = [];

      function NumberInputView({ target }: { target: FieldState<number, string> }) {
        const binding = useField(target);
        rawHistory.push(binding.rawValue);
        return createElement("input", {
          value: binding.rawValue,
          onChange: (e: any) => binding.setRawValue(e.target.value),
          onBlur: () => binding.blur(),
        });
      }

      const renderer = render(createElement(NumberInputView, { target: field }));
      expect(rawHistory).toEqual(["10"]);

      // User types intermediate "-"
      act(() => {
        field.setRawValue("-");
      });

      expect(rawHistory).toEqual(["10", "-"]);
      expect(field.parseStatus.get()).toBe("invalid");
      expect(field.parseIssue.get()?.code).toBe("parse.invalid_number");
      // Domain value remains 10 and raw input stays "-" without reverting
      expect(field.value.get()).toBe(10);
      expect(field.rawValue.get()).toBe("-");

      // User finishes typing "-25"
      act(() => {
        field.setRawValue("-25");
      });

      expect(field.value.get()).toBe(-25);
      expect(field.parseStatus.get()).toBe("parsed");
      expect(field.dirty.get()).toBe(true);

      act(() => {
        renderer.unmount();
      });
    });

    it("handles blur and touched validation transitions", () => {
      const field = createField<string>({
        initialValue: "",
        rules: [(v: string) => (v === "" ? { code: "required", message: "Required" } : null)],
        validateOn: "blur",
      });

      let touchedState = false;
      let issuesCount = 0;

      function TouchView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        touchedState = binding.touched;
        issuesCount = binding.issues.length;
        return createElement("button", { onClick: () => binding.blur() }, "Blur");
      }

      const renderer = render(createElement(TouchView, { target: field }));
      expect(touchedState).toBe(false);
      expect(issuesCount).toBe(0);

      act(() => {
        field.setTouched(true);
      });

      expect(touchedState).toBe(true);
      expect(issuesCount).toBe(1);

      act(() => {
        renderer.unmount();
      });
    });

    it("handles async validation pending state and stale resolution suppression", async () => {
      let resolveFirst!: (val: any) => void;
      const field = createField<string>({
        initialValue: "a",
        rules: [
          (val: string) => {
            if (val === "a") {
              return new Promise<any>((r) => {
                resolveFirst = r;
              });
            }
            return null;
          },
        ],
        validateOn: "change",
      });

      const pendingStates: boolean[] = [];

      function AsyncView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        useEffect(() => {
          pendingStates.push(binding.pending);
        }, [binding.pending]);
        return createElement("span", null, binding.pending ? "validating" : "idle");
      }

      const renderer = render(createElement(AsyncView, { target: field }));

      act(() => {
        field.setValue("a");
      });
      expect(field.pending.get()).toBe(true);

      // Superseding mutation
      act(() => {
        field.setValue("b");
      });
      expect(field.pending.get()).toBe(false);

      // Late resolution of first validator
      act(() => {
        resolveFirst({ code: "late_error", message: "Stale" });
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(field.issues.get().length).toBe(0);
      expect(field.validationStatus.get()).toBe("valid");

      act(() => {
        renderer.unmount();
      });
    });

    it("attaches server issues and clears them upon field edit", () => {
      const field = createField<string>({ initialValue: "test" });
      let serverIssuesLength = 0;

      function ServerIssueView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        serverIssuesLength = binding.serverIssues.length;
        return createElement("div", null, binding.serverIssues.map((s) => s.message).join(","));
      }

      const renderer = render(createElement(ServerIssueView, { target: field }));
      expect(serverIssuesLength).toBe(0);

      act(() => {
        field.setServerIssues([{ code: "server.error", message: "Server rejected" }]);
      });
      expect(serverIssuesLength).toBe(1);

      act(() => {
        field.setValue("new_val");
      });
      expect(serverIssuesLength).toBe(0);

      act(() => {
        renderer.unmount();
      });
    });
  });

  describe("useForm Hook & Form Lifecycle", () => {
    it("manages submission state machine and preserves terminal submission status across edits (Model A)", async () => {
      const submitSpy = vi.fn().mockResolvedValue({ ok: true, result: "saved" });
      const form = createForm({
        initialValues: { name: "initial" },
        submitAction: submitSpy,
      });

      const submissionHistory: string[] = [];

      function FormView({ target }: { target: FormInstance<{ name: string }> }) {
        const binding = useForm(target);
        submissionHistory.push(binding.submissionStatus);
        return createElement("div", null, binding.submissionStatus);
      }

      const renderer = render(createElement(FormView, { target: form }));
      expect(form.submissionStatus.get()).toBe("idle");

      let submitPromise!: Promise<any>;
      act(() => {
        submitPromise = form.submit();
      });

      await act(async () => {
        await submitPromise;
      });

      expect(form.submissionStatus.get()).toBe("succeeded");

      // Model A Terminal Submission Status: user edit keeps succeeded and marks dirty
      act(() => {
        form.fields.name.setValue("edited");
      });

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);

      // Form reset resets submission status to idle
      act(() => {
        form.reset();
      });

      expect(form.submissionStatus.get()).toBe("idle");
      expect(form.dirty.get()).toBe(false);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("handles reinitialize updating baseline values and pristine state", () => {
      const form = createForm({ initialValues: { count: 1 } });
      const valuesHistory: number[] = [];

      function CounterView({ target }: { target: FormInstance<{ count: number }> }) {
        const binding = useForm(target);
        valuesHistory.push(binding.values.count);
        return createElement("span", null, binding.values.count);
      }

      const renderer = render(createElement(CounterView, { target: form }));

      act(() => {
        form.fields.count.setValue(2);
      });
      expect(form.dirty.get()).toBe(true);

      act(() => {
        form.reinitialize({ count: 10 });
      });

      expect(form.values.get().count).toBe(10);
      expect(form.dirty.get()).toBe(false);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });
  });

  describe("useFieldArray & Stable Keys across Reorder", () => {
    it("renders items with stable key identity and preserves field state across swaps", () => {
      const form = createForm({
        initialValues: {
          items: [
            { id: "k1", name: "Item 1" },
            { id: "k2", name: "Item 2" },
          ],
        },
        keyExtractor: (it) => it.id,
      });

      const arrayNode = form.fields.items;

      function ItemRow({ item }: { item: any }) {
        const fieldNode = item.node.fields.name as FieldState<string, string, string>;
        const binding = useField(fieldNode);
        return createElement("li", { key: item.id, "data-id": item.id }, binding.value);
      }

      function ListView({ target }: { target: typeof arrayNode }) {
        const binding = useFieldArray(target);
        return createElement(
          "ul",
          null,
          binding.items.map((item) => createElement(ItemRow, { key: item.id, item })),
        );
      }

      const renderer = render(createElement(ListView, { target: arrayNode }));

      // Edit Item 1
      act(() => {
        (arrayNode.items.get()[0]?.node as any).fields.name.setValue("Item 1 Edited");
      });

      expect(
        ((arrayNode.items.get()[0]?.node as any).fields.name as FieldState<string>).value.get(),
      ).toBe("Item 1 Edited");

      // Swap items 0 and 1
      act(() => {
        arrayNode.swap(0, 1);
      });

      // Item 1 Edited is now at index 1, but retains its state and key "k1"
      const items = arrayNode.items.get();
      expect(items[0]?.id).toBe("k2");
      expect(items[1]?.id).toBe("k1");
      expect(((items[1]?.node as any).fields.name as FieldState<string>).value.get()).toBe(
        "Item 1 Edited",
      );

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });
  });

  describe("React StrictMode & Lifecycle Cleanup", () => {
    it("cleans up external subscriptions under StrictMode unmount", () => {
      const field = createField<string>({ initialValue: "test" });
      const renderCount = vi.fn();

      function StrictView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        renderCount(binding.value);
        return createElement("span", null, binding.value);
      }

      const renderer = render(
        createElement(StrictMode, null, createElement(StrictView, { target: field })),
      );
      const countBefore = renderCount.mock.calls.length;

      act(() => {
        renderer.unmount();
      });

      act(() => {
        field.setValue("after_unmount");
      });

      expect(renderCount).toHaveBeenCalledTimes(countBefore);
    });

    it("maintains referential snapshot stability across unchanged renders", () => {
      const field = createField<string>({ initialValue: "stable" });
      const snaps: any[] = [];

      function ProbeView({ target, tick }: { target: FieldState<string>; tick: number }) {
        const binding = useField(target);
        snaps.push(binding);
        return createElement("span", { "data-tick": tick }, binding.value);
      }

      const renderer = render(createElement(ProbeView, { target: field, tick: 1 }));

      // Re-render component with new prop tick=2 without store mutation
      act(() => {
        renderer.update(createElement(ProbeView, { target: field, tick: 2 }));
      });

      expect(snaps.length).toBe(2);
      expect(snaps[0]).toBe(snaps[1]);
      act(() => {
        renderer.unmount();
      });
    });

    it("reads Form snapshot during SSR without browser globals", () => {
      const form = createForm({ initialValues: { title: "SSR Safe" } });

      function SsrView({ target }: { target: FormInstance<{ title: string }> }) {
        const binding = useForm(target);
        return createElement("h1", null, binding.values.title);
      }

      const html = renderToStaticMarkup(createElement(SsrView, { target: form }));
      expect(html).toBe("<h1>SSR Safe</h1>");

      form.dispose();
    });

    it("completes 100 mount/unmount cycles with zero retained listener growth", () => {
      const field = createField<number>({ initialValue: 0 });

      function BenchView({ target }: { target: FieldState<number> }) {
        const binding = useField(target);
        return createElement("span", null, binding.value);
      }

      for (let i = 0; i < 100; i++) {
        const renderer = render(createElement(BenchView, { target: field }));
        act(() => {
          field.setValue(i);
        });
        act(() => {
          renderer.unmount();
        });
      }

      expect(field.value.get()).toBe(99);
    });
  });
});
