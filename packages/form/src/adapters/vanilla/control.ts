export type VanillaControlKind = "text" | "checkbox" | "radio" | "select-one" | "file";

/**
 * Classifies a DOM element into a supported form control kind or throws a TypeError.
 * Fails closed on unsupported elements (div, span, button, select-multiple, arbitrary objects, etc.)
 */
export function classifyControl(element: unknown): VanillaControlKind {
  if (!element || typeof element !== "object") {
    throw new TypeError("Invalid element: expected DOM element");
  }

  const el = element as {
    tagName?: unknown;
    nodeName?: unknown;
    type?: unknown;
    multiple?: unknown;
    options?: unknown;
    rows?: unknown;
    cols?: unknown;
  };

  const tag = String(el.tagName || el.nodeName || "").toUpperCase();

  if (tag && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
    throw new TypeError(
      `Unsupported element: <${tag.toLowerCase()}> is not a supported form control`,
    );
  }

  const type = el.type ? String(el.type).toLowerCase() : undefined;

  if (tag === "SELECT" || type === "select-one" || type === "select-multiple" || "options" in el) {
    if (el.multiple || type === "select-multiple") {
      throw new TypeError("Unsupported element: select-multiple is not supported in P1i");
    }
    return "select-one";
  }

  if (tag === "TEXTAREA" || type === "textarea" || ("rows" in el && "cols" in el)) {
    return "text";
  }

  if (/^(button|submit|reset|image)$/.test(type ?? "")) {
    throw new TypeError(
      `Unsupported element: input type "${type}" is not a supported form control`,
    );
  }

  if (type === "checkbox" || type === "radio" || type === "file") {
    return type;
  }

  if (
    tag === "INPUT" ||
    (type &&
      /^(text|password|email|search|tel|url|number|date|datetime-local|month|time|week|color|hidden)$/.test(
        type,
      ))
  ) {
    return "text";
  }

  throw new TypeError("Invalid element: expected DOM element");
}
