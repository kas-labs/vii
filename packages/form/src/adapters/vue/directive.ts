import type { DirectiveBinding } from "vue";
import type { FieldState } from "../../core/types.js";
import type {
  SupportedVueFieldElement,
  SupportedVueFieldState,
  ViiFieldDirective,
} from "./types.js";

interface ElementBindingState {
  readonly field: SupportedVueFieldState;
  readonly unsubscribe: () => void;
  readonly onInput: (e: Event) => void;
  readonly onBlur: () => void;
}

const elementStateMap = new WeakMap<SupportedVueFieldElement, ElementBindingState>();

function isBooleanField(field: SupportedVueFieldState): field is FieldState<unknown, boolean> {
  return typeof field.rawValue.get() === "boolean";
}

function isStringField(field: SupportedVueFieldState): field is FieldState<unknown, string> {
  return typeof field.rawValue.get() === "string";
}

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
 * Generic DOM Limitation:
 * DOM `<input type="checkbox">` cannot be statically differentiated from `<input type="text">`
 * in TypeScript because `HTMLInputElement.type` is typed as `string`. The directive therefore
 * enforces type safety at runtime: if a checkbox element is paired with a string field, or a
 * text-like input / textarea is paired with a boolean field, the directive fails closed without
 * attaching listeners or subscribing to state updates.
 *
 * Usage in template:
 * `<input v-vii-field="nameField" />`
 */
export const vViiField: ViiFieldDirective = {
  mounted(el: SupportedVueFieldElement, binding: DirectiveBinding<SupportedVueFieldState>) {
    bindElement(el, binding.value);
  },

  updated(el: SupportedVueFieldElement, binding: DirectiveBinding<SupportedVueFieldState>) {
    if (elementStateMap.get(el)?.field !== binding.value) {
      unbindElement(el);
      bindElement(el, binding.value);
    }
  },

  unmounted: unbindElement,
};

function bindElement(
  el: SupportedVueFieldElement,
  field: SupportedVueFieldState | undefined,
): void {
  if (!field?.setRawValue) return;
  const tag = el.tagName;
  const t = (el as HTMLInputElement).type;
  if (tag !== "INPUT" && tag !== "TEXTAREA") return;
  if (t === "file" || t === "radio") return;

  const isCheckbox = t === "checkbox";
  if (isCheckbox ? !isBooleanField(field) : !isStringField(field)) return;

  const inputEl = el as HTMLInputElement;
  const update = (): void => {
    if (isCheckbox) inputEl.checked = (field as FieldState<unknown, boolean>).rawValue.get();
    else inputEl.value = (field as FieldState<unknown, string>).rawValue.get() ?? "";
  };
  update();
  const unsubscribe = field.rawValue.subscribe(update);

  const onInput = (e: Event): void => {
    const target = e.target as HTMLInputElement | null;
    if (isCheckbox) {
      (field as FieldState<unknown, boolean>).setRawValue(Boolean(target?.checked));
    } else {
      (field as FieldState<unknown, string>).setRawValue(target?.value ?? "");
    }
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
