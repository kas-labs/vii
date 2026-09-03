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
 * Minimal structural DOM control interface required by Vanilla adapter field bindings.
 * Matches form control elements without enforcing runtime DOM global requirements.
 */
export interface VanillaDomControl {
  value: unknown;
  tagName?: string | undefined;
  nodeName?: string | undefined;
  type?: string | undefined;
  checked?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  multiple?: boolean | undefined;
  files?: unknown;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
  removeAttribute?(name: string): void;
  hasAttribute?(name: string): boolean;
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
 * Supported DOM form control elements for `bindField`.
 * Explicitly restricts binding to input, textarea, and select elements,
 * preventing arbitrary HTMLElement instances (such as HTMLDivElement) from passing type checks.
 */
export type VanillaFieldElement =
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | VanillaDomControl;

/**
 * Structural DOM element interface required by issue element sinks and general DOM nodes.
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
  hasAttribute?(name: string): boolean;
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
   * When the field is valid or upon disposal, the original pre-binding attribute state is restored.
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
