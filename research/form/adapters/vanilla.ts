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
  textContent?: string | null;
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

  const handleInput = (event: any): void => {
    if (isDisposed || isUpdatingFromStore) return;
    if (isCheckbox) {
      const nextChecked = Boolean(event?.target?.checked ?? element.checked);
      field.setValue(nextChecked as unknown as Value);
    } else {
      const nextRaw = (event?.target?.value ?? element.value) as unknown as Raw;
      field.setRawValue(nextRaw);
    }
  };

  const handleBlur = (): void => {
    if (isDisposed) return;
    field.setTouched(true);
  };

  const inputEventName = isCheckbox ? "change" : "input";
  element.addEventListener(inputEventName, handleInput);
  if (!isCheckbox) {
    element.addEventListener("change", handleInput);
  }
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
    } else if (field.parseStatus.get() !== "invalid") {
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
  });

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    element.removeEventListener(inputEventName, handleInput);
    if (!isCheckbox) {
      element.removeEventListener("change", handleInput);
    }
    element.removeEventListener("blur", handleBlur);
    unsubRaw();
    unsubVal();
    unsubIssues();
  };

  return { dispose };
}

export interface BindFormOptions<T extends Record<string, any>, TResult = void> {
  readonly action?: SubmitAction<T, TResult> | undefined;
  readonly submitOptions?: SubmitOptions | undefined;
  readonly onSubmitSuccess?: ((result: TResult) => void) | undefined;
  readonly onSubmitError?: ((issues: readonly FieldIssue[]) => void) | undefined;
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
      .catch((err) => {
        if (!isDisposed) throw err;
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
