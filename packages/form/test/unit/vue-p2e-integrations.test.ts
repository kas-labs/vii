import { effect, effectScope, type DirectiveBinding, type VNode } from "vue";
import { describe, expect, it } from "vitest";
import { createField, createForm, type FieldState } from "../../src/index.js";
import {
  useFormContext,
  useViiField,
  vViiField,
  type SupportedVueFieldState,
} from "../../src/adapters/vue/index.js";

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
    const signal = field[key] as { subscribe(fn: (v: unknown) => void): () => void };
    const orig = signal.subscribe.bind(signal);
    signal.subscribe = (cb: (v: unknown) => void) => {
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

describe("Vue P2e Integrations (@vii-labs/form/vue)", () => {
  describe("provideForm & useFormContext", () => {
    it("throws a descriptive error when useFormContext is called without provideForm", () => {
      expect(() => useFormContext()).toThrowError(
        "useFormContext must be used within a component tree with provideForm",
      );
    });
  });

  describe("useViiField Composable", () => {
    it("exposes writable model computed for direct v-model binding", () => {
      const field = createField<string>({ initialValue: "hello" });
      const handle = useViiField(field);

      expect(handle.model.value).toBe("hello");

      // Simulating v-model write
      handle.model.value = "world";
      expect(field.value.get()).toBe("world");
      expect(handle.value.value).toBe("world");
      expect(handle.dirty.value).toBe(true);

      handle.dispose();
      field.dispose();
    });

    it("exposes bind() helper with event handlers for v-bind", () => {
      const field = createField<string>({ initialValue: "test" });
      const handle = useViiField(field);

      const bindings = handle.bind();
      expect(bindings.value).toBe("test");

      // Simulate input event
      bindings.onInput({
        target: { value: "changed" },
      } as unknown as Event);

      expect(field.value.get()).toBe("changed");

      // Simulate blur
      expect(handle.touched.value).toBe(false);
      bindings.onBlur();
      expect(handle.touched.value).toBe(true);

      handle.dispose();
      field.dispose();
    });

    it("handles checkbox controls in bind().onInput", () => {
      const field = createField<boolean>({ initialValue: false });
      const handle = useViiField(field);

      const bindings = handle.bind();
      bindings.onInput({
        target: { type: "checkbox", checked: true },
      } as unknown as Event);

      expect(field.value.get()).toBe(true);

      handle.dispose();
      field.dispose();
    });
  });

  describe("vViiField Directive", () => {
    it("binds DOM input elements and syncs bidirectionally", () => {
      const field = createField<string>({ initialValue: "initial" });

      const listeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyInput = {
        tagName: "INPUT",
        type: "text",
        value: "",
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (listeners[event] = listeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLInputElement;

      const createBinding = <T extends SupportedVueFieldState>(
        value: T,
        oldValue: T | null = null,
      ): DirectiveBinding<T> => ({
        value,
        oldValue,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });
      const dummyVNode = null as unknown as VNode<unknown, HTMLInputElement>;

      // Mount directive
      vViiField.mounted!(dummyInput, createBinding(field), dummyVNode, null);

      // DOM value initialized
      expect(dummyInput.value).toBe("initial");

      // External field mutation updates DOM
      field.setRawValue("from-store");
      expect(dummyInput.value).toBe("from-store");

      // DOM input event updates field
      dummyInput.value = "user-typed";
      const inputFns = listeners["input"] || [];
      for (const fn of inputFns) {
        fn({ target: dummyInput } as unknown as Event);
      }
      expect(field.value.get()).toBe("user-typed");

      // DOM blur event marks field touched
      expect(field.touched.get()).toBe(false);
      const blurFns = listeners["blur"] || [];
      for (const fn of blurFns) {
        fn({ target: dummyInput } as unknown as Event);
      }
      expect(field.touched.get()).toBe(true);

      // Unmount directive cleans up listeners and signal subscription
      vViiField.unmounted!(dummyInput, createBinding(field), dummyVNode, null);
      expect((listeners["input"] || []).length).toBe(0);
      expect((listeners["blur"] || []).length).toBe(0);

      // Canonical node survives unmount
      expect(field.value.get()).toBe("user-typed");
      field.setValue("after-unmount");
      expect(field.value.get()).toBe("after-unmount");

      field.dispose();
    });

    it("handles field replacement in directive updated hook", () => {
      const fieldA = createField<string>({ initialValue: "A" });
      const fieldB = createField<string>({ initialValue: "B" });

      const listeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyInput = {
        tagName: "INPUT",
        type: "text",
        value: "",
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (listeners[event] = listeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLInputElement;

      const createBinding = <T extends SupportedVueFieldState>(
        value: T,
        oldValue: T | null = null,
      ): DirectiveBinding<T> => ({
        value,
        oldValue,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });
      const dummyVNode = null as unknown as VNode<unknown, HTMLInputElement>;

      // Mount fieldA
      vViiField.mounted!(dummyInput, createBinding(fieldA), dummyVNode, null);
      expect(dummyInput.value).toBe("A");

      // Update to fieldB
      vViiField.updated!(dummyInput, createBinding(fieldB, fieldA), dummyVNode, dummyVNode);
      expect(dummyInput.value).toBe("B");

      // External mutation on fieldA no longer affects DOM
      fieldA.setRawValue("A-changed");
      expect(dummyInput.value).toBe("B");

      // External mutation on fieldB affects DOM
      fieldB.setRawValue("B-changed");
      expect(dummyInput.value).toBe("B-changed");

      vViiField.unmounted!(dummyInput, createBinding(fieldB), dummyVNode, null);
      fieldA.dispose();
      fieldB.dispose();
    });

    it("binds checkbox inputs and syncs boolean values bidirectionally", () => {
      const field = createField<boolean>({ initialValue: false });

      const listeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyCheckbox = {
        tagName: "INPUT",
        type: "checkbox",
        checked: false,
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (listeners[event] = listeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLInputElement;

      const createBinding = <T extends SupportedVueFieldState>(value: T): DirectiveBinding<T> => ({
        value,
        oldValue: null,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });
      const dummyVNode = null as unknown as VNode<unknown, HTMLInputElement>;

      vViiField.mounted!(dummyCheckbox, createBinding(field), dummyVNode, null);
      expect(dummyCheckbox.checked).toBe(false);

      // External mutation updates checkbox DOM
      field.setRawValue(true);
      expect(dummyCheckbox.checked).toBe(true);

      // DOM change event updates field
      dummyCheckbox.checked = false;
      const changeFns = listeners["change"] || [];
      for (const fn of changeFns) {
        fn({ target: dummyCheckbox } as unknown as Event);
      }
      expect(field.value.get()).toBe(false);

      vViiField.unmounted!(dummyCheckbox, createBinding(field), dummyVNode, null);
      expect((listeners["change"] || []).length).toBe(0);
      field.dispose();
    });

    it("binds textarea elements and syncs string values", () => {
      const field = createField<string>({ initialValue: "notes" });

      const listeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyTextarea = {
        tagName: "TEXTAREA",
        value: "",
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (listeners[event] = listeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLTextAreaElement;

      const createBinding = (
        value: FieldState<unknown, string>,
      ): DirectiveBinding<FieldState<unknown, string>> => ({
        value,
        oldValue: null,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });
      const dummyVNode = null as unknown as VNode<unknown, HTMLTextAreaElement>;

      vViiField.mounted!(dummyTextarea, createBinding(field), dummyVNode, null);
      expect(dummyTextarea.value).toBe("notes");

      field.setRawValue("updated notes");
      expect(dummyTextarea.value).toBe("updated notes");

      vViiField.unmounted!(dummyTextarea, createBinding(field), dummyVNode, null);
      field.dispose();
    });

    it("ignores unsupported DOM elements cleanly without attaching listeners", () => {
      const field = createField<string>({ initialValue: "test" });
      const listeners: Record<string, ((e: Event) => void)[]> = {};
      const unsupportedDiv = {
        tagName: "DIV",
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (listeners[event] = listeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLInputElement;

      const createBinding = (
        value: SupportedVueFieldState,
      ): DirectiveBinding<SupportedVueFieldState> => ({
        value,
        oldValue: null,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });
      const dummyVNode = null as unknown as VNode<unknown, HTMLInputElement>;

      vViiField.mounted!(unsupportedDiv as never, createBinding(field), dummyVNode, null);
      expect(Object.keys(listeners).length).toBe(0);

      vViiField.unmounted!(unsupportedDiv as never, createBinding(field), dummyVNode, null);
      field.dispose();
    });

    it("fails closed when element type and field state raw type mismatch at runtime", () => {
      const stringField = createField<string>({ initialValue: "not a bool" });
      const boolField = createField<boolean>({ initialValue: false });

      const checkboxListeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyCheckbox = {
        tagName: "INPUT",
        type: "checkbox",
        checked: false,
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (checkboxListeners[event] = checkboxListeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          checkboxListeners[event] = (checkboxListeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLInputElement;

      const textListeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyTextInput = {
        tagName: "INPUT",
        type: "text",
        value: "",
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (textListeners[event] = textListeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          textListeners[event] = (textListeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLInputElement;

      const textareaListeners: Record<string, ((e: Event) => void)[]> = {};
      const dummyTextarea = {
        tagName: "TEXTAREA",
        value: "",
        addEventListener: (event: string, fn: (e: Event) => void) => {
          (textareaListeners[event] = textareaListeners[event] || []).push(fn);
        },
        removeEventListener: (event: string, fn: (e: Event) => void) => {
          textareaListeners[event] = (textareaListeners[event] || []).filter((l) => l !== fn);
        },
      } as unknown as HTMLTextAreaElement;

      const createBinding = <T extends SupportedVueFieldState>(value: T): DirectiveBinding<T> => ({
        value,
        oldValue: null,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });
      const dummyInputVNode = null as unknown as VNode<unknown, HTMLInputElement>;
      const dummyTextareaVNode = null as unknown as VNode<unknown, HTMLTextAreaElement>;

      // 1. Checkbox + string field: fails closed, 0 listeners, no dom mutation
      vViiField.mounted!(dummyCheckbox, createBinding(stringField), dummyInputVNode, null);
      expect(Object.keys(checkboxListeners).length).toBe(0);
      stringField.setRawValue("changed");
      expect(dummyCheckbox.checked).toBe(false);

      // 2. Text input + boolean field: fails closed, 0 listeners, no dom mutation
      vViiField.mounted!(dummyTextInput, createBinding(boolField), dummyInputVNode, null);
      expect(Object.keys(textListeners).length).toBe(0);
      boolField.setRawValue(true);
      expect(dummyTextInput.value).toBe("");

      // 3. Textarea + boolean field: fails closed at runtime
      vViiField.mounted!(
        dummyTextarea,
        createBinding(boolField) as never,
        dummyTextareaVNode,
        null,
      );
      expect(Object.keys(textareaListeners).length).toBe(0);
      boolField.setRawValue(false);
      expect(dummyTextarea.value).toBe("");

      stringField.dispose();
      boolField.dispose();
    });

    it("statically rejects incompatible field types on textarea at compile time", () => {
      const boolField = createField<boolean>({ initialValue: true });
      const dummyTextarea = {
        tagName: "TEXTAREA",
        value: "",
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as HTMLTextAreaElement;
      const dummyVNode = null as unknown as VNode<unknown, HTMLTextAreaElement>;
      const createBinding = <T extends SupportedVueFieldState>(value: T): DirectiveBinding<T> => ({
        value,
        oldValue: null,
        modifiers: {},
        arg: undefined,
        instance: null,
        dir: vViiField as never,
      });

      // @ts-expect-error textarea directive requires FieldState with string rawValue, rejecting boolean
      vViiField.mounted!(dummyTextarea, createBinding(boolField), dummyVNode, null);
      boolField.dispose();
    });
  });

  describe("100-Field Granular Reactivity Isolation", () => {
    it("mutating one field among 100 runs only affected effects", () => {
      const fieldRecord: Record<string, FieldState<number>> = {};
      for (let i = 0; i < 100; i++) {
        fieldRecord[`f_${i}`] = createField<number>({ initialValue: i });
      }
      const form = createForm({ fields: fieldRecord });

      const scope = effectScope();
      let effect42Runs = 0;
      let effect99Runs = 0;

      scope.run(() => {
        const handle42 = useViiField(form.fields["f_42"]!);
        const handle99 = useViiField(form.fields["f_99"]!);

        effect(() => {
          void handle42.value.value;
          effect42Runs++;
        });

        effect(() => {
          void handle99.value.value;
          effect99Runs++;
        });
      });

      expect(effect42Runs).toBe(1);
      expect(effect99Runs).toBe(1);

      // Mutate f_42
      form.fields["f_42"]!.setValue(1000);

      expect(effect42Runs).toBe(2);
      expect(effect99Runs).toBe(1); // Completely unaffected!

      scope.stop();
      form.dispose();
    });
  });

  describe("1,000-Cycle Resource Stress Test", () => {
    it("survives 1,000 effect-scope lifecycle cycles returning subscriptions to baseline", () => {
      const field = createField<string>({ initialValue: "stress" });
      const tracker = trackField(field);

      for (let i = 0; i < 1000; i++) {
        const scope = effectScope();
        scope.run(() => {
          useViiField(field);
        });
        expect(tracker.getActiveCount()).toBe(12);
        scope.stop();
        expect(tracker.getActiveCount()).toBe(0);
      }

      // Canonical field node remains functional
      expect(field.value.get()).toBe("stress");
      field.setValue("post-stress");
      expect(field.value.get()).toBe("post-stress");

      field.dispose();
    });
  });
});
