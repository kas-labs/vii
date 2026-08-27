import { effectScope } from "vue";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createField,
  createForm,
  createNumberParser,
  type FieldIssue,
  type FieldState,
  type FormInstance,
  type ParseStatus,
  type ServerIssue,
  type SubmissionStatus,
  type ValidationStatus,
} from "./form-core.js";
import { createVanillaField } from "./adapters/vanilla.js";
import { createAngularField, createAngularForm } from "./adapters/angular.js";
import { createVueField, createVueForm } from "./adapters/vue.js";

interface NormalizedFieldAdapter {
  getValue(): string;
  getRawValue(): string;
  getDirty(): boolean;
  getTouched(): boolean;
  getPending(): boolean;
  getValid(): boolean;
  getInvalid(): boolean;
  getParseStatus(): ParseStatus;
  getValidationStatus(): ValidationStatus;
  getIssues(): readonly FieldIssue[];
  getServerIssues(): readonly ServerIssue[];
  setValue(v: string): void;
  setRawValue(r: string): void;
  setTouched(t?: boolean): void;
  blur(): void;
  dispose(): void;
}

interface NormalizedFormAdapter {
  getValues(): { email: string };
  getDirty(): boolean;
  getTouched(): boolean;
  getSubmissionStatus(): SubmissionStatus;
  getSubmitting(): boolean;
  submit(): Promise<any>;
  reset(): void;
  dispose(): void;
}

interface FrameworkHarness {
  name: string;
  createFieldAdapter(field: FieldState<string>): NormalizedFieldAdapter;
  createFormAdapter(form: FormInstance<{ email: string }>): NormalizedFormAdapter;
}

