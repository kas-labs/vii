/**
 * @file Vanilla DOM adapter prototype for Vii Form.
 * Research only: not a public package API.
 *
 * Implements thin DOM binding and projection primitives over Form Core.
 * Contains ZERO independent state mirrors; translates DOM events to Form mutations
 * and Form state changes to DOM properties with explicit disposal.
 */

import type {
  FieldIssue,
  FieldState,
  FormInstance,
  ParseIssue,
  ParseStatus,
  ServerIssue,
  SubmitAction,
  SubmitOptions,
  ValidationStatus,
} from "../form-core.js";

export interface VanillaFieldSnapshot<Value, Raw, Output> {
  readonly value: Value;
  readonly rawValue: Raw;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly parseStatus: ParseStatus;
  readonly parseIssue: ParseIssue | null;
  readonly validationStatus: ValidationStatus;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
  readonly output: Output;
}

export interface VanillaFieldHandle<Value, Raw = Value, Output = Value> {
  readonly getSnapshot: () => VanillaFieldSnapshot<Value, Raw, Output>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setValue: (value: Value) => void;
  readonly setRawValue: (raw: Raw) => void;
  readonly setTouched: (touched?: boolean) => void;
  readonly blur: () => void;
  readonly reset: (...args: [nextInitial?: Value, nextInitialRaw?: Raw]) => void;
  readonly dispose: () => void;
}

