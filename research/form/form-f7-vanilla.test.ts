import { describe, expect, it, vi } from "vitest";
import { createField, createForm, createNumberParser, type FieldIssue } from "./form-core.js";
import {
  bindField,
  bindForm,
  createVanillaField,
  type DomElementLike,
} from "./adapters/vanilla.js";

/**
 * Minimal in-memory DOM element mock for headless Node testing.
 */
class MockDomElement implements DomElementLike {
  public value: string = "";
  public checked: boolean = false;
  public type: string = "text";
  public textContent: string | null = null;
  public eventListeners: Map<string, Set<(e: any) => void>> = new Map();

  constructor(type = "text") {
    this.type = type;
  }

  addEventListener(event: string, handler: (e: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: (e: any) => void): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  dispatchEvent(event: { type: string; [key: string]: any }): void {
    const handlers = this.eventListeners.get(event.type);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        handler({ target: this, preventDefault: () => {}, ...event });
      }
    }
  }

  simulateInput(value: string): void {
    this.value = value;
    this.dispatchEvent({ type: "input" });
  }

  simulateChange(valueOrChecked: string | boolean): void {
    if (this.type === "checkbox") {
      this.checked = Boolean(valueOrChecked);
      this.dispatchEvent({ type: "change" });
    } else {
      this.value = String(valueOrChecked);
      this.dispatchEvent({ type: "change" });
    }
  }

  simulateBlur(): void {
    this.dispatchEvent({ type: "blur" });
  }
}

