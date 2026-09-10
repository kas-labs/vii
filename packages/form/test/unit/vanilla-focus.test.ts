import { describe, expect, test } from "vitest";
import { createField, createFieldArray, createForm, type FieldState } from "../../src/index.js";
import {
  bindForm,
  focusFirstInvalid,
  focusInvalid,
  type VanillaDomControl,
  type VanillaDomElement,
} from "../../src/adapters/vanilla/index.js";
import { isElementFocusable } from "../../src/adapters/vanilla/focus.js";

class MockFocusElement implements VanillaDomControl, VanillaDomElement {
  value: unknown = "";
  tagName?: string = "INPUT";
  nodeName?: string = "INPUT";
  checked?: boolean | undefined = false;
  type?: string | undefined = "text";
  id?: string = "";
  name?: string = "";
  multiple?: boolean = false;
  files?: unknown = null;
  textContent?: string | null = "";

  public focused = false;
  public scrolled = false;
  public focusOptionsReceived?: unknown;
  public scrollOptionsReceived?: unknown;
  public isConnected = true;
  public disabled = false;
  public hidden = false;
  public inert = false;
  public form?: MockFocusElement | null = null;
  public parentElement?: MockFocusElement | null = null;
  public docOrderIndex = 0;
  public throwOnFocus = false;
  public failFocusSilently = false;
  public children: MockFocusElement[] = [];

