import { describe, expect, it } from "vitest";
import { state, computed, batch, createScope } from "../../../packages/core/src/index.js";
import { createField, createForm, type FieldState } from "../form-core.js";

describe("F9 Reactive Propagation Investigation: Derived Computed Semantics", () => {
  describe("1. Vii Core Semantics: Synchronous Reads of Derived Computed inside Source Subscriber", () => {
    it("proves that subscribing to Computed B before State A allows fresh read in A subscriber", () => {
      const a = state(1);
      const b = computed(() => a.get() * 2);

      // Subscribe to B first -> B attaches invalidate dependency listener to A first
      let directBSubscribedValue = 0;
      b.subscribe((val) => {
        directBSubscribedValue = val;
      });

      let observedBInsideASubscriber = 0;
      a.subscribe(() => {
        observedBInsideASubscriber = b.get();
      });

      a.set(5);

      expect(observedBInsideASubscriber).toBe(10);
      expect(directBSubscribedValue).toBe(10);
    });

    it("proves that subscribing to State A before Computed B is evaluated causes A subscriber to read stale Computed value", () => {
      const a = state("initial");
      const b = computed(() => `derived:${a.get()}`);

      const callOrder: string[] = [];

      // Subscribe to A first (listener 1 on A)
      a.subscribe(() => {
        // At this point, b.invalidate has NOT run yet because b is listener 2 on A
        callOrder.push(`subA(read b = ${b.get()})`);
      });

      // Subscribe to B second (evaluates b, registering b.invalidate as listener 2 on A)
      b.subscribe((val) => {
        callOrder.push(`subB(val = ${val})`);
      });

      a.set("updated");

      // Empirical proof: subA observes stale cached value "derived:initial" because
      // b's invalidation callback is scheduled after subA in A's subscriber list.
      expect(callOrder).toEqual(["subA(read b = derived:initial)", "subB(val = derived:updated)"]);
    });

    it("evaluates chained computed propagation (A -> B -> C)", () => {
      const a = state(10);
      const b = computed(() => a.get() + 5);
      const c = computed(() => b.get() * 2);

      // Evaluate C first so dependencies are attached
      expect(c.get()).toBe(30);

      let cReadInsideASub = 0;
      a.subscribe(() => {
        // Because c was evaluated prior to this subscription, invalidate ran
        cReadInsideASub = c.get();
      });

      a.set(20);

      // During A's subscriber callback, b is dirty, but c has not received invalidation from b yet.
      // Therefore, synchronous read of C inside A's subscriber reads cached value 30.
      expect(cReadInsideASub).toBe(30);
      // Once flush completes, reading b and c directly evaluates fresh:
      expect(b.get()).toBe(25);
      expect(c.get()).toBe(50);
    });

    it("evaluates batch propagation semantics with multiple states and computeds", () => {
      const a = state(1);
      const b = state(2);
      const sum = computed(() => a.get() + b.get());

      let observedSumInBatch = 0;
      sum.subscribe((val) => {
        observedSumInBatch = val;
      });

      batch(() => {
        a.set(10);
        b.set(20);
      });

      expect(observedSumInBatch).toBe(30);
      expect(sum.get()).toBe(30);
    });
  });

  describe("2. Form-Specific Cases: Field Flags and Aggregates", () => {
    it("investigates field.invalid / field.valid during setValue with sync rules", () => {
      const field = createField<string>({
        initialValue: "valid",
        rules: [
          (val: string) => (val.length >= 5 ? null : { code: "too_short", message: "Too short" }),
        ],
      });

      let invalidObservedInValueSub: boolean | undefined = undefined;
      let validObservedInValueSub: boolean | undefined = undefined;

      field.value.subscribe(() => {
        invalidObservedInValueSub = field.invalid.get();
        validObservedInValueSub = field.valid.get();
      });

      // Change to invalid string ("abc")
      field.setValue("abc");

      expect(field.value.get()).toBe("abc");
      // field.invalid in createField is computed from validationStatusState and serverIssuesState.
      // During setValue, validation is scheduled synchronously after the batch, so inside
      // value subscriber (which fires on batch end), validation hasn't run yet.
      expect(field.invalid.get()).toBe(true);
      expect(field.valid.get()).toBe(false);
    });

    it("investigates field.dirty during setValue and reset", () => {
      const field = createField({ initialValue: "hello" });

      // Trigger initial read of dirty to ensure dependency tracking is established
      expect(field.dirty.get()).toBe(false);

      const observedDirty: boolean[] = [];
      field.value.subscribe(() => {
        observedDirty.push(field.dirty.get());
      });

      field.setValue("world");
      expect(field.dirty.get()).toBe(true);

      field.setValue("hello");
      expect(field.dirty.get()).toBe(false);
      expect(observedDirty).toEqual([true, false]);
    });

    it("investigates group values and output aggregates during child field updates", () => {
      const form = createForm({
        initialValues: {
          first: "Ada",
          last: "Lovelace",
        },
      });

      let observedGroupValuesInFirstSub: any = null;
      (form.fields.first as FieldState<string>).value.subscribe(() => {
        observedGroupValuesInFirstSub = form.values.get();
      });

      (form.fields.first as FieldState<string>).setValue("Grace");

      expect(observedGroupValuesInFirstSub).toEqual({
        first: "Grace",
        last: "Lovelace",
      });
      expect(form.values.get()).toEqual({
        first: "Grace",
        last: "Lovelace",
      });

      form.dispose();
    });

    it("evaluates adapter ARIA direct source derivation (F8 finding validation)", () => {
      // In F8, ARIA projections derived invalidity directly from
      // issuesState, serverIssuesState, errorsState, and parseStatusState
      // to guarantee zero notification race conditions across microtasks / framework loops.
      const field = createField<string>({
        initialValue: "ok",
        rules: [
          (v: string) => (v === "ok" ? null : { code: "invalid_val", message: "Invalid value" }),
        ],
      });

      expect(field.invalid.get()).toBe(false);
      expect(field.issues.get().length > 0).toBe(false);

      field.setValue("not-ok");

      const computedInvalid = field.invalid.get();
      const directSourceInvalid =
        field.issues.get().length > 0 || field.serverIssues.get().length > 0;

      expect(computedInvalid).toBe(true);
      expect(directSourceInvalid).toBe(true);
      expect(computedInvalid).toBe(directSourceInvalid);
    });
  });
});
