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
      if (!set) map.set(field, (set = new Set()));
      set.add(element);
      return () => {
        set!.delete(element);
        if (set!.size === 0) map.delete(field);
      };
    },
    unregisterField: (field) => map.delete(field),
    getElementsForField: (field) => Array.from(map.get(field) || []),
    getRegisteredFields: () => Array.from(map.keys()),
    clear: () => map.clear(),
  };
}

const registryMap = new WeakMap<object, FormFocusRegistry>();

export function registerFormElement(formElement: object, registry: FormFocusRegistry): () => void {
  registryMap.set(formElement, registry);
  return () => {
    if (registryMap.get(formElement) === registry) registryMap.delete(formElement);
  };
}

export const associateFormBinding = (binding: object, registry: FormFocusRegistry): void => {
  registryMap.set(binding, registry);
};

export const removeFormBinding = (binding: object): void => {
  registryMap.delete(binding);
};

export const getRegistryForFormBinding = (binding: object): FormFocusRegistry | undefined =>
  registryMap.get(binding);

export function findRegistryForElement(element: unknown): FormFocusRegistry | undefined {
  if (!element || typeof element !== "object") return undefined;
  const el = element as {
    readonly form?: object | null;
    readonly closest?: (selector: string) => object | null;
  };
  if (el.form && registryMap.has(el.form)) return registryMap.get(el.form);
  try {
    const form = el.closest?.("form");
    if (form) return registryMap.get(form);
  } catch {
    // Safe fallback
  }
  return undefined;
}

export function isElementFocusable(element: unknown): boolean {
  if (!element || typeof element !== "object") return false;
  const el = element as {
    readonly focus?: (options?: unknown) => void;
    readonly isConnected?: boolean;
    readonly ownerDocument?: Document | null;
    readonly disabled?: boolean;
    readonly hidden?: boolean;
    readonly inert?: boolean;
    readonly type?: string;
    readonly tagName?: string;
    readonly nodeName?: string;
    readonly parentElement?: Element | null;
    readonly hasAttribute?: (name: string) => boolean;
    readonly getAttribute?: (name: string) => string | null;
    readonly matches?: (sel: string) => boolean;
    readonly closest?: (sel: string) => Element | null;
  };

  if (typeof el.focus !== "function" || el.isConnected === false) return false;
  if (el.ownerDocument?.contains && !el.ownerDocument.contains(element as Node)) return false;
  const has = (n: string) => Boolean(el.hasAttribute?.(n));

  if (
    el.disabled ||
    el.hidden ||
    el.inert ||
    el.type === "hidden" ||
    has("disabled") ||
    el.getAttribute?.("aria-disabled") === "true"
  ) {
    return false;
  }

  try {
    if (el.matches?.(":disabled") || el.closest?.("[hidden],[inert],[aria-hidden='true']")) {
      return false;
    }
  } catch {
    // Safe ignore
  }

  const hasWin = typeof window !== "undefined";
  let cur: Element | null = element as Element;
  while (cur) {
    if (hasWin) {
      try {
        const s = window.getComputedStyle?.(cur);
        if (s && (s.display === "none" || /^(hidden|collapse)$/.test(s.visibility))) return false;
      } catch {
        return false;
      }
    }
    if (
      cur !== element &&
      cur.tagName === "FIELDSET" &&
      ((cur as HTMLFieldSetElement).disabled || cur.hasAttribute?.("disabled")) &&
      !Array.from(cur.children)
        .find((c) => c.tagName === "LEGEND")
        ?.contains(element as Node)
    ) {
      return false;
    }
    cur = cur.parentElement;
  }

  if (has("tabindex")) {
    const raw = el.getAttribute?.("tabindex")?.trim();
    if (raw && /^-?\d+$/.test(raw) && parseInt(raw, 10) >= -1) return true;
  }

  const tag = (el.tagName || el.nodeName || "").toUpperCase();
  if (tag === "INPUT") return el.type !== "hidden";
  return /^(SELECT|TEXTAREA|BUTTON)$/.test(tag) || (tag === "A" && has("href"));
}