  private attributes = new Map<string, string>();
  private listeners = new Map<string, Set<(event: unknown) => void>>();

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
  }

  removeEventListener(event: string, handler: (event: unknown) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
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

  focus(options?: unknown): void {
    if (this.throwOnFocus) {
      throw new Error("Focus operation threw unexpectedly");
    }
    if (this.failFocusSilently) {
      this.focused = false;
      return;
    }
    this.focused = true;
    this.focusOptionsReceived = options;
  }

  contains(other: unknown): boolean {
    if (other === this) return true;
    for (const child of this.children) {
      if (child === other || (typeof child.contains === "function" && child.contains(other))) {
        return true;
      }
    }
    return false;
  }

  matches(selector: string): boolean {
    if (selector === ":disabled") {
      return this.disabled || this.hasAttribute("disabled");
    }
    return false;
  }

  scrollIntoView(options?: unknown): void {
    this.scrolled = true;
    this.scrollOptionsReceived = options;
  }

  compareDocumentPosition(other: MockFocusElement): number {
    if (this.docOrderIndex < other.docOrderIndex) {
      return 4; // Node.DOCUMENT_POSITION_FOLLOWING (other follows this)
    }
    if (this.docOrderIndex > other.docOrderIndex) {
      return 2; // Node.DOCUMENT_POSITION_PRECEDING (other precedes this)
    }
    return 0;
  }

  closest(selector: string): MockFocusElement | null {
    if (selector === "form" || selector.includes("form")) {
      if (this.form) return this.form;
      let cur: MockFocusElement | null | undefined = this.parentElement;
      while (cur) {
        if (cur.tagName === "FORM") return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    if (selector.includes("[hidden]") && (this.hidden || this.hasAttribute("hidden"))) return this;
    if (selector.includes("[inert]") && (this.inert || this.hasAttribute("inert"))) return this;
    if (selector.includes("[aria-hidden='true']") && this.getAttribute("aria-hidden") === "true") {
      return this;
    }
    if (this.parentElement) {
      return this.parentElement.closest(selector);
    }
    return null;
  }
}

function createMockFormElement(): MockFocusElement {
  const formEl = new MockFocusElement();
  formEl.tagName = "FORM";
  formEl.nodeName = "FORM";
  return formEl;
}

describe("Vanilla DOM Focus & A11y Contract Matrix (P2d)", () => {
  test("Scenario A: focuses single invalid bound field", () => {
    const field = createField({
      initialValue: "",
      rules: [(val: string) => (!val ? { code: "required", message: "Required" } : null)],
    });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const inputEl = new MockFocusElement();
    inputEl.id = "field-input";
    inputEl.form = formEl;
    formBinding.bindField(field, inputEl);

    field.validate();
    expect(field.invalid.get()).toBe(true);

    const result = formBinding.focusInvalid();
    expect(result.hasInvalidFields).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);
    expect(result.focused).toBe(true);
    expect(inputEl.focused).toBe(true);
  });

  test("Scenario B: multiple invalid fields select first in current DOM order, not object key order", () => {
    const fieldZ = createField({
      initialValue: "",
      rules: [() => ({ code: "err" })],
    });
    const fieldA = createField({
      initialValue: "",
      rules: [() => ({ code: "err" })],
    });

    // Form created with Z before A
    const form = createForm({ fields: { z: fieldZ, a: fieldA } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const inputZ = new MockFocusElement();
    inputZ.id = "input-z";
    inputZ.docOrderIndex = 20; // Appears second in DOM

    const inputA = new MockFocusElement();
    inputA.id = "input-a";
    inputA.docOrderIndex = 10; // Appears first in DOM

    formBinding.bindField(fieldZ, inputZ);
    formBinding.bindField(fieldA, inputA);

    fieldZ.validate();
    fieldA.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(inputA.focused).toBe(true);
    expect(inputZ.focused).toBe(false);
  });

  test("Scenario C: invalid field not currently bound to DOM is skipped safely without error", () => {
    const unboundField = createField({
      initialValue: "",
      rules: [() => ({ code: "err" })],
    });
    const boundField = createField({
      initialValue: "",
      rules: [() => ({ code: "err" })],
    });

    const form = createForm({ fields: { unbound: unboundField, bound: boundField } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const boundInput = new MockFocusElement();
    boundInput.id = "bound-input";
    formBinding.bindField(boundField, boundInput);

    unboundField.validate();
    boundField.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(boundInput.focused).toBe(true);
  });

  test("Scenario D: disabled invalid field is skipped in favor of next eligible invalid control", () => {
    const field1 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const field2 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });

    const form = createForm({ fields: { f1: field1, f2: field2 } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input1 = new MockFocusElement();
    input1.docOrderIndex = 1;
    input1.disabled = true;

    const input2 = new MockFocusElement();
    input2.docOrderIndex = 2;

    formBinding.bindField(field1, input1);
    formBinding.bindField(field2, input2);

    field1.validate();
    field2.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(input1.focused).toBe(false);
    expect(input2.focused).toBe(true);
  });

  test("Scenario E: hidden and type='hidden' invalid controls are skipped", () => {
    const field1 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const field2 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });

    const form = createForm({ fields: { f1: field1, f2: field2 } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input1 = new MockFocusElement();
    input1.type = "hidden";
    input1.docOrderIndex = 1;

    const input2 = new MockFocusElement();
    input2.docOrderIndex = 2;

    formBinding.bindField(field1, input1);
    formBinding.bindField(field2, input2);

    field1.validate();
    field2.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(input1.focused).toBe(false);
    expect(input2.focused).toBe(true);
  });

  test("Scenario F: invalid field inside hidden or inert ancestor container is skipped", () => {
    const field1 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const field2 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });

    const form = createForm({ fields: { f1: field1, f2: field2 } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const containerHidden = new MockFocusElement();
    containerHidden.hidden = true;

    const input1 = new MockFocusElement();
    input1.docOrderIndex = 1;
    input1.parentElement = containerHidden;

    const input2 = new MockFocusElement();
    input2.docOrderIndex = 2;

    formBinding.bindField(field1, input1);
    formBinding.bindField(field2, input2);

    field1.validate();
    field2.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(input1.focused).toBe(false);
    expect(input2.focused).toBe(true);
  });

  test("Scenario G: field that becomes valid before focus request is not focused", () => {
    const field = createField({
      initialValue: "invalid",
      rules: [(v: string) => (v === "invalid" ? { code: "err" } : null)],
    });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    field.validate();
    expect(field.invalid.get()).toBe(true);

    // Fix field before calling focus
    field.setValue("valid");
    expect(field.invalid.get()).toBe(false);

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(false);
    expect(result.hasInvalidFields).toBe(false);
    expect(input.focused).toBe(false);
  });

  test("Scenario H: bound control removed during async validation is safely skipped without mutation", async () => {
    const field = createField({
      initialValue: "test",
      rules: [
        async (v: unknown) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return v === "test" ? { code: "async_err" } : null;
        },
      ],
    });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    const valPromise = field.validate();

    // Detach element before async validation finishes
    input.isConnected = false;

    await valPromise;
    expect(field.invalid.get()).toBe(true);

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(false);
    expect(result.hasEligibleTarget).toBe(false);
    expect(input.focused).toBe(false);
  });

  test("Scenario I: dynamic P2b unregister removes field from focus eligibility", () => {
    const fieldA = createField<string>({ initialValue: "a", rules: [() => ({ code: "err" })] });
    const fieldB = createField<string>({ initialValue: "b", rules: [() => ({ code: "err" })] });

    const form = createForm<{ a?: FieldState<string>; b: FieldState<string> }>({
      fields: { a: fieldA, b: fieldB },
    });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const inputA = new MockFocusElement();
    inputA.docOrderIndex = 1;
    const inputB = new MockFocusElement();
    inputB.docOrderIndex = 2;

    formBinding.bindField(fieldA, inputA);
    formBinding.bindField(fieldB, inputB);

    fieldA.validate();
    fieldB.validate();

    // Unregister field A dynamically
    form.unregister("a");

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(inputA.focused).toBe(false);
    expect(inputB.focused).toBe(true);
  });

  test("Scenario J: FieldArray reorder updates chosen focus target to current DOM order", () => {
    const f0 = createField({ initialValue: "item1", rules: [() => ({ code: "err" })] });
    const f1 = createField({ initialValue: "item2", rules: [() => ({ code: "err" })] });
    const array = createFieldArray({ items: [f0, f1] });
    const form = createForm({ fields: { items: array } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const row0 = array.items.get()[0]!;
    const row1 = array.items.get()[1]!;

    const input0 = new MockFocusElement();
    input0.docOrderIndex = 10;
    const input1 = new MockFocusElement();
    input1.docOrderIndex = 20;

    formBinding.bindField(row0.node, input0);
    formBinding.bindField(row1.node, input1);

    row0.node.validate();
    row1.node.validate();

    // Reorder DOM rows so row1 is physically first in document
    input0.docOrderIndex = 50;
    input1.docOrderIndex = 5;

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(input1.focused).toBe(true);
    expect(input0.focused).toBe(false);
  });

  test("Scenario K: multiple controls for one field select visible element over hidden element", () => {
    const field = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const mobileInput = new MockFocusElement();
    mobileInput.docOrderIndex = 1;
    mobileInput.hidden = true; // Responsive hidden

    const desktopInput = new MockFocusElement();
    desktopInput.docOrderIndex = 2;

    formBinding.bindField(field, mobileInput);
    formBinding.bindField(field, desktopInput);

    field.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(mobileInput.focused).toBe(false);
    expect(desktopInput.focused).toBe(true);
  });

  test("Scenario L: radio group focuses checked radio if present, otherwise first in DOM order", () => {
    const radioField = createField({ initialValue: "opt2", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { payment: radioField } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const r1 = new MockFocusElement();
    r1.type = "radio";
    r1.value = "opt1";
    r1.docOrderIndex = 1;

    const r2 = new MockFocusElement();
    r2.type = "radio";
    r2.value = "opt2";
    r2.checked = true; // Checked!
    r2.docOrderIndex = 2;

    const r3 = new MockFocusElement();
    r3.type = "radio";
    r3.value = "opt3";
    r3.docOrderIndex = 3;

    formBinding.bindField(radioField, r1);
    formBinding.bindField(radioField, r2);
    formBinding.bindField(radioField, r3);

    radioField.validate();

    const resChecked = formBinding.focusInvalid();
    expect(resChecked.focused).toBe(true);
    expect(r2.focused).toBe(true);
    expect(r1.focused).toBe(false);

    // If none is checked:
    r2.focused = false;
    r2.checked = false;
    const resUnchecked = formBinding.focusInvalid();
    expect(resUnchecked.focused).toBe(true);
    expect(r1.focused).toBe(true);
  });

  test("Scenarios M, N, O, P, Q: supports checkbox, file, text, select-one, and custom controls", () => {
    const cbField = createField({ initialValue: false, rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { cb: cbField } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const cbInput = new MockFocusElement();
    cbInput.type = "checkbox";
    formBinding.bindField(cbField, cbInput);

    cbField.validate();
    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(cbInput.focused).toBe(true);
  });

  test("Scenario R: form with zero invalid controls returns false for focused and hasInvalidFields", () => {
    const field = createField({ initialValue: "valid" });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(false);
    expect(result.hasInvalidFields).toBe(false);
    expect(result.hasEligibleTarget).toBe(false);
    expect(input.focused).toBe(false);
  });

  test("Scenario S: submit action throws error without side effects from focus orchestration", async () => {
    const field = createField({ initialValue: "valid" });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();

    let caughtException: unknown = null;
    const formBinding = bindForm(form, formEl, {
      focusInvalidOnSubmit: true,
      action: async () => {
        throw new Error("Network crash");
      },
      onSubmitException: (err) => {
        caughtException = err;
      },
    });

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    // Trigger DOM submit
    formEl.dispatch("submit");
    await new Promise((r) => setTimeout(r, 20));

    expect(caughtException).toBeInstanceOf(Error);
    expect((caughtException as Error).message).toBe("Network crash");
    expect(input.focused).toBe(false);
  });

  test("Scenario S2: submit failure with focusInvalidOnSubmit automatically focuses invalid control", async () => {
    const field = createField({ initialValue: "", rules: [() => ({ code: "required" })] });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();

    let errorCount = 0;
    const formBinding = bindForm(form, formEl, {
      focusInvalidOnSubmit: true,
      onSubmitError: () => {
        errorCount++;
      },
    });

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    formEl.dispatch("submit");
    await new Promise((r) => setTimeout(r, 20));

    expect(errorCount).toBe(1);
    expect(input.focused).toBe(true);
  });

  test("Scenario W: binding disposal cleans up registry and subsequent focus calls return false", () => {
    const field = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    field.validate();

    formBinding.dispose();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(false);
    expect(input.focused).toBe(false);
  });

  test("Scroll options: passes scroll options to scrollIntoView and coordinates preventScroll", () => {
    const field = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    field.validate();

    const result = formBinding.focusInvalid({
      scroll: { behavior: "smooth", block: "center" },
    });

    expect(result.focused).toBe(true);
    expect(result.scrolled).toBe(true);
    expect(input.focused).toBe(true);
    expect(input.scrolled).toBe(true);
    expect(input.scrollOptionsReceived).toEqual({ behavior: "smooth", block: "center" });
    // preventScroll should be true to avoid duplicate scrolling
    expect(input.focusOptionsReceived).toEqual({ preventScroll: true });
  });

  test("Scroll-only mode: focus: false performs scroll without calling focus", () => {
    const field = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    field.validate();

    const result = formBinding.focusInvalid({
      scroll: true,
      focus: false,
    });

    expect(result.focused).toBe(false);
    expect(result.scrolled).toBe(true);
    expect(input.focused).toBe(false);
    expect(input.scrolled).toBe(true);
  });

  test("Standalone focusInvalid and focusFirstInvalid functions delegate to formBinding", () => {
    const field = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { field } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input = new MockFocusElement();
    formBinding.bindField(field, input);

    field.validate();

    const res1 = focusInvalid(formBinding);
    expect(res1.focused).toBe(true);

    input.focused = false;
    const res2 = focusFirstInvalid(formBinding);
    expect(res2.focused).toBe(true);
  });

  test("Target throwing during focus() fails safe and tries next candidate", () => {
    const f1 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const f2 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { f1, f2 } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input1 = new MockFocusElement();
    input1.docOrderIndex = 1;
    input1.throwOnFocus = true; // Throws!

    const input2 = new MockFocusElement();
    input2.docOrderIndex = 2;

    formBinding.bindField(f1, input1);
    formBinding.bindField(f2, input2);

    f1.validate();
    f2.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(input1.focused).toBe(false);
    expect(input2.focused).toBe(true);
  });

  test("Focusability detection: distinguishes genuinely focusable elements from plain non-focusable containers", () => {
    const plainDiv = new MockFocusElement();
    plainDiv.tagName = "DIV";
    plainDiv.nodeName = "DIV";
    expect(isElementFocusable(plainDiv)).toBe(false);

    const plainSpan = new MockFocusElement();
    plainSpan.tagName = "SPAN";
    plainSpan.nodeName = "SPAN";
    expect(isElementFocusable(plainSpan)).toBe(false);

    const divWithNegativeTabindex = new MockFocusElement();
    divWithNegativeTabindex.tagName = "DIV";
    divWithNegativeTabindex.setAttribute("tabindex", "-1");
    expect(isElementFocusable(divWithNegativeTabindex)).toBe(true);

    const divWithZeroTabindex = new MockFocusElement();
    divWithZeroTabindex.tagName = "DIV";
    divWithZeroTabindex.setAttribute("tabindex", "0");
    expect(isElementFocusable(divWithZeroTabindex)).toBe(true);

    const divWithPositiveTabindex = new MockFocusElement();
    divWithPositiveTabindex.tagName = "DIV";
    divWithPositiveTabindex.setAttribute("tabindex", "2");
    expect(isElementFocusable(divWithPositiveTabindex)).toBe(true);

    const divWithInvalidTabindex = new MockFocusElement();
    divWithInvalidTabindex.tagName = "DIV";
    divWithInvalidTabindex.setAttribute("tabindex", "invalid");
    expect(isElementFocusable(divWithInvalidTabindex)).toBe(false);

    const divWithEmptyTabindex = new MockFocusElement();
    divWithEmptyTabindex.tagName = "DIV";
    divWithEmptyTabindex.setAttribute("tabindex", "");
    expect(isElementFocusable(divWithEmptyTabindex)).toBe(false);

    const buttonEl = new MockFocusElement();
    buttonEl.tagName = "BUTTON";
    expect(isElementFocusable(buttonEl)).toBe(true);

    const anchorWithHref = new MockFocusElement();
    anchorWithHref.tagName = "A";
    anchorWithHref.setAttribute("href", "/target");
    expect(isElementFocusable(anchorWithHref)).toBe(true);

    const anchorWithoutHref = new MockFocusElement();
    anchorWithoutHref.tagName = "A";
    expect(isElementFocusable(anchorWithoutHref)).toBe(false);
  });

  test("Fieldset disabled semantics: skips disabled fieldset controls unless in first legend", () => {
    const fieldset = new MockFocusElement();
    fieldset.tagName = "FIELDSET";
    fieldset.disabled = true;

    const normalInputInDisabledFieldset = new MockFocusElement();
    normalInputInDisabledFieldset.parentElement = fieldset;
    fieldset.children.push(normalInputInDisabledFieldset);
    expect(isElementFocusable(normalInputInDisabledFieldset)).toBe(false);

    const legend = new MockFocusElement();
    legend.tagName = "LEGEND";
    fieldset.children.unshift(legend); // First legend of disabled fieldset

    const inputInsideLegend = new MockFocusElement();
    inputInsideLegend.parentElement = legend;
    legend.children.push(inputInsideLegend);
    expect(isElementFocusable(inputInsideLegend)).toBe(true);
  });

  test("Silent focus failure: falls back to next candidate when focus() does not transfer focus", () => {
    const f1 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const f2 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { f1, f2 } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input1 = new MockFocusElement();
    input1.docOrderIndex = 1;
    input1.failFocusSilently = true; // Simulates silent focus rejection

    const input2 = new MockFocusElement();
    input2.docOrderIndex = 2;

    formBinding.bindField(f1, input1);
    formBinding.bindField(f2, input2);

    f1.validate();
    f2.validate();

    const result = formBinding.focusInvalid();
    expect(result.hasInvalidFields).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);
    expect(result.focused).toBe(true);
    expect(input1.focused).toBe(false);
    expect(input2.focused).toBe(true);
  });

  test("Silent focus failure on all candidates reports focused: false and hasEligibleTarget: true", () => {
    const f1 = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { f1 } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const input1 = new MockFocusElement();
    input1.failFocusSilently = true;

    formBinding.bindField(f1, input1);
    f1.validate();

    const result = formBinding.focusInvalid();
    expect(result.hasInvalidFields).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);
    expect(result.focused).toBe(false);
    expect(input1.focused).toBe(false);
  });

  test("Radio group skips disabled checked radio in favor of first eligible radio", () => {
    const radioField = createField({ initialValue: "opt2", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { radio: radioField } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const r1 = new MockFocusElement();
    r1.type = "radio";
    r1.value = "opt1";
    r1.docOrderIndex = 1;

    const r2 = new MockFocusElement();
    r2.type = "radio";
    r2.value = "opt2";
    r2.checked = true;
    r2.disabled = true; // Checked but disabled!
    r2.docOrderIndex = 2;

    formBinding.bindField(radioField, r1);
    formBinding.bindField(radioField, r2);

    radioField.validate();

    const result = formBinding.focusInvalid();
    expect(result.focused).toBe(true);
    expect(r2.focused).toBe(false);
    expect(r1.focused).toBe(true);
  });

  test("Radio group with all members disabled returns hasEligibleTarget: false", () => {
    const radioField = createField({ initialValue: "", rules: [() => ({ code: "err" })] });
    const form = createForm({ fields: { radio: radioField } });
    const formEl = createMockFormElement();
    const formBinding = bindForm(form, formEl);

    const r1 = new MockFocusElement();
    r1.type = "radio";
    r1.disabled = true;

    const r2 = new MockFocusElement();
    r2.type = "radio";
    r2.hidden = true;

    formBinding.bindField(radioField, r1);
    formBinding.bindField(radioField, r2);

    radioField.validate();

    const result = formBinding.focusInvalid();
    expect(result.hasInvalidFields).toBe(true);
    expect(result.hasEligibleTarget).toBe(false);
    expect(result.focused).toBe(false);
  });
});
