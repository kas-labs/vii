import { createField, createForm } from "@vii-labs/form";
import { bindForm } from "@vii-labs/form/vanilla";
import { getRegistryForFormBinding } from "../../../src/adapters/vanilla/focus.js";
import type { ViiP1kBridge } from "./types.js";

export function mountFocusFirstInvalid(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "focus-first-form";

  const nameInput = document.createElement("input");
  nameInput.id = "input-name";
  nameInput.type = "text";
  nameInput.name = "name";

  const emailInput = document.createElement("input");
  emailInput.id = "input-email";
  emailInput.type = "text";
  emailInput.name = "email";

  const submitBtn = document.createElement("button");
  submitBtn.id = "submit-btn";
  submitBtn.type = "submit";
  submitBtn.textContent = "Submit";

  formEl.appendChild(nameInput);
  formEl.appendChild(emailInput);
  formEl.appendChild(submitBtn);
  container.appendChild(formEl);

  const nameField = createField({
    initialValue: "",
    rules: [(v) => (!v ? { code: "required", message: "Name is required" } : null)],
  });
  const emailField = createField({
    initialValue: "",
    rules: [(v) => (!v ? { code: "required", message: "Email is required" } : null)],
  });

  const form = createForm({ fields: { name: nameField, email: emailField } });
  const formBinding = bindForm(form, formEl, {
    focusInvalidOnSubmit: true,
  });

  const nameBinding = formBinding.bindField(nameField, nameInput);
  const emailBinding = formBinding.bindField(emailField, emailInput);

  bridge.form = form;
  bridge.formBinding = formBinding;
  bridge.nameBinding = nameBinding;
  bridge.emailBinding = emailBinding;
}

