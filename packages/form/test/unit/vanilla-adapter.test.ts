import { describe, expect, test } from "vitest";
import { createField, createForm, createNumberParser, type FieldIssue } from "../../src/index.js";
import { bindField, bindForm, type VanillaDomElement } from "../../src/adapters/vanilla/index.js";

class MockDomElement implements VanillaDomElement {
  value: unknown = "";
  checked?: boolean = false;
  type?: string = "text";
  id?: string = "";
  name?: string = "";
  multiple?: boolean = false;
  files?: unknown = null;
  textContent?: string | null = "";
  selectedOptions?: Array<{ value: string }> = [];

  private attributes = new Map<string, string>();
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  public totalListenersAdded = 0;
  public totalListenersRemoved = 0;

  get currentListenerCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }

  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name)! : null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  addEventListener(event: string, handler: (event: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.totalListenersAdded++;
  }

  removeEventListener(event: string, handler: (event: unknown) => void): void {
    const set = this.listeners.get(event);
    if (set && set.has(handler)) {
      set.delete(handler);
      this.totalListenersRemoved++;
    }
  }

  dispatch(eventName: string, overrides: Record<string, unknown> = {}): { prevented: boolean } {
    let prevented = false;
    const evt = {
      type: eventName,
      target: this,
      preventDefault: () => {
        prevented = true;
      },
      ...overrides,
    };
    const set = this.listeners.get(eventName);
    if (set) {
      for (const handler of Array.from(set)) {
        handler(evt);
      }
    }
    return { prevented };
  }
}

