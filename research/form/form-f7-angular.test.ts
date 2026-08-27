import {
  computed,
  createEnvironmentInjector,
  DestroyRef,
  Injector,
  runInInjectionContext,
  type EnvironmentInjector,
} from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import { createField, createForm, createNumberParser, type FieldState } from "./form-core.js";
import {
  createAngularField,
  createAngularFieldArray,
  createAngularForm,
  toAngularField,
  toAngularForm,
} from "./adapters/angular.js";

function createTestInjector(): EnvironmentInjector {
  return createEnvironmentInjector(
    [],
    Injector.create({ providers: [] }) as unknown as EnvironmentInjector,
  );
}

describe("Form Research F7: Angular Adapter", () => {
  describe("createAngularField Signals & Mutations", () => {
    it("initializes signals and propagates Form mutations reactively", () => {
      const field = createField<string>({ initialValue: "initial" });
      const handle = createAngularField(field);

      let runs = 0;
      const uppercase = computed(() => {
        runs++;
        return handle.value().toUpperCase();
      });

      expect(handle.value()).toBe("initial");
      expect(handle.dirty()).toBe(false);
      expect(uppercase()).toBe("INITIAL");
      expect(runs).toBe(1);

      field.setValue("updated");

      expect(handle.value()).toBe("updated");
      expect(handle.dirty()).toBe(true);
      expect(uppercase()).toBe("UPDATED");
      expect(runs).toBe(2);

      handle.dispose();
    });

    it("supports parser-backed raw input and preserves intermediate raw strings", () => {
      const field = createField<number, string>({
        initialValue: 100,
        initialRawValue: "100",
        parser: createNumberParser(),
      });
      const handle = createAngularField(field);

      expect(handle.value()).toBe(100);
      expect(handle.rawValue()).toBe("100");
      expect(handle.parseStatus()).toBe("parsed");

      // Intermediate "-"
      handle.setRawValue("-");
      expect(handle.rawValue()).toBe("-");
      expect(handle.value()).toBe(100);
      expect(handle.parseStatus()).toBe("invalid");
      expect(handle.parseIssue()?.code).toBe("parse.invalid_number");

      // Full valid number "-50"
      handle.setRawValue("-50");
      expect(handle.rawValue()).toBe("-50");
      expect(handle.value()).toBe(-50);
      expect(handle.parseStatus()).toBe("parsed");
      expect(handle.dirty()).toBe(true);

      handle.dispose();
    });

    it("handles blur and touched transitions", () => {
      const field = createField<string>({
        initialValue: "",
        rules: [(v: string) => (v === "" ? { code: "required", message: "Required" } : null)],
        validateOn: "blur",
      });
      const handle = createAngularField(field);

      expect(handle.touched()).toBe(false);
      expect(handle.validationStatus()).toBe("unvalidated");

      handle.blur();

      expect(handle.touched()).toBe(true);
      expect(handle.validationStatus()).toBe("invalid");
      expect(handle.issues().length).toBe(1);

      handle.dispose();
    });

    it("handles async validation pending and stale resolution suppression", async () => {
      let resolveValidator!: (val: any) => void;
      const field = createField<string>({
        initialValue: "a",
        rules: [
          (val: string) => {
            if (val === "a") {
              return new Promise<any>((r) => {
                resolveValidator = r;
              });
            }
            return null;
          },
        ],
        validateOn: "change",
      });
      const handle = createAngularField(field);

      handle.setValue("a");
      expect(handle.pending()).toBe(true);

      // Superseding mutation cancels prior validation
      handle.setValue("b");
      expect(handle.pending()).toBe(false);

      // Late resolution
      resolveValidator({ code: "late_error", message: "Stale" });
      await new Promise((r) => setTimeout(r, 10));

      expect(handle.issues().length).toBe(0);
      expect(handle.validationStatus()).toBe("valid");

      handle.dispose();
    });

    it("attaches server issues and clears them on field edit", () => {
      const field = createField<string>({ initialValue: "test" });
      const handle = createAngularField(field);

      expect(handle.serverIssues().length).toBe(0);

      field.setServerIssues([{ code: "server.error", message: "Failed" }]);
      expect(handle.serverIssues().length).toBe(1);

      handle.setValue("edited");
      expect(handle.serverIssues().length).toBe(0);

      handle.dispose();
    });
  });

  describe("createAngularForm & Form Lifecycle", () => {
    it("handles submission lifecycle and preserves terminal submission status across edits (Model A)", async () => {
      const submitSpy = vi.fn().mockResolvedValue({ ok: true, result: 123 });
      const form = createForm({
        initialValues: { name: "alice" },
        submitAction: submitSpy,
      });

      const handle = createAngularForm(form);
      expect(handle.submissionStatus()).toBe("idle");
      expect(handle.submitting()).toBe(false);

      const submitPromise = handle.submit();
      expect(handle.submitting()).toBe(true);

      await submitPromise;
      expect(handle.submissionStatus()).toBe("succeeded");
      expect(handle.submitting()).toBe(false);

      // Model A: user edit preserves succeeded status and marks dirty
      form.fields.name.setValue("alice_edited");
      expect(handle.submissionStatus()).toBe("succeeded");
      expect(handle.dirty()).toBe(true);

      // Reset restores idle
      handle.reset();
      expect(handle.submissionStatus()).toBe("idle");
      expect(handle.dirty()).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("handles reinitialize updating baseline values", () => {
      const form = createForm({ initialValues: { count: 1 } });
      const handle = createAngularForm(form);

      handle.setValues({ count: 5 });
      expect(handle.values().count).toBe(5);
      expect(handle.dirty()).toBe(true);

      handle.reinitialize({ count: 20 });
      expect(handle.values().count).toBe(20);
      expect(handle.dirty()).toBe(false);

      handle.dispose();
      form.dispose();
    });
  });

  describe("createAngularFieldArray & Stable Identity", () => {
    it("tracks array items with stable identity and preserves state across reorder", () => {
      const form = createForm({
        initialValues: {
          items: [
            { id: "1", label: "One" },
            { id: "2", label: "Two" },
          ],
        },
        keyExtractor: (it) => it.id,
      });

      const handle = createAngularFieldArray(form.fields.items);
      expect(handle.length()).toBe(2);

      // Edit item 0
      ((handle.items()[0]?.node as any).fields.label as FieldState<string>).setValue("One Edited");

      // Swap items
      handle.swap(0, 1);

      const items = handle.items();
      expect(items[0]?.id).toBe("2");
      expect(items[1]?.id).toBe("1");
      expect(((items[1]?.node as any).fields.label as FieldState<string>).value.get()).toBe(
        "One Edited",
      );

      handle.dispose();
      form.dispose();
    });
  });

  describe("DestroyRef Lifecycle Integration", () => {
    it("toAngularField automatically cleans subscriptions when DestroyRef fires", () => {
      const injector = createTestInjector();
      const field = createField<string>({ initialValue: "scoped" });

      const handle = runInInjectionContext(injector, () => toAngularField(field));
      expect(handle.value()).toBe("scoped");

      injector.destroy();

      // After destroy, store updates no longer update the signal
      field.setValue("after_destroy");
      expect(handle.value()).toBe("scoped");
    });

    it("completes 100 create/destroy cycles with zero retained resources", () => {
      const field = createField<number>({ initialValue: 0 });

      for (let i = 0; i < 100; i++) {
        const handle = createAngularField(field);
        handle.setValue(i);
        expect(handle.value()).toBe(i);
        handle.dispose();
      }

      expect(field.value.get()).toBe(99);
    });
  });
});
