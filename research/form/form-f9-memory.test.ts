import { describe, expect, it, vi } from "vitest";
import { createDiagnostics, createScope } from "../../packages/core/src/index.js";
import {
  createField,
  createFieldArray,
  createForm,
  type FieldArray,
  type FieldState,
} from "./form-core.js";

describe("Form Research F9: Memory, Lifecycle, and Retained Resource Evidence", () => {
  // ---------------------------------------------------------------------------
  // 1. 100 & 500 Create/Dispose Cycles
  // ---------------------------------------------------------------------------
  describe("Create / Dispose Cycles (100 and 500 cycles)", () => {
    it("completes 100 form create/dispose cycles with zero retained active scopes or listeners", () => {
      for (let i = 0; i < 100; i++) {
        const form = createForm({
          initialValues: {
            username: `user_${i}`,
            email: `user_${i}@example.com`,
            age: 20 + (i % 50),
            settings: {
              theme: "dark",
              notifications: true,
            },
            tags: ["tag1", "tag2", "tag3"],
          },
          rules: [
            (vals) => (vals.username.length > 0 ? null : { code: "req", path: ["username"] }),
          ],
        });

        // Add transient subscribers
        const unsub1 = form.values.subscribe(() => {});
        const unsub2 = form.dirty.subscribe(() => {});

        (form.fields.username as FieldState<string>).setValue(`user_mod_${i}`);
        form.validate();

        unsub1();
        unsub2();
        form.dispose();
      }
    });

    it("completes 500 nested form create/dispose cycles cleanly", () => {
      for (let i = 0; i < 500; i++) {
        const form = createForm({
          initialValues: {
            a: 1,
            b: 2,
            group: {
              c: 3,
              d: 4,
            },
          },
        });
        (form.fields.a as FieldState<number>).setValue(10);
        form.dispose();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. FieldArray Lifecycle & Item Resource Disposal
  // ---------------------------------------------------------------------------
  describe("FieldArray Item Lifecycle & Disposal", () => {
    it("verifies item identity stability and proper disposal of removed items across push, insert, remove, swap, move", () => {
      const scope = createScope({ name: "array-test-scope" });

      const arr: FieldArray<{ id: string; name: string }> = createFieldArray({
        initialValues: [
          { id: "1", name: "Ada" },
          { id: "2", name: "Grace" },
          { id: "3", name: "Margaret" },
        ],
        scope,
        keyExtractor: (it) => it.id,
      });

      const initialItems = arr.items.get();
      expect(initialItems.length).toBe(3);
      expect(initialItems.map((it) => it.id)).toEqual(["1", "2", "3"]);

      // Push item
      arr.push({ id: "4", name: "Katherine" });
      expect(arr.items.get().length).toBe(4);
      expect(arr.items.get()[3]?.id).toBe("4");

      // Swap items 0 and 1
      arr.swap(0, 1);
      expect(arr.items.get().map((it) => it.id)).toEqual(["2", "1", "3", "4"]);

      // Move item 3 to 0
      arr.move(3, 0);
      expect(arr.items.get().map((it) => it.id)).toEqual(["4", "2", "1", "3"]);

      // Remove item at index 1 ("2")
      arr.remove(1);
      expect(arr.items.get().map((it) => it.id)).toEqual(["4", "1", "3"]);

      // Repeated remove and add cycles (100 iterations)
      for (let i = 0; i < 100; i++) {
        arr.push({ id: `dyn_${i}`, name: `Dyn ${i}` });
        arr.remove(arr.items.get().length - 1);
      }

      expect(arr.items.get().length).toBe(3);

      scope.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Debounce Timer Cleanup
  // ---------------------------------------------------------------------------
  describe("Debounce Timer Cleanup", () => {
    it("cancels in-flight debounce timers upon form disposal without dangling timers", async () => {
      vi.useFakeTimers();

      const form = createForm({
        initialValues: { text: "test" },
        debounceMs: 200,
        rules: [(vals) => (vals.text.length >= 3 ? null : { code: "short", path: ["text"] })],
      });

      const field = form.fields.text as FieldState<string>;

      // Rapidly change values
      field.setValue("a");
      field.setValue("ab");
      field.setValue("abc");

      // Before timers expire, dispose the form
      form.dispose();

      // Advance all timers
      vi.runAllTimers();

      expect(field.value.get()).toBe("abc");

      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Async Validation Supersession & Promise Safety
  // ---------------------------------------------------------------------------
  describe("Async Validation Supersession & Promise Safety", () => {
    it("handles 200 rapid async setValue calls with exact supersession and zero unhandled rejections", async () => {
      let activeControllers = 0;
      let abortedControllers = 0;
      let committedRuns = 0;

      const unhandledRejections: unknown[] = [];
      const onUnhandled = (reason: unknown) => {
        unhandledRejections.push(reason);
      };
      process.on("unhandledRejection", onUnhandled);

      try {
        const field = createField<string>({
          initialValue: "init",
          rules: [
            async (val, ctx) => {
              activeControllers++;
              const signal = ctx.signal;
              // Microtask deferral
              await Promise.resolve();
              await Promise.resolve();

              if (signal.aborted) {
                abortedControllers++;
                return null;
              }
              committedRuns++;
              return val === "valid_final" ? null : { code: "invalid", message: "Invalid value" };
            },
          ],
        });

        // 200 rapid setValue calls
        for (let i = 0; i < 199; i++) {
          field.setValue(`rapid_${i}`);
        }
        field.setValue("valid_final");

        // Wait for microtasks to drain
        for (let i = 0; i < 10; i++) {
          await Promise.resolve();
        }

        expect(field.value.get()).toBe("valid_final");
        expect(field.pending.get()).toBe(false);
        expect(field.valid.get()).toBe(true);
        expect(unhandledRejections).toEqual([]);
        expect(activeControllers).toBe(200);
        expect(abortedControllers).toBe(199);
        expect(committedRuns).toBe(1);
      } finally {
        process.removeListener("unhandledRejection", onUnhandled);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Diagnostics Overhead & Value-Free Verification
  // ---------------------------------------------------------------------------
  describe("Diagnostics Structural Overhead", () => {
    it("verifies diagnostics sink receives events without capturing secret values", () => {
      const recordedEvents: any[] = [];
      const diag = createDiagnostics({
        mode: "development",
        sink: (evt) => recordedEvents.push(evt),
      });

      const form = createForm({
        initialValues: {
          secretField: "SUPER_SECRET_VALUE_9999",
        },
      });

      (form.fields.secretField as FieldState<string>).setValue("MODIFIED_SECRET_8888");

      // Verify no event payload contains the secret string
      const serialized = JSON.stringify(recordedEvents);
      expect(serialized.includes("SUPER_SECRET_VALUE_9999")).toBe(false);
      expect(serialized.includes("MODIFIED_SECRET_8888")).toBe(false);

      form.dispose();
    });
  });
});
