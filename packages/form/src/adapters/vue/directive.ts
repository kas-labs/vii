import type { ObjectDirective } from "vue";
import type { SupportedVueFieldElement, SupportedVueFieldState } from "./types.js";

interface ElementBindingState {
  readonly field: SupportedVueFieldState;
  readonly unsubscribe: () => void;
  readonly onInput: (e: Event) => void;
  readonly onBlur: () => void;
}

const elementStateMap = new WeakMap<SupportedVueFieldElement, ElementBindingState>();

/**
 * Vue directive for declarative two-way DOM binding to a Vii FieldState.
 *
 * Supported controls:
 * - Text-like inputs (`<input type="text">`, `<input type="email">`, etc.) with `string` raw values.
 * - Textarea elements (`<textarea>`) with `string` raw values.
 * - Checkbox inputs (`<input type="checkbox">`) with `boolean` raw values.
 *
 * Excluded controls:
 * - Radio groups, file inputs, select[multiple], or custom controls are not supported
 *   by this directive. Use `useViiField` with `v-model` or explicit bindings for those.
 *
 * Usage in template:
 * `<input v-vii-field="nameField" />`
 */
export const vViiField: ObjectDirective<SupportedVueFieldElement, SupportedVueFieldState> = {
  mounted(el, binding) {
    bindElement(el, binding.value);
  },

  updated(el, binding) {
    const state = elementStateMap.get(el);
    if (!state || binding.value === state.field) return;
    unbindElement(el);
    bindElement(el, binding.value);
  },

  unmounted(el) {
    unbindElement(el);
  },
};

function bindElement(
  el: SupportedVueFieldElement,
  field: SupportedVueFieldState | undefined,
): void {
  if (!field?.setRawValue) return;
  const tag = el.tagName;
  const t = (el as HTMLInputElement).type;
  if (tag && tag !== "INPUT" && tag !== "TEXTAREA") return;
  if (t === "file" || t === "radio") return;

  const isCheckbox = t === "checkbox";
  const updateDom = (val: unknown): void => {
    if (isCheckbox) (el as HTMLInputElement).checked = Boolean(val);
    else if ("value" in el) (el as HTMLInputElement).value = String(val ?? "");
  };

  updateDom(field.rawValue.get());
  const unsubscribe = field.rawValue.subscribe(updateDom);

  const onInput = (e: Event): void => {
    const target = e.target as { value?: unknown; checked?: boolean } | null;
    const next = isCheckbox ? Boolean(target?.checked) : (target?.value ?? "");
    (field.setRawValue as (v: unknown) => void)(next);
  };

  const onBlur = (): void => {
    field.markTouched();
  };

  const eventName = isCheckbox ? "change" : "input";
  el.addEventListener(eventName, onInput);
  el.addEventListener("blur", onBlur);

  elementStateMap.set(el, { field, unsubscribe, onInput, onBlur });
}

function unbindElement(el: SupportedVueFieldElement): void {
  const state = elementStateMap.get(el);
  if (!state) return;
  elementStateMap.delete(el);
  state.unsubscribe();
  const eventName = (el as HTMLInputElement).type === "checkbox" ? "change" : "input";
  el.removeEventListener(eventName, state.onInput);
  el.removeEventListener("blur", state.onBlur);
}
