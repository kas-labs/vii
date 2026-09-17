import type { ControlValueAccessor } from "@angular/forms";
import type { FieldState } from "../../core/types.js";
import { createTeardown } from "./destroy.js";
import type { AngularAdapterOptions } from "./types.js";

/** Angular Forms `ControlValueAccessor` bridge; Vii `FieldState` remains canonical. */
export class ViiControlValueAccessor<
  TValue = unknown,
  TRaw = TValue,
> implements ControlValueAccessor {
  private isPropagatingFromAngular = false;
  private onChangeCallback?: ((value: TRaw) => void) | undefined;
  private onTouchedCallback?: (() => void) | undefined;
  private disabledState = false;
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
      this.disabledState = isDisabled;
    }
  }

  disabled(): boolean {
    return this.disabledState;
  }

  dispose(): void {
    this.teardown.dispose();
    this.onChangeCallback = undefined;
    this.onTouchedCallback = undefined;
  }
}