describe("Form Research F7: Vanilla DOM Adapter", () => {
  describe("Text Input Binding & Mutation", () => {
    it("synchronizes initial value to DOM and user input to Form", () => {
      const field = createField<string>({ initialValue: "initial" });
      const input = new MockDomElement("text");

      const binding = bindField(field, input);

      expect(input.value).toBe("initial");
      expect(field.value.get()).toBe("initial");
      expect(field.dirty.get()).toBe(false);

      input.simulateInput("updated");

      expect(field.value.get()).toBe("updated");
      expect(field.dirty.get()).toBe(true);

      field.setValue("programmatic");
      expect(input.value).toBe("programmatic");

      binding.dispose();
    });

    it("handles blur and touched transitions", () => {
      const field = createField<string>({
        initialValue: "",
        rules: [
          (val: string) => (val === "" ? { code: "required", message: "Required field" } : null),
        ],
        validateOn: "blur",
      });
      const input = new MockDomElement("text");
      const binding = bindField(field, input);

      expect(field.touched.get()).toBe(false);
      expect(field.validationStatus.get()).toBe("unvalidated");

      input.simulateBlur();

      expect(field.touched.get()).toBe(true);
      expect(field.validationStatus.get()).toBe("invalid");
      expect(field.issues.get()[0]?.code).toBe("required");

      binding.dispose();
    });
  });

  describe("Parser-Backed Number Input", () => {
    it("preserves intermediate raw string and does not clobber domain value on parse failure", () => {
      const field = createField<number, string>({
        initialValue: 42,
        initialRawValue: "42",
        parser: createNumberParser(),
      });
      const input = new MockDomElement("text");
      const binding = bindField(field, input);

      expect(input.value).toBe("42");
      expect(field.value.get()).toBe(42);

      // Typing leading zero "042" parses to 42, dirty remains false
      input.simulateInput("042");
      expect(field.value.get()).toBe(42);
      expect(field.rawValue.get()).toBe("042");
      expect(field.dirty.get()).toBe(false);
      expect(field.parseStatus.get()).toBe("parsed");

      // Typing invalid intermediate string "-"
      input.simulateInput("-");
      expect(input.value).toBe("-");
      expect(field.rawValue.get()).toBe("-");
      expect(field.parseStatus.get()).toBe("invalid");
      expect(field.parseIssue.get()?.code).toBe("parse.invalid_number");
      expect(field.validationStatus.get()).toBe("invalid");

      // Intermediate raw string is preserved and not reset to 42
      expect(input.value).toBe("-");

      binding.dispose();
    });
  });

  describe("Checkbox & Select Non-Text Controls", () => {
    it("binds boolean checkbox correctly", () => {
      const field = createField<boolean>({ initialValue: false });
      const checkbox = new MockDomElement("checkbox");
      const binding = bindField(field, checkbox);

      expect(checkbox.checked).toBe(false);

      checkbox.simulateChange(true);
      expect(field.value.get()).toBe(true);
      expect(field.dirty.get()).toBe(true);

      field.setValue(false);
      expect(checkbox.checked).toBe(false);

      binding.dispose();
    });

    it("binds select dropdown correctly", () => {
      const field = createField<string>({ initialValue: "option_a" });
      const select = new MockDomElement("select-one");
      const binding = bindField(field, select);

      expect(select.value).toBe("option_a");

      select.simulateChange("option_b");
      expect(field.value.get()).toBe("option_b");
      expect(field.dirty.get()).toBe(true);

      binding.dispose();
    });
  });

  describe("XSS-Safe Issue Rendering", () => {
    it("renders issue messages via textContent without HTML injection", () => {
      const hostileMessage = '<img src=x onerror="alert(1)"> & <script>bad()</script>';
      const field = createField<string>({
        initialValue: "bad",
        rules: [() => ({ code: "hostile", message: hostileMessage })],
      });
      const input = new MockDomElement("text");
      const issueEl = new MockDomElement("div");

      const binding = bindField(field, input, { issueElement: issueEl });
      field.validate("manual");

      expect(issueEl.textContent).toBe(hostileMessage);

      binding.dispose();
    });
  });

  describe("Form Submit Binding & Lifecycle", () => {
    it("intercepts form submit event and delegates to form.submit()", async () => {
      const submitSpy = vi.fn().mockResolvedValue({ ok: true, result: "saved" });
      const form = createForm({
        initialValues: { username: "alice" },
        submitAction: submitSpy,
      });

      const formElement = new MockDomElement("form");
      let successResult: unknown = null;

      const binding = bindForm(form, formElement, {
        onSubmitSuccess: (res) => {
          successResult = res;
        },
      });

      let defaultPrevented = false;
      formElement.dispatchEvent({
        type: "submit",
        preventDefault: () => {
          defaultPrevented = true;
        },
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(defaultPrevented).toBe(true);
      expect(submitSpy).toHaveBeenCalledTimes(1);
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(successResult).toBe("saved");

      // Model A Terminal Submission Status: editing field preserves succeeded status and marks dirty
      form.fields.username.setValue("alice_edited");
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);

      binding.dispose();
      form.dispose();
    });
  });

  describe("Disposal & Resource Accounting", () => {
    it("unsubscribes and detaches all event listeners on dispose", () => {
      const field = createField<string>({ initialValue: "test" });
      const input = new MockDomElement("text");
      const issueEl = new MockDomElement("div");

      const binding = bindField(field, input, { issueElement: issueEl });
      binding.dispose();

      // Subsequent user input does not mutate field
      input.simulateInput("new_value");
      expect(field.value.get()).toBe("test");

      // Subsequent programmatic field mutation does not update input
      field.setValue("after_dispose");
      expect(input.value).toBe("new_value");
    });

    it("completes 100 bind/unbind cycles with zero retained listeners", () => {
      const field = createField<string>({ initialValue: "benchmark" });
      const input = new MockDomElement("text");

      for (let i = 0; i < 100; i++) {
        const binding = bindField(field, input);
        input.simulateInput(`val_${i}`);
        expect(field.value.get()).toBe(`val_${i}`);
        binding.dispose();
      }

      for (const [, set] of input.eventListeners) {
        expect(set.size).toBe(0);
      }
    });

    it("createVanillaField provides headless projection with clean disposal", () => {
      const field = createField<number>({ initialValue: 10 });
      const handle = createVanillaField(field);

      const snap1 = handle.getSnapshot();
      expect(snap1.value).toBe(10);
      expect(snap1.dirty).toBe(false);

      handle.setValue(20);
      const snap2 = handle.getSnapshot();
      expect(snap2.value).toBe(20);
      expect(snap2.dirty).toBe(true);

      handle.dispose();
      handle.setValue(30);
      expect(field.value.get()).toBe(20);
    });
  });
  // -------------------------------------------------------------------------
  // Review regressions (F7 fix pass)
  // -------------------------------------------------------------------------
  describe("F7 review regressions", () => {
    const microtasks = async (n = 10): Promise<void> => {
      for (let i = 0; i < n; i++) await Promise.resolve();
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
    };

    it("a throwing submit action does not raise an unhandled rejection from the DOM handler", async () => {
      const seen: unknown[] = [];
      const onUnhandled = (reason: unknown): void => {
        seen.push(reason);
      };
      process.on("unhandledRejection", onUnhandled);

      const form = createForm<{ a: string }>({ initialValues: { a: "x" } });
      const formElement = new MockDomElement("form");
      const captured: unknown[] = [];
      const binding = bindForm(form, formElement, {
        action: async () => {
          throw new Error("server exploded");
        },
        onSubmitException: (err) => {
          captured.push(err);
        },
      });

      formElement.dispatchEvent({ type: "submit" });
      await microtasks();

      process.off("unhandledRejection", onUnhandled);
      expect(seen).toEqual([]);
      expect(captured).toHaveLength(1);
      expect((captured[0] as Error).message).toBe("server exploded");
      expect(form.submissionStatus.get()).toBe("failed");

      binding.dispose();
      form.dispose();
    });

    it("a submit exception is contained even with no onSubmitException handler", async () => {
      const seen: unknown[] = [];
      const onUnhandled = (reason: unknown): void => {
        seen.push(reason);
      };
      process.on("unhandledRejection", onUnhandled);

      const form = createForm<{ a: string }>({ initialValues: { a: "x" } });
      const formElement = new MockDomElement("form");
      const binding = bindForm(form, formElement, {
        action: async () => {
          throw new Error("silent boom");
        },
      });

      formElement.dispatchEvent({ type: "submit" });
      await microtasks();

      process.off("unhandledRejection", onUnhandled);
      expect(seen).toEqual([]);

      binding.dispose();
      form.dispose();
    });

    it("a parser-backed control keeps the raw string the user typed", async () => {
      const field = createField<number, string>({
        initialValue: 0,
        initialRawValue: "0",
        parser: createNumberParser(),
      });
      const input = new MockDomElement("text");
      const binding = bindField(field, input);

      // "05" parses to 5, but the control must keep showing what was typed.
      input.simulateInput("05");
      await Promise.resolve();
      expect(field.value.get()).toBe(5);
      expect(input.value).toBe("05");

      // A raw string that fails to parse is preserved too.
      input.simulateInput("-");
      await Promise.resolve();
      expect(field.parseStatus.get()).toBe("invalid");
      expect(input.value).toBe("-");

      binding.dispose();
    });

    it("a text control runs the field pipeline once per edit, not once per DOM event", () => {
      let runs = 0;
      const field = createField<string>({
        initialValue: "",
        rules: [
          (): null => {
            runs++;
            return null;
          },
        ],
      });
      const input = new MockDomElement("text");
      const binding = bindField(field, input);

      // A browser fires "input" while typing and "change" again on blur.
      input.simulateInput("hello");
      input.simulateChange("hello");

      expect(runs).toBe(1);
      expect(field.value.get()).toBe("hello");

      binding.dispose();
    });

    it("a select control still commits on change", () => {
      const field = createField<string>({ initialValue: "option_a" });
      const select = new MockDomElement("select-one");
      const binding = bindField(field, select);

      select.simulateChange("option_b");
      expect(field.value.get()).toBe("option_b");

      binding.dispose();
    });
  });
});
