export type VanillaControlKind = "text" | "checkbox" | "radio" | "select-one" | "file";

const SUPPORTED_INPUT_TYPES = new Set([
  "text",
  "password",
  "email",
  "search",
  "tel",
  "url",
  "number",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
  "color",
  "hidden",
]);

/**
 * Classifies a DOM element into a supported form control kind or throws a TypeError.
 *
 * Supported runtime categories:
 * - HTMLInputElement-compatible (text-like types, checkbox, radio, file)
 * - HTMLTextAreaElement-compatible
 * - HTMLSelectElement-compatible (select-one only; select-multiple is deferred from P1i)
 * - Structurally equivalent test doubles matching one of those categories
 *
 * Fails closed on unsupported elements (div, span, button, select-multiple, arbitrary objects, etc.)
 * before any listener registration, signal subscription, or DOM mutation occurs.
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
    selectedOptions?: unknown;
    rows?: unknown;
    cols?: unknown;
  };

  const rawTag =
    typeof el.tagName === "string"
      ? el.tagName
      : typeof el.nodeName === "string"
        ? el.nodeName
        : undefined;
  const tag = rawTag ? rawTag.toUpperCase() : undefined;

  // If a tag name is present, reject unsupported tags immediately
  if (tag !== undefined && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
    throw new TypeError(
      `Unsupported element: <${tag.toLowerCase()}> is not a supported form control`,
    );
  }

  const rawType = typeof el.type === "string" ? el.type.toLowerCase() : undefined;

  // Check for select element
  const isSelect =
    tag === "SELECT" ||
    rawType === "select-one" ||
    rawType === "select-multiple" ||
    ("options" in el && el.options !== undefined);

  if (isSelect) {
    const isMultiple = Boolean(el.multiple || rawType === "select-multiple");
    if (isMultiple) {
      throw new TypeError("Unsupported element: select-multiple is not supported in P1i");
    }
    return "select-one";
  }

  // Check for textarea element
  const isTextarea =
    tag === "TEXTAREA" ||
    rawType === "textarea" ||
    ("rows" in el && "cols" in el && el.rows !== undefined);

  if (isTextarea) {
    return "text";
  }

  // Check for button/submit/reset types
  if (rawType === "button" || rawType === "submit" || rawType === "reset" || rawType === "image") {
    throw new TypeError(
      `Unsupported element: input type "${rawType}" is not a supported form control`,
    );
  }

  // Check for checkbox, radio, file input controls
  if (rawType === "checkbox") return "checkbox";
  if (rawType === "radio") return "radio";
  if (rawType === "file") return "file";

  // Check for supported text-like input types
  if (rawType !== undefined && SUPPORTED_INPUT_TYPES.has(rawType)) {
    return "text";
  }

  if (tag === "INPUT") {
    // An HTMLInputElement without explicit type defaults to "text"
    return "text";
  }

  // If there are no recognizable control markers, fail closed
  throw new TypeError("Unsupported element: expected input, textarea, or select element");
}
