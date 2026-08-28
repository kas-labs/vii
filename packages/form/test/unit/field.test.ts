import { createScope } from "@vii-labs/core";
import { describe, expect, test, vi } from "vitest";
import { createField, type CreateFieldOptions, type FieldState } from "../../src/index.js";

describe("createField — Field Core (P1c)", () => {
  describe("A. Initial State & Raw === Value Invariant", () => {
    test("initializes with provided value and clean baseline state where Raw === Value", () => {
      const field = createField({ initialValue: "hello" });

      expect(field.kind).toBe("field");
      expect(field.getValue()).toBe("hello");
      expect(field.getRawValue()).toBe("hello");
      expect(field.value.get()).toBe("hello");
      expect(field.rawValue.get()).toBe("hello");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
    });

    test("enforces Raw === Value across setValue, setRawValue, and reset", () => {
      const field = createField({ initialValue: 42 });

      expect(field.getValue()).toBe(42);
      expect(field.getRawValue()).toBe(42);

      field.setValue(43);
      expect(field.getValue()).toBe(43);
      expect(field.getRawValue()).toBe(43);
      expect(field.dirty.get()).toBe(true);

      field.setRawValue(44);
      expect(field.getValue()).toBe(44);
      expect(field.getRawValue()).toBe(44);
      expect(field.dirty.get()).toBe(true);

      field.reset();
      expect(field.getValue()).toBe(42);
      expect(field.getRawValue()).toBe(42);
      expect(field.dirty.get()).toBe(false);
    });
  });

  describe("B. Value Mutation", () => {
    test("setValue updates value and rawValue, setting dirty to true", () => {
      const field = createField({ initialValue: "initial" });

      field.setValue("updated");

      expect(field.getValue()).toBe("updated");
      expect(field.getRawValue()).toBe("updated");
      expect(field.value.get()).toBe("updated");
      expect(field.rawValue.get()).toBe("updated");
      expect(field.dirty.get()).toBe(true);
    });

    test("setRawValue updates rawValue and value for unparsed field", () => {
      const field = createField({ initialValue: "initial" });

      field.setRawValue("raw-change");

      expect(field.getValue()).toBe("raw-change");
      expect(field.getRawValue()).toBe("raw-change");
      expect(field.dirty.get()).toBe(true);
    });
  });

  describe("C. Return to Baseline", () => {
    test("mutating A -> B -> A returns dirty to false", () => {
      const field = createField({ initialValue: "pristine" });

      expect(field.dirty.get()).toBe(false);

      field.setValue("dirty-value");
      expect(field.dirty.get()).toBe(true);

      field.setValue("pristine");
      expect(field.dirty.get()).toBe(false);
    });
  });

  describe("D. Touched Independence", () => {
    test("markTouched sets touched to true without mutating value or dirty", () => {
      const field = createField({ initialValue: "pristine" });

      expect(field.touched.get()).toBe(false);
      expect(field.dirty.get()).toBe(false);

      field.markTouched();

      expect(field.touched.get()).toBe(true);
      expect(field.getValue()).toBe("pristine");
      expect(field.dirty.get()).toBe(false);
    });

    test("setTouched allows explicit boolean setting", () => {
      const field = createField({ initialValue: "pristine" });

      field.setTouched(true);
      expect(field.touched.get()).toBe(true);

      field.setTouched(false);
      expect(field.touched.get()).toBe(false);
    });

    test("setValue does not automatically set touched to true", () => {
      const field = createField({ initialValue: "pristine" });

      field.setValue("mutated");

      expect(field.dirty.get()).toBe(true);
      expect(field.touched.get()).toBe(false);
    });
  });

  describe("E. Reset Contract", () => {
    test("reset restores baseline value, raw value, dirty=false, and touched=false", () => {
      const field = createField({ initialValue: 100 });

      field.setValue(200);
      field.markTouched();

      expect(field.getValue()).toBe(200);
      expect(field.dirty.get()).toBe(true);
      expect(field.touched.get()).toBe(true);

      field.reset();

      expect(field.getValue()).toBe(100);
      expect(field.getRawValue()).toBe(100);
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
    });

    test("reset executes atomically inside batch", () => {
      const field = createField({ initialValue: "baseline" });
      field.setValue("dirty");
      field.markTouched();

      const observations: Array<{ value: string; touched: boolean; dirty: boolean }> = [];

      field.value.subscribe((val) => {
        observations.push({
          value: val,
          touched: field.touched.get(),
          dirty: field.dirty.get(),
        });
      });

      field.reset();

      expect(observations.length).toBe(1);
      expect(observations[0]).toEqual({
        value: "baseline",
        touched: false,
        dirty: false,
      });
    });
  });

  describe("F. Same-Value Mutation & Equality", () => {
    test("setting identical value is a no-op for dirty and notifications", () => {
      const field = createField({ initialValue: "same" });
      const listener = vi.fn();
      field.value.subscribe(listener);

      field.setValue("same");

      expect(field.dirty.get()).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    });

    test("supports custom equality comparator for dirty calculation", () => {
      const field = createField({
        initialValue: "abc",
        equality: (a, b) => a.toLowerCase() === b.toLowerCase(),
      });

      expect(field.dirty.get()).toBe(false);

      field.setValue("ABC");
      expect(field.getValue()).toBe("ABC");
      expect(field.dirty.get()).toBe(false);

      field.setValue("def");
      expect(field.getValue()).toBe("def");
      expect(field.dirty.get()).toBe(true);

      field.setValue("aBc");
      expect(field.dirty.get()).toBe(false);
    });
  });

  describe("G. Fine-Grained Subscriptions", () => {
    test("value subscriber receives notifications on value changes only", () => {
      const field = createField({ initialValue: 1 });
      const valueUpdates: number[] = [];

      const unsubscribe = field.value.subscribe((v) => valueUpdates.push(v));

      field.setValue(2);
      field.markTouched();
      field.setValue(3);

      expect(valueUpdates).toEqual([2, 3]);

      unsubscribe();
      field.setValue(4);
      expect(valueUpdates).toEqual([2, 3]);
    });

    test("touched subscriber receives notifications on touched changes", () => {
      const field = createField({ initialValue: "test" });
      const touchedUpdates: boolean[] = [];

      const unsubscribe = field.touched.subscribe((t) => touchedUpdates.push(t));

      field.markTouched();
      field.setTouched(false);
      field.setValue("new value");

      expect(touchedUpdates).toEqual([true, false]);

      unsubscribe();
      field.markTouched();
      expect(touchedUpdates).toEqual([true, false]);
    });

    test("dirty computed subscriber receives notifications on dirty state changes", () => {
      const field = createField({ initialValue: "start" });
      const dirtyUpdates: boolean[] = [];

      const unsubscribe = field.dirty.subscribe((d) => dirtyUpdates.push(d));

      field.setValue("dirty");
      field.setValue("still dirty");
      field.setValue("start");

      expect(dirtyUpdates).toEqual([true, false]);

      unsubscribe();
    });
  });

  describe("H. Scope Ownership & Lifecycle Matrix", () => {
    test("field attached to owner Scope is disposed when owner Scope disposes", () => {
      const ownerScope = createScope({ name: "owner" });
      const field = createField({
        initialValue: "scoped",
        scope: ownerScope,
      });

      expect(field.getValue()).toBe("scoped");

      ownerScope.dispose();

      expect(() => field.getValue()).toThrow("Field is disposed");
      expect(() => field.setValue("next")).toThrow("Field is disposed");
    });

    test("manual field.dispose() is idempotent and does not throw on repetition", () => {
      const field = createField({ initialValue: "test" });

      expect(() => {
        field.dispose();
        field.dispose();
        field.dispose();
      }).not.toThrow();

      expect(() => field.getValue()).toThrow("Field is disposed");
    });

    test("exact post-disposal method and signal access behavior", () => {
      const field = createField({ initialValue: "active-value" });
      field.markTouched();
      field.setValue("mutated-value");

      field.dispose();

      // Field methods enforce disposal check and throw deterministic error
      expect(() => field.getValue()).toThrow("Field is disposed");
      expect(() => field.getRawValue()).toThrow("Field is disposed");
      expect(() => field.setValue("foo")).toThrow("Field is disposed");
      expect(() => field.setRawValue("bar")).toThrow("Field is disposed");
      expect(() => field.setTouched(true)).toThrow("Field is disposed");
      expect(() => field.markTouched()).toThrow("Field is disposed");
      expect(() => field.reset()).toThrow("Field is disposed");

      // Scope-owned dirty computed is disposed and throws upon evaluation
      expect(() => field.dirty.get()).toThrow("Computed is disposed");

      // State references remain readable snapshots under Core State semantics
      expect(field.value.get()).toBe("mutated-value");
      expect(field.rawValue.get()).toBe("mutated-value");
      expect(field.touched.get()).toBe(true);
    });

    test("subscription behavior before and after disposal", () => {
      const field = createField({ initialValue: "before" });
      const preListener = vi.fn();
      field.value.subscribe(preListener);

      field.dispose();

      // Attempting mutation after dispose throws, ensuring no listener notifications occur
      expect(() => field.setValue("after")).toThrow("Field is disposed");
      expect(preListener).not.toHaveBeenCalled();

      // Subscribing after dispose attaches to quiescent state without error, but no mutations can happen
      const postListener = vi.fn();
      const unsub = field.value.subscribe(postListener);
      expect(typeof unsub).toBe("function");
      expect(postListener).not.toHaveBeenCalled();
    });
  });

  describe("I. Multiple Independent Fields", () => {
    test("mutations on field A do not trigger notifications or state changes on field B", () => {
      const fieldA = createField({ initialValue: "A" });
      const fieldB = createField({ initialValue: "B" });

      const listenerA = vi.fn();
      const listenerB = vi.fn();

      fieldA.value.subscribe(listenerA);
      fieldB.value.subscribe(listenerB);

      fieldA.setValue("A2");

      expect(listenerA).toHaveBeenCalledWith("A2");
      expect(listenerB).not.toHaveBeenCalled();
      expect(fieldA.dirty.get()).toBe(true);
      expect(fieldB.dirty.get()).toBe(false);
    });
  });

  describe("J. Security / Data Invariants: __proto__, constructor, prototype values", () => {
    test("handles dangerous property names as ordinary string values without prototype pollution", () => {
      const dangerousValues = ["__proto__", "constructor", "prototype", "toString", "valueOf"];

      for (const val of dangerousValues) {
        const field = createField({ initialValue: val });

        expect(field.getValue()).toBe(val);
        expect(field.getRawValue()).toBe(val);
        expect(field.dirty.get()).toBe(false);

        field.setValue("safe");
        expect(field.dirty.get()).toBe(true);

        field.setValue(val);
        expect(field.dirty.get()).toBe(false);

        field.reset();
        expect(field.getValue()).toBe(val);
      }

      expect(Object.prototype.hasOwnProperty.call(Object.prototype, "dirty")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, "value")).toBe(false);
    });
  });

  describe("K. Type Inference Checks", () => {
    test("infers value type from initialValue correctly with single generic", () => {
      const strField: FieldState<string> = createField({ initialValue: "test" });
      const numField: FieldState<number> = createField({ initialValue: 42 });
      const boolField: FieldState<boolean> = createField({ initialValue: true });
      const objField: FieldState<{ foo: string }> = createField({ initialValue: { foo: "bar" } });

      const _strVal: string = strField.getValue();
      const _numVal: number = numField.getValue();
      const _boolVal: boolean = boolField.getValue();
      const _objVal: { foo: string } = objField.getValue();

      expect(typeof _strVal).toBe("string");
      expect(typeof _numVal).toBe("number");
      expect(typeof _boolVal).toBe("boolean");
      expect(typeof _objVal).toBe("object");

      const options: CreateFieldOptions<number> = { initialValue: 123 };
      const explicitField = createField<number>(options);
      expect(explicitField.getValue()).toBe(123);
    });
  });
});
