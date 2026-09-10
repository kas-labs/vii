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

interface AriaInvalidOwnership {
  readonly baselineHadAttr: boolean;
  readonly baselineValue: string | null;
  readonly bindings: Map<symbol, boolean>;
}

/**
 * Private element-local WeakMap tracking overlapping bindings on the same DOM element.
 * Retains elements weakly so discarded elements are automatically reclaimed by GC.
 * Entries are deleted explicitly upon the disposal of the final participating binding.
 */
const ariaInvalidOwnershipMap = new WeakMap<object, AriaInvalidOwnership>();

/**
 * Test-only inspection helper returning the count of active bindings in an element's ownership state.
 * Returns 0 if the element has no active ownership record.
 * @internal
 */
export function getAriaInvalidOwnershipSize(element: object): number {
  return ariaInvalidOwnershipMap.get(element)?.bindings.size ?? 0;
}

/**
 * Sets up non-destructive `aria-invalid` management for a control with overlapping binding coordination.
 *
 * Remembers the true application-owned baseline once per element (presence and exact string value).
 * When multiple bindings share an element:
 * - Each participating binding gets a unique generation token.
 * - Effective DOM projection: if ANY active aria-enabled binding says invalid, projects `aria-invalid="true"`.
 *   Otherwise, projects the exact application-owned baseline.
 * - Disposing a binding removes only its contribution and recomputes the projection from remaining live bindings.
 * - Disposing the final participating binding restores the exact application baseline and deletes the WeakMap entry.
 * - When `enabled` is false (`ariaInvalid: false`), does not participate in ownership or mutate the element.
 */
export function setupAriaInvalid(
  element: VanillaDomControl | VanillaDomElement,
  enabled: boolean,
): AriaInvalidController {
  if (!enabled || typeof element?.setAttribute !== "function") {
    return { update: () => undefined, dispose: () => undefined };
  }

  const target = element as object;
  const attr = "aria-invalid";
  let ownership = ariaInvalidOwnershipMap.get(target);
  if (!ownership) {
    const baselineValue =
      typeof element.getAttribute === "function" ? element.getAttribute(attr) : null;
    const baselineHadAttr = Boolean(element.hasAttribute?.(attr) ?? baselineValue !== null);

    ownership = {
      baselineHadAttr,
      baselineValue,
      bindings: new Map<symbol, boolean>(),
    };
    ariaInvalidOwnershipMap.set(target, ownership);
  }

  const bindingId = Symbol();
  ownership.bindings.set(bindingId, false);
  let isDisposed = false;

  const restoreBaseline = (): void => {
    if (ownership!.baselineHadAttr && ownership!.baselineValue !== null) {
      element.setAttribute!(attr, ownership!.baselineValue);
    } else {
      element.removeAttribute?.(attr);
    }
  };

  const syncEffectiveState = (): void => {
    if (Array.from(ownership!.bindings.values()).some(Boolean)) {
      element.setAttribute!(attr, "true");
    } else {
      restoreBaseline();
    }
  };

  return {
    update: (isInvalid: boolean): void => {
      if (isDisposed) return;
      ownership!.bindings.set(bindingId, isInvalid);
      syncEffectiveState();
    },
    dispose: (): void => {
      if (isDisposed) return;
      isDisposed = true;
      ownership!.bindings.delete(bindingId);
      if (ownership!.bindings.size === 0) {
        ariaInvalidOwnershipMap.delete(target);
        restoreBaseline();
      } else {
        syncEffectiveState();
      }
    },
  };
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
  const id = issueElement?.id?.trim();
  const el = element as {
    getAttribute?: (name: string) => string | null;
    setAttribute?: (name: string, value: string) => void;
    removeAttribute?: (name: string) => void;
  };
  const attr = "aria-describedby";
  if (!enabled || !id || !el.getAttribute || !el.setAttribute) return () => undefined;

  const initial = (el.getAttribute(attr) || "").split(/\s+/).filter(Boolean);
  if (initial.includes(id)) return () => undefined;

  el.setAttribute(attr, [...initial, id].join(" "));

  return () => {
    const remaining = (el.getAttribute?.(attr) || "").split(/\s+/).filter((t) => t && t !== id);
    if (remaining.length > 0) {
      el.setAttribute!(attr, remaining.join(" "));
    } else {
      el.removeAttribute?.(attr);
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
  issueElement.textContent =
    issues.length === 0
      ? ""
      : typeof formatIssues === "function"
        ? String(formatIssues(issues))
        : issues.map((iss) => iss.message ?? iss.code).join(", ");
}
