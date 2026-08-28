import { createScope } from "@vii-labs/core";
import { describe, expect, test, vi } from "vitest";
import { createField } from "../../src/core/field.js";
import { createFieldGroup } from "../../src/core/group.js";

describe("createFieldGroup (P1d)", () => {
  test("initializes with nested aggregate value and rawValue mirroring", () => {
    const group = createFieldGroup({
      fields: {
        street: createField({ initialValue: "123 Main St" }),
        city: createField({ initialValue: "Berlin" }),
        zip: createField({ initialValue: 10115 }),
      },
    });

    expect(group.kind).toBe("group");
    expect(group.getValue()).toEqual({
      street: "123 Main St",
      city: "Berlin",
      zip: 10115,
    });
    expect(group.getRawValue()).toEqual({
      street: "123 Main St",
      city: "Berlin",
      zip: 10115,
    });
    expect(group.value.get()).toEqual({
      street: "123 Main St",
      city: "Berlin",
      zip: 10115,
    });
    expect(group.rawValue.get()).toEqual({
      street: "123 Main St",
      city: "Berlin",
      zip: 10115,
    });
  });

  test("supports direct object fields argument syntax", () => {
    const street = createField({ initialValue: "123 Main St" });
    const city = createField({ initialValue: "Berlin" });
    const group = createFieldGroup({ street, city });

    expect(group.fields.street.getValue()).toBe("123 Main St");
    expect(group.fields.city.getValue()).toBe("Berlin");
    expect(group.getValue()).toEqual({ street: "123 Main St", city: "Berlin" });
  });

  test("child mutation updates aggregate value and notifies group subscribers", () => {
    const group = createFieldGroup({
      fields: {
        name: createField({ initialValue: "Alice" }),
        age: createField({ initialValue: 25 }),
      },
    });

    const listener = vi.fn();
    const unsubscribe = group.value.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(0);

    group.fields.name.setValue("Bob");

    expect(group.getValue()).toEqual({ name: "Bob", age: 25 });
    expect(group.getRawValue()).toEqual({ name: "Bob", age: 25 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ name: "Bob", age: 25 });

    unsubscribe();
  });

  test("fine-grained sibling field subscriber is not notified on sibling mutation", () => {
    const street = createField({ initialValue: "Main St" });
    const city = createField({ initialValue: "Berlin" });
    const group = createFieldGroup({ fields: { street, city } });

    const streetListener = vi.fn();
    const cityListener = vi.fn();
    street.value.subscribe(streetListener);
    city.value.subscribe(cityListener);

    expect(streetListener).toHaveBeenCalledTimes(0);
    expect(cityListener).toHaveBeenCalledTimes(0);

    city.setValue("Munich");

    expect(cityListener).toHaveBeenCalledTimes(1);
    expect(cityListener).toHaveBeenLastCalledWith("Munich");
    expect(streetListener).toHaveBeenCalledTimes(0); // Sibling not notified!
    expect(group.getValue()).toEqual({ street: "Main St", city: "Munich" });
  });

  test("tracks aggregate dirty state based on baseline return semantics", () => {
    const group = createFieldGroup({
      fields: {
        street: createField({ initialValue: "Main St" }),
        city: createField({ initialValue: "Berlin" }),
      },
    });

    expect(group.dirty.get()).toBe(false);

    group.fields.street.setValue("Broadway");
    expect(group.dirty.get()).toBe(true);

    group.fields.city.setValue("Munich");
    expect(group.dirty.get()).toBe(true);

    // Revert street back to baseline
    group.fields.street.setValue("Main St");
    expect(group.dirty.get()).toBe(true); // City is still dirty

    // Revert city back to baseline
    group.fields.city.setValue("Berlin");
    expect(group.dirty.get()).toBe(false); // Both pristine again!
  });

  test("tracks aggregate touched state across descendants", () => {
    const group = createFieldGroup({
      fields: {
        street: createField({ initialValue: "Main St" }),
        city: createField({ initialValue: "Berlin" }),
      },
    });

    expect(group.touched.get()).toBe(false);

    group.fields.city.markTouched();
    expect(group.touched.get()).toBe(true);

    group.reset();
    expect(group.touched.get()).toBe(false);
  });

  test("reset atomically restores original baseline across all descendants", () => {
    const group = createFieldGroup({
      fields: {
        street: createField({ initialValue: "Main St" }),
        city: createField({ initialValue: "Berlin" }),
      },
    });

    group.fields.street.setValue("Broadway");
    group.fields.city.setValue("Munich");
    group.fields.street.markTouched();

    expect(group.getValue()).toEqual({ street: "Broadway", city: "Munich" });
    expect(group.dirty.get()).toBe(true);
    expect(group.touched.get()).toBe(true);

    group.reset();

    expect(group.getValue()).toEqual({ street: "Main St", city: "Berlin" });
    expect(group.getRawValue()).toEqual({ street: "Main St", city: "Berlin" });
    expect(group.dirty.get()).toBe(false);
    expect(group.touched.get()).toBe(false);
  });

  test("supports multi-level recursive nested groups", () => {
    const group = createFieldGroup({
      fields: {
        user: createFieldGroup({
          fields: {
            first: createField({ initialValue: "John" }),
            last: createField({ initialValue: "Doe" }),
          },
        }),
        settings: createFieldGroup({
          fields: {
            notifications: createField({ initialValue: true }),
            theme: createField({ initialValue: "dark" }),
          },
        }),
      },
    });

    expect(group.getValue()).toEqual({
      user: { first: "John", last: "Doe" },
      settings: { notifications: true, theme: "dark" },
    });
    expect(group.dirty.get()).toBe(false);

    group.fields.user.fields.first.setValue("Jane");

    expect(group.getValue()).toEqual({
      user: { first: "Jane", last: "Doe" },
      settings: { notifications: true, theme: "dark" },
    });
    expect(group.fields.user.dirty.get()).toBe(true);
    expect(group.fields.settings.dirty.get()).toBe(false);
    expect(group.dirty.get()).toBe(true);

    group.reset();
    expect(group.getValue()).toEqual({
      user: { first: "John", last: "Doe" },
      settings: { notifications: true, theme: "dark" },
    });
    expect(group.dirty.get()).toBe(false);
  });

  test("disposal cascades to child nodes and is idempotent", () => {
    const street = createField({ initialValue: "Main St" });
    const city = createField({ initialValue: "Berlin" });
    const group = createFieldGroup({ fields: { street, city } });

    group.dispose();
    group.dispose(); // Idempotent

    expect(() => group.getValue()).toThrowError("Group is disposed");
    expect(() => group.getRawValue()).toThrowError("Group is disposed");
    expect(() => group.reset()).toThrowError("Group is disposed");
    expect(() => street.getValue()).toThrowError("Field is disposed");
    expect(() => city.getValue()).toThrowError("Field is disposed");
  });

  test("parent Scope disposal cascades to group and child nodes", () => {
    const parentScope = createScope({ name: "parent" });
    const street = createField({ initialValue: "Main St" });
    const group = createFieldGroup({ fields: { street }, scope: parentScope });

    parentScope.dispose();

    expect(() => group.getValue()).toThrowError("Group is disposed");
    expect(() => street.getValue()).toThrowError("Field is disposed");
  });

  test("handles dangerous-looking object keys safely without prototype pollution", () => {
    const protoField = createField({ initialValue: "custom-proto" });
    const constructorField = createField({ initialValue: "custom-constructor" });
    const prototypeField = createField({ initialValue: "custom-prototype" });

    const group = createFieldGroup({
      fields: {
        ["__proto__"]: protoField,
        constructor: constructorField,
        prototype: prototypeField,
      },
    });

    const val = group.getValue();
    expect(Object.hasOwn(val, "__proto__")).toBe(true);
    expect(Object.hasOwn(val, "constructor")).toBe(true);
    expect(Object.hasOwn(val, "prototype")).toBe(true);
    expect(val["__proto__"]).toBe("custom-proto");
    expect(val["constructor"]).toBe("custom-constructor");
    expect(val["prototype"]).toBe("custom-prototype");

    // Verify Object.prototype is unaffected
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "customProperty")).toBe(false);
    expect(Object.getPrototypeOf(val)).toBe(Object.prototype);

    protoField.setValue("pollute-attempt");
    expect(group.getValue()["__proto__"]).toBe("pollute-attempt");
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluteAttempt")).toBe(false);
  });

  test("provides referential stability until child values change", () => {
    const group = createFieldGroup({
      fields: {
        a: createField({ initialValue: 1 }),
        b: createField({ initialValue: 2 }),
      },
    });

    const snap1 = group.value.get();
    const snap2 = group.value.get();
    expect(snap1).toBe(snap2); // Stable snapshot reference

    group.fields.a.setValue(10);
    const snap3 = group.value.get();
    expect(snap3).not.toBe(snap1);
    expect(snap3).toEqual({ a: 10, b: 2 });
  });

  test("independent groups remain completely isolated", () => {
    const group1 = createFieldGroup({
      fields: { count: createField({ initialValue: 0 }) },
    });
    const group2 = createFieldGroup({
      fields: { count: createField({ initialValue: 100 }) },
    });

    group1.fields.count.setValue(5);

    expect(group1.getValue()).toEqual({ count: 5 });
    expect(group2.getValue()).toEqual({ count: 100 });
    expect(group1.dirty.get()).toBe(true);
    expect(group2.dirty.get()).toBe(false);
  });
});
