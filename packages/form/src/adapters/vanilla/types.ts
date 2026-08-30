import type { FieldIssue, FormValues, SubmitAction, SubmitOptions } from "../../core/types.js";

/**
 * Disposable handle returned by DOM bindings (`bindField`, `bindForm`).
 */
export interface VanillaBinding {
  /**
   * Detaches DOM event listeners and unsubscribes from Vii Form reactive signals.
   * Does NOT dispose the canonical FieldState or FormInstance.
   */
  readonly dispose: () => void;
}

/**
 * Minimal structural DOM element interface required by Vanilla adapter bindings.
 * Matches standard HTML elements without enforcing runtime DOM global requirements.
 */
export interface VanillaDomElement {
  value?: unknown;
  checked?: boolean | undefined;
  type?: string | undefined;
  id?: string | undefined;
  name?: string | undefined;
  multiple?: boolean | undefined;
  files?: unknown;
  textContent?: string | null | undefined;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
  removeAttribute?(name: string): void;
  addEventListener(
    event: string,
    handler: (event: unknown) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    event: string,
    handler: (event: unknown) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

/**
 * Configuration options for `bindField`.
 */
export interface BindFieldOptions {
  /**
   * Target DOM element for rendering validation/server issue messages using safe textContent.
   */
  readonly issueElement?: VanillaDomElement | HTMLElement | undefined;

  /**
   * Custom issue message formatter. Must return plain text string (never HTML).
   */
  readonly formatIssues?: ((issues: readonly FieldIssue[]) => string) | undefined;

  /**
   * Controls whether `aria-invalid="true"` is projected when the field is invalid.
   * Defaults to `true` when the element supports DOM attributes.
   * Pending async validation alone never marks the control invalid.
   */
  readonly ariaInvalid?: boolean | undefined;

  /**
   * Controls whether the issue element's `id` is linked into the control's `aria-describedby` attribute.
   * Defaults to `true` when both elements support attributes and issueElement has a non-empty `id`.
   */
  readonly ariaDescribedBy?: boolean | undefined;
}

/**
 * Configuration options for `bindForm`.
 */
export interface BindFormOptions<
  TValues extends FormValues<Record<string, unknown>>,
  TResult = void,
> {
  /**
   * Application submit action invoked when native form submit occurs.
   */
  readonly action?: SubmitAction<TValues, TResult> | undefined;

  /**
   * Submission execution options (e.g. duplicate submit policy).
   */
  readonly submitOptions?: SubmitOptions | undefined;

  /**
   * Callback invoked when submission succeeds.
   */
  readonly onSubmitSuccess?: ((result: TResult) => void) | undefined;

  /**
   * Callback invoked when submission fails due to client or server validation issues.
   */
  readonly onSubmitError?: ((issues: readonly FieldIssue[]) => void) | undefined;

  /**
   * Callback invoked when the submit action throws or rejects with an unexpected error.
   * A native DOM submit event listener is fire-and-forget; this callback provides error
   * ownership and prevents unhandled Promise rejections.
   */
  readonly onSubmitException?: ((error: unknown) => void) | undefined;
}
