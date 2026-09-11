import type { ObjectDirective } from "vue";
import type { FieldState } from "../../core/types.js";

interface ElementBindingState {
  readonly field: FieldState<unknown, unknown>;
  readonly unsubscribe: () => void;
  readonly onInput: (e: Event) => void;
  readonly onBlur: () => void;
}

const elementStateMap = new WeakMap<HTMLElement, ElementBindingState>();

/**
 * Vue directive for declarative two-way DOM binding to a Vii FieldState.
 *
 * Usage in template:
 * `<input v-vii-field="nameField" />`
 */
export const vViiField: ObjectDirective<HTMLElement, FieldState<unknown, unknown>> = {
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

function bindElement(el: HTMLElement, field: FieldState<unknown, unknown> | undefined): void {
  if (!field?.setRawValue) return;

  const isCheckbox = (el as HTMLInputElement).type === "checkbox";
  const updateDom = (val: unknown): void => {
    if (isCheckbox) (el as HTMLInputElement).checked = Boolean(val);
    else if ("value" in el) (el as HTMLInputElement).value = String(val ?? "");
  };

  updateDom(field.rawValue.get());
  const unsubscribe = field.rawValue.subscribe(updateDom);

  const onInput = (e: Event): void => {
    const t = e.target as { value?: unknown; checked?: boolean } | null;
    field.setRawValue(isCheckbox ? Boolean(t?.checked) : (t?.value ?? ""));
  };

  const onBlur = (): void => {
    field.markTouched();
  };

  const eventName = isCheckbox ? "change" : "input";
  el.addEventListener(eventName, onInput);
  el.addEventListener("blur", onBlur);

  elementStateMap.set(el, { field, unsubscribe, onInput, onBlur });
}

function unbindElement(el: HTMLElement): void {
  const state = elementStateMap.get(el);
  if (!state) return;
  elementStateMap.delete(el);
  state.unsubscribe();
  const eventName = (el as HTMLInputElement).type === "checkbox" ? "change" : "input";
  el.removeEventListener(eventName, state.onInput);
  el.removeEventListener("blur", state.onBlur);
}
