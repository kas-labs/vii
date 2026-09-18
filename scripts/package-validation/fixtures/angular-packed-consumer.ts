import "@angular/compiler";
import "zone.js";
import { Window } from "happy-dom";

const domWindow = new Window();
Object.assign(globalThis, {
  window: domWindow,
  document: domWindow.document,
  getComputedStyle: domWindow.getComputedStyle.bind(domWindow),
  Node: domWindow.Node,
  HTMLElement: domWindow.HTMLElement,
  HTMLInputElement: domWindow.HTMLInputElement,
  HTMLTextAreaElement: domWindow.HTMLTextAreaElement,
  Event: domWindow.Event,
  InputEvent: domWindow.InputEvent,
});
import {
  Component,
  DestroyRef,
  forwardRef,
  inject,
  Input,
  type OnDestroy,
  type OnInit,
} from "@angular/core";
import { TestBed, getTestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import {
  type ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from "@angular/forms";
import { createField, createForm } from "@vii-labs/form";
import * as formAngular from "@vii-labs/form/angular";
import {
  ViiFieldDirective,
  provideViiForm,
  VII_FORM_TOKEN,
  ViiControlValueAccessor,
} from "@vii-labs/form/angular";

export const angularKeys = Object.keys(formAngular).sort();

let testEnvReady = false;

function ensureTestEnvironment(): void {
  if (testEnvReady) {
    return;
  }
  getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  testEnvReady = true;
}

@Component({
  standalone: true,
  imports: [ViiFieldDirective],
  template: `
    <input type="text" [viiField]="textField" />
    <textarea [viiField]="textField"></textarea>
    <input type="checkbox" [viiField]="boolField" />
  `,
})
class PackedDirectiveHostComponent {
  textField = createField({ initialValue: "packed-hello" });
  boolField = createField({ initialValue: false });
}

@Component({
  selector: "vii-packed-cva-bridge",
  standalone: true,
  imports: [ViiFieldDirective],
  template: `<input type="text" [viiField]="field" />`,
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

  ngOnInit(): void {
    this.bridge = new ViiControlValueAccessor(this.field, { destroyRef: this.destroyRef });
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
class PackedCvaHostComponent {
  field = createField({ initialValue: "vii-seed" });
  control = new FormControl("angular-seed", { nonNullable: true });
}

export function runAngularTemplateIntegration() {
  ensureTestEnvironment();

  const form = createForm({
    fields: {
      username: createField({ initialValue: "test-user" }),
    },
  });
  const provider = provideViiForm(form) as {
    provide: typeof VII_FORM_TOKEN;
    useValue: unknown;
  };
  const hasProvider = provider.provide === VII_FORM_TOKEN && provider.useValue === form;

  TestBed.configureTestingModule({ imports: [PackedDirectiveHostComponent] });
  const directiveFixture = TestBed.createComponent(PackedDirectiveHostComponent);
  directiveFixture.detectChanges();

  const input = directiveFixture.nativeElement.querySelector(
    "input[type='text']",
  ) as HTMLInputElement;
  const checkbox = directiveFixture.nativeElement.querySelector(
    "input[type='checkbox']",
  ) as HTMLInputElement;

  input.value = "packed-dom";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  directiveFixture.detectChanges();

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change"));
  directiveFixture.detectChanges();

  const textField = directiveFixture.componentInstance.textField;
  const boolField = directiveFixture.componentInstance.boolField;

  TestBed.resetTestingModule();
  ensureTestEnvironment();
  TestBed.configureTestingModule({ imports: [PackedCvaHostComponent] });
  const cvaFixture = TestBed.createComponent(PackedCvaHostComponent);
  cvaFixture.detectChanges();

  let controlChanges = 0;
  const sub = cvaFixture.componentInstance.control.valueChanges.subscribe(() => {
    controlChanges += 1;
  });

  cvaFixture.componentInstance.control.setValue("from-form-control");
  cvaFixture.detectChanges();

  const cvaInput = cvaFixture.nativeElement.querySelector("input") as HTMLInputElement;
  cvaInput.value = "from-packed-user";
  cvaInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
  cvaFixture.detectChanges();

  const bridge = new ViiControlValueAccessor(form.fields.username);
  bridge.writeValue("bridge-user");
  const bridgeWritten = form.fields.username.getRawValue();
  bridge.dispose();

  const result = {
    hasProvider,
    templateCompiled: true,
    initialInputValue: input.value,
    textRawAfterInput: textField.getRawValue(),
    boolRawAfterToggle: boolField.getRawValue(),
    cvaControlValue: cvaFixture.componentInstance.control.value,
    cvaFieldRaw: cvaFixture.componentInstance.field.getRawValue(),
    cvaInputValue: cvaInput.value,
    controlChanges,
    bridgeWritten,
  };

  sub.unsubscribe();
  textField.dispose();
  boolField.dispose();
  cvaFixture.componentInstance.field.dispose();
  cvaFixture.destroy();
  directiveFixture.destroy();
  form.dispose();

  return result;
}
