import type { FieldIssue, FieldState } from "../../core/types.js";
import type { VanillaDomElement } from "./types.js";

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
 * Projects `aria-invalid="true"` to the element when the field is invalid.
 * When the field is valid or pending-only, removes the attribute.
 */
export function applyAriaInvalid(
  element: VanillaDomElement,
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
  element: VanillaDomElement,
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
