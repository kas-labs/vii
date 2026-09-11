import { createElement, StrictMode, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import {
  createField,
  createForm,
  createNumberParser,
  type FieldState,
  type FormInstance,
} from "../../src/index.js";
import {
  Controller,
  FormProvider,
  useController,
  useField,
  useFormContext,
} from "../../src/adapters/react/index.js";

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

function trackField(field: FieldState<unknown, unknown>) {
  const signalKeys = [
    "value",
    "rawValue",
    "touched",
    "dirty",
    "pending",
    "valid",
    "invalid",
    "issues",
    "serverIssues",
    "parseStatus",
    "parseIssue",
    "validationStatus",
  ] as const;

  let activeCount = 0;
  for (const key of signalKeys) {
    const signal = field[key] as { subscribe(fn: () => void): () => void };
    const orig = signal.subscribe.bind(signal);
    signal.subscribe = (cb: () => void) => {
      activeCount++;
      const unsub = orig(cb);
      return () => {
        activeCount--;
        unsub();
      };
    };
  }

  return {
    getActiveCount: () => activeCount,
  };
}

describe("React P2e Integrations (@vii-labs/form/react)", () => {
  describe("FormProvider & useFormContext", () => {
    it("provides canonical FormInstance reference across component trees", () => {
      const form = createForm({
        fields: {
          username: createField({ initialValue: "alice" }),
        },
      });

      let observedForm!: FormInstance<typeof form.fields>;

      function Child() {
        observedForm = useFormContext<typeof form.fields>();
        return createElement("span", null, "child");
      }

      function App() {
        return createElement(FormProvider, { form }, createElement(Child, null));
      }

      const renderer = render(createElement(App));
      expect(observedForm).toBe(form);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("throws a descriptive error when useFormContext is called outside FormProvider", () => {
      function Orphan() {
        useFormContext();
        return null;
      }

      expect(() => render(createElement(Orphan))).toThrowError(
        "useFormContext must be used within a <FormProvider>",
      );
    });

    it("does not re-render context consumer components when unrelated fields mutate", () => {
      const form = createForm({
        fields: {
          first: createField({ initialValue: "a" }),
          second: createField({ initialValue: "b" }),
        },
      });

      let contextRenders = 0;
      function ContextConsumer() {
        contextRenders++;
        const ctx = useFormContext();
        return createElement("div", null, ctx ? "yes" : "no");
      }

      function FirstField() {
        const binding = useField(form.fields.first);
        return createElement("span", null, binding.value);
      }

      function App() {
        return createElement(
          FormProvider,
          { form },
          createElement(FirstField, null),
          createElement(ContextConsumer, null),
        );
      }

      render(createElement(App));
      expect(contextRenders).toBe(1);

      act(() => {
        form.fields.first.setValue("mutated");
      });

      expect(contextRenders).toBe(1);
      form.dispose();
    });
  });

  describe("useController & Controller", () => {
    it("binds input events and values correctly", () => {
      const field = createField<string>({ initialValue: "init" });

      let capturedController!: ReturnType<typeof useController<string>>;
      function InputComponent() {
        capturedController = useController(field, { name: "testField" });
        return createElement("input", {
          name: capturedController.field.name,
          value: capturedController.field.value,
          onChange: capturedController.field.onChange,
          onBlur: capturedController.field.onBlur,
        });
      }

      render(createElement(InputComponent));

      expect(capturedController.field.name).toBe("testField");
      expect(capturedController.field.value).toBe("init");
      expect(capturedController.fieldState.invalid).toBe(false);
      expect(capturedController.fieldState.isDirty).toBe(false);
      expect(capturedController.fieldState.isTouched).toBe(false);

      // Simulate event with target.value
      act(() => {
        capturedController.field.onChange({ target: { value: "updated" } });
      });

      expect(field.value.get()).toBe("updated");
      expect(capturedController.field.value).toBe("updated");
      expect(capturedController.fieldState.isDirty).toBe(true);

      // Simulate blur
      act(() => {
        capturedController.field.onBlur();
      });
      expect(capturedController.fieldState.isTouched).toBe(true);

      // Simulate direct value pass (custom component)
      act(() => {
        capturedController.field.onChange("direct");
      });
      expect(field.value.get()).toBe("direct");

      field.dispose();
    });

    it("handles checkbox controls via target.checked", () => {
      const field = createField<boolean>({ initialValue: false });

      let capturedController!: ReturnType<typeof useController<boolean>>;
      function CheckboxComponent() {
        capturedController = useController(field);
        return createElement("input", {
          type: "checkbox",
          checked: Boolean(capturedController.field.value),
          onChange: capturedController.field.onChange,
        });
      }

      render(createElement(CheckboxComponent));
      expect(capturedController.field.value).toBe(false);

      act(() => {
        capturedController.field.onChange({
          target: { type: "checkbox", checked: true },
        });
      });

      expect(field.value.get()).toBe(true);
      expect(capturedController.field.value).toBe(true);

      field.dispose();
    });

    it("retains raw presentation on parsed fields", () => {
      const field = createField<number, string>({
        initialValue: 5,
        initialRawValue: "05",
        parser: createNumberParser(),
      });

      let capturedController!: ReturnType<typeof useController<number, string>>;
      function ParsedInput() {
        capturedController = useController(field);
        return createElement("input", { value: capturedController.field.value });
      }

      render(createElement(ParsedInput));
      expect(capturedController.field.value).toBe("05");

      act(() => {
        capturedController.field.onChange({ target: { value: "09" } });
      });

      expect(field.value.get()).toBe(9);
      expect(capturedController.field.value).toBe("09");

      field.dispose();
    });

    it("composes with P2d focus registration via ref callback and cleans up", () => {
      const field = createField<string>({ initialValue: "focus-test" });

      let registeredElement: unknown = null;
      let cleanedUp = false;

      const mockBinding = {
        registerControl: (f: unknown, el: unknown) => {
          registeredElement = el;
          return () => {
            cleanedUp = true;
          };
        },
      };

      const dummyEl = { tagName: "INPUT" } as HTMLElement;

      function RefComponent() {
        const ctrl = useController(field, { formBinding: mockBinding });
        return createElement("div", {
          ref: () => {
            ctrl.field.ref(dummyEl);
          },
        });
      }

      const renderer = render(createElement(RefComponent));
      expect(registeredElement).toBe(dummyEl);
      expect(cleanedUp).toBe(false);

      act(() => {
        renderer.unmount();
      });
      expect(cleanedUp).toBe(true);

      field.dispose();
    });

    it("renders declaratively using <Controller>", () => {
      const field = createField<string>({ initialValue: "declarative" });

      let renderCount = 0;
      function App() {
        return createElement(Controller, {
          field,
          render: ({ field: f, fieldState }) => {
            renderCount++;
            return createElement("input", {
              value: f.value,
              "data-invalid": fieldState.invalid,
            });
          },
        });
      }

      const renderer = render(createElement(App));
      expect(renderCount).toBe(1);

      act(() => {
        field.setValue("new-val");
      });
      expect(renderCount).toBe(2);

      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });
  });

  describe("100-Field Granular Render Isolation", () => {
    it("mutating one field among 100 does not re-render the other 99 field components", () => {
      const fieldRecord: Record<string, FieldState<number>> = {};
      for (let i = 0; i < 100; i++) {
        fieldRecord[`field_${i}`] = createField<number>({ initialValue: i });
      }
      const form = createForm({ fields: fieldRecord });

      const renderCounts = new Array(100).fill(0);

      function FieldItem({ index, field }: { index: number; field: FieldState<number> }) {
        renderCounts[index]++;
        const ctrl = useController(field);
        return createElement("div", null, ctrl.field.value);
      }

      function FormApp() {
        return createElement(
          FormProvider,
          { form },
          createElement(
            "div",
            null,
            ...Array.from({ length: 100 }, (_, i) =>
              createElement(FieldItem, {
                key: i,
                index: i,
                field: form.fields[`field_${i}`]!,
              }),
            ),
          ),
        );
      }

      const renderer = render(createElement(FormApp));

      // Initial render: every field rendered exactly once
      for (let i = 0; i < 100; i++) {
        expect(renderCounts[i]).toBe(1);
      }

      // Mutate field_42 only
      act(() => {
        form.fields["field_42"]!.setValue(999);
      });

      // Assert: field_42 re-rendered, while ALL other 99 fields did NOT re-render!
      expect(renderCounts[42]).toBe(2);
      for (let i = 0; i < 100; i++) {
        if (i !== 42) {
          expect(renderCounts[i]).toBe(1);
        }
      }

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });
  });

  describe("React StrictMode Resilience", () => {
    it("handles double-mount and unmount cleanly under StrictMode without duplicate subscriptions", () => {
      const field = createField<string>({ initialValue: "strict" });
      const tracker = trackField(field);

      let renderCount = 0;
      function StrictField() {
        renderCount++;
        const ctrl = useController(field);
        return createElement("span", null, ctrl.field.value);
      }

      function App() {
        return createElement(StrictMode, null, createElement(StrictField, null));
      }

      const renderer = render(createElement(App));
      // In StrictMode development simulation, subscriptions attach cleanly
      expect(renderCount).toBeGreaterThanOrEqual(1);
      expect(tracker.getActiveCount()).toBe(12);

      act(() => {
        field.setValue("strict-updated");
      });
      expect(field.value.get()).toBe("strict-updated");

      act(() => {
        renderer.unmount();
      });

      // After unmount, subscriptions must return to 0
      expect(tracker.getActiveCount()).toBe(0);
      // Canonical node survives
      expect(field.value.get()).toBe("strict-updated");

      field.dispose();
    });
  });

  describe("1,000-Cycle Resource Stress Test", () => {
    it("survives 1,000 mount/unmount cycles returning subscriptions to baseline with zero leaks", () => {
      const field = createField<string>({ initialValue: "stress" });
      const tracker = trackField(field);

      function StressComponent() {
        const ctrl = useController(field);
        return createElement("input", { value: ctrl.field.value });
      }

      for (let i = 0; i < 1000; i++) {
        const renderer = render(createElement(StressComponent));
        expect(tracker.getActiveCount()).toBe(12);
        act(() => {
          renderer.unmount();
        });
        expect(tracker.getActiveCount()).toBe(0);
      }

      // Canonical field node remains fully functional
      expect(field.value.get()).toBe("stress");
      field.setValue("post-stress");
      expect(field.value.get()).toBe("post-stress");

      field.dispose();
    });
  });
});
