import type { FieldState, FormInstance } from "../../core/types.js";
import { isFieldInvalid } from "./a11y.js";
import type {
  FocusInvalidOptions,
  FocusInvalidResult,
  VanillaDomControl,
  VanillaFormBinding,
} from "./types.js";

export interface FormFocusRegistry {
  readonly register: (
    field: FieldState<unknown, unknown>,
    element: VanillaDomControl | Element,
  ) => () => void;
  readonly unregisterField: (field: FieldState<unknown, unknown>) => void;
  readonly getElementsForField: (
    field: FieldState<unknown, unknown>,
  ) => readonly (VanillaDomControl | Element)[];
  readonly getRegisteredFields: () => readonly FieldState<unknown, unknown>[];
  readonly clear: () => void;
}

export function createFormFocusRegistry(): FormFocusRegistry {
  const map = new Map<FieldState<unknown, unknown>, Set<VanillaDomControl | Element>>();

  return {
    register: (field, element) => {
      let set = map.get(field);
      if (!set) {
        set = new Set();
        map.set(field, set);
      }
      set.add(element);

      return () => {
        const s = map.get(field);
        if (s) {
          s.delete(element);
          if (s.size === 0) map.delete(field);
        }
      };
    },
    unregisterField: (field) => {
      map.delete(field);
    },
    getElementsForField: (field) => {
      const s = map.get(field);
      return s ? Array.from(s) : [];
    },
    getRegisteredFields: () => Array.from(map.keys()),
    clear: () => {
      map.clear();
    },
  };
}

const registryMap = new WeakMap<object, FormFocusRegistry>();

export function registerFormElement(formElement: object, registry: FormFocusRegistry): () => void {
  registryMap.set(formElement, registry);
  return () => {
    if (registryMap.get(formElement) === registry) {
      registryMap.delete(formElement);
    }
  };
}

export function associateFormBinding(binding: object, registry: FormFocusRegistry): void {
  registryMap.set(binding, registry);
}

export function getRegistryForFormBinding(binding: object): FormFocusRegistry | undefined {
  return registryMap.get(binding);
}

export function findRegistryForElement(element: unknown): FormFocusRegistry | undefined {
  if (!element || typeof element !== "object") return undefined;
  const el = element as {
    readonly form?: object | null | undefined;
    readonly closest?: ((selector: string) => object | null) | undefined;
  };

  if (el.form && registryMap.has(el.form)) {
    return registryMap.get(el.form);
  }

  if (typeof el.closest === "function") {
    try {
      const form = el.closest("form");
      if (form) return registryMap.get(form);
    } catch {
      // Safe fallback
    }
  }

  return undefined;
}

