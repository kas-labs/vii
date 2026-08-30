import type { FieldState } from "../../core/types.js";
import {
  applyAriaInvalid,
  isFieldInvalid,
  renderSafeIssues,
  setupAriaDescribedBy,
} from "./a11y.js";
import type { BindFieldOptions, VanillaBinding, VanillaDomElement } from "./types.js";

interface EventWithTarget {
  readonly target?: {
    readonly value?: unknown;
    readonly checked?: boolean;
    readonly files?: unknown;
  } | null;
}

/**
 * Binds a DOM input, textarea, or select element to a Vii FieldState.
 *
 * Enforces single commit event semantics:
 * - Text-like controls use "input"
 * - Checkbox, radio, select, and file controls use "change"
 * - Dual "input" + "change" registration is strictly prevented.
 *
 * Manages bidirectional projection without feedback loops, projects ARIA attributes,
 * safely renders issue messages via textContent, and provides deterministic disposal.
 */
export function bindField<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  element: VanillaDomElement | HTMLElement,
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

  const domElement = element as VanillaDomElement;
  let isDisposed = false;
  let isUpdatingFromStore = false;

  // Control classification
  const isCheckbox = domElement.type === "checkbox";
  const isRadio = domElement.type === "radio";
  const isSelect =
    domElement.type === "select-one" ||
    domElement.type === "select-multiple" ||
    (typeof domElement.type === "string" && domElement.type.startsWith("select")) ||
    (!domElement.type && "selectedOptions" in domElement);
  const isFile = domElement.type === "file";

  const commitsOnChange = isCheckbox || isRadio || isSelect || isFile;
  const inputEventName = commitsOnChange ? "change" : "input";

  // Initial Field -> DOM projection
  if (isCheckbox) {
    domElement.checked = Boolean(field.value.get());
  } else if (isRadio) {
    domElement.checked = Object.is(field.value.get(), domElement.value);
  } else if (!isFile) {
    const isUnparsed = field.parseStatus.get() === "unparsed";
    const initialDisplay = isUnparsed ? field.value.get() : field.rawValue.get();
    domElement.value =
      initialDisplay !== undefined && initialDisplay !== null ? String(initialDisplay) : "";
  }

  // Initial A11y / ARIA projection
  const projectAriaInvalid =
    (options?.ariaInvalid ?? true) && typeof domElement.setAttribute === "function";
  applyAriaInvalid(
    domElement,
    isFieldInvalid(field as unknown as FieldState<unknown, unknown>),
    projectAriaInvalid,
  );

  const cleanupDescribedBy = setupAriaDescribedBy(
    domElement,
    options?.issueElement as VanillaDomElement | undefined,
    options?.ariaDescribedBy ?? true,
  );

  renderSafeIssues(
    options?.issueElement as VanillaDomElement | undefined,
    field.issues.get(),
    options?.formatIssues,
  );

  // DOM -> Field commit handler
  const handleCommit = (event: unknown): void => {
    if (isDisposed || isUpdatingFromStore) return;
    const evt = event as EventWithTarget | undefined;

    if (isCheckbox) {
      const nextChecked = Boolean(evt?.target?.checked ?? domElement.checked);
      if (Object.is(nextChecked, Boolean(field.value.get()))) return;
      field.setValue(nextChecked as unknown as TValue);
    } else if (isRadio) {
      const target = (evt?.target ?? domElement) as VanillaDomElement;
      if (target.checked) {
        field.setValue(target.value as unknown as TValue);
      }
    } else if (isSelect) {
      if (domElement.multiple && "selectedOptions" in domElement && domElement.selectedOptions) {
        const values = Array.from(domElement.selectedOptions as ArrayLike<{ value: string }>).map(
          (opt) => opt.value,
        );
        field.setValue(values as unknown as TValue);
      } else {
        const nextVal = (evt?.target?.value ?? domElement.value) as unknown as TValue;
        if (Object.is(nextVal, field.value.get())) return;
        field.setValue(nextVal);
      }
    } else if (isFile) {
      const files = evt?.target?.files ?? domElement.files;
      field.setValue(files as unknown as TValue);
    } else {
      const nextRaw = (evt?.target?.value ?? domElement.value) as unknown as TRaw;
      if (Object.is(nextRaw, field.rawValue.get())) return;
      field.setRawValue(nextRaw);
    }
  };

  const handleBlur = (): void => {
    if (isDisposed) return;
    field.setTouched(true);
  };

  // Register single primary commit event and blur listener
  domElement.addEventListener(inputEventName, handleCommit);
  domElement.addEventListener("blur", handleBlur);

  // Field -> DOM subscriptions
  const unsubRaw = field.rawValue.subscribe((nextRaw) => {
    if (isDisposed || commitsOnChange) return;
    if (field.parseStatus.get() !== "unparsed") {
      const nextStr = nextRaw !== undefined && nextRaw !== null ? String(nextRaw) : "";
      if (domElement.value !== nextStr) {
        isUpdatingFromStore = true;
        try {
          domElement.value = nextStr;
        } finally {
          isUpdatingFromStore = false;
        }
      }
    }
  });

  const unsubVal = field.value.subscribe((nextVal) => {
    if (isDisposed) return;

    if (isCheckbox) {
      const nextBool = Boolean(nextVal);
      if (domElement.checked !== nextBool) {
        isUpdatingFromStore = true;
        try {
          domElement.checked = nextBool;
        } finally {
          isUpdatingFromStore = false;
        }
      }
    } else if (isRadio) {
      const shouldBeChecked = Object.is(nextVal, domElement.value);
      if (domElement.checked !== shouldBeChecked) {
        isUpdatingFromStore = true;
        try {
          domElement.checked = shouldBeChecked;
        } finally {
          isUpdatingFromStore = false;
        }
      }
    } else if (!isFile && field.parseStatus.get() === "unparsed") {
      const nextStr = nextVal !== undefined && nextVal !== null ? String(nextVal) : "";
      if (domElement.value !== nextStr) {
        isUpdatingFromStore = true;
        try {
          domElement.value = nextStr;
        } finally {
          isUpdatingFromStore = false;
        }
      }
    }
  });

  const updateAriaAndIssues = (): void => {
    if (isDisposed) return;
    renderSafeIssues(
      options?.issueElement as VanillaDomElement | undefined,
      field.issues.get(),
      options?.formatIssues,
    );
    applyAriaInvalid(
      domElement,
      isFieldInvalid(field as unknown as FieldState<unknown, unknown>),
      projectAriaInvalid,
    );
  };

  const unsubIssues = field.issues.subscribe(updateAriaAndIssues);
  const unsubServerIssues = field.serverIssues.subscribe(updateAriaAndIssues);
  const unsubParseStatus = field.parseStatus.subscribe(updateAriaAndIssues);

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;

    domElement.removeEventListener(inputEventName, handleCommit);
    domElement.removeEventListener("blur", handleBlur);

    unsubRaw();
    unsubVal();
    unsubIssues();
    unsubServerIssues();
    unsubParseStatus();

    cleanupDescribedBy();

    if (projectAriaInvalid && typeof domElement.removeAttribute === "function") {
      domElement.removeAttribute("aria-invalid");
    }
  };

  return { dispose };
}
