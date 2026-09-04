import {
  computed,
  createEnvironmentInjector,
  DestroyRef,
  Injector,
  runInInjectionContext,
  type EnvironmentInjector,
} from "@angular/core";
import { describe, expect, it, vi } from "vitest";
import {
  createAngularField,
  createAngularFieldArray,
  createAngularForm,
} from "../../src/adapters/angular/index.js";
import {
  createField,
  createFieldArray,
  createForm,
  createNumberParser,
  type SubmitActionResult,
  type ValidationIssueInput,
} from "../../src/index.js";
import type { FieldState } from "../../src/core/types.js";

function createTestInjector(): EnvironmentInjector {
  return createEnvironmentInjector(
    [],
    Injector.create({ providers: [] }) as unknown as EnvironmentInjector,
  );
}

interface SignalSubscriptionTracker {
  readonly subscribeCalls: () => number;
  readonly unsubscribeCalls: () => number;
  readonly activeCount: () => number;
}

function trackSignal(signal: {
  subscribe(fn: (v: unknown) => void): () => void;
}): SignalSubscriptionTracker {
  let subscribeCalls = 0;
  let unsubscribeCalls = 0;
  const originalSubscribe = signal.subscribe.bind(signal);

  signal.subscribe = (callback: (v: unknown) => void) => {
    subscribeCalls++;
    const unsubscribe = originalSubscribe(callback);
    let unsubscribed = false;
    return () => {
      if (!unsubscribed) {
        unsubscribed = true;
        unsubscribeCalls++;
      }
      unsubscribe();
    };
  };

  return {
    subscribeCalls: () => subscribeCalls,
    unsubscribeCalls: () => unsubscribeCalls,
    activeCount: () => subscribeCalls - unsubscribeCalls,
  };
}

