import { describe, expect, it, vi } from "vitest";
import { bindFormToExternalState, createField, createForm } from "./form-core.js";
import { state } from "../../packages/core/src/index.js";

describe("Form Research F1 — Minimal Field and Form State Prototype", () => {
  describe("Field State Primitives & Signal Granularity", () => {
    it("should initialize field with pristine signals", () => {
      const field = createField({ initialValue: "Ada" });

      expect(field.value.get()).toBe("Ada");
      expect(field.initialValue.get()).toBe("Ada");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.pending.get()).toBe(false);
      expect(field.valid.get()).toBe(true);
      expect(field.invalid.get()).toBe(false);
      expect(field.errors.get()).toEqual([]);
    });

    it("should track dirty state based on equality comparison", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Grace");
      expect(field.value.get()).toBe("Grace");
      expect(field.dirty.get()).toBe(true);

      field.setValue("Ada");
      expect(field.dirty.get()).toBe(false);
    });

    it("should support custom equality comparators for complex values", () => {
      const field = createField<{ id: number; name: string }>({
        initialValue: { id: 1, name: "Ada" },
        equality: (a: { id: number; name: string }, b: { id: number; name: string }) =>
          a.id === b.id && a.name === b.name,
      });

      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 1, name: "Ada" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 1, name: "Grace" });
      expect(field.dirty.get()).toBe(true);
    });

    it("should update touched and errors independently", () => {
      const field = createField({ initialValue: "" });

      expect(field.touched.get()).toBe(false);
      field.setTouched(true);
      expect(field.touched.get()).toBe(true);

      expect(field.valid.get()).toBe(true);
      field.setErrors(["Required field"]);
      expect(field.errors.get()).toEqual(["Required field"]);
      expect(field.valid.get()).toBe(false);
      expect(field.invalid.get()).toBe(true);
    });

    it("should reset field state to initial value", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Grace");
      field.setTouched(true);
      field.setErrors(["Some error"]);
      field.setPending(true);

      field.reset();

      expect(field.value.get()).toBe("Ada");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.pending.get()).toBe(false);
      expect(field.errors.get()).toEqual([]);
      expect(field.valid.get()).toBe(true);
    });

    it("should reset field to a new initial baseline when provided", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Temporary");
      field.reset("Margaret");

      expect(field.value.get()).toBe("Margaret");
      expect(field.initialValue.get()).toBe("Margaret");
      expect(field.dirty.get()).toBe(false);
    });

    it("should allow explicit undefined as a new initial value when T permits undefined", () => {
      const field = createField<string | undefined>({ initialValue: "Ada" });

      field.setValue("Grace");
      expect(field.dirty.get()).toBe(true);

      // Explicitly passing undefined as new initial baseline
      field.reset(undefined);

      expect(field.value.get()).toBeUndefined();
      expect(field.initialValue.get()).toBeUndefined();
      expect(field.dirty.get()).toBe(false);

      field.setValue("Ada");
      expect(field.dirty.get()).toBe(true);
    });

    it("should handle reset to the same initial value and clear touched, pending, and errors", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Ada"); // Still initial value
      field.setTouched(true);
      field.setPending(true);
      field.setErrors(["Validation issue"]);

      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(true);
      expect(field.pending.get()).toBe(true);
      expect(field.valid.get()).toBe(false);

      field.reset();

      expect(field.value.get()).toBe("Ada");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.pending.get()).toBe(false);
      expect(field.valid.get()).toBe(true);
      expect(field.errors.get()).toEqual([]);
    });

    it("should correctly report pristine after new baseline reset with custom comparator", () => {
      const field = createField<{ id: number; tag: string }>({
        initialValue: { id: 1, tag: "v1" },
        equality: (a: { id: number; tag: string }, b: { id: number; tag: string }) =>
          a.id === b.id && a.tag === b.tag,
      });

      field.setValue({ id: 1, tag: "v2" });
      expect(field.dirty.get()).toBe(true);

      field.reset({ id: 2, tag: "v2" });
      expect(field.value.get()).toEqual({ id: 2, tag: "v2" });
      expect(field.initialValue.get()).toEqual({ id: 2, tag: "v2" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 2, tag: "v2" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 2, tag: "v3" });
      expect(field.dirty.get()).toBe(true);
    });

    it("should allow partial reset with explicit undefined on form", () => {
      const form = createForm<{
        name: string | undefined;
        role: string;
      }>({
        initialValues: {
          name: "Ada",
          role: "Engineer",
        },
      });

      form.fields.name.setValue("Grace");
      form.fields.role.setValue("Architect");
      expect(form.dirty.get()).toBe(true);

      form.reset({ name: undefined });

      expect(form.fields.name.value.get()).toBeUndefined();
      expect(form.fields.name.initialValue.get()).toBeUndefined();
      expect(form.fields.name.dirty.get()).toBe(false);

      // role was not in reset partial, so reset to its original initial value
      expect(form.fields.role.value.get()).toBe("Engineer");
      expect(form.fields.role.dirty.get()).toBe(false);

      form.dispose();
    });
  });

  describe("Form Aggregate Evaluation & Subscription Fan-Out", () => {
    it("should aggregate values, dirty, touched, and validity across fields", () => {
      const form = createForm({
        initialValues: {
          username: "ada",
          email: "ada@example.com",
          age: 36,
        },
      });

      expect(form.values.get()).toEqual({
        username: "ada",
        email: "ada@example.com",
        age: 36,
      });
      expect(form.dirty.get()).toBe(false);
      expect(form.touched.get()).toBe(false);
      expect(form.valid.get()).toBe(true);

      form.fields.username.setValue("lovelace");
      expect(form.dirty.get()).toBe(true);
      expect(form.values.get().username).toBe("lovelace");

      form.fields.email.setErrors(["Invalid domain"]);
      expect(form.valid.get()).toBe(false);
      expect(form.invalid.get()).toBe(true);
      expect(form.errors.get().email).toEqual(["Invalid domain"]);

      form.dispose();
    });

    it("should isolate subscriptions so mutating field A does NOT notify field B subscribers", () => {
      const form = createForm({
        initialValues: {
          fieldA: "alpha",
          fieldB: "beta",
        },
      });

      const subscriberA = vi.fn();
      const subscriberB = vi.fn();
      const subscriberAggregate = vi.fn();

      form.fields.fieldA.value.subscribe(subscriberA);
      form.fields.fieldB.value.subscribe(subscriberB);
      form.values.subscribe(subscriberAggregate);

      expect(subscriberA).toHaveBeenCalledTimes(0);
      expect(subscriberB).toHaveBeenCalledTimes(0);
      expect(subscriberAggregate).toHaveBeenCalledTimes(0);

      // Mutate Field A
      form.fields.fieldA.setValue("alpha-2");

      expect(subscriberA).toHaveBeenCalledTimes(1);
      expect(subscriberB).toHaveBeenCalledTimes(0); // ZERO extra notifications to B
      expect(subscriberAggregate).toHaveBeenCalledTimes(1);

      form.dispose();
    });

    it("should batch multiple field updates into a single aggregate change", () => {
      const form = createForm({
        initialValues: {
          firstName: "Ada",
          lastName: "Lovelace",
        },
      });

      const aggregateSub = vi.fn();
      form.values.subscribe(aggregateSub);
      expect(aggregateSub).toHaveBeenCalledTimes(0);

      form.setValues({
        firstName: "Grace",
        lastName: "Hopper",
      });

      expect(aggregateSub).toHaveBeenCalledTimes(1);
      expect(form.values.get()).toEqual({
        firstName: "Grace",
        lastName: "Hopper",
      });

      form.dispose();
    });
  });

  describe("Model Ownership Trade-Offs & Research Fixtures", () => {
    it("Form-Owned baseline: completely self-contained state and lifecycle", () => {
      const form = createForm({
        initialValues: { count: 0 },
      });

      form.fields.count.setValue(10);
      expect(form.fields.count.dirty.get()).toBe(true);
      expect(form.values.get().count).toBe(10);

      form.reset();
      expect(form.fields.count.value.get()).toBe(0);
      expect(form.fields.count.dirty.get()).toBe(false);

      form.dispose();
    });

    it("External State Binding: bidirectional synchronization with external store fixture", () => {
      const appStore = state<{ search: string; page: number }>({ search: "query", page: 1 });

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      expect(form.values.get()).toEqual({ search: "query", page: 1 });

      // Mutating form updates external state
      form.fields.search.setValue("new query");
      expect(appStore.get().search).toBe("new query");

      // Mutating external state updates form
      appStore.set({ search: "external update", page: 2 });
      expect(form.fields.search.value.get()).toBe("external update");
      expect(form.fields.page.value.get()).toBe(2);

      form.dispose();
    });

    it("External State Binding Lifecycle: clean disconnection post-disposal", () => {
      const appStore = state<{ search: string; page: number }>({ search: "query", page: 1 });

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      form.dispose();

      // After form disposal, form changes must not sync to external State
      form.fields.search.setValue("disconnected form change");
      expect(appStore.get().search).toBe("query");

      // After form disposal, external State changes must not sync to form
      appStore.set({ search: "external after disposal", page: 99 });
      expect(form.fields.search.value.get()).toBe("disconnected form change");
      expect(form.fields.page.value.get()).toBe(1);
    });

    it("External State Binding: repeated equal values do not create duplicate feedback loops", () => {
      const appStore = state<{ text: string }>({ text: "hello" });
      const externalListener = vi.fn();
      appStore.subscribe(externalListener);

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      expect(externalListener).toHaveBeenCalledTimes(0);

      // Mutate form with new value
      form.fields.text.setValue("world");
      expect(externalListener).toHaveBeenCalledTimes(1);
      expect(appStore.get().text).toBe("world");

      // Setting same value on external state does not cause redundant loop back
      appStore.set({ text: "world" });
      expect(form.fields.text.value.get()).toBe("world");

      form.dispose();
    });

    it("External State Binding: disposal is idempotent", () => {
      const appStore = state<{ text: string }>({ text: "test" });
      const form = bindFormToExternalState({
        externalState: appStore,
      });

      expect(() => {
        form.dispose();
        form.dispose();
      }).not.toThrow();
    });
  });

  describe("Scope Ownership & Teardown Disposal", () => {
    it("should stop all computed evaluation and notifications upon form.dispose()", () => {
      const form = createForm({
        initialValues: { name: "Ada" },
      });

      const dirtySub = vi.fn();
      form.dirty.subscribe(dirtySub);
      expect(dirtySub).toHaveBeenCalledTimes(0);

      form.fields.name.setValue("Grace");
      expect(dirtySub).toHaveBeenCalledTimes(1);

      form.dispose();

      // After disposal, mutations should not trigger disposed computed subscribers
      form.fields.name.setValue("Margaret");
      expect(dirtySub).toHaveBeenCalledTimes(1);
    });
  });
});
