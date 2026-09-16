import { signal, type Signal } from "@angular/core";
import type { FieldState } from "../../core/types.js";
import { createTeardown } from "./destroy.js";
import type { AngularAdapterOptions } from "./types.js";

/**
 * ControlValueAccessor bridge connecting a canonical Vii FieldState to Angular forms.
 *
 * Guarantees:
 * - Vii FieldState remains authoritative canonical state.
 * - Reentrancy guard prevents feedback loops during Angular-originated writes.
 * - Presentation-owned disabled state projected via Angular Signal.
 * - Preserves raw vs domain value distinction (operates on TRaw).
 * - Destroying the accessor only tears down adapter subscriptions; canonical field survives.
 */
export class ViiControlValueAccessor<TValue = unknown, TRaw = TValue> {
  private isPropagatingFromAngular = false;
  private onChangeCallback?: ((value: TRaw) => void) | undefined;
  private onTouchedCallback?: (() => void) | undefined;
  private readonly disabledSig = signal(false);
  readonly disabled: Signal<boolean> = this.disabledSig.asReadonly();
  private readonly teardown: ReturnType<typeof createTeardown>;

  constructor(
    readonly field: FieldState<TValue, TRaw>,
    options?: AngularAdapterOptions,
  ) {
    this.teardown = createTeardown(options);
    this.teardown.unsubs.push(
      field.rawValue.subscribe((raw) => {
        if (
          !this.teardown.isDisposed() &&
          !this.isPropagatingFromAngular &&
          this.onChangeCallback
        ) {
          this.onChangeCallback(raw);
        }
      }),
      field.touched.subscribe((touched) => {
        if (!this.teardown.isDisposed() && touched && this.onTouchedCallback) {
          this.onTouchedCallback();
        }
      }),
    );
  }

  writeValue(value: unknown): void {
    if (this.teardown.isDisposed()) return;
    this.isPropagatingFromAngular = true;
    try {
      this.field.setRawValue(value as TRaw);
    } finally {
      this.isPropagatingFromAngular = false;
    }
  }

  registerOnChange(fn: (value: TRaw) => void): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (!this.teardown.isDisposed()) {
      this.disabledSig.set(isDisabled);
    }
  }

  dispose(): void {
    this.teardown.dispose();
    this.onChangeCallback = undefined;
    this.onTouchedCallback = undefined;
  }
}

/**
 * Creates a ViiControlValueAccessor bridge for a canonical Vii FieldState.
 */
export function createViiControlValueAccessor<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  options?: AngularAdapterOptions,
): ViiControlValueAccessor<TValue, TRaw> {
  return new ViiControlValueAccessor(field, options);
}
