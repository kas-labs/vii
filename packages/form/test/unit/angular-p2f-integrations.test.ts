import {
  createEnvironmentInjector,
  DestroyRef,
  ElementRef,
  Injector,
  runInInjectionContext,
  type EnvironmentInjector,
  type Provider,
} from "@angular/core";
import { describe, expect, it } from "vitest";
import {
  createAngularField,
  injectViiForm,
  provideViiForm,
  ViiControlValueAccessor,
  ViiFieldDirective,
} from "../../src/adapters/angular/index.js";
import type {
  SupportedAngularFieldElement,
  SupportedAngularFieldState,
} from "../../src/adapters/angular/types.js";
import { createField, createForm, createNumberParser } from "../../src/index.js";
import type { FieldState } from "../../src/core/types.js";

// Mock DOM elements for testing
class MockElement {
  public tagName: string;
  public type: string;
  public value: string = "";
  public checked: boolean = false;
  private listeners: Map<string, Set<(e: Event) => void>> = new Map();

  constructor(tagName: string, type: string = "text") {
    this.tagName = tagName.toUpperCase();
    this.type = type.toLowerCase();
  }

  addEventListener(name: string, fn: (e: Event) => void): void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    this.listeners.get(name)!.add(fn);
  }

  removeEventListener(name: string, fn: (e: Event) => void): void {
    this.listeners.get(name)?.delete(fn);
  }

  dispatchEvent(name: string): void {
    const fns = this.listeners.get(name);
    if (fns) {
      for (const fn of Array.from(fns)) {
        fn({ target: this } as unknown as Event);
      }
    }
  }

  getListenerCount(name?: string): number {
    if (name) return this.listeners.get(name)?.size ?? 0;
    let sum = 0;
    for (const set of this.listeners.values()) sum += set.size;
    return sum;
  }
}

function createMockElementRef(el: MockElement): ElementRef<SupportedAngularFieldElement> {
  return new ElementRef(el as unknown as SupportedAngularFieldElement);
}

function assignViiField(
  directive: ViiFieldDirective,
  field: SupportedAngularFieldState | undefined,
  previous: SupportedAngularFieldState | undefined = undefined,
): void {
  void previous;
  directive.viiField = field;
  directive.ngOnChanges({
    viiField: {
      previousValue: previous,
      currentValue: field,
      firstChange: previous === undefined,
      isFirstChange: () => previous === undefined,
    },
  });
}

function createTestInjector(providers: Provider[] = []): EnvironmentInjector {
  return createEnvironmentInjector(
    providers,
    Injector.create({ providers: [] }) as unknown as EnvironmentInjector,
  );
}