export function createVanillaField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
): VanillaFieldHandle<Value, Raw, Output> {
  let isDisposed = false;
  const listeners = new Set<() => void>();

  const getSnapshot = (): VanillaFieldSnapshot<Value, Raw, Output> => ({
    value: field.value.get(),
    rawValue: field.rawValue.get(),
    dirty: field.dirty.get(),
    touched: field.touched.get(),
    pending: field.pending.get(),
    valid: field.valid.get(),
    invalid: field.invalid.get(),
    parseStatus: field.parseStatus.get(),
    parseIssue: field.parseIssue.get(),
    validationStatus: field.validationStatus.get(),
    issues: field.issues.get(),
    serverIssues: field.serverIssues.get(),
    output: field.output.get(),
  });

  const notify = (): void => {
    if (isDisposed) return;
    for (const listener of listeners) {
      listener();
    }
  };

  const unsubs: Array<() => void> = [
    field.value.subscribe(notify),
    field.rawValue.subscribe(notify),
    field.touched.subscribe(notify),
    field.pending.subscribe(notify),
    field.parseStatus.subscribe(notify),
    field.parseIssue.subscribe(notify),
    field.validationStatus.subscribe(notify),
    field.issues.subscribe(notify),
    field.serverIssues.subscribe(notify),
  ];

  const subscribe = (listener: () => void): (() => void) => {
    if (isDisposed) {
      return () => undefined;
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    listeners.clear();
    for (const unsub of unsubs) {
      unsub();
    }
  };

  return {
    getSnapshot,
    subscribe,
    setValue: (v) => {
      if (!isDisposed) field.setValue(v);
    },
    setRawValue: (r) => {
      if (!isDisposed) field.setRawValue(r);
    },
    setTouched: (t = true) => {
      if (!isDisposed) field.setTouched(t);
    },
    blur: () => {
      if (!isDisposed) field.setTouched(true);
    },
    reset: (...args) => {
      if (!isDisposed) field.reset(...args);
    },
    dispose,
  };
}

export interface DomElementLike {
  value?: any;
  checked?: boolean;
  type?: string;
  id?: string;
  textContent?: string | null;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
  removeAttribute?(name: string): void;
  addEventListener(event: string, handler: (event: any) => void): void;
  removeEventListener(event: string, handler: (event: any) => void): void;
}

export interface BindFieldOptions {
  /**
   * Target element for rendering error/issue messages using safe textContent.
   */
  readonly issueElement?: DomElementLike | undefined;
  /**
   * Custom issue formatter callback. Must return text string, never HTML.
   */
  readonly formatIssues?: ((issues: readonly FieldIssue[]) => string) | undefined;
  /**
   * Projects `aria-invalid` from the field's `invalid` state. Defaults to true
   * when the element supports attributes. Pending async validation never marks
   * the control invalid, because `invalid` does not include `pending`.
   */
  readonly ariaInvalid?: boolean | undefined;
  /**
   * Links the control to `issueElement` by adding its id to `aria-describedby`,
   * preserving any tokens already present and removing only the added one on
   * dispose. Defaults to true when both elements support attributes and the
   * issue element has an id.
   */
  readonly ariaDescribedBy?: boolean | undefined;
}

export interface VanillaDisposer {
  dispose(): void;
}

/**
 * Binds an HTML/DOM input, textarea, or select element to a Form FieldState.
 * Translates DOM input/change to field.setRawValue (or setValue) and blur to field.setTouched(true).
 * Subscribes to field changes to update element value/checked without feedback loops.
 */
export function bindField<Value, Raw = Value, Output = Value>(
  field: FieldState<Value, Raw, Output>,
  element: DomElementLike,
  options?: BindFieldOptions,
): VanillaDisposer {
  let isDisposed = false;
  let isUpdatingFromStore = false;

  const isCheckbox = element.type === "checkbox";

  // Initial synchronization
  if (isCheckbox) {
    element.checked = Boolean(field.value.get());
  } else {
    const isUnparsed = field.parseStatus.get() === "unparsed";
    const initialDisplay = isUnparsed ? field.value.get() : field.rawValue.get();
    element.value =
      initialDisplay !== undefined && initialDisplay !== null ? String(initialDisplay) : "";
  }

  const renderIssues = (): void => {
    if (!options?.issueElement) return;
    const issues = field.issues.get();
    if (issues.length === 0) {
      options.issueElement.textContent = "";
      return;
    }
    if (options.formatIssues) {
      options.issueElement.textContent = options.formatIssues(issues);
    } else {
      options.issueElement.textContent = issues.map((iss) => iss.message ?? iss.code).join(", ");
    }
  };

  renderIssues();

  // ---------------------------------------------------------------------
  // ARIA projection. The DOM adapter is the only layer that owns element
  // attributes; the React, Angular and Vue adapters expose `invalid` and the
  // template writes the attribute.
  // ---------------------------------------------------------------------
  const supportsAttributes =
    typeof element.setAttribute === "function" && typeof element.removeAttribute === "function";
  const projectAriaInvalid = (options?.ariaInvalid ?? true) && supportsAttributes;

  // Derived from the raw state nodes rather than the `invalid` computed: a
  // notification callback can run before a downstream computed has recomputed,
  // which left the attribute one edit behind. Pending is deliberately absent -
  // an in-flight async validation must not mark the control invalid.
  const isCurrentlyInvalid = (): boolean =>
    field.issues.get().length > 0 ||
    field.serverIssues.get().length > 0 ||
    field.errors.get().length > 0 ||
    field.parseStatus.get() === "invalid";

  const applyAriaInvalid = (): void => {
    if (!projectAriaInvalid) return;
    element.setAttribute!("aria-invalid", isCurrentlyInvalid() ? "true" : "false");
  };

  applyAriaInvalid();

  const describedById = options?.issueElement?.id;
  const linkDescribedBy =
    (options?.ariaDescribedBy ?? true) &&
    supportsAttributes &&
    typeof element.getAttribute === "function" &&
    typeof describedById === "string" &&
    describedById !== "";
  let addedDescribedByToken = false;

  if (linkDescribedBy) {
    const existing = element.getAttribute!("aria-describedby");
    const tokens = existing ? existing.split(/\s+/).filter((t) => t !== "") : [];
    if (!tokens.includes(describedById!)) {
      tokens.push(describedById!);
      element.setAttribute!("aria-describedby", tokens.join(" "));
      addedDescribedByToken = true;
    }
  }

  const handleInput = (event: any): void => {
    if (isDisposed || isUpdatingFromStore) return;
    if (isCheckbox) {
      const nextChecked = Boolean(event?.target?.checked ?? element.checked);
      if (Object.is(nextChecked, Boolean(field.value.get()))) return;
      field.setValue(nextChecked as unknown as Value);
    } else {
      const nextRaw = (event?.target?.value ?? element.value) as unknown as Raw;
      // A browser fires "input" while typing and "change" again on blur, and a
      // caller may re-dispatch either. Re-running the pipeline for a raw value
      // the field already holds re-fires validation, which for an async rule is
      // a duplicate request per blur.
      if (Object.is(nextRaw, field.rawValue.get())) return;
      field.setRawValue(nextRaw);
    }
  };

  const handleBlur = (): void => {
    if (isDisposed) return;
    field.setTouched(true);
  };

  // Controls that commit on change rather than on keystroke. Registering both
  // "input" and "change" on a text field ran the handler twice per edit.
  const commitsOnChange =
    isCheckbox ||
    element.type === "radio" ||
    element.type === "select-one" ||
    element.type === "select-multiple" ||
    element.type === "file";
  const inputEventName = commitsOnChange ? "change" : "input";
  element.addEventListener(inputEventName, handleInput);
  element.addEventListener("blur", handleBlur);

  const unsubRaw = field.rawValue.subscribe((nextRaw) => {
    if (isDisposed || isCheckbox) return;
    if (field.parseStatus.get() === "invalid" || field.parseStatus.get() === "parsed") {
      const nextStr = nextRaw !== undefined && nextRaw !== null ? String(nextRaw) : "";
      if (element.value !== nextStr) {
        isUpdatingFromStore = true;
        try {
          element.value = nextStr;
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
      if (element.checked !== nextBool) {
        isUpdatingFromStore = true;
        try {
          element.checked = nextBool;
        } finally {
          isUpdatingFromStore = false;
        }
      }
    } else if (field.parseStatus.get() === "unparsed") {
      // Only a field with no parser displays its domain value. On a parsed field
      // the raw string is what the user typed and what the control must show:
      // writing String(value) here snapped "05" back to "5" mid-keystroke, and
      // raced the rawValue subscriber for which one landed last.
      const nextStr = nextVal !== undefined && nextVal !== null ? String(nextVal) : "";
      if (element.value !== nextStr) {
        isUpdatingFromStore = true;
        try {
          element.value = nextStr;
        } finally {
          isUpdatingFromStore = false;
        }
      }
    }
  });

  const unsubIssues = field.issues.subscribe(() => {
    if (isDisposed) return;
    renderIssues();
    applyAriaInvalid();
  });

  const unsubServerIssues = field.serverIssues.subscribe(() => {
    if (isDisposed) return;
    renderIssues();
    applyAriaInvalid();
  });

  const unsubParseStatus = field.parseStatus.subscribe(() => {
    if (isDisposed) return;
    applyAriaInvalid();
  });

  const unsubErrors = field.errors.subscribe(() => {
    if (isDisposed) return;
    applyAriaInvalid();
  });

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    element.removeEventListener(inputEventName, handleInput);
    element.removeEventListener("blur", handleBlur);
    unsubRaw();
    unsubVal();
    unsubIssues();
    unsubServerIssues();
    unsubParseStatus();
    unsubErrors();

    // Leave the element as it was found: drop only the token this binding added.
    if (addedDescribedByToken && typeof element.getAttribute === "function") {
      const current = element.getAttribute("aria-describedby");
      const remaining = (current ? current.split(/\s+/) : []).filter(
        (t) => t !== "" && t !== describedById,
      );
      if (remaining.length > 0) {
        element.setAttribute!("aria-describedby", remaining.join(" "));
      } else {
        element.removeAttribute!("aria-describedby");
      }
    }
    if (projectAriaInvalid) {
      element.removeAttribute!("aria-invalid");
    }
  };

  return { dispose };
}

export interface BindFormOptions<T extends Record<string, any>, TResult = void> {
  readonly action?: SubmitAction<T, TResult> | undefined;
  readonly submitOptions?: SubmitOptions | undefined;
  readonly onSubmitSuccess?: ((result: TResult) => void) | undefined;
  readonly onSubmitError?: ((issues: readonly FieldIssue[]) => void) | undefined;
  /**
   * Invoked when the submit action throws or rejects with something other than
   * server validation issues. A DOM submit listener cannot return a promise to
   * anyone, so without this the rejection has no owner.
   */
  readonly onSubmitException?: ((error: unknown) => void) | undefined;
}

/**
 * Binds a DOM <form> element to a Vii FormInstance.
 * Intercepts submit events, invokes event.preventDefault(), and triggers form.submit().
 */
export function bindForm<T extends Record<string, any>, TResult = void>(
  form: FormInstance<T>,
  formElement: DomElementLike,
  options?: BindFormOptions<T, TResult>,
): VanillaDisposer {
  let isDisposed = false;

  const handleSubmit = (event: any): void => {
    if (isDisposed) return;
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    void form
      .submit<TResult>(options?.action, options?.submitOptions)
      .then((res) => {
        if (isDisposed) return;
        if (res.status === "succeeded") {
          options?.onSubmitSuccess?.(res.result);
        } else if (res.status === "invalid" || res.status === "server-invalid") {
          options?.onSubmitError?.(res.issues);
        }
      })
      .catch((err: unknown) => {
        // Rethrowing here produces a fresh rejected promise that nobody owns,
        // which surfaces as an unhandled rejection and, under Node's default
        // policy, terminates the process. A DOM event handler has no caller to
        // return the failure to, so it goes to the callback or nowhere.
        if (isDisposed) return;
        options?.onSubmitException?.(err);
      });
  };

  formElement.addEventListener("submit", handleSubmit);

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    formElement.removeEventListener("submit", handleSubmit);
  };

  return { dispose };
}