describe("Form Research F7: Cross-Framework Semantic Compliance", () => {
  const harnesses: FrameworkHarness[] = [
    {
      name: "Vanilla Adapter",
      createFieldAdapter: (field) => {
        const handle = createVanillaField(field);
        return {
          getValue: () => handle.getSnapshot().value,
          getRawValue: () => handle.getSnapshot().rawValue,
          getDirty: () => handle.getSnapshot().dirty,
          getTouched: () => handle.getSnapshot().touched,
          getPending: () => handle.getSnapshot().pending,
          getValid: () => handle.getSnapshot().valid,
          getInvalid: () => handle.getSnapshot().invalid,
          getParseStatus: () => handle.getSnapshot().parseStatus,
          getValidationStatus: () => handle.getSnapshot().validationStatus,
          getIssues: () => handle.getSnapshot().issues,
          getServerIssues: () => handle.getSnapshot().serverIssues,
          setValue: (v) => handle.setValue(v),
          setRawValue: (r) => handle.setRawValue(r),
          setTouched: (t) => handle.setTouched(t),
          blur: () => handle.blur(),
          dispose: () => handle.dispose(),
        };
      },
      createFormAdapter: (form) => {
        return {
          getValues: () => form.values.get(),
          getDirty: () => form.dirty.get(),
          getTouched: () => form.touched.get(),
          getSubmissionStatus: () => form.submissionStatus.get(),
          getSubmitting: () => form.submitting.get(),
          submit: () => form.submit(),
          reset: () => form.reset(),
          dispose: () => {},
        };
      },
    },
    {
      name: "Angular Signal Adapter",
      createFieldAdapter: (field) => {
        const handle = createAngularField(field);
        return {
          getValue: () => handle.value(),
          getRawValue: () => handle.rawValue(),
          getDirty: () => handle.dirty(),
          getTouched: () => handle.touched(),
          getPending: () => handle.pending(),
          getValid: () => handle.valid(),
          getInvalid: () => handle.invalid(),
          getParseStatus: () => handle.parseStatus(),
          getValidationStatus: () => handle.validationStatus(),
          getIssues: () => handle.issues(),
          getServerIssues: () => handle.serverIssues(),
          setValue: (v) => handle.setValue(v),
          setRawValue: (r) => handle.setRawValue(r),
          setTouched: (t) => handle.setTouched(t),
          blur: () => handle.blur(),
          dispose: () => handle.dispose(),
        };
      },
      createFormAdapter: (form) => {
        const handle = createAngularForm(form);
        return {
          getValues: () => handle.values(),
          getDirty: () => handle.dirty(),
          getTouched: () => handle.touched(),
          getSubmissionStatus: () => handle.submissionStatus(),
          getSubmitting: () => handle.submitting(),
          submit: () => handle.submit(),
          reset: () => handle.reset(),
          dispose: () => handle.dispose(),
        };
      },
    },
    {
      name: "Vue Ref Adapter",
      createFieldAdapter: (field) => {
        const handle = createVueField(field);
        return {
          getValue: () => handle.value.value,
          getRawValue: () => handle.rawValue.value,
          getDirty: () => handle.dirty.value,
          getTouched: () => handle.touched.value,
          getPending: () => handle.pending.value,
          getValid: () => handle.valid.value,
          getInvalid: () => handle.invalid.value,
          getParseStatus: () => handle.parseStatus.value,
          getValidationStatus: () => handle.validationStatus.value,
          getIssues: () => handle.issues.value,
          getServerIssues: () => handle.serverIssues.value,
          setValue: (v) => handle.setValue(v),
          setRawValue: (r) => handle.setRawValue(r),
          setTouched: (t) => handle.setTouched(t),
          blur: () => handle.blur(),
          dispose: () => handle.dispose(),
        };
      },
      createFormAdapter: (form) => {
        const handle = createVueForm(form);
        return {
          getValues: () => handle.values.value,
          getDirty: () => handle.dirty.value,
          getTouched: () => handle.touched.value,
          getSubmissionStatus: () => handle.submissionStatus.value,
          getSubmitting: () => handle.submitting.value,
          submit: () => handle.submit(),
          reset: () => handle.reset(),
          dispose: () => handle.dispose(),
        };
      },
    },
  ];

  describe.each(harnesses)(
    "Normalized Compliance Scenario: $name",
    ({ createFieldAdapter, createFormAdapter }) => {
      it("produces identical semantic results through normalized multi-step lifecycle", async () => {
        let resolveAsyncValidator!: (val: any) => void;

        const submitSpy = vi.fn().mockResolvedValue({ ok: true, result: "saved" });
        const form = createForm({
          initialValues: { email: "old@example.com" },
          submitAction: submitSpy,
        });

        // Attach async rule on email field
        const emailNode = form.fields.email;
        const fieldAdapter = createFieldAdapter(emailNode);
        const formAdapter = createFormAdapter(form);

        // Step 1: Initial state
        expect(fieldAdapter.getValue()).toBe("old@example.com");
        expect(fieldAdapter.getDirty()).toBe(false);
        expect(fieldAdapter.getTouched()).toBe(false);
        expect(formAdapter.getSubmissionStatus()).toBe("idle");

        // Step 2: Form submit succeeds
        await formAdapter.submit();
        expect(formAdapter.getSubmissionStatus()).toBe("succeeded");
        expect(fieldAdapter.getDirty()).toBe(false);

        // Step 3: User edits email -> Model A invariant
        fieldAdapter.setValue("new@example.com");
        expect(fieldAdapter.getValue()).toBe("new@example.com");
        expect(fieldAdapter.getDirty()).toBe(true);
        expect(formAdapter.getSubmissionStatus()).toBe("succeeded"); // Terminal status preserved!

        // Step 4: Blur interaction
        fieldAdapter.blur();
        expect(fieldAdapter.getTouched()).toBe(true);

        // Step 5: Server issue attached
        emailNode.setServerIssues([{ code: "server.duplicate", message: "Email taken" }]);
        expect(fieldAdapter.getServerIssues().length).toBe(1);
        expect(fieldAdapter.getValid()).toBe(false);

        // Step 6: User edit clears owned server issue
        fieldAdapter.setValue("brand_new@example.com");
        expect(fieldAdapter.getServerIssues().length).toBe(0);
        expect(fieldAdapter.getDirty()).toBe(true);
        expect(formAdapter.getSubmissionStatus()).toBe("succeeded");

        // Step 7: Form reset
        formAdapter.reset();
        expect(formAdapter.getSubmissionStatus()).toBe("idle");
        expect(fieldAdapter.getValue()).toBe("old@example.com");
        expect(fieldAdapter.getDirty()).toBe(false);
        expect(fieldAdapter.getTouched()).toBe(false);

        fieldAdapter.dispose();
        formAdapter.dispose();
        form.dispose();
      });
    },
  );

  describe("Compile-time Type Preservation & Negative Type Assertions", () => {
    it("preserves typed Value, Raw, and Output across all adapters without type erasure", () => {
      function TypeCheckProbe() {
        const numberField = createField<number, string, { num: number }>({
          initialValue: 0,
          initialRawValue: "0",
          parser: createNumberParser(),
          transform: (v) => ({ num: v }),
        });

        // 1. Vanilla adapter types
        const vanillaHandle = createVanillaField(numberField);
        const vanillaSnap = vanillaHandle.getSnapshot();
        expectTypeOf(vanillaSnap.value).toEqualTypeOf<number>();
        expectTypeOf(vanillaSnap.rawValue).toEqualTypeOf<string>();
        expectTypeOf(vanillaSnap.output).toEqualTypeOf<{ num: number }>();
        expectTypeOf(vanillaHandle.setValue).parameter(0).toEqualTypeOf<number>();
        expectTypeOf(vanillaHandle.setRawValue).parameter(0).toEqualTypeOf<string>();

        // 2. Angular adapter types
        const angularHandle = createAngularField(numberField);
        expectTypeOf(angularHandle.value()).toEqualTypeOf<number>();
        expectTypeOf(angularHandle.rawValue()).toEqualTypeOf<string>();
        expectTypeOf(angularHandle.output()).toEqualTypeOf<{ num: number }>();
        expectTypeOf(angularHandle.setValue).parameter(0).toEqualTypeOf<number>();
        expectTypeOf(angularHandle.setRawValue).parameter(0).toEqualTypeOf<string>();

        // 3. Vue adapter types
        const vueHandle = createVueField(numberField);
        expectTypeOf(vueHandle.value.value).toEqualTypeOf<number>();
        expectTypeOf(vueHandle.rawValue.value).toEqualTypeOf<string>();
        expectTypeOf(vueHandle.output.value).toEqualTypeOf<{ num: number }>();
        expectTypeOf(vueHandle.setValue).parameter(0).toEqualTypeOf<number>();
        expectTypeOf(vueHandle.setRawValue).parameter(0).toEqualTypeOf<string>();

        return null;
      }

      expect(TypeCheckProbe).toBeTypeOf("function");
    });
  });
});