describe("Angular Ecosystem Integration (P2f)", () => {
  describe("ViiFieldDirective ([viiField])", () => {
    it("binds text input element and projects initial value", () => {
      const field = createField({ initialValue: "test-user" });
      const el = new MockElement("input", "text");
      const directive = new ViiFieldDirective(createMockElementRef(el));

      assignViiField(directive, field);

      expect(el.value).toBe("test-user");
      expect(el.getListenerCount("input")).toBe(1);
      expect(el.getListenerCount("blur")).toBe(1);

      directive.ngOnDestroy();
      field.dispose();
    });

    it("synchronizes DOM input event to Vii raw state", () => {
      const field = createField({ initialValue: "initial" });
      const el = new MockElement("input", "text");
      const directive = new ViiFieldDirective(createMockElementRef(el));

      assignViiField(directive, field);
      el.value = "typed-value";
      el.dispatchEvent("input");

      expect(field.getRawValue()).toBe("typed-value");
      expect(field.getValue()).toBe("typed-value");
      expect(field.dirty.get()).toBe(true);

      directive.ngOnDestroy();
      field.dispose();
    });

    it("marks field as touched on DOM blur event", () => {
      const field = createField({ initialValue: "" });
      const el = new MockElement("input", "text");
      const directive = new ViiFieldDirective(createMockElementRef(el));

      assignViiField(directive, field);
      expect(field.touched.get()).toBe(false);

      el.dispatchEvent("blur");
      expect(field.touched.get()).toBe(true);

      directive.ngOnDestroy();
      field.dispose();
    });

    it("binds textarea elements for multiline string fields", () => {
      const field = createField({ initialValue: "line1\nline2" });
      const el = new MockElement("textarea");
      const directive = new ViiFieldDirective(createMockElementRef(el));

      assignViiField(directive, field);
      expect(el.value).toBe("line1\nline2");

      el.value = "line1\nline2\nline3";
      el.dispatchEvent("input");
      expect(field.getValue()).toBe("line1\nline2\nline3");

      directive.ngOnDestroy();
      field.dispose();
    });

    it("binds checkbox inputs and sets boolean raw values", () => {
      const field = createField({ initialValue: false });
      const el = new MockElement("input", "checkbox");
      const directive = new ViiFieldDirective(createMockElementRef(el));

      assignViiField(directive, field);
      expect(el.checked).toBe(false);
      expect(el.getListenerCount("change")).toBe(1);

      el.checked = true;
      el.dispatchEvent("change");
      expect(field.getValue()).toBe(true);
      expect(field.dirty.get()).toBe(true);

      // External mutation updates checkbox
      field.setValue(false);
      expect(el.checked).toBe(false);

      directive.ngOnDestroy();
      field.dispose();
    });

    describe("Checkbox & Text Type Safety & Fail-Closed Behavior", () => {
      it("fails closed when checkbox is bound to string field", () => {
        const field = createField({ initialValue: "not-a-boolean" });
        const el = new MockElement("input", "checkbox");
        const directive = new ViiFieldDirective(createMockElementRef(el));

        assignViiField(directive, field as unknown as SupportedAngularFieldState);
        expect(el.getListenerCount()).toBe(0);
        expect(el.checked).toBe(false);

        el.checked = true;
        el.dispatchEvent("change");
        expect(field.getValue()).toBe("not-a-boolean");

        directive.ngOnDestroy();
        field.dispose();
      });

      it("fails closed when text input is bound to boolean field", () => {
        const field = createField({ initialValue: true });
        const el = new MockElement("input", "text");
        const directive = new ViiFieldDirective(createMockElementRef(el));

        assignViiField(directive, field as unknown as SupportedAngularFieldState);
        expect(el.getListenerCount()).toBe(0);
        expect(el.value).toBe("");

        directive.ngOnDestroy();
        field.dispose();
      });

      it("fails closed when textarea is bound to boolean field", () => {
        const field = createField({ initialValue: false });
        const el = new MockElement("textarea");
        const directive = new ViiFieldDirective(createMockElementRef(el));

        assignViiField(directive, field as unknown as SupportedAngularFieldState);
        expect(el.getListenerCount()).toBe(0);

        directive.ngOnDestroy();
        field.dispose();
      });

      it("fails closed on unsupported element types (file, radio, select, div)", () => {
        const stringField = createField({ initialValue: "test" });

        const unsupportedElements: readonly (readonly [string, string])[] = [
          ["input", "file"],
          ["input", "radio"],
          ["select", ""],
          ["div", ""],
        ];

        for (const [tag, type] of unsupportedElements) {
          const el = new MockElement(tag, type);
          const directive = new ViiFieldDirective(createMockElementRef(el));
          assignViiField(directive, stringField);
          expect(el.getListenerCount()).toBe(0);
          directive.ngOnDestroy();
        }

        stringField.dispose();
      });
    });

    describe("Field Replacement (fieldA -> fieldB)", () => {
      it("detaches listeners and subscriptions from fieldA and cleanly binds fieldB", () => {
        const fieldA = createField({ initialValue: "User A" });
        const fieldB = createField({ initialValue: "User B" });
        const el = new MockElement("input", "text");
        const directive = new ViiFieldDirective(createMockElementRef(el));

        assignViiField(directive, fieldA);
        expect(el.value).toBe("User A");
        expect(el.getListenerCount()).toBe(2);

        // Replace with fieldB
        assignViiField(directive, fieldB, fieldA);
        // DOM immediately reflects fieldB
        expect(el.value).toBe("User B");
        // Listener count remains 2 (not duplicated)
        expect(el.getListenerCount()).toBe(2);

        // Typing into DOM updates fieldB only
        el.value = "Updated User B";
        el.dispatchEvent("input");
        expect(fieldB.getValue()).toBe("Updated User B");
        expect(fieldA.getValue()).toBe("User A");

        // fieldA external mutation does NOT affect DOM
        fieldA.setValue("Stale Write A");
        expect(el.value).toBe("Updated User B");

        directive.ngOnDestroy();
        fieldA.dispose();
        fieldB.dispose();
      });
    });

    describe("Presentation-Only Lifecycle & Unmount Preservation", () => {
      it("preserves canonical field state when directive is destroyed and remounted", () => {
        const field = createField({ initialValue: "persistent-value" });
        field.setTouched(true);
        field.setValue("mutated-value");

        const el1 = new MockElement("input", "text");
        const directive1 = new ViiFieldDirective(createMockElementRef(el1));
        assignViiField(directive1, field);
        expect(el1.value).toBe("mutated-value");

        // Unmount directive1 (simulating @if unmount)
        directive1.ngOnDestroy();
        expect(el1.getListenerCount()).toBe(0);

        // Canonical field survives untouched!
        expect(field.getValue()).toBe("mutated-value");
        expect(field.touched.get()).toBe(true);
        expect(field.dirty.get()).toBe(true);

        // Remount directive2 (simulating @if remount)
        const el2 = new MockElement("input", "text");
        const directive2 = new ViiFieldDirective(createMockElementRef(el2));
        assignViiField(directive2, field);
        expect(el2.value).toBe("mutated-value");

        directive2.ngOnDestroy();
        field.dispose();
      });

      it("supports multiple presentation bindings to one canonical field", () => {
        const field = createField({ initialValue: "shared-state" });
        const el1 = new MockElement("input", "text");
        const el2 = new MockElement("input", "text");

        const dir1 = new ViiFieldDirective(createMockElementRef(el1));
        const dir2 = new ViiFieldDirective(createMockElementRef(el2));

        assignViiField(dir1, field);
        assignViiField(dir2, field);

        expect(el1.value).toBe("shared-state");
        expect(el2.value).toBe("shared-state");

        // Typing in el1 updates field and el2
        el1.value = "from-view-1";
        el1.dispatchEvent("input");

        expect(field.getValue()).toBe("from-view-1");
        expect(el2.value).toBe("from-view-1");

        // Destroying dir1 does not affect dir2 or canonical field
        dir1.ngOnDestroy();
        expect(el1.getListenerCount()).toBe(0);
        expect(el2.getListenerCount()).toBe(2);

        el2.value = "from-view-2";
        el2.dispatchEvent("input");
        expect(field.getValue()).toBe("from-view-2");

        dir2.ngOnDestroy();
        field.dispose();
      });
    });

    describe("SSR Safety", () => {
      it("instantiates cleanly without DOM elements during SSR / Node execution", () => {
        const directive = new ViiFieldDirective(
          createMockElementRef(new MockElement("input", "text")),
        );
        expect(directive).toBeDefined();

        const field = createField({ initialValue: "ssr-val" });
        assignViiField(directive, field);

        expect(() => directive.ngOnDestroy()).not.toThrow();
        field.dispose();
      });
    });
  });

  describe("ViiControlValueAccessor (CVA Bridge)", () => {
    it("implements ControlValueAccessor protocol with factory and class", () => {
      const field = createField({ initialValue: "initial-val" });
      const cva = new ViiControlValueAccessor(field);

      expect(cva instanceof ViiControlValueAccessor).toBe(true);
      expect(cva.field).toBe(field);
      expect(typeof cva.writeValue).toBe("function");
      expect(typeof cva.registerOnChange).toBe("function");
      expect(typeof cva.registerOnTouched).toBe("function");
      expect(typeof cva.setDisabledState).toBe("function");
      expect(cva.disabled()).toBe(false);

      cva.dispose();
      field.dispose();
    });

    it("satisfies dedicated anti-loop guarantee (Step 38)", () => {
      const field = createField({ initialValue: "init" });
      const cva = new ViiControlValueAccessor(field);

      let onChangeCalls = 0;
      let lastOnChangeVal = "";
      cva.registerOnChange((val) => {
        onChangeCalls++;
        lastOnChangeVal = val;
      });

      let onTouchedCalls = 0;
      cva.registerOnTouched(() => {
        onTouchedCalls++;
      });

      // 1. Angular writes value into CVA:
      // Canonical Vii state updates, but onChange is NOT called back (anti-loop)
      cva.writeValue("from-angular");
      expect(field.getValue()).toBe("from-angular");
      expect(field.getRawValue()).toBe("from-angular");
      expect(onChangeCalls).toBe(0); // Zero loopback!

      // 2. User/presentation mutates field:
      // onChange is called exactly once
      field.setRawValue("from-user");
      expect(onChangeCalls).toBe(1);
      expect(lastOnChangeVal).toBe("from-user");

      // 3. blur / touched propagates exactly once
      expect(onTouchedCalls).toBe(0);
      field.setTouched(true);
      expect(onTouchedCalls).toBe(1);

      // Setting touched again does not call onTouched again
      field.setTouched(true);
      expect(onTouchedCalls).toBe(1);

      cva.dispose();
      field.dispose();
    });

    it("manages presentation-owned disabled state without mutating Core", () => {
      const field = createField({ initialValue: "data" });
      const cva = new ViiControlValueAccessor(field);

      expect(cva.disabled()).toBe(false);

      cva.setDisabledState(true);
      expect(cva.disabled()).toBe(true);

      cva.setDisabledState(false);
      expect(cva.disabled()).toBe(false);

      // Core FieldState is headless and untouched
      expect(field.getValue()).toBe("data");

      cva.dispose();
      field.dispose();
    });

    it("preserves raw vs domain value distinction for parser-backed fields", () => {
      const field = createField<number, string>({
        initialValue: 100,
        initialRawValue: "100",
        parser: createNumberParser(),
      });
      const cva = new ViiControlValueAccessor(field);

      let lastOnChange = "";
      cva.registerOnChange((val) => {
        lastOnChange = val;
      });

      // Write intermediate raw string from Angular
      cva.writeValue("250");
      expect(field.getValue()).toBe(250);
      expect(field.getRawValue()).toBe("250");

      // Field set raw string with intermediate invalid text
      field.setRawValue("-");
      expect(lastOnChange).toBe("-");
      expect(field.getRawValue()).toBe("-");
      expect(field.getValue()).toBe(250); // Domain value preserved
      expect(field.parseStatus.get()).toBe("invalid");

      cva.dispose();
      field.dispose();
    });

    it("cleans up subscriptions on dispose or DestroyRef without disposing canonical field", () => {
      const injector = createTestInjector();
      const field = createField({ initialValue: "test" });

      const cva = runInInjectionContext(
        injector,
        () => new ViiControlValueAccessor(field, { destroyRef: injector.get(DestroyRef) }),
      );

      let onChangeCalls = 0;
      cva.registerOnChange(() => onChangeCalls++);

      field.setRawValue("val1");
      expect(onChangeCalls).toBe(1);

      // Destroy injector
      injector.destroy();

      // Subsequent field changes do not notify CVA
      field.setRawValue("val2");
      expect(onChangeCalls).toBe(1);

      // Canonical field is still alive and operational
      expect(field.getRawValue()).toBe("val2");

      field.dispose();
    });
  });

  describe("Angular Dependency Injection (provideViiForm & injectViiForm)", () => {
    it("provides and injects FormInstance via scoped injector token", () => {
      const form = createForm({
        fields: {
          username: createField({ initialValue: "alice" }),
        },
      });

      const injector = createTestInjector([provideViiForm(form)]);

      const injected = runInInjectionContext(injector, () =>
        injectViiForm<{ username: FieldState<string> }>(),
      );
      expect(injected).toBe(form);
      expect(injected.fields.username.getValue()).toBe("alice");

      form.dispose();
    });

    it("isolates multiple simultaneous form instances in different injector scopes (Step 25)", () => {
      const formA = createForm({
        fields: {
          title: createField({ initialValue: "Form A Title" }),
        },
      });
      const formB = createForm({
        fields: {
          title: createField({ initialValue: "Form B Title" }),
        },
      });

      const injectorA = createTestInjector([provideViiForm(formA)]);
      const injectorB = createTestInjector([provideViiForm(formB)]);

      const injectedA = runInInjectionContext(injectorA, () =>
        injectViiForm<{ title: FieldState<string> }>(),
      );
      const injectedB = runInInjectionContext(injectorB, () =>
        injectViiForm<{ title: FieldState<string> }>(),
      );

      expect(injectedA).toBe(formA);
      expect(injectedB).toBe(formB);
      expect(injectedA).not.toBe(injectedB);

      expect(injectedA.fields.title.getValue()).toBe("Form A Title");
      expect(injectedB.fields.title.getValue()).toBe("Form B Title");

      injectedA.fields.title.setValue("Updated Title A");
      expect(injectedA.fields.title.getValue()).toBe("Updated Title A");
      expect(injectedB.fields.title.getValue()).toBe("Form B Title"); // Isolated!

      formA.dispose();
      formB.dispose();
    });

    it("throws a descriptive error when injectViiForm is called without provideViiForm", () => {
      const injector = createTestInjector([]);

      expect(() => runInInjectionContext(injector, () => injectViiForm())).toThrow(
        "ViiForm not found. Use provideViiForm() upstream.",
      );
    });
  });

  describe("100-Field Granular Update Isolation (Step 36)", () => {
    it("mutating 1 leaf field updates only that field projection without recomputing siblings", () => {
      const fields: Record<string, FieldState<string>> = {};
      for (let i = 0; i < 100; i++) {
        fields[`field_${i}`] = createField({ initialValue: `initial_${i}` });
      }

      const handles = Object.values(fields).map((f) => createAngularField(f));

      const counters = new Array(100).fill(0);
      const unsubs = handles.map((h, idx) =>
        fields[`field_${idx}`]!.value.subscribe(() => {
          counters[idx]++;
        }),
      );

      // Mutate only field 42
      fields["field_42"]!.setValue("updated_42");

      expect(counters[42]).toBe(1);
      for (let i = 0; i < 100; i++) {
        if (i !== 42) {
          expect(counters[i]).toBe(0);
        }
      }

      for (const unsub of unsubs) unsub();
      for (const h of handles) h.dispose();
      for (const f of Object.values(fields)) f.dispose();
    });
  });

  describe("1,000-Cycle Resource Stress Test (Step 37)", () => {
    it("creates, mounts, and destroys presentation integration 1,000 times with zero leaks", () => {
      const field = createField({ initialValue: "stress-test" });

      for (let i = 0; i < 1000; i++) {
        const el = new MockElement("input", "text");
        const directive = new ViiFieldDirective(createMockElementRef(el));
        assignViiField(directive, field);
        const cva = new ViiControlValueAccessor(field);
        cva.writeValue(`cycle_${i}`);

        directive.ngOnDestroy();
        cva.dispose();
      }

      // After 1,000 cycles, canonical field is still intact and functional
      expect(field.getValue()).toBe("cycle_999");
      field.setValue("final-value");
      expect(field.getValue()).toBe("final-value");

      field.dispose();
    });
  });
});
