/**
 * @vitest-environment happy-dom
 */
import "@angular/compiler";
import "zone.js";
import "zone.js/testing";
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TestBed, getTestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import { DestroyRef, forwardRef, inject, Input, type OnDestroy, type OnInit } from "@angular/core";
import {
  type ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from "@angular/forms";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ViiFieldDirective, ViiControlValueAccessor } from "../../dist/adapters/angular/index.js";
import { createField } from "../../src/index.js";

beforeAll(() => {
  getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
});

afterEach(() => {
  TestBed.resetTestingModule();
});

describe("Angular template integration (P2f acceptance)", () => {
  describe("ViiFieldDirective via real templates", () => {
    @Component({
      standalone: true,
      imports: [CommonModule, ViiFieldDirective],
      template: `
        <input *ngIf="showInput" type="text" [viiField]="field" />
        <textarea [viiField]="field"></textarea>
        <input type="checkbox" [viiField]="booleanField" />
      `,
    })
    class HostComponent {
      field = createField({ initialValue: "hello" });
      booleanField = createField({ initialValue: false });
      showInput = true;
    }

    it("injects host ElementRef and syncs input, textarea, and checkbox", async () => {
      await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
      const fixture = TestBed.createComponent(HostComponent);
      const host = fixture.componentInstance;
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector(
        "input:not([type='checkbox'])",
      ) as HTMLInputElement;
      const textarea = fixture.nativeElement.querySelector("textarea") as HTMLTextAreaElement;
      const checkbox = fixture.nativeElement.querySelector(
        "input[type='checkbox']",
      ) as HTMLInputElement;

      expect(input.value).toBe("hello");
      expect(textarea.value).toBe("hello");
      expect(checkbox.checked).toBe(false);

      input.value = "from-dom";
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      fixture.detectChanges();
      expect(host.field.rawValue.get()).toBe("from-dom");

      host.field.setRawValue("from-vii");
      fixture.detectChanges();
      expect(input.value).toBe("from-vii");
      expect(textarea.value).toBe("from-vii");

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change"));
      expect(host.booleanField.rawValue.get()).toBe(true);

      input.dispatchEvent(new Event("blur"));
      expect(host.field.touched.get()).toBe(true);

      host.showInput = false;
      fixture.detectChanges();
      host.field.setRawValue("after-destroy");
      fixture.detectChanges();
      expect(textarea.value).toBe("after-destroy");

      host.showInput = true;
      fixture.detectChanges();
      const remounted = fixture.nativeElement.querySelector(
        "input:not([type='checkbox'])",
      ) as HTMLInputElement;
      expect(remounted.value).toBe("after-destroy");
      expect(host.field.rawValue.get()).toBe("after-destroy");

      host.booleanField.dispose();
      fixture.destroy();
    });
  });

  describe("Angular Forms CVA with ViiFieldDirective", () => {
    @Component({
      selector: "vii-packed-cva-bridge",
      standalone: true,
      imports: [ViiFieldDirective],
      template: `<input type="text" [viiField]="field" [disabled]="presentationDisabled" />`,
      providers: [
        {
          provide: NG_VALUE_ACCESSOR,
          useExisting: forwardRef(() => PackedCvaBridgeComponent),
          multi: true,
        },
      ],
    })
    class PackedCvaBridgeComponent implements ControlValueAccessor, OnInit, OnDestroy {
      @Input({ required: true }) field!: ReturnType<typeof createField<string>>;
      private readonly destroyRef = inject(DestroyRef);
      private bridge?: ViiControlValueAccessor<unknown, string>;
      presentationDisabled = false;

      ngOnInit(): void {
        this.bridge = new ViiControlValueAccessor(this.field, {
          destroyRef: this.destroyRef,
        });
      }

      writeValue(value: unknown): void {
        this.bridge?.writeValue(value);
      }

      registerOnChange(fn: (value: string) => void): void {
        this.bridge?.registerOnChange(fn);
      }

      registerOnTouched(fn: () => void): void {
        this.bridge?.registerOnTouched(fn);
      }

      setDisabledState(isDisabled: boolean): void {
        this.bridge?.setDisabledState(isDisabled);
        this.presentationDisabled = isDisabled;
      }

      ngOnDestroy(): void {
        this.bridge?.dispose();
      }
    }

    @Component({
      standalone: true,
      imports: [ReactiveFormsModule, PackedCvaBridgeComponent],
      template: `<vii-packed-cva-bridge [field]="field" [formControl]="control" />`,
    })
    class CvaHostComponent {
      field = createField({ initialValue: "vii-init" });
      control = new FormControl("angular-init", { nonNullable: true });
    }

    it("syncs FormControl and Vii without feedback loops", async () => {
      await TestBed.configureTestingModule({
        imports: [ReactiveFormsModule, CvaHostComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(CvaHostComponent);
      const host = fixture.componentInstance;
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
      expect(host.field.rawValue.get()).toBe("angular-init");
      expect(input.value).toBe("angular-init");
      expect(host.control.value).toBe("angular-init");

      let onChangeCalls = 0;
      const sub = host.control.valueChanges.subscribe(() => {
        onChangeCalls += 1;
      });

      host.control.setValue("from-angular");
      fixture.detectChanges();
      expect(host.field.rawValue.get()).toBe("from-angular");
      expect(input.value).toBe("from-angular");
      expect(onChangeCalls).toBe(1);

      input.value = "from-user";
      input.dispatchEvent(new Event("input"));
      expect(host.field.rawValue.get()).toBe("from-user");
      expect(host.control.value).toBe("from-user");
      expect(onChangeCalls).toBe(2);

      host.field.setRawValue("from-vii");
      fixture.detectChanges();
      expect(host.control.value).toBe("from-vii");
      expect(onChangeCalls).toBe(3);

      input.dispatchEvent(new Event("blur"));
      expect(host.field.touched.get()).toBe(true);

      host.control.disable();
      fixture.detectChanges();
      expect(host.control.disabled).toBe(true);
      const bridge = fixture.debugElement.query(By.directive(PackedCvaBridgeComponent))
        .componentInstance as PackedCvaBridgeComponent;
      expect(bridge.presentationDisabled).toBe(true);

      fixture.destroy();
      host.field.setRawValue("survives");
      expect(host.field.rawValue.get()).toBe("survives");

      sub.unsubscribe();
      host.field.dispose();
    });
  });
});