export function compareDomOrder(a: unknown, b: unknown): number {
  if (a === b) return 0;
  try {
    const pos = (a as Node | null)?.compareDocumentPosition?.(b as Node);
    if (pos === undefined) return 0;
    return pos & 4 ? -1 : pos & 2 ? 1 : 0;
  } catch {
    return 0;
  }
}

export function resolveFieldTarget(
  _field: FieldState<unknown, unknown>,
  elements: readonly (VanillaDomControl | Element)[],
): (VanillaDomControl | Element) | undefined {
  const eligible = elements.filter(isElementFocusable);
  if (eligible.length <= 1) return eligible[0];

  return (
    eligible.find(
      (el) => (el as HTMLInputElement).type === "radio" && (el as HTMLInputElement).checked,
    ) || [...eligible].sort(compareDomOrder)[0]
  );
}

interface TreeNode {
  readonly fields?: Record<string, unknown>;
  readonly items?: {
    readonly get?: () => readonly { readonly node?: unknown }[];
  };
}

const inTree = (t: unknown, n: unknown): boolean =>
  t === n ||
  (Boolean(n && typeof n === "object") &&
    (Object.values((n as TreeNode).fields || {}).some((c) => inTree(t, c)) ||
      ((n as TreeNode).items?.get?.() || []).some((it) => inTree(t, it?.node))));

export const makeResult = (
  focused: boolean,
  scrolled: boolean,
  hasInvalidFields: boolean,
  hasEligibleTarget: boolean,
): FocusInvalidResult => ({ focused, scrolled, hasInvalidFields, hasEligibleTarget });

function isFocused(t: unknown): boolean {
  try {
    const el = t as Node & {
      readonly ownerDocument?: Document | null;
      readonly focused?: boolean;
    };
    const root = (el as { getRootNode?: (options?: unknown) => unknown }).getRootNode?.() as
      Document | ShadowRoot | null | undefined;
    if ((root?.activeElement ?? el.ownerDocument?.activeElement) === t) return true;
    return el.focused === true;
  } catch {
    return false;
  }
}

export function orchestrateFocusInvalid(
  registry: FormFocusRegistry,
  form: FormInstance<Record<string, unknown>>,
  options?: FocusInvalidOptions,
): FocusInvalidResult {
  const invalidFields = registry.getRegisteredFields().filter((f) => {
    if (!inTree(f, form)) {
      registry.unregisterField(f);
      return false;
    }
    return isFieldInvalid(f);
  });

  const hasInvalid = form.issues.get().length > 0 || form.invalid.get() || invalidFields.length > 0;
  if (!hasInvalid || invalidFields.length === 0) return makeResult(false, false, hasInvalid, false);

  const candidates = invalidFields
    .map((f) => resolveFieldTarget(f, registry.getElementsForField(f)))
    .filter((t): t is VanillaDomControl | Element => Boolean(t))
    .sort(compareDomOrder);

  if (candidates.length === 0) return makeResult(false, false, true, false);

  const shouldScroll = Boolean(options?.scroll);
  const shouldFocus = options?.focus !== false;
  const preventScroll = options?.preventScroll ?? shouldScroll;

  let hadEligible = false;
  for (const c of candidates) {
    if (!isElementFocusable(c)) continue;
    hadEligible = true;
    const el = c as HTMLElement;
    let focused = false;
    if (shouldFocus) {
      try {
        el.focus?.({ preventScroll });
        focused = isFocused(c);
      } catch {
        // Safe ignore
      }
      if (!focused) continue;
    }

    let scrolled = false;
    if (shouldScroll) {
      try {
        el.scrollIntoView?.(typeof options?.scroll === "object" ? options.scroll : undefined);
        scrolled = true;
      } catch {
        // Safe ignore
      }
    }
    return makeResult(focused, scrolled, true, true);
  }

  return makeResult(false, false, true, hadEligible);
}

export function focusInvalid(
  formBinding: VanillaFormBinding,
  options?: FocusInvalidOptions,
): FocusInvalidResult {
  if (!formBinding?.focusInvalid) {
    throw new TypeError("Invalid formBinding: expected VanillaFormBinding instance");
  }
  return formBinding.focusInvalid(options);
}

export const focusFirstInvalid = focusInvalid;
