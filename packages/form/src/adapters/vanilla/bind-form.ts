import type { FormFieldsRecord, FormInstance, FormValues } from "../../core/types.js";
import { bindField } from "./bind-field.js";
import {
  associateFormBinding,
  createFormFocusRegistry,
  makeResult,
  orchestrateFocusInvalid,
  registerFormElement,
  removeFormBinding,
} from "./focus.js";
import type { BindFormOptions, VanillaDomElement, VanillaFormBinding } from "./types.js";

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
 * - Optionally orchestrates focus to the first invalid control on submission failure via focusInvalidOnSubmit.
 * - Returns a VanillaFormBinding handle exposing imperative focusInvalid orchestration and scoped bindField.
 * - Provides deterministic disposal without disposing the canonical FormInstance.
 */
export function bindForm<TFields extends FormFieldsRecord, TResult = void>(
  form: FormInstance<TFields>,
  formElement: VanillaDomElement | HTMLFormElement,
  options?: BindFormOptions<FormValues<TFields>, TResult>,
): VanillaFormBinding {
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
      "Invalid element: expected DOM element with addEventListener and removeEventListener",
    );
  }

  const domElement = formElement as VanillaDomElement;
  const registry = createFormFocusRegistry();
  const unregisterFormElement = registerFormElement(domElement, registry);
  let isDisposed = false;

  const formAny = form as unknown as FormInstance<Record<string, unknown>>;

  const handleSubmit = (event: unknown): void => {
    if (isDisposed) return;
    (event as EventWithPreventDefault | undefined)?.preventDefault?.();

    void form
      .submit<TResult>(options?.action, options?.submitOptions)
      .then((res) => {
        if (isDisposed) return;
        if (res.status === "succeeded") {
          options?.onSubmitSuccess?.(res.result);
        } else if (res.status === "invalid" || res.status === "server-invalid") {
          if (options?.focusInvalidOnSubmit) {
            orchestrateFocusInvalid(
              registry,
              formAny,
              typeof options.focusInvalidOnSubmit === "object"
                ? options.focusInvalidOnSubmit
                : undefined,
            );
          }
          options?.onSubmitError?.(res.issues);
        }
      })
      .catch((err: unknown) => {
        if (!isDisposed && options?.onSubmitException) {
          try {
            options.onSubmitException(err);
          } catch {
            // Contain synchronous errors
          }
        }
      });
  };

  domElement.addEventListener("submit", handleSubmit);

  const formBinding: VanillaFormBinding = {
    focusInvalid: (focusOpts) =>
      isDisposed
        ? makeResult(false, false, false, false)
        : orchestrateFocusInvalid(registry, formAny, focusOpts),
    focusFirstInvalid: (focusOpts) => formBinding.focusInvalid(focusOpts),
    bindField: (field, element, fieldOptions) =>
      bindField(field, element, { ...fieldOptions, formBinding }),
    dispose: (): void => {
      if (isDisposed) return;
      isDisposed = true;
      domElement.removeEventListener("submit", handleSubmit);
      unregisterFormElement();
      removeFormBinding(formBinding);
      registry.clear();
    },
  };

  associateFormBinding(formBinding, registry);

  return formBinding;
}