describe("Angular Adapter (@vii-labs/form/angular)", () => {
  describe("createAngularField Signals & Leaf Mutations", () => {
    it("initializes all 12 field signals with canonical state", () => {
      const field = createField<string>({ initialValue: "test" });
      const handle = createAngularField(field);

      expect(handle.value()).toBe("test");
      expect(handle.rawValue()).toBe("test");
      expect(handle.dirty()).toBe(false);
      expect(handle.touched()).toBe(false);
      expect(handle.pending()).toBe(false);
      expect(handle.valid()).toBe(true);
      expect(handle.invalid()).toBe(false);
      expect(handle.parseStatus()).toBe("unparsed");
      expect(handle.parseIssue()).toBeNull();
      expect(handle.validationStatus()).toBe("unvalidated");
      expect(handle.issues()).toEqual([]);
      expect(handle.serverIssues()).toEqual([]);

      handle.dispose();
      field.dispose();
    });

    it("propagates Vii field mutations to Angular signals reactively", () => {
      const field = createField<string>({ initialValue: "hello" });
      const handle = createAngularField(field);

      let evaluations = 0;
      const uppercase = computed(() => {
        evaluations++;
        return handle.value().toUpperCase();
      });

      expect(handle.value()).toBe("hello");
      expect(uppercase()).toBe("HELLO");
      expect(evaluations).toBe(1);

      field.setValue("world");

      expect(handle.value()).toBe("world");
      expect(handle.dirty()).toBe(true);
      expect(uppercase()).toBe("WORLD");
      expect(evaluations).toBe(2);

      handle.dispose();
      field.dispose();
    });

    it("propagates adapter setValue and setRawValue mutations to canonical field", () => {
      const field = createField<string>({ initialValue: "initial" });
      const handle = createAngularField(field);

      handle.setValue("from-handle");
      expect(field.getValue()).toBe("from-handle");
      expect(handle.value()).toBe("from-handle");

      handle.setRawValue("raw-direct");
      expect(field.getRawValue()).toBe("raw-direct");
      expect(handle.rawValue()).toBe("raw-direct");

      handle.dispose();
      field.dispose();
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

      // Full number "-50"
      handle.setRawValue("-50");
      expect(handle.rawValue()).toBe("-50");
      expect(handle.value()).toBe(-50);
      expect(handle.parseStatus()).toBe("parsed");
      expect(handle.dirty()).toBe(true);

      handle.dispose();
      field.dispose();
    });

    it("handles touched and blur transitions", () => {
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
      field.dispose();
    });

    it("handles async validation pending and stale resolution suppression", async () => {
      let resolveValidator!: (val: ValidationIssueInput | null) => void;
      const field = createField<string>({
        initialValue: "a",
        rules: [
          (val: string): Promise<ValidationIssueInput | null> | null => {
            if (val === "a") {
              return new Promise<ValidationIssueInput | null>((r) => {
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
      field.dispose();
    });

    it("attaches server issues and clears them on localized field edit", async () => {
      const form = createForm({
        fields: {
          username: createField<string>({ initialValue: "test" }),
        },
      });
      const handle = createAngularField(form.fields.username);

      expect(handle.serverIssues().length).toBe(0);

      // Trigger a failed submit with server issues
      await form.submit(async () => {
        return {
          ok: false,
          issues: [{ path: ["username"], code: "server.taken", message: "Username taken" }],
        };
      });

      expect(handle.serverIssues().length).toBe(1);
      expect(handle.serverIssues()[0]?.message).toBe("Username taken");

      // Localized edit clears server issues
      handle.setValue("new_name");
      expect(handle.serverIssues().length).toBe(0);

      handle.dispose();
      form.dispose();
    });

    it("preserves stable action method identities across signal updates", () => {
      const field = createField<string>({ initialValue: "init" });
      const handle = createAngularField(field);

      const firstSetValue = handle.setValue;
      const firstSetRawValue = handle.setRawValue;
      const firstSetTouched = handle.setTouched;
      const firstBlur = handle.blur;
      const firstValidate = handle.validate;
      const firstReset = handle.reset;
      const firstDispose = handle.dispose;

      handle.setValue("mutation_1");
      handle.setTouched(true);

      expect(handle.setValue).toBe(firstSetValue);
      expect(handle.setRawValue).toBe(firstSetRawValue);
      expect(handle.setTouched).toBe(firstSetTouched);
      expect(handle.blur).toBe(firstBlur);
      expect(handle.validate).toBe(firstValidate);
      expect(handle.reset).toBe(firstReset);
      expect(handle.dispose).toBe(firstDispose);

      handle.dispose();
      field.dispose();
    });

    it("cleans up subscriptions on manual dispose and keeps canonical field alive", () => {
      const field = createField<string>({ initialValue: "initial" });
      const handle = createAngularField(field);

      expect(handle.value()).toBe("initial");

      handle.dispose();

      // Mutation after dispose does not update Angular signal
      field.setValue("after_dispose");
      expect(handle.value()).toBe("initial");

      // Canonical field remains completely alive and functional
      expect(field.getValue()).toBe("after_dispose");
      field.setValue("second_mutation");
      expect(field.getValue()).toBe("second_mutation");

      field.dispose();
    });

    it("preserves sibling reactivity isolation without whole-form notification", () => {
      const form = createForm({
        fields: {
          fieldA: createField<string>({ initialValue: "A" }),
          fieldB: createField<string>({ initialValue: "B" }),
        },
      });

      const handleA = createAngularField(form.fields.fieldA);
      let evaluationsA = 0;
      const computedA = computed(() => {
        evaluationsA++;
        return handleA.value();
      });

      expect(computedA()).toBe("A");
      expect(evaluationsA).toBe(1);

      // Mutate sibling fieldB
      form.fields.fieldB.setValue("B_mutated");

      // fieldA computation must NOT re-evaluate
      expect(computedA()).toBe("A");
      expect(evaluationsA).toBe(1);

      // Mutate fieldA
      form.fields.fieldA.setValue("A_mutated");
      expect(computedA()).toBe("A_mutated");
      expect(evaluationsA).toBe(2);

      handleA.dispose();
      form.dispose();
    });
  });

  describe("DestroyRef Lifecycle Integration", () => {
    it("createAngularField with options.destroyRef cleans up when injector destroys", () => {
      const injector = createTestInjector();
      const destroyRef = injector.get(DestroyRef);
      const field = createField<string>({ initialValue: "scoped" });

      const handle = createAngularField(field, { destroyRef });
      expect(handle.value()).toBe("scoped");

      injector.destroy();

      // After destroy, updates no longer propagate to signal
      field.setValue("after_destroy");
      expect(handle.value()).toBe("scoped");

      // Canonical field stays alive
      expect(field.getValue()).toBe("after_destroy");
      field.dispose();
    });

    it("createAngularField works outside an injection context with manual dispose", () => {
      const field = createField<string>({ initialValue: "manual" });
      const handle = createAngularField(field);
      expect(handle.value()).toBe("manual");

      handle.dispose();
      field.setValue("after_dispose");
      expect(handle.value()).toBe("manual");
      expect(field.getValue()).toBe("after_dispose");

      field.dispose();
    });

    it("is safe and idempotent when manual dispose occurs before DestroyRef teardown", () => {
      const injector = createTestInjector();
      const destroyRef = injector.get(DestroyRef);
      const field = createField<string>({ initialValue: "safe" });

      const handle = createAngularField(field, { destroyRef });

      expect(() => {
        handle.dispose();
        injector.destroy();
      }).not.toThrow();

      field.setValue("mutated");
      expect(handle.value()).toBe("safe");
      expect(field.getValue()).toBe("mutated");

      field.dispose();
    });

    it("is safe and idempotent when DestroyRef teardown occurs before manual dispose", () => {
      const injector = createTestInjector();
      const destroyRef = injector.get(DestroyRef);
      const field = createField<string>({ initialValue: "safe2" });

      const handle = createAngularField(field, { destroyRef });

      expect(() => {
        injector.destroy();
        handle.dispose();
      }).not.toThrow();

      field.dispose();
    });

    it("proves exact subscription cleanup accounting returning to baseline across 100 cycles", () => {
      const field = createField<number>({ initialValue: 0 });
      const trackers = [
        trackSignal(field.value),
        trackSignal(field.rawValue),
        trackSignal(field.dirty),
        trackSignal(field.touched),
        trackSignal(field.pending),
        trackSignal(field.valid),
        trackSignal(field.invalid),
        trackSignal(field.parseStatus),
        trackSignal(field.parseIssue),
        trackSignal(field.validationStatus),
        trackSignal(field.issues),
        trackSignal(field.serverIssues),
      ];

      const baselineActive = trackers.reduce((sum, t) => sum + t.activeCount(), 0);
      expect(baselineActive).toBe(0);

      for (let i = 0; i < 100; i++) {
        const injector = createTestInjector();
        const destroyRef = injector.get(DestroyRef);
        const handle = createAngularField(field, { destroyRef });
        handle.setValue(i);
        expect(handle.value()).toBe(i);

        const duringActive = trackers.reduce((sum, t) => sum + t.activeCount(), 0);
        expect(duringActive).toBe(12);

        injector.destroy();

        const afterActive = trackers.reduce((sum, t) => sum + t.activeCount(), 0);
        expect(afterActive).toBe(0);
      }

      expect(field.getValue()).toBe(99);
      field.dispose();
    });

    it("guarantees handle A cleanup does not cancel concurrent handle B on same field", () => {
      const field = createField<string>({ initialValue: "shared" });
      const handleA = createAngularField(field);
      const handleB = createAngularField(field);

      expect(handleA.value()).toBe("shared");
      expect(handleB.value()).toBe("shared");

      handleA.dispose();

      field.setValue("updated");
      expect(handleA.value()).toBe("shared");
      expect(handleB.value()).toBe("updated");

      handleB.dispose();
      field.dispose();
    });
  });

  describe("createAngularForm & Aggregate State", () => {
    it("initializes form aggregate signals correctly", () => {
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "Alice" }),
          age: createField<number>({ initialValue: 30 }),
        },
      });

      const handle = createAngularForm(form);

      expect(handle.value()).toEqual({ name: "Alice", age: 30 });
      expect(handle.rawValue()).toEqual({ name: "Alice", age: 30 });
      expect(handle.dirty()).toBe(false);
      expect(handle.touched()).toBe(false);
      expect(handle.pending()).toBe(false);
      expect(handle.valid()).toBe(true);
      expect(handle.invalid()).toBe(false);
      expect(handle.issues()).toEqual([]);
      expect(handle.serverIssues()).toEqual([]);
      expect(handle.submissionStatus()).toBe("idle");
      expect(handle.submitting()).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("reflects field mutations in aggregate value and dirty signals", () => {
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "Alice" }),
        },
      });

      const handle = createAngularForm(form);
      expect(handle.dirty()).toBe(false);

      form.fields.name.setValue("Bob");
      expect(handle.value().name).toBe("Bob");
      expect(handle.dirty()).toBe(true);

      handle.dispose();
      form.dispose();
    });

    it("preserves Model A submission lifecycle (validating -> submitting -> succeeded)", async () => {
      const submitSpy = vi.fn().mockResolvedValue({ ok: true, result: "saved" });
      const form = createForm({
        fields: {
          username: createField<string>({ initialValue: "alice" }),
        },
      });

      const handle = createAngularForm(form);
      expect(handle.submissionStatus()).toBe("idle");
      expect(handle.submitting()).toBe(false);

      const submitPromise = handle.submit(submitSpy);
      expect(handle.submitting()).toBe(true);

      const result = await submitPromise;
      expect(result.status).toBe("succeeded");
      expect(handle.submissionStatus()).toBe("succeeded");
      expect(handle.submitting()).toBe(false);

      // Model A: user edit preserves terminal succeeded status and sets dirty: true
      form.fields.username.setValue("alice_edited");
      expect(handle.submissionStatus()).toBe("succeeded");
      expect(handle.dirty()).toBe(true);

      // Reset restores idle
      handle.reset();
      expect(handle.submissionStatus()).toBe("idle");
      expect(handle.dirty()).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("handles failed submission properly", async () => {
      // 1. Client-side validation block
      const invalidForm = createForm({
        fields: {
          code: createField<string>({
            initialValue: "",
            rules: [(v: string) => (v === "" ? { code: "required", message: "Required" } : null)],
          }),
        },
      });

      const invalidHandle = createAngularForm(invalidForm);
      const gateResult = await invalidHandle.submit(async () => ({ ok: true }));

      expect(gateResult.status).toBe("invalid");
      expect(invalidHandle.submissionStatus()).toBe("idle");
      expect(invalidHandle.invalid()).toBe(true);
      expect(invalidHandle.issues().length).toBe(1);

      invalidHandle.dispose();
      invalidForm.dispose();

      // 2. Submit action failure
      const form = createForm({
        fields: {
          code: createField<string>({ initialValue: "valid_code" }),
        },
      });

      const handle = createAngularForm(form);
      const failResult = await handle.submit(async () => ({
        ok: false,
        issues: [{ code: "server.error", message: "Server rejected", path: ["code"] }],
      }));

      expect(failResult.status).toBe("server-invalid");
      expect(handle.submissionStatus()).toBe("failed");
      expect(handle.issues().length).toBe(1);
      expect(handle.fields.code.serverIssues.get().length).toBe(1);

      handle.dispose();
      form.dispose();
    });

    it("handles reinitialize updating baseline values and resetting dirty", () => {
      const form = createForm({
        fields: {
          count: createField<number>({ initialValue: 1 }),
        },
      });

      const handle = createAngularForm(form);
      form.fields.count.setValue(10);
      expect(handle.dirty()).toBe(true);

      handle.reinitialize({ value: { count: 10 }, rawValue: { count: 10 } });
      expect(handle.value().count).toBe(10);
      expect(handle.dirty()).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("handles cancelled submission and root server issues", async () => {
      const form = createForm({
        fields: {
          text: createField<string>({ initialValue: "hello" }),
        },
      });

      const handle = createAngularForm(form);

      // Cancelled submission test
      const submitPromise = handle.submit(
        (_output, context) =>
          new Promise<SubmitActionResult<void>>((resolve) => {
            context.signal.addEventListener("abort", () =>
              resolve({ ok: true, result: undefined }),
            );
          }),
      );

      expect(handle.submitting()).toBe(true);
      handle.cancelSubmit();

      const cancelResult = await submitPromise;
      expect(cancelResult.status).toBe("cancelled");
      expect(handle.submissionStatus()).toBe("cancelled");
      expect(handle.submitting()).toBe(false);

      // Root server issues
      const rootResult = await handle.submit(async () => ({
        ok: false,
        issues: [{ code: "server.root_failure", message: "Root submission error", path: [] }],
      }));

      expect(rootResult.status).toBe("server-invalid");
      expect(handle.serverIssues().length).toBe(1);
      expect(handle.serverIssues()[0]?.message).toBe("Root submission error");

      handle.dispose();
      form.dispose();
    });

    it("cleans up form subscriptions when DestroyRef fires", () => {
      const injector = createTestInjector();
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "Alice" }),
        },
      });

      const handle = runInInjectionContext(injector, () =>
        createAngularForm(form, { destroyRef: injector.get(DestroyRef) }),
      );
      expect(handle.value().name).toBe("Alice");

      injector.destroy();

      form.fields.name.setValue("Bob");
      expect(handle.value().name).toBe("Alice");
      expect(form.getValue().name).toBe("Bob");

      form.dispose();
    });
  });

  describe("createAngularFieldArray & Stable Identity", () => {
    it("tracks collection items and preserves stable identities across swap, move, append, prepend, insert, remove, clear, and reset", () => {
      const item1 = createField<string>({ initialValue: "Item 1" });
      const item2 = createField<string>({ initialValue: "Item 2" });
      const array = createFieldArray({ items: [item1, item2] });

      const handle = createAngularFieldArray(array);
      expect(handle.length()).toBe(2);

      const id0 = handle.items()[0]?.id;
      const id1 = handle.items()[1]?.id;
      expect(id0).toBeDefined();
      expect(id1).toBeDefined();
      expect(id0).not.toBe(id1);

      // Swap
      handle.swap(0, 1);
      expect(handle.items()[0]?.id).toBe(id1);
      expect(handle.items()[1]?.id).toBe(id0);
      expect(handle.items()[0]?.node.getValue()).toBe("Item 2");
      expect(handle.items()[1]?.node.getValue()).toBe("Item 1");

      // Move
      handle.move(1, 0);
      expect(handle.items()[0]?.id).toBe(id0);
      expect(handle.items()[1]?.id).toBe(id1);

      // Prepend
      const item0 = createField<string>({ initialValue: "Item 0" });
      handle.prepend(item0);
      expect(handle.length()).toBe(3);
      expect(handle.items()[0]?.node.getValue()).toBe("Item 0");

      // Insert
      const itemMid = createField<string>({ initialValue: "Item Mid" });
      handle.insert(1, itemMid);
      expect(handle.length()).toBe(4);
      expect(handle.items()[1]?.node.getValue()).toBe("Item Mid");

      // Append
      const item3 = createField<string>({ initialValue: "Item 3" });
      handle.append(item3);
      expect(handle.length()).toBe(5);
      expect(handle.items()[4]?.node.getValue()).toBe("Item 3");

      // Remove
      handle.remove(1); // removes itemMid
      expect(handle.length()).toBe(4);
      expect(handle.items()[1]?.id).toBe(id0);

      // Child mutation updates collection dirty
      expect(handle.dirty()).toBe(true);
      (handle.items()[1]?.node as FieldState<string>).setValue("Item 1 edited");
      expect(handle.value()[1]).toBe("Item 1 edited");

      // Reset
      handle.reset();
      expect(handle.length()).toBe(2);
      expect(handle.items()[0]?.id).toBe(id0);
      expect(handle.items()[1]?.id).toBe(id1);
      expect(handle.dirty()).toBe(false);

      // Clear
      handle.clear();
      expect(handle.length()).toBe(0);

      handle.dispose();
      array.dispose();
    });

    it("cleans up array subscriptions when DestroyRef fires", () => {
      const injector = createTestInjector();
      const item1 = createField<string>({ initialValue: "One" });
      const array = createFieldArray({ items: [item1] });

      const handle = runInInjectionContext(injector, () =>
        createAngularFieldArray(array, { destroyRef: injector.get(DestroyRef) }),
      );
      expect(handle.length()).toBe(1);

      injector.destroy();

      const item2 = createField<string>({ initialValue: "Two" });
      array.append(item2);
      expect(handle.length()).toBe(1);
      expect(array.items.get().length).toBe(2);

      array.dispose();
    });
  });
});
