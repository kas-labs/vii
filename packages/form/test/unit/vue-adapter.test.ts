import { effect, effectScope, isReadonly } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  createVueField,
  createVueFieldArray,
  createVueForm,
} from "../../src/adapters/vue/index.js";
import {
  createField,
  createFieldArray,
  createForm,
  createNumberParser,
  type SubmitActionResult,
  type ValidationIssueInput,
} from "../../src/index.js";
import type { FieldState } from "../../src/core/types.js";

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

describe("Vue Adapter (@vii-labs/form/vue)", () => {
  describe("createVueField Refs & Reactivity", () => {
    it("initializes all 12 field shallow refs as readonly", () => {
      const field = createField<string>({ initialValue: "test" });
      const handle = createVueField(field);

      expect(isReadonly(handle.value)).toBe(true);
      expect(isReadonly(handle.rawValue)).toBe(true);
      expect(isReadonly(handle.dirty)).toBe(true);
      expect(isReadonly(handle.touched)).toBe(true);
      expect(isReadonly(handle.pending)).toBe(true);
      expect(isReadonly(handle.valid)).toBe(true);
      expect(isReadonly(handle.invalid)).toBe(true);
      expect(isReadonly(handle.parseStatus)).toBe(true);
      expect(isReadonly(handle.parseIssue)).toBe(true);
      expect(isReadonly(handle.validationStatus)).toBe(true);
      expect(isReadonly(handle.issues)).toBe(true);
      expect(isReadonly(handle.serverIssues)).toBe(true);

      expect(handle.value.value).toBe("test");
      expect(handle.rawValue.value).toBe("test");
      expect(handle.dirty.value).toBe(false);
      expect(handle.touched.value).toBe(false);
      expect(handle.pending.value).toBe(false);
      expect(handle.valid.value).toBe(true);
      expect(handle.invalid.value).toBe(false);
      expect(handle.parseStatus.value).toBe("unparsed");
      expect(handle.parseIssue.value).toBeNull();
      expect(handle.validationStatus.value).toBe("unvalidated");
      expect(handle.issues.value).toEqual([]);
      expect(handle.serverIssues.value).toEqual([]);

      handle.dispose();
      field.dispose();
    });

    it("propagates Vii field mutations into Vue effects reactively", () => {
      const field = createField<string>({ initialValue: "initial" });
      const scope = effectScope();
      const observed: string[] = [];

      scope.run(() => {
        const handle = createVueField(field);

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
      field.dispose();
    });

    it("propagates adapter setValue and setRawValue mutations to canonical field", () => {
      const field = createField<string>({ initialValue: "initial" });
      const handle = createVueField(field);

      handle.setValue("from-handle");
      expect(field.getValue()).toBe("from-handle");
      expect(handle.value.value).toBe("from-handle");

      handle.setRawValue("raw-direct");
      expect(field.getRawValue()).toBe("raw-direct");
      expect(handle.rawValue.value).toBe("raw-direct");

      handle.dispose();
      field.dispose();
    });

    it("supports parser-backed raw input and preserves intermediate raw strings", () => {
      const field = createField<number, string>({
        initialValue: 100,
        initialRawValue: "100",
        parser: createNumberParser(),
      });
      const handle = createVueField(field);

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

      handle.dispose();
      field.dispose();
    });

    it("handles touched and blur transitions", () => {
      const field = createField<string>({
        initialValue: "",
        rules: [(v: string) => (v === "" ? { code: "required", message: "Required" } : null)],
        validateOn: "blur",
      });
      const handle = createVueField(field);

      expect(handle.touched.value).toBe(false);
      expect(handle.validationStatus.value).toBe("unvalidated");

      handle.blur();

      expect(handle.touched.value).toBe(true);
      expect(handle.validationStatus.value).toBe("invalid");
      expect(handle.issues.value.length).toBe(1);

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
      const handle = createVueField(field);

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

      handle.dispose();
      field.dispose();
    });

    it("attaches server issues and clears them on localized field edit", async () => {
      const form = createForm({
        fields: {
          username: createField<string>({ initialValue: "test" }),
        },
      });
      const handle = createVueField(form.fields.username);

      expect(handle.serverIssues.value.length).toBe(0);

      await form.submit(async () => ({
        ok: false,
        issues: [{ path: ["username"], code: "server.taken", message: "Username taken" }],
      }));

      expect(handle.serverIssues.value.length).toBe(1);
      expect(handle.serverIssues.value[0]?.message).toBe("Username taken");

      // Localized edit clears server issues
      handle.setValue("new_name");
      expect(handle.serverIssues.value.length).toBe(0);

      handle.dispose();
      form.dispose();
    });

    it("preserves stable action method identities across ref updates", () => {
      const field = createField<string>({ initialValue: "init" });
      const handle = createVueField(field);

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
      const handle = createVueField(field);

      expect(handle.value.value).toBe("initial");

      handle.dispose();

      // Mutation after dispose does not update Vue ref
      field.setValue("after_dispose");
      expect(handle.value.value).toBe("initial");

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

      const scope = effectScope();
      const observedA: string[] = [];

      scope.run(() => {
        const handleA = createVueField(form.fields.fieldA);

        effect(() => {
          observedA.push(handleA.value.value);
        });

        expect(observedA).toEqual(["A"]);

        // Mutate sibling fieldB
        form.fields.fieldB.setValue("B_mutated");
        // fieldA effect must NOT trigger
        expect(observedA).toEqual(["A"]);

        // Mutate fieldA
        form.fields.fieldA.setValue("A_mutated");
        expect(observedA).toEqual(["A", "A_mutated"]);
      });

      scope.stop();
      form.dispose();
    });
  });

  describe("EffectScope Lifecycle & Resource Stability", () => {
    it("createVueField automatically cleans subscriptions when Vue effectScope is stopped", () => {
      const field = createField<string>({ initialValue: "scoped" });
      const scope = effectScope();
      let handleRef!: ReturnType<typeof createVueField<string>>;

      scope.run(() => {
        handleRef = createVueField(field);
      });

      expect(handleRef.value.value).toBe("scoped");

      scope.stop();

      // After scope stop, store updates no longer update the ref
      field.setValue("after_scope_stop");
      expect(handleRef.value.value).toBe("scoped");

      // Canonical field stays alive
      expect(field.getValue()).toBe("after_scope_stop");
      field.dispose();
    });

    it("createVueField works outside an active effectScope with manual dispose", () => {
      const field = createField<string>({ initialValue: "manual" });
      const handle = createVueField(field);
      expect(handle.value.value).toBe("manual");

      handle.dispose();
      field.setValue("after_dispose");
      expect(handle.value.value).toBe("manual");
      expect(field.getValue()).toBe("after_dispose");

      field.dispose();
    });

    it("is safe and idempotent when manual dispose occurs before scope.stop()", () => {
      const field = createField<string>({ initialValue: "safe" });
      const scope = effectScope();
      let handleRef!: ReturnType<typeof createVueField<string>>;

      scope.run(() => {
        handleRef = createVueField(field);
      });

      expect(() => {
        handleRef.dispose();
        scope.stop();
      }).not.toThrow();

      field.setValue("mutated");
      expect(handleRef.value.value).toBe("safe");
      expect(field.getValue()).toBe("mutated");

      field.dispose();
    });

    it("is safe and idempotent when scope.stop() occurs before manual dispose", () => {
      const field = createField<string>({ initialValue: "safe2" });
      const scope = effectScope();
      let handleRef!: ReturnType<typeof createVueField<string>>;

      scope.run(() => {
        handleRef = createVueField(field);
      });

      expect(() => {
        scope.stop();
        handleRef.dispose();
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
        const scope = effectScope();
        let handle!: ReturnType<typeof createVueField<number>>;
        scope.run(() => {
          handle = createVueField(field);
        });

        handle.setValue(i);
        expect(handle.value.value).toBe(i);

        const duringActive = trackers.reduce((sum, t) => sum + t.activeCount(), 0);
        expect(duringActive).toBe(12);

        scope.stop();

        const afterActive = trackers.reduce((sum, t) => sum + t.activeCount(), 0);
        expect(afterActive).toBe(0);
      }

      expect(field.getValue()).toBe(99);
      field.dispose();
    });

    it("guarantees handle A cleanup does not cancel concurrent handle B on same field", () => {
      const field = createField<string>({ initialValue: "shared" });
      const scopeA = effectScope();
      const scopeB = effectScope();
      let handleA!: ReturnType<typeof createVueField<string>>;
      let handleB!: ReturnType<typeof createVueField<string>>;

      scopeA.run(() => {
        handleA = createVueField(field);
      });
      scopeB.run(() => {
        handleB = createVueField(field);
      });

      expect(handleA.value.value).toBe("shared");
      expect(handleB.value.value).toBe("shared");

      scopeA.stop();

      field.setValue("updated");
      expect(handleA.value.value).toBe("shared");
      expect(handleB.value.value).toBe("updated");

      scopeB.stop();
      field.dispose();
    });
  });

  describe("createVueForm & Aggregate State", () => {
    it("initializes form aggregate shallow refs correctly", () => {
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "Alice" }),
          age: createField<number>({ initialValue: 30 }),
        },
      });

      const handle = createVueForm(form);

      expect(isReadonly(handle.value)).toBe(true);
      expect(isReadonly(handle.rawValue)).toBe(true);
      expect(isReadonly(handle.dirty)).toBe(true);
      expect(isReadonly(handle.touched)).toBe(true);
      expect(isReadonly(handle.pending)).toBe(true);
      expect(isReadonly(handle.valid)).toBe(true);
      expect(isReadonly(handle.invalid)).toBe(true);
      expect(isReadonly(handle.issues)).toBe(true);
      expect(isReadonly(handle.serverIssues)).toBe(true);
      expect(isReadonly(handle.submissionStatus)).toBe(true);
      expect(isReadonly(handle.submitting)).toBe(true);

      expect(handle.value.value).toEqual({ name: "Alice", age: 30 });
      expect(handle.rawValue.value).toEqual({ name: "Alice", age: 30 });
      expect(handle.dirty.value).toBe(false);
      expect(handle.touched.value).toBe(false);
      expect(handle.pending.value).toBe(false);
      expect(handle.valid.value).toBe(true);
      expect(handle.invalid.value).toBe(false);
      expect(handle.issues.value).toEqual([]);
      expect(handle.serverIssues.value).toEqual([]);
      expect(handle.submissionStatus.value).toBe("idle");
      expect(handle.submitting.value).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("reflects field mutations in aggregate value and dirty refs", () => {
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "Alice" }),
        },
      });

      const handle = createVueForm(form);
      expect(handle.dirty.value).toBe(false);

      form.fields.name.setValue("Bob");
      expect(handle.value.value.name).toBe("Bob");
      expect(handle.dirty.value).toBe(true);

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

      const handle = createVueForm(form);
      expect(handle.submissionStatus.value).toBe("idle");
      expect(handle.submitting.value).toBe(false);

      const submitPromise = handle.submit(submitSpy);
      expect(handle.submitting.value).toBe(true);

      const result = await submitPromise;
      expect(result.status).toBe("succeeded");
      expect(handle.submissionStatus.value).toBe("succeeded");
      expect(handle.submitting.value).toBe(false);

      // Model A: user edit preserves terminal succeeded status and sets dirty: true
      form.fields.username.setValue("alice_edited");
      expect(handle.submissionStatus.value).toBe("succeeded");
      expect(handle.dirty.value).toBe(true);

      // Reset restores idle
      handle.reset();
      expect(handle.submissionStatus.value).toBe("idle");
      expect(handle.dirty.value).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("handles client validation block and submit action failure properly", async () => {
      // 1. Client-side validation block
      const invalidForm = createForm({
        fields: {
          code: createField<string>({
            initialValue: "",
            rules: [(v: string) => (v === "" ? { code: "required", message: "Required" } : null)],
          }),
        },
      });

      const invalidHandle = createVueForm(invalidForm);
      const gateResult = await invalidHandle.submit(async () => ({ ok: true }));

      expect(gateResult.status).toBe("invalid");
      expect(invalidHandle.submissionStatus.value).toBe("idle");
      expect(invalidHandle.invalid.value).toBe(true);
      expect(invalidHandle.issues.value.length).toBe(1);

      invalidHandle.dispose();
      invalidForm.dispose();

      // 2. Submit action failure
      const form = createForm({
        fields: {
          code: createField<string>({ initialValue: "valid_code" }),
        },
      });

      const handle = createVueForm(form);
      const failResult = await handle.submit(async () => ({
        ok: false,
        issues: [{ code: "server.error", message: "Server rejected", path: ["code"] }],
      }));

      expect(failResult.status).toBe("server-invalid");
      expect(handle.submissionStatus.value).toBe("failed");
      expect(handle.issues.value.length).toBe(1);
      expect(handle.fields.code.serverIssues.get().length).toBe(1);

      handle.dispose();
      form.dispose();
    });

    it("handles cancelled submission and root server issues", async () => {
      const form = createForm({
        fields: {
          text: createField<string>({ initialValue: "hello" }),
        },
      });

      const handle = createVueForm(form);

      // Cancelled submission test
      const submitPromise = handle.submit(
        (_output, context) =>
          new Promise<SubmitActionResult<void>>((resolve) => {
            context.signal.addEventListener("abort", () =>
              resolve({ ok: true, result: undefined }),
            );
          }),
      );

      expect(handle.submitting.value).toBe(true);
      handle.cancelSubmit();

      const cancelResult = await submitPromise;
      expect(cancelResult.status).toBe("cancelled");
      expect(handle.submissionStatus.value).toBe("cancelled");
      expect(handle.submitting.value).toBe(false);

      // Root server issues
      const rootResult = await handle.submit(async () => ({
        ok: false,
        issues: [{ code: "server.root_failure", message: "Root submission error", path: [] }],
      }));

      expect(rootResult.status).toBe("server-invalid");
      expect(handle.serverIssues.value.length).toBe(1);
      expect(handle.serverIssues.value[0]?.message).toBe("Root submission error");

      handle.dispose();
      form.dispose();
    });

    it("handles reinitialize updating baseline values and resetting dirty", () => {
      const form = createForm({
        fields: {
          count: createField<number>({ initialValue: 1 }),
        },
      });

      const handle = createVueForm(form);
      form.fields.count.setValue(10);
      expect(handle.dirty.value).toBe(true);

      handle.reinitialize({ value: { count: 10 }, rawValue: { count: 10 } });
      expect(handle.value.value.count).toBe(10);
      expect(handle.dirty.value).toBe(false);

      handle.dispose();
      form.dispose();
    });

    it("cleans up form subscriptions when effectScope is stopped", () => {
      const scope = effectScope();
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "Alice" }),
        },
      });

      let handle!: ReturnType<typeof createVueForm<typeof form.fields>>;
      scope.run(() => {
        handle = createVueForm(form);
      });
      expect(handle.value.value.name).toBe("Alice");

      scope.stop();

      form.fields.name.setValue("Bob");
      expect(handle.value.value.name).toBe("Alice");
      expect(form.getValue().name).toBe("Bob");

      form.dispose();
    });
  });

  describe("createVueFieldArray & Stable Identity", () => {
    it("tracks collection items and preserves stable identities across swap, move, append, prepend, insert, remove, clear, and reset", () => {
      const item1 = createField<string>({ initialValue: "Item 1" });
      const item2 = createField<string>({ initialValue: "Item 2" });
      const array = createFieldArray({ items: [item1, item2] });

      const handle = createVueFieldArray(array);
      expect(handle.length.value).toBe(2);

      const id0 = handle.items.value[0]?.id;
      const id1 = handle.items.value[1]?.id;
      expect(id0).toBeDefined();
      expect(id1).toBeDefined();
      expect(id0).not.toBe(id1);

      // Swap
      handle.swap(0, 1);
      expect(handle.items.value[0]?.id).toBe(id1);
      expect(handle.items.value[1]?.id).toBe(id0);
      expect(handle.items.value[0]?.node.getValue()).toBe("Item 2");
      expect(handle.items.value[1]?.node.getValue()).toBe("Item 1");

      // Move
      handle.move(1, 0);
      expect(handle.items.value[0]?.id).toBe(id0);
      expect(handle.items.value[1]?.id).toBe(id1);

      // Prepend
      const item0 = createField<string>({ initialValue: "Item 0" });
      handle.prepend(item0);
      expect(handle.length.value).toBe(3);
      expect(handle.items.value[0]?.node.getValue()).toBe("Item 0");

      // Insert
      const itemMid = createField<string>({ initialValue: "Item Mid" });
      handle.insert(1, itemMid);
      expect(handle.length.value).toBe(4);
      expect(handle.items.value[1]?.node.getValue()).toBe("Item Mid");

      // Append
      const item3 = createField<string>({ initialValue: "Item 3" });
      handle.append(item3);
      expect(handle.length.value).toBe(5);
      expect(handle.items.value[4]?.node.getValue()).toBe("Item 3");

      // Remove
      handle.remove(1); // removes itemMid
      expect(handle.length.value).toBe(4);
      expect(handle.items.value[1]?.id).toBe(id0);

      // Child mutation updates collection dirty
      expect(handle.dirty.value).toBe(true);
      (handle.items.value[1]?.node as FieldState<string>).setValue("Item 1 edited");
      expect(handle.value.value[1]).toBe("Item 1 edited");

      // Reset
      handle.reset();
      expect(handle.length.value).toBe(2);
      expect(handle.items.value[0]?.id).toBe(id0);
      expect(handle.items.value[1]?.id).toBe(id1);
      expect(handle.dirty.value).toBe(false);

      // Clear
      handle.clear();
      expect(handle.length.value).toBe(0);

      handle.dispose();
      array.dispose();
    });

    it("cleans up array subscriptions when effectScope is stopped", () => {
      const scope = effectScope();
      const item1 = createField<string>({ initialValue: "One" });
      const array = createFieldArray({ items: [item1] });

      let handle!: ReturnType<typeof createVueFieldArray>;
      scope.run(() => {
        handle = createVueFieldArray(array);
      });
      expect(handle.length.value).toBe(1);

      scope.stop();

      const item2 = createField<string>({ initialValue: "Two" });
      array.append(item2);
      expect(handle.length.value).toBe(1);
      expect(array.items.get().length).toBe(2);

      array.dispose();
    });
  });
});
