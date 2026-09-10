import type {
  FieldIssue,
  FieldState,
  FormValues,
  SubmitAction,
  SubmitOptions,
} from "../../core/types.js";

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
 * Configuration options for focus and scroll orchestration.
 */
export interface FocusInvalidOptions {
  /**
   * Whether to scroll the target element into view.
   * Accepts boolean or native `ScrollIntoViewOptions`.
   * Defaults to false.
   */
  readonly scroll?: boolean | ScrollIntoViewOptions | undefined;

  /**
   * Whether to prevent browser default scroll when focusing.
   * Defaults to true if `scroll` is requested to prevent duplicate scrolling, false otherwise.
   */
  readonly preventScroll?: boolean | undefined;

  /**
   * Whether to focus the target element.
   * Defaults to true. If false, only scrolling is performed (scroll-only mode).
   */
  readonly focus?: boolean | undefined;
}

/**
 * Diagnostic outcome returned by focus invalid orchestration.
 * Contains purely boolean indicators without exposing field or DOM values.
 */
export interface FocusInvalidResult {
  /**
   * Whether an eligible invalid form control was successfully focused.
   */
  readonly focused: boolean;

  /**
   * Whether an eligible invalid form control was scrolled into view.
   */
  readonly scrolled: boolean;

  /**
   * Whether at least one invalid field was found in the form.
   */
  readonly hasInvalidFields: boolean;

  /**
   * Whether an eligible DOM control matching an invalid field was found.
   */
  readonly hasEligibleTarget: boolean;
}

/**
 * Disposable handle returned by `bindForm`.
 * Extends `VanillaBinding` with focus and accessibility orchestration capabilities.
 */
export interface VanillaFormBinding extends VanillaBinding {
  /**
   * Imperatively orchestrates focus (and optional scrolling) to the first eligible
   * invalid bound form control according to current DOM presentation order.
   */
  readonly focusInvalid: (options?: FocusInvalidOptions) => FocusInvalidResult;

  /**
   * Convenience alias for `focusInvalid`.
   */
  readonly focusFirstInvalid: (options?: FocusInvalidOptions) => FocusInvalidResult;

  /**
   * Binds a field control element within the scope of this form binding.
   */
  readonly bindField: <TValue, TRaw = TValue>(
    field: FieldState<TValue, TRaw>,
    element: VanillaFieldElement,
    options?: BindFieldOptions,
  ) => VanillaBinding;
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

  /**
   * Optional form binding handle to associate this field's control with for focus orchestration.
   * If omitted, automatic association via the control's enclosing `<form>` element is attempted.
   */
  readonly formBinding?: VanillaFormBinding | undefined;
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

  /**
   * If true or configured with options, automatically focuses (and optionally scrolls to)
   * the first invalid bound control upon submit validation failure.
   * Defaults to false (explicit opt-in).
   */
  readonly focusInvalidOnSubmit?: boolean | FocusInvalidOptions | undefined;
}
