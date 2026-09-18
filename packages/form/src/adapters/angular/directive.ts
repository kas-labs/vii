/* eslint-disable @typescript-eslint/consistent-type-imports -- ElementRef is a runtime DI token for Angular. */
import {
  Directive,
  ElementRef,
  Input,
  type OnChanges,
  type OnDestroy,
  type SimpleChanges,
} from "@angular/core";
import type { FieldState } from "../../core/types.js";
import type { SupportedAngularFieldElement, SupportedAngularFieldState } from "./types.js";

@Directive({ selector: "[viiField]", standalone: true })
export class ViiFieldDirective implements OnChanges, OnDestroy {
  @Input()
  viiField: SupportedAngularFieldState | undefined;

  private cleanupFn?: (() => void) | undefined;

  constructor(private readonly elementRef: ElementRef<SupportedAngularFieldElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["viiField"]) {
      this.syncFieldBinding();
    }
  }

  ngOnDestroy(): void {
    this.unbind();
  }

  private syncFieldBinding(): void {
    this.unbind();
    const field = this.viiField;
    const element = this.elementRef.nativeElement;
    if (field && element) {
      this.bind(element, field);
    }
  }

  private bind(el: SupportedAngularFieldElement, field: SupportedAngularFieldState): void {
    if (!field?.setRawValue) return;
    const tag = el.tagName;
    const t = (el as HTMLInputElement).type;
    if (tag !== "INPUT" && tag !== "TEXTAREA") return;
    if (t === "file" || t === "radio") return;

    const isCheckbox = t === "checkbox";
    const rawKind = typeof field.rawValue.get();
    if (isCheckbox ? rawKind !== "boolean" : rawKind !== "string") return;

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
  }
}