export function isElementFocusable(element: unknown): boolean {
  if (!element || typeof element !== "object") return false;

  const el = element as {
    readonly focus?: unknown;
    readonly isConnected?: boolean | undefined;
    readonly ownerDocument?: Document | null | undefined;
    readonly disabled?: boolean | undefined;
    readonly hidden?: boolean | undefined;
    readonly type?: string | undefined;
    readonly inert?: boolean | undefined;
    readonly hasAttribute?: ((name: string) => boolean) | undefined;
    readonly getAttribute?: ((name: string) => string | null) | undefined;
    readonly closest?: ((selector: string) => Element | null) | undefined;
  };

  if (typeof el.focus !== "function") return false;
  if (el.isConnected === false) return false;
  if (el.ownerDocument?.contains && !el.ownerDocument.contains(element as Node)) {
    return false;
  }

  if (el.disabled || el.hidden || el.inert || el.type === "hidden") return false;

  const has = (name: string) => typeof el.hasAttribute === "function" && el.hasAttribute(name);
  const get = (name: string) =>
    typeof el.getAttribute === "function" ? el.getAttribute(name) : null;

  if (
    has("disabled") ||
    has("hidden") ||
    get("aria-disabled") === "true" ||
    get("aria-hidden") === "true"
  ) {
    return false;
  }

  if (typeof el.closest === "function") {
    try {
      if (el.closest("[hidden],[inert],[aria-hidden='true']")) return false;
    } catch {
      // Safe fallback
    }
  }

  if (
    typeof window !== "undefined" &&
    typeof window.getComputedStyle === "function" &&
    element instanceof Element
  ) {
    try {
      const s = window.getComputedStyle(element);
      if (s.display === "none" || s.visibility === "hidden" || s.visibility === "collapse") {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function compareDomOrder(a: unknown, b: unknown): number {
  if (a === b) return 0;
  const nodeA = a as Node;
  if (typeof nodeA?.compareDocumentPosition === "function") {
    try {
      const pos = nodeA.compareDocumentPosition(b as Node);
      if (pos & 4) return -1;
      if (pos & 2) return 1;
    } catch {
      // Safe fallback
    }
  }
  return 0;
}

export function resolveFieldTarget(
  _field: FieldState<unknown, unknown>,
  elements: readonly (VanillaDomControl | Element)[],
): (VanillaDomControl | Element) | undefined {
  const eligible = elements.filter(isElementFocusable);
  if (eligible.length === 0) return undefined;
  if (eligible.length === 1) return eligible[0];

  const checkedRadio = eligible.find(
    (el) => (el as HTMLInputElement).type === "radio" && (el as HTMLInputElement).checked,
  );
  if (checkedRadio) return checkedRadio;

  const sorted = [...eligible].sort(compareDomOrder);
  return sorted[0];
}

function isFieldInTree(target: FieldState<unknown, unknown>, node: unknown): boolean {
  if (target === (node as unknown)) return true;
  if (!node || typeof node !== "object") return false;

  const n = node as Record<string, unknown>;
  const fields = n["fields"];
  if (fields && typeof fields === "object") {
    for (const key of Object.keys(fields)) {
      if (isFieldInTree(target, (fields as Record<string, unknown>)[key])) return true;
    }
  }
  const itemsProp = n["items"] as { get?: () => Array<{ node?: unknown }> } | undefined;
  if (typeof itemsProp?.get === "function") {
    for (const item of itemsProp.get()) {
      if (item && isFieldInTree(target, item.node)) return true;
    }
  }
  return false;
}

export const makeResult = (
  focused: boolean,
  scrolled: boolean,
  hasInvalidFields: boolean,
  hasEligibleTarget: boolean,
): FocusInvalidResult => ({ focused, scrolled, hasInvalidFields, hasEligibleTarget });

export function orchestrateFocusInvalid(
  registry: FormFocusRegistry,
  form: FormInstance<Record<string, unknown>>,
  options?: FocusInvalidOptions,
): FocusInvalidResult {
  const registeredFields = registry.getRegisteredFields();
  const invalidFields: FieldState<unknown, unknown>[] = [];

  for (const field of registeredFields) {
    if (!isFieldInTree(field, form)) {
      registry.unregisterField(field);
      continue;
    }
    if (isFieldInvalid(field)) {
      invalidFields.push(field);
    }
  }

  const hasFormLevel = form.issues.get().length > 0 || form.invalid.get();
  const hasInvalid = hasFormLevel || invalidFields.length > 0;

  if (!hasInvalid || invalidFields.length === 0) {
    return makeResult(false, false, hasInvalid, false);
  }

  const candidates: (VanillaDomControl | Element)[] = [];
  for (const field of invalidFields) {
    const target = resolveFieldTarget(field, registry.getElementsForField(field));
    if (target) candidates.push(target);
  }

  if (candidates.length === 0) {
    return makeResult(false, false, true, false);
  }

  candidates.sort(compareDomOrder);

  const shouldScroll = Boolean(options?.scroll);
  const shouldFocus = options?.focus !== false;
  const preventScroll = options?.preventScroll ?? (shouldScroll ? true : false);

  for (const candidate of candidates) {
    if (!isElementFocusable(candidate)) continue;

    let focused = false;
    let scrolled = false;

    if (shouldFocus) {
      try {
        if (typeof (candidate as HTMLElement).focus === "function") {
          (candidate as HTMLElement).focus({ preventScroll });
          focused = true;
        }
      } catch {
        continue;
      }
    }

    if (shouldScroll) {
      try {
        if (typeof (candidate as HTMLElement).scrollIntoView === "function") {
          const scrollArgs = typeof options?.scroll === "object" ? options.scroll : undefined;
          (candidate as HTMLElement).scrollIntoView(scrollArgs);
          scrolled = true;
        }
      } catch {
        // Safe ignore
      }
    }

    return makeResult(focused, scrolled, true, true);
  }

  return makeResult(false, false, true, candidates.length > 0);
}

export function focusInvalid(
  formBinding: VanillaFormBinding,
  options?: FocusInvalidOptions,
): FocusInvalidResult {
  if (!formBinding || typeof formBinding.focusInvalid !== "function") {
    throw new TypeError("Invalid formBinding: expected VanillaFormBinding instance");
  }
  return formBinding.focusInvalid(options);
}

export const focusFirstInvalid = focusInvalid;
