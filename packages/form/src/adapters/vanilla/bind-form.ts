import type { FormFieldsRecord, FormInstance, FormValues } from "../../core/types.js";
import type { BindFormOptions, VanillaBinding, VanillaDomElement } from "./types.js";

interface EventWithPreventDefault {
  readonly preventDefault?: () => void;
}

/**
 * Binds a DOM <form> element to a Vii FormInstance.
 *
 * Coordinates native submit events with canonical Model A form submission:
 * - Listens strictly to the native "submit" event (preventing double invocation from button clicks).
 * - Invokes event.preventDefault() to suppress native page navigation.
 * - Routes successful submissions to onSubmitSuccess and validation failures to onSubmitError.
 * - Guarantees error containment: catches unexpected submit action rejections and routes them
 *   through onSubmitException, preventing unhandled Promise rejections from fire-and-forget DOM listeners.
 * - Provides deterministic disposal without disposing the canonical FormInstance.
 */
export function bindForm<TFields extends FormFieldsRecord, TResult = void>(
  form: FormInstance<TFields>,
  formElement: VanillaDomElement | HTMLFormElement,
  options?: BindFormOptions<FormValues<TFields>, TResult>,
): VanillaBinding {
  // Preflight validation: fail closed with TypeError before any listener attachment
  if (
    !form ||
    typeof form !== "object" ||
    form.kind !== "form" ||
    typeof form.submit !== "function"
  ) {
    throw new TypeError("Invalid form: expected FormInstance");
  }

  if (
    !formElement ||
    typeof formElement !== "object" ||
    typeof formElement.addEventListener !== "function" ||
    typeof formElement.removeEventListener !== "function"
  ) {
    throw new TypeError(
      "Invalid formElement: expected DOM element with addEventListener and removeEventListener",
    );
  }

  const domElement = formElement as VanillaDomElement;
  let isDisposed = false;

  const handleSubmit = (event: unknown): void => {
    if (isDisposed) return;
    const evt = event as EventWithPreventDefault | undefined;

    if (evt && typeof evt.preventDefault === "function") {
      evt.preventDefault();
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
        if (isDisposed) return;
        if (options?.onSubmitException) {
          try {
            options.onSubmitException(err);
          } catch {
            // Contain synchronous errors thrown by user onSubmitException handler
          }
        }
      });
  };

  domElement.addEventListener("submit", handleSubmit);

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    domElement.removeEventListener("submit", handleSubmit);
  };

  return { dispose };
}
