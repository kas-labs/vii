import type { FieldIssue, FieldState } from "../../core/types.js";
import type { VanillaDomControl, VanillaDomElement } from "./types.js";

/**
 * Evaluates whether a field is currently invalid by reading underlying source State signals directly,
 * adhering to Rule 1 of the Invalidation Ordering Caveat (FORM_ARCHITECTURE §6.3).
 *
 * Pending async validation alone does NOT mark a field invalid.
 */
export function isFieldInvalid(field: FieldState<unknown, unknown>): boolean {
  return (
    field.issues.get().length > 0 ||
    field.serverIssues.get().length > 0 ||
    field.parseStatus.get() === "invalid"
  );
}

/**
 * Controller for generation-local `aria-invalid` lifecycle management with original-state restoration.
 */
export interface AriaInvalidController {
  readonly update: (isInvalid: boolean) => void;
  readonly dispose: () => void;
}

/**
 * Sets up non-destructive `aria-invalid` management for a control.
 *
 * Captures the pre-binding `aria-invalid` attribute state (presence and exact string value).
 * While bound:
 * - When invalid, projects `aria-invalid="true"`.
 * - When valid, restores the original application-owned attribute value (or removes it if absent).
 * Upon disposal:
 * - Restores the exact pre-binding attribute state, preserving application ownership.
 */
export function setupAriaInvalid(
  element: VanillaDomControl | VanillaDomElement,
  enabled: boolean,
): AriaInvalidController {
  if (!enabled || typeof element.setAttribute !== "function") {
    return {
      update: () => undefined,
      dispose: () => undefined,
    };
  }

  const hasGet = typeof element.getAttribute === "function";
  const hasHas = typeof element.hasAttribute === "function";

  const originalHadAttr = hasHas
    ? Boolean(element.hasAttribute!("aria-invalid"))
    : hasGet && element.getAttribute!("aria-invalid") !== null;

  const originalValue = hasGet ? element.getAttribute!("aria-invalid") : null;

  const restoreOriginal = (): void => {
    if (originalHadAttr && originalValue !== null) {
      element.setAttribute!("aria-invalid", originalValue);
    } else if (typeof element.removeAttribute === "function") {
      element.removeAttribute("aria-invalid");
    }
  };

  return {
    update: (isInvalid: boolean): void => {
      if (isInvalid) {
        element.setAttribute!("aria-invalid", "true");
      } else {
        restoreOriginal();
      }
    },
    dispose: (): void => {
      restoreOriginal();
    },
  };
}

/**
 * Projects `aria-invalid="true"` to the element when the field is invalid.
 * When the field is valid or pending-only, removes the attribute.
 */
export function applyAriaInvalid(
  element: VanillaDomControl | VanillaDomElement,
  isInvalid: boolean,
  enabled: boolean,
): void {
  if (!enabled || typeof element.setAttribute !== "function") return;

  if (isInvalid) {
    element.setAttribute("aria-invalid", "true");
  } else if (typeof element.removeAttribute === "function") {
    element.removeAttribute("aria-invalid");
  }
}

/**
 * Associates an issue element with the control via `aria-describedby`.
 * Preserves pre-existing tokens and returns a cleanup function that removes only the added token.
 */
export function setupAriaDescribedBy(
  element: VanillaDomControl | VanillaDomElement,
  issueElement: VanillaDomElement | undefined,
  enabled: boolean,
): () => void {
  if (
    !enabled ||
    !issueElement ||
    typeof issueElement.id !== "string" ||
    issueElement.id.trim() === "" ||
    typeof element.getAttribute !== "function" ||
    typeof element.setAttribute !== "function"
  ) {
    return () => undefined;
  }

  const describedById = issueElement.id.trim();
  const existing = element.getAttribute("aria-describedby");
  const tokens = existing ? existing.split(/\s+/).filter(Boolean) : [];

  if (tokens.includes(describedById)) {
    // Token already pre-existed on the element; do not remove on disposal
    return () => undefined;
  }

  tokens.push(describedById);
  element.setAttribute("aria-describedby", tokens.join(" "));

  return () => {
    if (typeof element.getAttribute !== "function") return;
    const current = element.getAttribute("aria-describedby");
    const remaining = (current ? current.split(/\s+/).filter(Boolean) : []).filter(
      (token) => token !== describedById,
    );

    if (remaining.length > 0 && typeof element.setAttribute === "function") {
      element.setAttribute("aria-describedby", remaining.join(" "));
    } else if (typeof element.removeAttribute === "function") {
      element.removeAttribute("aria-describedby");
    }
  };
}

/**
 * Renders validation and server issue messages strictly via `textContent`.
 * Prevents HTML interpretation at the issue-message sink by writing through textContent.
 * NEVER uses `innerHTML`, `outerHTML`, or HTML parsing sinks.
 */
export function renderSafeIssues(
  issueElement: VanillaDomElement | undefined,
  issues: readonly FieldIssue[],
  formatIssues?: ((issues: readonly FieldIssue[]) => string) | undefined,
): void {
  if (!issueElement) return;

  if (issues.length === 0) {
    issueElement.textContent = "";
    return;
  }

  if (typeof formatIssues === "function") {
    issueElement.textContent = String(formatIssues(issues));
  } else {
    issueElement.textContent = issues.map((iss) => iss.message ?? iss.code).join(", ");
  }
}
