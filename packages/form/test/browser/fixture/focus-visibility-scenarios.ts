import { createField, createForm } from "@vii-labs/form";
import { bindForm } from "@vii-labs/form/vanilla";
import type { ViiP1kBridge } from "./types.js";

export function mountFocusAncestorDisplayNone(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "ancestor-display-none-form";

  const hiddenWrapper = document.createElement("div");
  hiddenWrapper.style.display = "none";
  const hiddenInput = document.createElement("input");
  hiddenInput.id = "hidden-by-ancestor-display";
  hiddenWrapper.appendChild(hiddenInput);

  const visibleWrapper = document.createElement("div");
  const visibleInput = document.createElement("input");
  visibleInput.id = "visible-fallback-display";
  visibleWrapper.appendChild(visibleInput);

  formEl.appendChild(hiddenWrapper);
  formEl.appendChild(visibleWrapper);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(f1, hiddenInput);
  formBinding.bindField(f2, visibleInput);

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusAncestorVisibilityHidden(
  container: HTMLElement,
  bridge: ViiP1kBridge,
): void {
  const formEl = document.createElement("form");
  formEl.id = "ancestor-visibility-hidden-form";

  const hiddenWrapper = document.createElement("div");
  hiddenWrapper.style.visibility = "hidden";
  const hiddenInput = document.createElement("input");
  hiddenInput.id = "hidden-by-ancestor-visibility";
  hiddenWrapper.appendChild(hiddenInput);

  const visibleWrapper = document.createElement("div");
  const visibleInput = document.createElement("input");
  visibleInput.id = "visible-fallback-visibility";
  visibleWrapper.appendChild(visibleInput);

  formEl.appendChild(hiddenWrapper);
  formEl.appendChild(visibleWrapper);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(f1, hiddenInput);
  formBinding.bindField(f2, visibleInput);

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusScrollFallback(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "scroll-fallback-form";

  const hiddenWrapper = document.createElement("div");
  hiddenWrapper.style.display = "none";
  const hiddenInput = document.createElement("input");
  hiddenInput.id = "scroll-hidden-input";
  hiddenWrapper.appendChild(hiddenInput);

  const spacer = document.createElement("div");
  spacer.style.height = "1200px";

  const visibleWrapper = document.createElement("div");
  const visibleInput = document.createElement("input");
  visibleInput.id = "scroll-visible-input";
  visibleWrapper.appendChild(visibleInput);

  formEl.appendChild(hiddenWrapper);
  formEl.appendChild(spacer);
  formEl.appendChild(visibleWrapper);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(f1, hiddenInput);
  formBinding.bindField(f2, visibleInput);

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}

export function mountFocusAllCssHidden(container: HTMLElement, bridge: ViiP1kBridge): void {
  const formEl = document.createElement("form");
  formEl.id = "all-css-hidden-form";

  const hiddenWrapper = document.createElement("div");
  hiddenWrapper.style.display = "none";
  const hiddenInput1 = document.createElement("input");
  hiddenInput1.id = "all-hidden-input-1";
  const hiddenInput2 = document.createElement("input");
  hiddenInput2.id = "all-hidden-input-2";
  hiddenWrapper.appendChild(hiddenInput1);
  hiddenWrapper.appendChild(hiddenInput2);

  formEl.appendChild(hiddenWrapper);
  container.appendChild(formEl);

  const f1 = createField({ initialValue: "", rules: [() => ({ code: "err1" })] });
  const f2 = createField({ initialValue: "", rules: [() => ({ code: "err2" })] });
  const form = createForm({ fields: { f1, f2 } });
  const formBinding = bindForm(form, formEl);

  formBinding.bindField(f1, hiddenInput1);
  formBinding.bindField(f2, hiddenInput2);

  f1.validate();
  f2.validate();

  bridge.form = form;
  bridge.formBinding = formBinding;
}
