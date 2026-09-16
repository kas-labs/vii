import {
  ɵɵdefineDirective,
  type ElementRef,
  type OnChanges,
  type OnDestroy,
  type SimpleChanges,
} from "@angular/core";
import type { FieldState } from "../../core/types.js";
import type { SupportedAngularFieldElement, SupportedAngularFieldState } from "./types.js";

function isBooleanField(field: SupportedAngularFieldState): field is FieldState<unknown, boolean> {
  return typeof field.rawValue.get() === "boolean";
}

function isStringField(field: SupportedAngularFieldState): field is FieldState<unknown, string> {
  return typeof field.rawValue.get() === "string";
}

/**
 * Angular standalone directive for declarative two-way DOM binding to a Vii FieldState.
 *
 * Supported controls:
 * - Text-like inputs (`<input type="text">`, `<input type="email">`, etc.) with `string` raw values.
 * - Textarea elements (`<textarea>`) with `string` raw values.
 * - Checkbox inputs (`<input type="checkbox">`) with `boolean` raw values.
 *
 * Excluded controls:
 * - File inputs, radio groups, select[multiple], or custom controls fail closed safely
 *   without attaching listeners or subscriptions.
 *
 * Fail-Closed Safety:
 * If a checkbox is paired with a string field, or a text-like input / textarea is paired
 * with a boolean field, the directive fails closed without attaching listeners or subscriptions.
 *
 * Usage in template:
 * `<input [viiField]="usernameField" />`
 */
export class ViiFieldDirective implements OnChanges, OnDestroy {
  static ɵfac = (t?: unknown) =>
    t ? new (t as new (...args: unknown[]) => ViiFieldDirective)() : new ViiFieldDirective();

  static ɵdir = ɵɵdefineDirective({
    type: ViiFieldDirective,
    selectors: [["", "viiField", ""]],
    inputs: { field: "viiField" },
    standalone: true,
  });

  field: SupportedAngularFieldState | undefined;

  private currentField: SupportedAngularFieldState | undefined;
  private cleanupFn?: (() => void) | undefined;
  private readonly element: SupportedAngularFieldElement | null;

  constructor(elementRef?: ElementRef<SupportedAngularFieldElement>) {
    this.element = (elementRef?.nativeElement as SupportedAngularFieldElement) ?? null;
  }

  ngOnChanges(changes?: SimpleChanges): void {
    if (!changes || "field" in changes || this.field !== this.currentField) {
      this.unbind();
      this.currentField = this.field;
      if (this.field && this.element) {
        this.bind(this.element, this.field);
      }
    }
  }

  ngOnDestroy(): void {
    this.unbind();
  }

  private bind(el: SupportedAngularFieldElement, field: SupportedAngularFieldState): void {
    if (!field?.setRawValue) return;
    const tag = el.tagName;
    const t = (el as HTMLInputElement).type;
    if (tag !== "INPUT" && tag !== "TEXTAREA") return;
    if (t === "file" || t === "radio") return;

    const isCheckbox = t === "checkbox";
    if (isCheckbox ? !isBooleanField(field) : !isStringField(field)) return;

    const inputEl = el as HTMLInputElement;
    const update = (): void => {
      if (isCheckbox) {
        inputEl.checked = (field as FieldState<unknown, boolean>).rawValue.get();
      } else {
        inputEl.value = (field as FieldState<unknown, string>).rawValue.get() ?? "";
      }
    };
    update();
    const unsubscribe = field.rawValue.subscribe(update);

    const onInput = (e: Event): void => {
      const target = e.target as HTMLInputElement | null;
      if (isCheckbox) {
        (field as FieldState<unknown, boolean>).setRawValue(Boolean(target?.checked));
      } else {
        (field as FieldState<unknown, string>).setRawValue(target?.value ?? "");
      }
    };

    const onBlur = (): void => {
      field.markTouched();
    };

    const eventName = isCheckbox ? "change" : "input";
    el.addEventListener(eventName, onInput);
    el.addEventListener("blur", onBlur);

    this.cleanupFn = () => {
      unsubscribe();
      el.removeEventListener(eventName, onInput);
      el.removeEventListener("blur", onBlur);
    };
  }

  private unbind(): void {
    if (this.cleanupFn) {
      const clean = this.cleanupFn;
      this.cleanupFn = undefined;
      clean();
    }
    this.currentField = undefined;
  }
}