export function mountFocusDomOrder(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "dom-order-form";

  const wrapper1 = document.createElement("div");
  wrapper1.id = "wrapper-1";
  const input1 = document.createElement("input");
  input1.id = "order-input-1";
  wrapper1.appendChild(input1);

  const wrapper2 = document.createElement("div");
  wrapper2.id = "wrapper-2";
  const input2 = document.createElement("input");
  input2.id = "order-input-2";
  wrapper2.appendChild(input2);

  formEl.appendChild(wrapper1);
  formEl.appendChild(wrapper2);
  container.appendChild(formEl);

  const field1 = createField({
    initialValue: "",
    rules: [() => ({ code: "err1", message: "Field 1 error" })],
  });
  const field2 = createField({
    initialValue: "",
    rules: [() => ({ code: "err2", message: "Field 2 error" })],
  });

  const form = createForm({ fields: { f1: field1, f2: field2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(field1, input1);
  formBinding.bindField(field2, input2);

  field1.validate();
  field2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
  bridge.swapDomOrder = () => {
    // Physically swap wrappers in DOM
    formEl.insertBefore(wrapper2, wrapper1);
  };
}

export function mountFocusRadioGroup(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "radio-form";

  const r1 = document.createElement("input");
  r1.type = "radio";
  r1.name = "payment";
  r1.value = "card";
  r1.id = "radio-card";

  const r2 = document.createElement("input");
  r2.type = "radio";
  r2.name = "payment";
  r2.value = "paypal";
  r2.id = "radio-paypal";

  const r3 = document.createElement("input");
  r3.type = "radio";
  r3.name = "payment";
  r3.value = "apple";
  r3.id = "radio-apple";

  formEl.appendChild(r1);
  formEl.appendChild(r2);
  formEl.appendChild(r3);
  container.appendChild(formEl);

  const paymentField = createField({
    initialValue: "",
    rules: [(v) => (!v ? { code: "required", message: "Select payment method" } : null)],
  });

  const form = createForm({ fields: { payment: paymentField } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(paymentField, r1);
  formBinding.bindField(paymentField, r2);
  formBinding.bindField(paymentField, r3);

  paymentField.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
  bridge.paymentField = paymentField;
}

export function mountFocusScroll(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "scroll-form";

  const topInput = document.createElement("input");
  topInput.id = "top-input";
  topInput.type = "text";
  topInput.value = "Valid top input";

  const spacer = document.createElement("div");
  spacer.style.height = "1200px";
  spacer.textContent = "Tall spacer pushing invalid input below fold";

  const bottomInput = document.createElement("input");
  bottomInput.id = "bottom-input";
  bottomInput.type = "text";

  formEl.appendChild(topInput);
  formEl.appendChild(spacer);
  formEl.appendChild(bottomInput);
  container.appendChild(formEl);

  const topField = createField({ initialValue: "valid" });
  const bottomField = createField({
    initialValue: "",
    rules: [() => ({ code: "err", message: "Bottom error" })],
  });

  const form = createForm({ fields: { top: topField, bottom: bottomField } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(topField, topInput);
  formBinding.bindField(bottomField, bottomInput);

  bottomField.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusDynamicUnregister(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "dynamic-form";

  const optInput = document.createElement("input");
  optInput.id = "opt-input";

  const reqInput = document.createElement("input");
  reqInput.id = "req-input";

  formEl.appendChild(optInput);
  formEl.appendChild(reqInput);
  container.appendChild(formEl);

  const optField = createField<string>({
    initialValue: "",
    rules: [() => ({ code: "err_opt", message: "Optional invalid" })],
  });
  const reqField = createField<string>({
    initialValue: "",
    rules: [() => ({ code: "err_req", message: "Required invalid" })],
  });

  const form = createForm<{ opt?: typeof optField; req: typeof reqField }>({
    fields: { opt: optField, req: reqField },
  });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(optField, optInput);
  formBinding.bindField(reqField, reqInput);

  optField.validate();
  reqField.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
  bridge.unregisterOpt = () => {
    form.unregister("opt");
  };
}

export function mountFocusA11yAudit(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "a11y-focus-form";

  const labelName = document.createElement("label");
  labelName.htmlFor = "a11y-name";
  labelName.textContent = "Full Name";

  const nameInput = document.createElement("input");
  nameInput.id = "a11y-name";
  nameInput.type = "text";

  const issueName = document.createElement("div");
  issueName.id = "a11y-name-issue";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Save Profile";

  formEl.appendChild(labelName);
  formEl.appendChild(nameInput);
  formEl.appendChild(issueName);
  formEl.appendChild(submitBtn);
  container.appendChild(formEl);

  const nameField = createField({
    initialValue: "",
    rules: [(v) => (!v ? { code: "required", message: "Name is required" } : null)],
  });

  const form = createForm({ fields: { name: nameField } });
  const formBinding = bindForm(form, formEl, {
    focusInvalidOnSubmit: true,
  });

  formBinding.bindField(nameField, nameInput, {
    issueElement: issueName,
    ariaInvalid: true,
    ariaDescribedBy: true,
  });

  nameField.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusPlainDivVsTabindex(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "plain-div-form";

  const plainDiv = document.createElement("div");
  plainDiv.id = "plain-div";
  plainDiv.textContent = "Plain Div Without Tabindex";

  const tabindexDiv = document.createElement("div");
  tabindexDiv.id = "tabindex-div";
  tabindexDiv.setAttribute("tabindex", "-1");
  tabindexDiv.textContent = "Div with tabindex -1";

  formEl.appendChild(plainDiv);
  formEl.appendChild(tabindexDiv);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  const registry = getRegistryForFormBinding(formBinding);
  if (registry) {
    registry.register(f1, plainDiv);
    registry.register(f2, tabindexDiv);
  }

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusFieldsetDisabled(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "fieldset-disabled-form";

  const fieldset = document.createElement("fieldset");
  fieldset.disabled = true;

  const normalInput = document.createElement("input");
  normalInput.id = "disabled-fieldset-input";
  normalInput.type = "text";

  const legend = document.createElement("legend");
  const legendInput = document.createElement("input");
  legendInput.id = "legend-input";
  legendInput.type = "text";
  legend.appendChild(legendInput);

  fieldset.appendChild(normalInput);
  fieldset.appendChild(legend);
  formEl.appendChild(fieldset);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(f1, normalInput);
  formBinding.bindField(f2, legendInput);

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusSilentFailureFallback(
  container: HTMLElement,
  bridge: ViiP1kBridge,
): void {
  const formEl = document.createElement("form");
  formEl.id = "silent-failure-form";

  const failInput = document.createElement("input");
  failInput.id = "silent-fail-input";
  failInput.type = "text";
  // Immediately blur whenever focused, simulating silent rejection / focus prevention
  failInput.addEventListener("focus", () => {
    failInput.blur();
  });

  const fallbackInput = document.createElement("input");
  fallbackInput.id = "fallback-input";
  fallbackInput.type = "text";

  formEl.appendChild(failInput);
  formEl.appendChild(fallbackInput);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(f1, failInput);
  formBinding.bindField(f2, fallbackInput);

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusRadioDisabledCheck(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "radio-disabled-form";

  const r1 = document.createElement("input");
  r1.type = "radio";
  r1.name = "plan";
  r1.value = "pro";
  r1.id = "radio-pro-disabled";
  r1.checked = true;
  r1.disabled = true; // Checked but disabled!

  const r2 = document.createElement("input");
  r2.type = "radio";
  r2.name = "plan";
  r2.value = "free";
  r2.id = "radio-free-enabled";

  formEl.appendChild(r1);
  formEl.appendChild(r2);
  container.appendChild(formEl);

  const planField = createField({
    initialValue: "pro",
    rules: [() => ({ code: "err" })],
  });
  const form = createForm({ fields: { plan: planField } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(planField, r1);
  formBinding.bindField(planField, r2);

  planField.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}
