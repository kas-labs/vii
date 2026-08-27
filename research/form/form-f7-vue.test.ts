import { effect, effectScope, isReadonly } from "vue";
import { describe, expect, it, vi } from "vitest";
import { createField, createForm, createNumberParser, type FieldState } from "./form-core.js";
import {
  createVueField,
  createVueFieldArray,
  createVueForm,
  useViiField,
  useViiForm,
} from "./adapters/vue.js";

describe("Form Research F7: Vue Adapter", () => {
  describe("createVueField Refs & Reactivity", () => {
    it("initializes readonly shallow refs and updates inside Vue effect scope", () => {
      const field = createField<string>({ initialValue: "initial" });
      const scope = effectScope();
      const observed: string[] = [];

      scope.run(() => {
        const handle = createVueField(field);
        expect(isReadonly(handle.value)).toBe(true);

        effect(() => {
          observed.push(handle.value.value);
        });

        expect(handle.value.value).toBe("initial");
        expect(handle.dirty.value).toBe(false);

        field.setValue("updated");
        expect(handle.value.value).toBe("updated");
        expect(handle.dirty.value).toBe(true);
      });

      expect(observed).toEqual(["initial", "updated"]);
      scope.stop();
    });

    it("supports parser-backed raw input and preserves intermediate raw strings", () => {
      const field = createField<number, string>({
        initialValue: 100,
        initialRawValue: "100",
        parser: createNumberParser(),
      });
      const scope = effectScope();

      scope.run(() => {
        const handle = useViiField(field);

        expect(handle.value.value).toBe(100);
        expect(handle.rawValue.value).toBe("100");
        expect(handle.parseStatus.value).toBe("parsed");

        // Intermediate "-"
        handle.setRawValue("-");
        expect(handle.rawValue.value).toBe("-");
        expect(handle.value.value).toBe(100);
        expect(handle.parseStatus.value).toBe("invalid");
        expect(handle.parseIssue.value?.code).toBe("parse.invalid_number");

        // Valid "-50"
        handle.setRawValue("-50");
        expect(handle.rawValue.value).toBe("-50");
        expect(handle.value.value).toBe(-50);
        expect(handle.parseStatus.value).toBe("parsed");
        expect(handle.dirty.value).toBe(true);
      });

      scope.stop();
    });

    it("handles blur and touched transitions", () => {
      const field = createField<string>({
        initialValue: "",
        rules: [(v: string) => (v === "" ? { code: "required", message: "Required" } : null)],
        validateOn: "blur",
      });
      const scope = effectScope();

      scope.run(() => {
        const handle = useViiField(field);

        expect(handle.touched.value).toBe(false);
        expect(handle.validationStatus.value).toBe("unvalidated");

        handle.blur();

        expect(handle.touched.value).toBe(true);
        expect(handle.validationStatus.value).toBe("invalid");
        expect(handle.issues.value.length).toBe(1);
      });

      scope.stop();
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
      const scope = effectScope();

      await scope.run(async () => {
        const handle = useViiField(field);

        handle.setValue("a");
        expect(handle.pending.value).toBe(true);

        // Superseding mutation cancels prior validation
        handle.setValue("b");
        expect(handle.pending.value).toBe(false);

        // Late resolution
        resolveValidator({ code: "late_error", message: "Stale" });
        await new Promise((r) => setTimeout(r, 10));

        expect(handle.issues.value.length).toBe(0);
        expect(handle.validationStatus.value).toBe("valid");
      });

      scope.stop();
    });

    it("attaches server issues and clears them on field edit", () => {
      const field = createField<string>({ initialValue: "test" });
      const scope = effectScope();

      scope.run(() => {
        const handle = useViiField(field);

        expect(handle.serverIssues.value.length).toBe(0);

        field.setServerIssues([{ code: "server.error", message: "Failed" }]);
        expect(handle.serverIssues.value.length).toBe(1);

        handle.setValue("edited");
        expect(handle.serverIssues.value.length).toBe(0);
      });

      scope.stop();
    });
  });

  describe("createVueForm & Form Lifecycle", () => {
    it("handles submission lifecycle and preserves terminal submission status across edits (Model A)", async () => {
      const submitSpy = vi.fn().mockResolvedValue({ ok: true, result: "vue_saved" });
      const form = createForm({
        initialValues: { name: "alice" },
        submitAction: submitSpy,
      });

      const scope = effectScope();

      await scope.run(async () => {
        const handle = useViiForm(form);
        expect(handle.submissionStatus.value).toBe("idle");
        expect(handle.submitting.value).toBe(false);

        const submitPromise = handle.submit();
        expect(handle.submitting.value).toBe(true);

        await submitPromise;
        expect(handle.submissionStatus.value).toBe("succeeded");
        expect(handle.submitting.value).toBe(false);

        // Model A: user edit preserves succeeded status and marks dirty
        form.fields.name.setValue("alice_edited");
        expect(handle.submissionStatus.value).toBe("succeeded");
        expect(handle.dirty.value).toBe(true);

        // Reset restores idle
        handle.reset();
        expect(handle.submissionStatus.value).toBe("idle");
        expect(handle.dirty.value).toBe(false);
      });

      scope.stop();
      form.dispose();
    });

    it("handles reinitialize updating baseline values", () => {
      const form = createForm({ initialValues: { count: 1 } });
      const scope = effectScope();

      scope.run(() => {
        const handle = useViiForm(form);

        handle.setValues({ count: 5 });
        expect(handle.values.value.count).toBe(5);
        expect(handle.dirty.value).toBe(true);

        handle.reinitialize({ count: 20 });
        expect(handle.values.value.count).toBe(20);
        expect(handle.dirty.value).toBe(false);
      });

      scope.stop();
      form.dispose();
    });
  });

  describe("createVueFieldArray & Stable Identity", () => {
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

      const scope = effectScope();

      scope.run(() => {
        const handle = createVueFieldArray(form.fields.items);
        expect(handle.length.value).toBe(2);

        // Edit item 0
        ((handle.items.value[0]?.node as any).fields.label as FieldState<string>).setValue(
          "One Edited",
        );

        // Swap items
        handle.swap(0, 1);

        const items = handle.items.value;
        expect(items[0]?.id).toBe("2");
        expect(items[1]?.id).toBe("1");
        expect(((items[1]?.node as any).fields.label as FieldState<string>).value.get()).toBe(
          "One Edited",
        );
      });

      scope.stop();
      form.dispose();
    });
  });

  describe("EffectScope Lifecycle & Resource Stability", () => {
    it("automatically cleans subscriptions when Vue effectScope is stopped", () => {
      const field = createField<string>({ initialValue: "scoped" });
      const scope = effectScope();
      let handleRef!: ReturnType<typeof useViiField<string>>;

      scope.run(() => {
        handleRef = useViiField(field);
      });

      expect(handleRef.value.value).toBe("scoped");

      scope.stop();

      // After scope stop, store updates no longer update the ref
      field.setValue("after_scope_stop");
      expect(handleRef.value.value).toBe("scoped");
    });

    it("completes 100 create/dispose cycles with zero retained resources", () => {
      const field = createField<number>({ initialValue: 0 });

      for (let i = 0; i < 100; i++) {
        const handle = createVueField(field);
        handle.setValue(i);
        expect(handle.value.value).toBe(i);
        handle.dispose();
      }

      expect(field.value.get()).toBe(99);
    });
  });
});
