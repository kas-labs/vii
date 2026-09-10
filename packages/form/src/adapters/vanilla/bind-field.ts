import type { FieldState } from "../../core/types.js";
import {
  isFieldInvalid,
  renderSafeIssues,
  setupAriaDescribedBy,
  setupAriaInvalid,
} from "./a11y.js";
import { classifyControl } from "./control.js";
import { findRegistryForElement, getRegistryForFormBinding } from "./focus.js";
import type {
  BindFieldOptions,
  VanillaBinding,
  VanillaDomControl,
  VanillaDomElement,
  VanillaFieldElement,
} from "./types.js";

interface EventWithTarget {
  readonly target?: {
    readonly value?: unknown;
    readonly checked?: boolean;
    readonly files?: unknown;
  } | null;
}

/**
 * Binds a DOM input, textarea, or single-select element to a Vii FieldState.
 *
 * Enforces single commit event semantics:
 * - Text-like controls use "input"
 * - Checkbox, radio, select-one, and file controls use "change"
 * - Dual "input" + "change" registration is strictly prevented.
 *
 * Manages bidirectional projection without feedback loops, non-destructively projects ARIA
 * attributes (restoring original application state upon validity or disposal),
 * safely renders issue messages via textContent, and provides deterministic disposal.
 *
 * Unsupported elements (div, span, button, select-multiple, arbitrary objects) fail closed
 * with a TypeError during preflight before any listener attachment or DOM mutation.
 */
export function bindField<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  element: VanillaFieldElement,
  options?: BindFieldOptions,
): VanillaBinding {
  // Preflight validation: fail closed with TypeError before any mutation or listener attachment
  if (
    !field ||
    typeof field !== "object" ||
    field.kind !== "field" ||
    typeof field.setValue !== "function" ||
    typeof field.setRawValue !== "function" ||
    typeof field.setTouched !== "function"
  ) {
    throw new TypeError("Invalid field: expected FieldState instance");
  }

  if (
    !element ||
    typeof element !== "object" ||
    typeof element.addEventListener !== "function" ||
    typeof element.removeEventListener !== "function"
  ) {
    throw new TypeError(
      "Invalid element: expected DOM element with addEventListener and removeEventListener",
    );
  }

  // Classify control kind; fails closed on unsupported elements (div, span, button, select-multiple)
  const controlKind = classifyControl(element);

  const domElement = element as VanillaDomControl;
  let isDisposed = false;
  let isUpdatingFromStore = false;

  const commitsOnChange = controlKind !== "text";
  const inputEventName = commitsOnChange ? "change" : "input";

  const updateDom = (fn: () => void): void => {
    isUpdatingFromStore = true;
    try {
      fn();
    } finally {
      isUpdatingFromStore = false;
    }
  };

  const setDomVal = (str: unknown) => {
    const s = str != null ? String(str) : "";
    if (domElement.value !== s)
      updateDom(() => {
        domElement.value = s;
      });
  };

  const setChecked = (b: boolean) => {
    if (domElement.checked !== b)
      updateDom(() => {
        domElement.checked = b;
      });
  };

  // Initial Field -> DOM projection
  if (controlKind === "checkbox") setChecked(Boolean(field.value.get()));
  else if (controlKind === "radio") setChecked(Object.is(field.value.get(), domElement.value));
  else if (controlKind !== "file") {
    setDomVal(field.parseStatus.get() === "unparsed" ? field.value.get() : field.rawValue.get());
  }

  const issueEl = options?.issueElement as VanillaDomElement | undefined;
  const fieldAny = field as unknown as FieldState<unknown, unknown>;

  // Initial A11y / ARIA projection with non-destructive restoration tracking
  const projectAriaInvalid =
    (options?.ariaInvalid ?? true) && typeof domElement.setAttribute === "function";
  const ariaInvalidController = setupAriaInvalid(domElement, projectAriaInvalid);

  const cleanupDescribedBy = setupAriaDescribedBy(
    domElement,
    issueEl,
    options?.ariaDescribedBy ?? true,
  );

  const updateAriaAndIssues = (): void => {
    if (isDisposed) return;
    renderSafeIssues(issueEl, field.issues.get(), options?.formatIssues);
    ariaInvalidController.update(isFieldInvalid(fieldAny));
  };

  updateAriaAndIssues();

  // Register presentation control in form focus registry for focus invalid orchestration
  const targetRegistry =
    (options?.formBinding ? getRegistryForFormBinding(options.formBinding) : undefined) ??
    findRegistryForElement(element);
  const unregisterFocus = targetRegistry?.register(
    field as unknown as FieldState<unknown, unknown>,
    domElement,
  );

  // DOM -> Field commit handler
  const handleCommit = (event: unknown): void => {
    if (isDisposed || isUpdatingFromStore) return;
    const target = ((event as EventWithTarget | undefined)?.target ??
      domElement) as VanillaDomControl;

    if (controlKind === "checkbox") {
      const nextChecked = Boolean(target.checked);
      if (!Object.is(nextChecked, Boolean(field.value.get())))
        field.setValue(nextChecked as unknown as TValue);
    } else if (controlKind === "radio") {
      if (target.checked) field.setValue(target.value as unknown as TValue);
    } else if (controlKind === "select-one") {
      if (!Object.is(target.value, field.value.get()))
        field.setValue(target.value as unknown as TValue);
    } else if (controlKind === "file") {
      field.setValue(target.files as unknown as TValue);
    } else {
      if (
        !(event as { isComposing?: boolean })?.isComposing &&
        !Object.is(target.value, field.rawValue.get())
      ) {
        field.setRawValue(target.value as unknown as TRaw);
      }
    }
  };

  const handleBlur = (): void => {
    if (isDisposed) return;
    field.setTouched(true);
  };

  // Register single primary commit event and blur listener
  domElement.addEventListener(inputEventName, handleCommit);
  domElement.addEventListener("blur", handleBlur);

  const unsubs = [
    field.rawValue.subscribe((nextRaw) => {
      if (!isDisposed && !commitsOnChange && field.parseStatus.get() !== "unparsed") {
        setDomVal(nextRaw);
      }
    }),
    field.value.subscribe((nextVal) => {
      if (isDisposed) return;
      if (controlKind === "checkbox") setChecked(Boolean(nextVal));
      else if (controlKind === "radio") setChecked(Object.is(nextVal, domElement.value));
      else if (controlKind !== "file" && field.parseStatus.get() === "unparsed") setDomVal(nextVal);
    }),
    ...[field.issues, field.serverIssues, field.parseStatus].map((s) =>
      s.subscribe(updateAriaAndIssues),
    ),
  ];

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;

    domElement.removeEventListener(inputEventName, handleCommit);
    domElement.removeEventListener("blur", handleBlur);

    unsubs.forEach((u) => u());

    cleanupDescribedBy();
    ariaInvalidController.dispose();
    unregisterFocus?.();
  };

  return { dispose };
}
