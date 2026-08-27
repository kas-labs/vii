import { describe, expect, it } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import { createField, createForm, createNumberParser, type FieldIssue } from "./form-core.js";
import { bindField, bindForm } from "./adapters/vanilla.js";
import { useField, useForm } from "./adapters/react.js";
import { createAngularField, createAngularForm } from "./adapters/angular.js";
import { createVueField, createVueForm } from "./adapters/vue.js";

// Minimal DOM mock for accessibility tests in Node environment
function createMockElement(tagName = "input", attributes: Record<string, string> = {}): any {
  const attrs: Record<string, string> = { ...attributes };
  const listeners: Record<string, Array<(event: any) => void>> = {};

  return {
    tagName: tagName.toUpperCase(),
    type: attrs["type"] || "text",
    id: attrs["id"] || "",
    value: "",
    checked: false,
    textContent: "",
    getAttribute(name: string): string | null {
      return attrs[name] ?? null;
    },
    setAttribute(name: string, value: string): void {
      attrs[name] = String(value);
    },
    removeAttribute(name: string): void {
      delete attrs[name];
    },
    hasAttribute(name: string): boolean {
      return name in attrs;
    },
    addEventListener(event: string, handler: (e: any) => void): void {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeEventListener(event: string, handler: (e: any) => void): void {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((h) => h !== handler);
    },
    dispatchEvent(event: { type: string; [key: string]: any }): boolean {
      const handlers = listeners[event.type] || [];
      for (const h of handlers) {
        h(event);
      }
      return !event["defaultPrevented"];
    },
    focusCalled: false,
    focus(): void {
      this.focusCalled = true;
    },
  };
}

describe("Form F8 Accessibility Hardening", () => {
  describe("1. Programmatic Labels & Accessible Names", () => {
    it("preserves native HTML label association without wrapper disconnection (Vanilla)", () => {
      const scope = createScope();
      const emailField = createField<string>({
        initialValue: "",
        scope,
        rules: [
          (val: string) =>
            val.includes("@") ? null : { code: "invalid_email", message: "Email required" },
        ],
      });

      const label = createMockElement("label", { for: "email-input" });
      label.textContent = "Email Address";

      const input = createMockElement("input", { id: "email-input", type: "email" });
      const errorDiv = createMockElement("div", { id: "email-error" });

      const binding = bindField(emailField, input, { issueElement: errorDiv });

      // Label and input remain directly associated by ID
      expect(label.getAttribute("for")).toBe("email-input");
      expect(input.id).toBe("email-input");

      // Typing triggers validation and updates error element safely
      input.value = "invalid";
      input.dispatchEvent({ type: "input", target: input });
      expect(emailField.invalid.get()).toBe(true);
      expect(errorDiv.textContent).toBe("Email required");

      binding.dispose();
      scope.dispose();
    });

    it("exposes the state a React template binds to aria attributes", () => {
      const scope = createScope();
      const nameField = createField<string>({
        initialValue: "",
        scope,
        rules: [(v: string) => (v ? null : { code: "required", message: "Required" })],
      });

      // What a component would spread onto <input id=... aria-invalid=...>.
      const ariaProps = () => ({
        "aria-invalid": nameField.invalid.get() ? "true" : "false",
        "aria-describedby": nameField.issues.get().length > 0 ? "name-error" : undefined,
      });

      expect(ariaProps()).toEqual({ "aria-invalid": "false", "aria-describedby": undefined });

      nameField.validate("change");
      expect(ariaProps()).toEqual({ "aria-invalid": "true", "aria-describedby": "name-error" });

      nameField.setValue("Alex");
      nameField.validate("change");
      expect(ariaProps()).toEqual({ "aria-invalid": "false", "aria-describedby": undefined });

      scope.dispose();
    });

    it("computes aria-invalid accurately across unvalidated, valid, invalid, and server states", () => {
      const scope = createScope();
      const field = createField<string>({
        initialValue: "",
        scope,
        rules: [
          (val: string) =>
            val.length >= 3 ? null : { code: "too_short", message: "Minimum 3 chars" },
        ],
      });

      // Initial state: unvalidated, invalid is false
      expect(field.validationStatus.get()).toBe("unvalidated");
      expect(field.invalid.get()).toBe(false);
      expect(field.invalid.get() ? "true" : "false").toBe("false");

      // Set invalid value
      field.setRawValue("ab");
      expect(field.validationStatus.get()).toBe("invalid");
      expect(field.invalid.get()).toBe(true);
      expect(field.invalid.get() ? "true" : "false").toBe("true");

      // Set valid value
      field.setRawValue("abcd");
      expect(field.validationStatus.get()).toBe("valid");
      expect(field.invalid.get()).toBe(false);
      expect(field.invalid.get() ? "true" : "false").toBe("false");

      // Server issue marks field invalid
      field.setServerIssues([{ code: "server.taken", message: "Username taken" }]);
      expect(field.invalid.get()).toBe(true);
      expect(field.invalid.get() ? "true" : "false").toBe("true");

      // Clear server issues restores valid state
      field.clearServerIssues();
      expect(field.invalid.get()).toBe(false);

      scope.dispose();
    });

    it("proves pending async validation does NOT mark field as aria-invalid", async () => {
      const scope = createScope();
      let resolveAsync: (val: any) => void = () => undefined;

      const asyncField = createField<string>({
        initialValue: "test",
        scope,
        rules: [
          () =>
            new Promise<FieldIssue | null>((resolve) => {
              resolveAsync = resolve;
            }),
        ],
      });

      // Trigger async validation
      const valPromise = asyncField.validate("manual");
      expect(asyncField.pending.get()).toBe(true);

      // CRITICAL WCAG INVARIANT: Pending validation is in progress, not invalid
      expect(asyncField.invalid.get()).toBe(false);
      expect(asyncField.issues.get().length).toBe(0);

      // Complete async validation with error
      resolveAsync({
        code: "async.error",
        message: "Async validation failed",
        source: "validation",
      });
      await valPromise;

      expect(asyncField.pending.get()).toBe(false);
      expect(asyncField.invalid.get()).toBe(true);
      expect(asyncField.issues.get().length).toBe(1);

      scope.dispose();
    });

    it("reflects parse failure as aria-invalid immediately", () => {
      const scope = createScope();
      const numberField = createField<number, string>({
        initialValue: 0,
        initialRawValue: "0",
        parser: createNumberParser(),
        scope,
      });

      expect(numberField.invalid.get()).toBe(false);

      // Type invalid non-numeric string
      numberField.setRawValue("abc");
      expect(numberField.parseStatus.get()).toBe("invalid");
      expect(numberField.invalid.get()).toBe(true);
      expect(numberField.issues.get()[0]?.source).toBe("parse");

      scope.dispose();
    });
  });

  describe("3. aria-describedby Association & Safe Rendering", () => {
    it("links input aria-describedby to issue element rendered via safe textContent", () => {
      const scope = createScope();
      const field = createField<string>({
        initialValue: "",
        scope,
        rules: [
          (v: string) => (v ? null : { code: "required", message: "This field is required" }),
        ],
      });

      const input = createMockElement("input", {
        id: "username",
        "aria-describedby": "username-error",
      });
      const errorElem = createMockElement("div", { id: "username-error" });

      const binding = bindField(field, input, { issueElement: errorElem });

      // Initial clean state
      expect(errorElem.textContent).toBe("");

      // Trigger validation error
      field.setTouched(true);
      field.validate("change");

      expect(field.invalid.get()).toBe(true);
      expect(input.getAttribute("aria-describedby")).toBe("username-error");
      expect(errorElem.id).toBe("username-error");
      expect(errorElem.textContent).toBe("This field is required");

      binding.dispose();
      scope.dispose();
    });

    it("renders custom formatted issue text safely without innerHTML", () => {
      const scope = createScope();
      const field = createField({
        initialValue: "bad",
        scope,
        rules: [
          () => ({ code: "err1", message: "First error" }),
          () => ({ code: "err2", message: "Second error" }),
        ],
      });

      const input = createMockElement("input");
      const errorElem = createMockElement("div", { id: "errors" });

      const binding = bindField(field, input, {
        issueElement: errorElem,
        formatIssues: (issues) => issues.map((i, idx) => `${idx + 1}. ${i.message}`).join(" | "),
      });

      field.validate("change");

      expect(errorElem.textContent).toBe("1. First error | 2. Second error");

      binding.dispose();
      scope.dispose();
    });
  });

  describe("4. Error Announcements, Live Regions, and Error Summary", () => {
    it("proves form-level issues provide complete data for an accessible Error Summary", async () => {
      const form = createForm<{ username: string; email: string }>({
        initialValues: {
          username: "",
          email: "",
        },
        rules: [
          (val: { username: string; email: string }) => {
            const issues: FieldIssue[] = [];
            if (!val.username) {
              issues.push({
                code: "required",
                message: "Username is required",
                path: ["username"],
                source: "validation",
              });
            }
            if (!val.email || !val.email.includes("@")) {
              issues.push({
                code: "invalid_email",
                message: "Invalid email",
                path: ["email"],
                source: "validation",
              });
            }
            return issues;
          },
        ],
      });

      // Trigger form validation
      const result = await form.submit();
      expect(result.status).toBe("invalid");

      const allIssues = form.issues.get();
      expect(allIssues.length).toBe(2);

      // Application error summary data structure
      const errorSummaryList = allIssues.map((iss) => ({
        fieldPath: iss.path ? iss.path.join(".") : "form",
        message: iss.message ?? iss.code,
        targetId: iss.path ? `${iss.path.join("-")}-input` : "form-errors",
      }));

      expect(errorSummaryList).toEqual([
        {
          fieldPath: "username",
          message: "Username is required",
          targetId: "username-input",
        },
        {
          fieldPath: "email",
          message: "Invalid email",
          targetId: "email-input",
        },
      ]);

      form.dispose();
    });

    it("proves deterministic issue ordering enables focusing the first invalid field", async () => {
      const form = createForm<{ first: string; second: string }>({
        initialValues: {
          first: "",
          second: "",
        },
        rules: [
          (val: { first: string; second: string }) => {
            const issues: FieldIssue[] = [];
            if (!val.first) {
              issues.push({
                code: "required",
                message: "First is required",
                path: ["first"],
                source: "validation",
              });
            }
            if (!val.second) {
              issues.push({
                code: "required",
                message: "Second is required",
                path: ["second"],
                source: "validation",
              });
            }
            return issues;
          },
        ],
      });

      // Element registry simulating UI focus management
      const elementRegistry = new Map<string, any>();
      const firstInput = createMockElement("input", { id: "first" });
      const secondInput = createMockElement("input", { id: "second" });
      elementRegistry.set("first", firstInput);
      elementRegistry.set("second", secondInput);

      await form.submit();

      // Locate first invalid field by issue path
      const firstIssue = form.issues.get()[0];
      expect(firstIssue).toBeDefined();
      const firstInvalidPath = firstIssue?.path?.join(".");
      expect(firstInvalidPath).toBe("first");

      // UI focuses first invalid input
      const targetElement = elementRegistry.get(firstInvalidPath!);
      targetElement?.focus();

      expect(firstInput.focusCalled).toBe(true);
      expect(secondInput.focusCalled).toBe(false);

      form.dispose();
    });
  });

  describe("5. Native Keyboard & Submit Semantics", () => {
    it("bindForm intercepts native submit event with preventDefault and triggers form.submit", async () => {
      let submitted = false;

      const form = createForm<{ title: string }>({
        initialValues: {
          title: "Valid Title",
        },
      });

      const formElem = createMockElement("form");
      const binding = bindForm(form, formElem, {
        action: async () => {
          submitted = true;
          return { ok: true, result: undefined };
        },
      });

      let defaultPrevented = false;
      const submitEvent = {
        type: "submit",
        defaultPrevented: false,
        preventDefault() {
          defaultPrevented = true;
          this.defaultPrevented = true;
        },
      };

      formElem.dispatchEvent(submitEvent);

      // Native default submit prevented to avoid page reload
      expect(defaultPrevented).toBe(true);

      // Wait a tick for async action
      await new Promise((r) => setTimeout(r, 10));
      expect(submitted).toBe(true);

      binding.dispose();
      form.dispose();
    });

    it("resets accessibility state on form reset", () => {
      const scope = createScope();
      const field = createField<string>({
        initialValue: "initial",
        scope,
        rules: [
          (v: string) => (v === "valid" ? null : { code: "invalid", message: "Invalid value" }),
        ],
      });

      field.setRawValue("bad");
      expect(field.invalid.get()).toBe(true);
      expect(field.issues.get().length).toBe(1);

      // Reset restores valid state
      field.reset("valid");
      expect(field.invalid.get()).toBe(false);
      expect(field.issues.get().length).toBe(0);
      expect(field.validationStatus.get()).toBe("unvalidated");

      scope.dispose();
    });
  });

  describe("6. Cross-Framework Accessibility Projection Parity", () => {
    it("Angular signals project aria-invalid and issues cleanly for template binding", () => {
      const scope = createScope();
      const field = createField<string>({
        initialValue: "",
        scope,
        rules: [(v: string) => (v ? null : { code: "required", message: "Required" })],
      });

      const angularField = createAngularField(field);

      // Initial state
      expect(angularField.invalid()).toBe(false);
      expect(angularField.issues().length).toBe(0);

      // In Angular template: [attr.aria-invalid]="field.invalid()"
      field.setRawValue("");
      field.validate("change");

      expect(angularField.invalid()).toBe(true);
      expect(angularField.issues()[0]?.message).toBe("Required");

      angularField.dispose();
      scope.dispose();
    });

    it("Vue shallowRefs project aria-invalid and issues cleanly for template binding", () => {
      const scope = createScope();
      const field = createField<string>({
        initialValue: "",
        scope,
        rules: [(v: string) => (v ? null : { code: "required", message: "Required" })],
      });

      const vueField = createVueField(field);

      // Initial state
      expect(vueField.invalid.value).toBe(false);
      expect(vueField.issues.value.length).toBe(0);

      // In Vue template: :aria-invalid="field.invalid"
      field.setRawValue("");
      field.validate("change");

      expect(vueField.invalid.value).toBe(true);
      expect(vueField.issues.value[0]?.message).toBe("Required");

      vueField.dispose();
      scope.dispose();
    });
  });
  // -------------------------------------------------------------------------
  // Review regressions (F8 fix pass): the DOM adapter projects ARIA itself
  // -------------------------------------------------------------------------
  describe("F8 review regressions - adapter ARIA projection", () => {
    it("bindField writes aria-invalid and keeps it in step with field state", async () => {
      const scope = createScope();
      const field = createField<string>({
        initialValue: "",
        scope,
        rules: [(v: string) => (v ? null : { code: "required", message: "Required" })],
        validateOn: "manual",
      });
      const input = createMockElement("input", { id: "u" });

      const binding = bindField(field, input);
      // Projected at bind time, not only after the first change.
      expect(input.getAttribute("aria-invalid")).toBe("false");

      field.validate("manual");
      expect(input.getAttribute("aria-invalid")).toBe("true");

      field.setValue("filled");
      field.validate("manual");
      expect(input.getAttribute("aria-invalid")).toBe("false");

      binding.dispose();
      expect(input.getAttribute("aria-invalid")).toBeNull();
      scope.dispose();
    });

    it("a pending async validation never marks the control aria-invalid", async () => {
      const scope = createScope();
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      const field = createField<string>({
        initialValue: "ok",
        scope,
        rules: [
          async () => {
            await gate;
            return null;
          },
        ],
        validateOn: "manual",
      });
      const input = createMockElement("input", { id: "p" });
      const binding = bindField(field, input);

      const pending = field.validate("manual");
      await Promise.resolve();
      expect(field.pending.get()).toBe(true);
      expect(input.getAttribute("aria-invalid")).toBe("false");

      release();
      await pending;
      expect(input.getAttribute("aria-invalid")).toBe("false");

      binding.dispose();
      scope.dispose();
    });

    it("a parse failure is projected as aria-invalid", () => {
      const scope = createScope();
      const field = createField<number, string>({
        initialValue: 0,
        initialRawValue: "0",
        scope,
        parser: createNumberParser(),
      });
      const input = createMockElement("input", { id: "n" });
      const binding = bindField(field, input);

      expect(input.getAttribute("aria-invalid")).toBe("false");
      field.setRawValue("not-a-number");
      expect(field.parseStatus.get()).toBe("invalid");
      expect(input.getAttribute("aria-invalid")).toBe("true");

      binding.dispose();
      scope.dispose();
    });

    it("a server issue is projected as aria-invalid", async () => {
      const scope = createScope();
      const form = createForm<{ a: string }>({ initialValues: { a: "x" } });
      const node = form.getNode("a") as ReturnType<typeof createField<string>>;
      const input = createMockElement("input", { id: "s" });
      const binding = bindField(node, input);

      expect(input.getAttribute("aria-invalid")).toBe("false");
      await form.submit(async () => ({
        ok: false as const,
        issues: [{ code: "taken", message: "Already taken", path: ["a"] }],
      }));
      expect(input.getAttribute("aria-invalid")).toBe("true");

      binding.dispose();
      form.dispose();
      scope.dispose();
    });

    it("bindField adds its issue element to aria-describedby and restores it on dispose", () => {
      const scope = createScope();
      const field = createField<string>({ initialValue: "", scope });
      const input = createMockElement("input", { id: "u2", "aria-describedby": "hint-text" });
      const errorElem = createMockElement("div", { id: "u2-error" });

      const binding = bindField(field, input, { issueElement: errorElem });

      // The adapter appends, it does not clobber an existing token.
      expect(input.getAttribute("aria-describedby")).toBe("hint-text u2-error");

      binding.dispose();
      expect(input.getAttribute("aria-describedby")).toBe("hint-text");
      scope.dispose();
    });

    it("aria projection can be opted out of", () => {
      const scope = createScope();
      const field = createField<string>({ initialValue: "", scope });
      const input = createMockElement("input", { id: "u3" });
      const errorElem = createMockElement("div", { id: "u3-error" });

      const binding = bindField(field, input, {
        issueElement: errorElem,
        ariaInvalid: false,
        ariaDescribedBy: false,
      });

      expect(input.getAttribute("aria-invalid")).toBeNull();
      expect(input.getAttribute("aria-describedby")).toBeNull();

      binding.dispose();
      scope.dispose();
    });
  });
});
