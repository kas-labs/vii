import type {
  DOMCapabilityProvider,
  FocusTrapHandle,
  FocusTrapOptions,
  InertHandle,
  ScrollLockHandle,
} from "./types.js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
  });
}

export function trapFocus(container: HTMLElement, options: FocusTrapOptions = {}): FocusTrapHandle {
  const previouslyFocused =
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
  let active = false;

  function handleKeyDown(event: KeyboardEvent): void {
    if (!active || event.key !== "Tab") return;

    const tabbables = getTabbableElements(container);
    if (tabbables.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = tabbables[0]!;
    const last = tabbables[tabbables.length - 1]!;
    const current = document.activeElement;

    if (event.shiftKey && (current === first || !container.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function activate(): void {
    if (active) return;
    active = true;
    if (typeof document !== "undefined") {
      document.addEventListener("keydown", handleKeyDown);
    }
    const initial =
      typeof options.initialFocus === "function" ? options.initialFocus() : options.initialFocus;
    if (initial) {
      initial.focus();
    } else {
      const tabbables = getTabbableElements(container);
      if (tabbables.length > 0) {
        tabbables[0]!.focus();
      } else {
        container.focus();
      }
    }
  }

  function deactivate(): void {
    if (!active) return;
    active = false;
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", handleKeyDown);
    }
    if (
      options.returnFocus !== false &&
      previouslyFocused &&
      typeof previouslyFocused.focus === "function"
    ) {
      previouslyFocused.focus();
    }
  }

  return {
    activate,
    deactivate,
    destroy: deactivate,
  };
}

export function setInert(elements: HTMLElement[]): InertHandle {
  const previousStates = elements.map((el) => ({
    element: el,
    wasInert: (el as any).inert,
    ariaHidden: el.getAttribute("aria-hidden"),
  }));

  for (const item of previousStates) {
    (item.element as any).inert = true;
    item.element.setAttribute("aria-hidden", "true");
  }

  return {
    restore: () => {
      for (const item of previousStates) {
        if (!item.wasInert) {
          (item.element as any).inert = false;
        }
        if (item.ariaHidden === null) {
          item.element.removeAttribute("aria-hidden");
        } else {
          item.element.setAttribute("aria-hidden", item.ariaHidden);
        }
      }
    },
  };
}

export function lockScroll(target?: HTMLElement): ScrollLockHandle {
  const el = target ?? (typeof document !== "undefined" ? document.body : null);
  if (!el) return { unlock: () => {} };

  const originalOverflow = el.style.overflow;
  el.style.overflow = "hidden";

  return {
    unlock: () => {
      el.style.overflow = originalOverflow;
    },
  };
}

export function onEscape(callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      callback();
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}

export function onOutsideClick(container: HTMLElement, callback: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  function handlePointerDown(event: MouseEvent | PointerEvent): void {
    const target = event.target as Node | null;
    if (target && !container.contains(target)) {
      callback();
    }
  }
  document.addEventListener("pointerdown", handlePointerDown);
  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
  };
}

export const defaultDOMCapabilities: DOMCapabilityProvider = {
  trapFocus,
  setInert,
  lockScroll,
  onEscape,
  onOutsideClick,
};