describe("@vii-labs/form/vanilla - Vanilla DOM Adapter", () => {
  describe("Text-like Controls & Single Commit Contract", () => {
    test("initializes DOM input with initial field raw value", () => {
      const field = createField({ initialValue: "hello world" });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);
      expect(input.value).toBe("hello world");
      binding.dispose();
      field.dispose();
    });

    test("commits DOM input event to field rawValue exactly once per event", () => {
      let validationCount = 0;
      const field = createField({
        initialValue: "abc",
        rules: [
          (val: string) => {
            validationCount++;
            return val.length < 2 ? { code: "min_len", message: "too short" } : null;
          },
        ],
        validateOn: "change",
      });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);
      validationCount = 0;

      input.value = "abcd";
      input.dispatch("input");

      expect(field.rawValue.get()).toBe("abcd");
      expect(field.value.get()).toBe("abcd");
      expect(validationCount).toBe(1);

      // Verify change event is NOT registered for text inputs
      input.value = "abcde";
      input.dispatch("change");
      // field should NOT change from change event because only input is bound
      expect(field.rawValue.get()).toBe("abcd");
      expect(validationCount).toBe(1);

      binding.dispose();
      field.dispose();
    });

    test("projects programmatic setRawValue back to input.value", () => {
      const field = createField<number, string>({
        initialValue: 42,
        initialRawValue: "42",
        parser: createNumberParser(),
      });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);
      expect(input.value).toBe("42");

      field.setRawValue("100");
      expect(input.value).toBe("100");
      expect(field.value.get()).toBe(100);

      binding.dispose();
      field.dispose();
    });

    test("parsed invalid intermediate raw input remains visible in DOM and does not snap back", () => {
      const field = createField<number, string>({
        initialValue: 42,
        initialRawValue: "42",
        parser: createNumberParser(),
      });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);

      // User types "-" which is invalid numeric syntax
      input.value = "-";
      input.dispatch("input");

      expect(field.rawValue.get()).toBe("-");
      expect(field.value.get()).toBe(42); // Domain value remains at last known valid baseline
      expect(field.parseStatus.get()).toBe("invalid");
      expect(input.value).toBe("-"); // DOM input must NOT snap back to "42"

      binding.dispose();
      field.dispose();
    });

    test("reset projects baseline back to DOM input", () => {
      const field = createField({ initialValue: "initial text" });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);
      input.value = "modified text";
      input.dispatch("input");
      expect(field.rawValue.get()).toBe("modified text");

      field.reset();
      expect(field.rawValue.get()).toBe("initial text");
      expect(input.value).toBe("initial text");

      binding.dispose();
      field.dispose();
    });

    test("blur event marks field touched exactly once and triggers blur validation", () => {
      let blurValidateCount = 0;
      const field = createField({
        initialValue: "test",
        rules: [
          () => {
            blurValidateCount++;
            return null;
          },
        ],
        validateOn: "blur",
      });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);
      expect(field.touched.get()).toBe(false);
      expect(blurValidateCount).toBe(0);

      input.dispatch("blur");
      expect(field.touched.get()).toBe(true);
      expect(blurValidateCount).toBe(1);

      // Repeated blur when already touched
      input.dispatch("blur");
      expect(field.touched.get()).toBe(true);

      binding.dispose();
      field.dispose();
    });
  });

  describe("Checkbox Controls", () => {
    test("initializes checked state and syncs bidirectionally on change", () => {
      let commitCount = 0;
      const field = createField<boolean>({
        initialValue: false,
        rules: [
          () => {
            commitCount++;
            return null;
          },
        ],
        validateOn: "change",
      });
      const checkbox = new MockDomElement();
      checkbox.type = "checkbox";

      const binding = bindField(field, checkbox);
      expect(checkbox.checked).toBe(false);
      commitCount = 0;

      // User checks the box
      checkbox.checked = true;
      checkbox.dispatch("change");

      expect(field.value.get()).toBe(true);
      expect(commitCount).toBe(1);

      // Programmatic change
      field.setValue(false);
      expect(checkbox.checked).toBe(false);

      // Reset
      field.setValue(true);
      expect(checkbox.checked).toBe(true);
      field.reset();
      expect(checkbox.checked).toBe(false);

      binding.dispose();
      field.dispose();
    });
  });

  describe("Select Controls", () => {
    test("binds single select and commits on change event", () => {
      let commitCount = 0;
      const field = createField({
        initialValue: "opt-1",
        rules: [
          () => {
            commitCount++;
            return null;
          },
        ],
        validateOn: "change",
      });
      const select = new MockDomElement();
      select.type = "select-one";

      const binding = bindField(field, select);
      expect(select.value).toBe("opt-1");
      commitCount = 0;

      select.value = "opt-2";
      select.dispatch("change");

      expect(field.value.get()).toBe("opt-2");
      expect(commitCount).toBe(1);

      field.setValue("opt-3");
      expect(select.value).toBe("opt-3");

      binding.dispose();
      field.dispose();
    });

    test("binds multi-select when multiple is true", () => {
      const field = createField<string[]>({
        initialValue: ["opt-1"],
      });
      const select = new MockDomElement();
      select.type = "select-multiple";
      select.multiple = true;
      select.selectedOptions = [{ value: "opt-1" }, { value: "opt-3" }];

      const binding = bindField(field, select);
      select.dispatch("change");

      expect(field.value.get()).toEqual(["opt-1", "opt-3"]);

      binding.dispose();
      field.dispose();
    });
  });

  describe("Radio Controls", () => {
    test("binds radio option and sets checked based on value matching", () => {
      const field = createField({ initialValue: "green" });
      const radioRed = new MockDomElement();
      radioRed.type = "radio";
      radioRed.value = "red";

      const radioGreen = new MockDomElement();
      radioGreen.type = "radio";
      radioGreen.value = "green";

      const bindingRed = bindField(field, radioRed);
      const bindingGreen = bindField(field, radioGreen);

      expect(radioRed.checked).toBe(false);
      expect(radioGreen.checked).toBe(true);

      // User selects red
      radioRed.checked = true;
      radioRed.dispatch("change");

      expect(field.value.get()).toBe("red");
      expect(radioRed.checked).toBe(true);
      expect(radioGreen.checked).toBe(false);

      bindingRed.dispose();
      bindingGreen.dispose();
      field.dispose();
    });
  });

  describe("File Input Controls", () => {
    test("binds file input DOM -> Field on change without reverse path mutation", () => {
      const field = createField<unknown>({ initialValue: null });
      const fileInput = new MockDomElement();
      fileInput.type = "file";
      const dummyFileList = [{ name: "document.pdf", size: 1024 }];
      fileInput.files = dummyFileList;

      const binding = bindField(field, fileInput);

      fileInput.dispatch("change");
      expect(field.value.get()).toBe(dummyFileList);

      // Programmatic field update must not throw or attempt fileInput.value mutation
      expect(() => {
        field.setValue({ name: "another.pdf" });
      }).not.toThrow();

      binding.dispose();
      field.dispose();
    });
  });

  describe("ARIA Projection & Safe textContent Sink", () => {
    test("projects aria-invalid only when invalid and never when pending-only", async () => {
      let resolveAsync!: () => void;
      const field = createField({
        initialValue: "valid-input",
        rules: [
          (val: string) =>
            val === "invalid-input" ? { code: "invalid_input", message: "Input is invalid" } : null,
          () =>
            new Promise<FieldIssue | null>((res) => {
              resolveAsync = () => res(null);
            }),
        ],
        validateOn: "change",
      });
      const input = new MockDomElement();
      input.type = "text";

      const binding = bindField(field, input);
      expect(input.hasAttribute("aria-invalid")).toBe(false);

      // Trigger change to enter pending state
      input.value = "pending-input";
      input.dispatch("input");

      expect(field.pending.get()).toBe(true);
      expect(field.invalid.get()).toBe(false);
      // Pending alone must NOT mark aria-invalid="true"
      expect(input.hasAttribute("aria-invalid")).toBe(false);

      resolveAsync();
      await new Promise((r) => setTimeout(r, 0));

      expect(field.pending.get()).toBe(false);
      expect(input.hasAttribute("aria-invalid")).toBe(false);

      // Now set client invalid
      input.value = "invalid-input";
      input.dispatch("input");

      expect(field.invalid.get()).toBe(true);
      expect(input.getAttribute("aria-invalid")).toBe("true");

      // Restore to valid
      input.value = "valid-again";
      input.dispatch("input");
      resolveAsync();
      await new Promise((r) => setTimeout(r, 0));
      expect(field.invalid.get()).toBe(false);
      expect(input.hasAttribute("aria-invalid")).toBe(false);

      binding.dispose();
      field.dispose();
    });

    test("links issueElement id into aria-describedby and restores original tokens on unbind", () => {
      const field = createField({ initialValue: "test" });
      const input = new MockDomElement();
      input.setAttribute("aria-describedby", "existing-help-id");

      const issueElement = new MockDomElement();
      issueElement.id = "email-issue-id";

      const binding = bindField(field, input, { issueElement });
      expect(input.getAttribute("aria-describedby")).toBe("existing-help-id email-issue-id");

      binding.dispose();
      // On unbind, only email-issue-id is removed; existing-help-id is preserved!
      expect(input.getAttribute("aria-describedby")).toBe("existing-help-id");

      field.dispose();
    });

    test("removes aria-describedby completely on unbind if no prior tokens existed", () => {
      const field = createField({ initialValue: "test" });
      const input = new MockDomElement();
      const issueElement = new MockDomElement();
      issueElement.id = "only-error-id";

      const binding = bindField(field, input, { issueElement });
      expect(input.getAttribute("aria-describedby")).toBe("only-error-id");

      binding.dispose();
      expect(input.hasAttribute("aria-describedby")).toBe(false);

      field.dispose();
    });

    test("renders hostile HTML issue messages strictly as literal text via textContent (XSS defense)", () => {
      const field = createField({
        initialValue: "bad",
        rules: [
          () => ({
            code: "xss_attempt",
            message: '<img src=x onerror="globalThis.__xss=true">',
          }),
        ],
        validateOn: "change",
      });
      const input = new MockDomElement();
      const issueElement = new MockDomElement();

      const binding = bindField(field, input, { issueElement });

      input.value = "trigger";
      input.dispatch("input");

      expect(issueElement.textContent).toBe('<img src=x onerror="globalThis.__xss=true">');
      expect((globalThis as Record<string, unknown>)["__xss"]).toBeUndefined();

      binding.dispose();
      field.dispose();
    });

    test("supports custom formatIssues text formatter", () => {
      const field = createField({
        initialValue: "val",
        rules: [() => ({ code: "err", message: "first error" })],
        validateOn: "change",
      });
      const input = new MockDomElement();
      const issueElement = new MockDomElement();

      const binding = bindField(field, input, {
        issueElement,
        formatIssues: (issues) => `[Error Count: ${issues.length}] ${issues[0]?.message}`,
      });

      input.value = "new-val";
      input.dispatch("input");

      expect(issueElement.textContent).toBe("[Error Count: 1] first error");

      binding.dispose();
      field.dispose();
    });
  });

  describe("bindForm Submission & Error Containment", () => {
    test("submits form on native submit event and prevents default", async () => {
      const form = createForm({
        fields: {
          username: createField({ initialValue: "valid-user" }),
        },
      });
      const formElement = new MockDomElement();

      let submitActionCalled = false;
      let successResult: string | undefined;

      const binding = bindForm(form, formElement, {
        action: async (values) => {
          submitActionCalled = true;
          return { ok: true, result: `Saved ${values.username}` };
        },
        onSubmitSuccess: (res) => {
          successResult = res;
        },
      });

      const { prevented } = formElement.dispatch("submit");
      expect(prevented).toBe(true);

      await new Promise((r) => setTimeout(r, 10));

      expect(submitActionCalled).toBe(true);
      expect(successResult).toBe("Saved valid-user");
      expect(form.submissionStatus.get()).toBe("succeeded");

      binding.dispose();
      form.dispose();
    });

    test("routes validation failure to onSubmitError", async () => {
      const form = createForm({
        fields: {
          age: createField<number, string>({
            initialValue: -5,
            initialRawValue: "-5",
            parser: createNumberParser(),
            rules: [
              (v: number) => (v < 0 ? { code: "min_age", message: "Age must be positive" } : null),
            ],
          }),
        },
      });
      const formElement = new MockDomElement();

      let errorIssues: readonly FieldIssue[] | undefined;

      const binding = bindForm(form, formElement, {
        onSubmitError: (issues) => {
          errorIssues = issues;
        },
      });

      formElement.dispatch("submit");
      await new Promise((r) => setTimeout(r, 10));

      expect(form.submissionStatus.get()).toBe("idle");
      expect(errorIssues).toBeDefined();
      expect(errorIssues?.length).toBe(1);
      expect(errorIssues?.[0]?.message).toBe("Age must be positive");

      binding.dispose();
      form.dispose();
    });

    test("contains unexpected submit action rejection through onSubmitException without unhandled rejection", async () => {
      const form = createForm({
        fields: {
          field: createField({ initialValue: "test" }),
        },
      });
      const formElement = new MockDomElement();

      let caughtException: unknown;
      const expectedError = new Error("Network offline");

      const binding = bindForm(form, formElement, {
        action: async () => {
          throw expectedError;
        },
        onSubmitException: (err) => {
          caughtException = err;
        },
      });

      formElement.dispatch("submit");
      await new Promise((r) => setTimeout(r, 10));

      expect(form.submissionStatus.get()).toBe("failed");
      expect(caughtException).toBe(expectedError);

      binding.dispose();
      form.dispose();
    });

    test("contains error when onSubmitException is omitted", async () => {
      const form = createForm({
        fields: {
          field: createField({ initialValue: "test" }),
        },
      });
      const formElement = new MockDomElement();

      const binding = bindForm(form, formElement, {
        action: async () => {
          throw new Error("Unexpected crash");
        },
      });

      // Must not produce unhandled rejection
      expect(() => {
        formElement.dispatch("submit");
      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 10));
      expect(form.submissionStatus.get()).toBe("failed");

      binding.dispose();
      form.dispose();
    });

    test("contains synchronous errors thrown by user onSubmitException handler", async () => {
      const form = createForm({
        fields: {
          field: createField({ initialValue: "test" }),
        },
      });
      const formElement = new MockDomElement();

      const binding = bindForm(form, formElement, {
        action: async () => {
          throw new Error("Action failed");
        },
        onSubmitException: () => {
          throw new Error("Handler also crashed");
        },
      });

      expect(() => {
        formElement.dispatch("submit");
      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 10));

      binding.dispose();
      form.dispose();
    });
  });

  describe("Lifecycle, Rebinding & Leak Safety", () => {
    test("unsubscribes and detaches all event listeners on dispose", () => {
      const field = createField({ initialValue: "initial" });
      const input = new MockDomElement();

      const binding = bindField(field, input);
      expect(input.currentListenerCount).toBe(2); // input + blur

      binding.dispose();
      expect(input.currentListenerCount).toBe(0);

      // Further input events do not update field
      input.value = "after-dispose";
      input.dispatch("input");
      expect(field.rawValue.get()).toBe("initial");

      // Canonical field is still alive and usable
      field.setRawValue("alive");
      expect(field.rawValue.get()).toBe("alive");

      field.dispose();
    });

    test("repeated bind/unbind cycles maintain zero listener growth", () => {
      const field = createField({ initialValue: "test" });
      const input = new MockDomElement();

      for (let i = 0; i < 10; i++) {
        const binding = bindField(field, input);
        expect(input.currentListenerCount).toBe(2);
        binding.dispose();
        expect(input.currentListenerCount).toBe(0);
      }

      expect(input.totalListenersAdded).toBe(20);
      expect(input.totalListenersRemoved).toBe(20);

      field.dispose();
    });

    test("handles multiple independent bindings with generation-local cleanup", () => {
      const field = createField({ initialValue: "test" });
      const input = new MockDomElement();

      const binding1 = bindField(field, input);
      const binding2 = bindField(field, input);

      expect(input.currentListenerCount).toBe(4);

      binding1.dispose();
      expect(input.currentListenerCount).toBe(2);

      // binding2 remains active
      input.value = "changed-via-binding2";
      input.dispatch("input");
      expect(field.rawValue.get()).toBe("changed-via-binding2");

      binding2.dispose();
      expect(input.currentListenerCount).toBe(0);

      field.dispose();
    });

    test("dispose is idempotent", () => {
      const field = createField({ initialValue: "test" });
      const input = new MockDomElement();
      const binding = bindField(field, input);

      expect(() => {
        binding.dispose();
        binding.dispose();
        binding.dispose();
      }).not.toThrow();

      field.dispose();
    });

    test("bindForm cleanup removes submit listener and keeps canonical form usable", () => {
      const form = createForm({
        fields: {
          test: createField({ initialValue: "abc" }),
        },
      });
      const formElement = new MockDomElement();

      let submitCount = 0;
      const binding = bindForm(form, formElement, {
        action: async () => {
          submitCount++;
          return { ok: true, result: undefined };
        },
      });

      expect(formElement.currentListenerCount).toBe(1);

      binding.dispose();
      expect(formElement.currentListenerCount).toBe(0);

      formElement.dispatch("submit");
      expect(submitCount).toBe(0);

      // Form remains usable
      expect(form.getValue()).toEqual({ test: "abc" });
      form.dispose();
    });
  });

  describe("Transactional Preflight / Fail-closed Validation", () => {
    test("throws TypeError when field is invalid without mutating DOM element", () => {
      const element = new MockDomElement();
      expect(() => {
        bindField(null as never, element);
      }).toThrow(TypeError);
      expect(element.currentListenerCount).toBe(0);
    });

    test("throws TypeError when element is invalid without subscribing to field", () => {
      const field = createField({ initialValue: "test" });
      expect(() => {
        bindField(field, null as never);
      }).toThrow(TypeError);

      field.dispose();
    });

    test("bindForm throws TypeError on invalid form or element", () => {
      const element = new MockDomElement();
      expect(() => {
        bindForm(null as never, element);
      }).toThrow(TypeError);

      const form = createForm({ fields: { a: createField({ initialValue: 1 }) } });
      expect(() => {
        bindForm(form, null as never);
      }).toThrow(TypeError);

      form.dispose();
    });
  });

  describe("Server Issues & Localized Clearing Integration", () => {
    test("projects server issue to aria-invalid and safe issue element, clears localized on edit", async () => {
      const form = createForm({
        fields: {
          email: createField({ initialValue: "test@example.com" }),
          name: createField({ initialValue: "Vitalii" }),
        },
      });
      const emailInput = new MockDomElement();
      const emailIssueElem = new MockDomElement();
      emailIssueElem.id = "email-err";

      const bindingEmail = bindField(form.fields.email, emailInput, {
        issueElement: emailIssueElem,
      });

      expect(emailInput.hasAttribute("aria-invalid")).toBe(false);
      expect(emailIssueElem.textContent).toBe("");

      // Submit with server issue targeting email
      await form.submit(async () => ({
        ok: false,
        issues: [{ code: "email_taken", message: "Email already in use", path: ["email"] }],
      }));

      expect(form.fields.email.invalid.get()).toBe(true);
      expect(emailInput.getAttribute("aria-invalid")).toBe("true");
      expect(emailIssueElem.textContent).toBe("Email already in use");

      // Localized edit on email clears only email's server issue
      emailInput.value = "new@example.com";
      emailInput.dispatch("input");

      expect(form.fields.email.serverIssues.get().length).toBe(0);
      expect(form.fields.email.invalid.get()).toBe(false);
      expect(emailInput.hasAttribute("aria-invalid")).toBe(false);
      expect(emailIssueElem.textContent).toBe("");

      bindingEmail.dispose();
      form.dispose();
    });
  });
});
