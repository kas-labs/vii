import { describe, expect, it } from "vitest";
import {
  createField,
  createFieldGroup,
  createForm,
  createNumberParser,
  type AsyncValidationRule,
} from "../../src/index.js";

describe("P1e: Reinitialize transactional atomicity", () => {
  it("throws on deep missing raw key with zero mutation", () => {
    const name = createField({ initialValue: "Alice" });
    const city = createField({ initialValue: "Berlin" });
    const form = createForm({
      fields: {
        name,
        address: createFieldGroup({ fields: { city } }),
      },
    });

    expect(form.getValue()).toEqual({ name: "Alice", address: { city: "Berlin" } });
    expect(form.dirty.get()).toBe(false);

    expect(() =>
      form.reinitialize({
        value: { name: "Bob", address: { city: "Paris" } },
        rawValue: { name: "Bob", address: {} },
      } as never),
    ).toThrow(TypeError);

    expect(form.fields.name.getValue()).toBe("Alice");
    expect(form.fields.name.getRawValue()).toBe("Alice");
    expect(form.fields.address.fields.city.getValue()).toBe("Berlin");
    expect(form.fields.address.fields.city.getRawValue()).toBe("Berlin");
    expect(form.getValue()).toEqual({ name: "Alice", address: { city: "Berlin" } });
    expect(form.getRawValue()).toEqual({ name: "Alice", address: { city: "Berlin" } });
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);
    expect(form.pending.get()).toBe(false);
  });

  it("throws on deep missing value key with zero mutation", () => {
    const name = createField({ initialValue: "Alice" });
    const city = createField({ initialValue: "Berlin" });
    const form = createForm({
      fields: {
        name,
        address: createFieldGroup({ fields: { city } }),
      },
    });

    expect(() =>
      form.reinitialize({
        value: { name: "Bob", address: {} },
        rawValue: { name: "Bob", address: { city: "Paris" } },
      } as never),
    ).toThrow(TypeError);

    expect(form.fields.name.getValue()).toBe("Alice");
    expect(form.fields.address.fields.city.getValue()).toBe("Berlin");
    expect(form.dirty.get()).toBe(false);
  });

  it("preserves dirty mutated state when malformed reinitialize fails", () => {
    const name = createField({ initialValue: "Alice" });
    const city = createField({ initialValue: "Berlin" });
    const form = createForm({
      fields: {
        name,
        address: createFieldGroup({ fields: { city } }),
      },
    });

    form.fields.name.setValue("Changed");
    form.fields.address.fields.city.setValue("Munich");
    expect(form.dirty.get()).toBe(true);

    expect(() =>
      form.reinitialize({
        value: { name: "Bob", address: { city: "Paris" } },
        rawValue: { name: "Bob", address: {} },
      } as never),
    ).toThrow(TypeError);

    expect(form.fields.name.getValue()).toBe("Changed");
    expect(form.fields.address.fields.city.getValue()).toBe("Munich");
    expect(form.dirty.get()).toBe(true);

    form.reset();
    expect(form.getValue()).toEqual({ name: "Alice", address: { city: "Berlin" } });
    expect(form.dirty.get()).toBe(false);
  });

  it("succeeds with valid reinitialize after a failed attempt", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
        address: createFieldGroup({
          fields: { city: createField({ initialValue: "Berlin" }) },
        }),
      },
    });

    expect(() =>
      form.reinitialize({
        value: { name: "Bob", address: { city: "Paris" } },
        rawValue: { name: "Bob", address: {} },
      } as never),
    ).toThrow(TypeError);

    form.reinitialize({
      value: { name: "Bob", address: { city: "Paris" } },
      rawValue: { name: "Bob", address: { city: "Paris" } },
    });

    expect(form.getValue()).toEqual({ name: "Bob", address: { city: "Paris" } });
    expect(form.dirty.get()).toBe(false);

    form.fields.name.setValue("Mutated");
    form.reset();
    expect(form.getValue()).toEqual({ name: "Bob", address: { city: "Paris" } });
  });

  it("does not cancel pending validation when prevalidation fails", async () => {
    let resolveAsync!: (value: null) => void;
    const asyncPromise = new Promise<null>((resolve) => {
      resolveAsync = resolve;
    });
    const asyncRule: AsyncValidationRule<string> = async () => asyncPromise;

    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice", rules: [asyncRule], validateOn: "change" }),
        address: createFieldGroup({
          fields: { city: createField({ initialValue: "Berlin" }) },
        }),
      },
    });

    form.fields.name.setValue("pending");
    expect(form.pending.get()).toBe(true);

    expect(() =>
      form.reinitialize({
        value: { name: "Bob", address: { city: "Paris" } },
        rawValue: { name: "Bob", address: {} },
      } as never),
    ).toThrow(TypeError);

    expect(form.pending.get()).toBe(true);
    expect(form.fields.name.getValue()).toBe("pending");

    resolveAsync(null);
    await asyncPromise;
    await new Promise((r) => setTimeout(r, 10));
  });

  it("preserves parsed sibling parse issue when nested reinitialize prevalidation fails", () => {
    const age = createField<number, string>({
      initialValue: 5,
      initialRawValue: "05",
      parser: createNumberParser(),
    });
    const form = createForm({
      fields: {
        age,
        address: createFieldGroup({
          fields: { city: createField({ initialValue: "Berlin" }) },
        }),
      },
    });

    form.fields.age.setRawValue("abc");
    expect(form.fields.age.parseStatus.get()).toBe("invalid");
    expect(form.fields.age.rawValue.get()).toBe("abc");
    expect(form.fields.age.value.get()).toBe(5);

    expect(() =>
      form.reinitialize({
        value: { age: 10, address: { city: "Paris" } },
        rawValue: { age: "10", address: {} },
      } as never),
    ).toThrow(TypeError);

    expect(form.fields.age.parseStatus.get()).toBe("invalid");
    expect(form.fields.age.rawValue.get()).toBe("abc");
    expect(form.fields.age.value.get()).toBe(5);
    expect(form.fields.age.parseIssue.get()).not.toBeNull();
  });

  it("supports reserved nested field names during prevalidation", () => {
    const form = createForm({
      fields: {
        ["__proto__"]: createField({ initialValue: "a" }),
        nested: createFieldGroup({
          fields: {
            value: createField({ initialValue: "v" }),
            rawValue: createField({ initialValue: "r" }),
          },
        }),
      },
    });

    expect(() =>
      form.reinitialize({
        value: { ["__proto__"]: "b", nested: { value: "v2" } },
        rawValue: { ["__proto__"]: "b", nested: { rawValue: "r2" } },
      } as never),
    ).toThrow(TypeError);

    expect(form.getValue()).toEqual({
      ["__proto__"]: "a",
      nested: { value: "v", rawValue: "r" },
    });
  });
});

describe("P1e: Reinitialize baseline contract", () => {
  it("parserless scalar reinitialize via separate value/raw trees", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    form.fields.name.setValue("Bob");
    form.reinitialize({
      value: { name: "Carol" },
      rawValue: { name: "Carol" },
    });

    expect(form.getValue()).toEqual({ name: "Carol" });
    expect(form.getRawValue()).toEqual({ name: "Carol" });
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);
  });

  it("parserless object TValue containing value/rawValue keys is not misclassified", () => {
    type MoneyModel = { value: number; rawValue: string };
    const moneyField = createField<MoneyModel>({
      initialValue: { value: 5, rawValue: "€5" },
    });
    const form = createForm({
      fields: {
        money: moneyField,
      },
    });

    const nextBaseline = { value: 10, rawValue: "€10" };
    form.reinitialize({
      value: { money: nextBaseline },
      rawValue: { money: nextBaseline },
    });

    expect(form.fields.money.getValue()).toEqual(nextBaseline);
    expect(form.fields.money.getRawValue()).toEqual(nextBaseline);
    expect(form.fields.money.dirty.get()).toBe(false);
  });

  it("parsed field reinitialize uses separate domain/raw trees", () => {
    const ageField = createField<number, string>({
      initialValue: 5,
      initialRawValue: "05",
      parser: createNumberParser(),
    });
    const form = createForm({ fields: { age: ageField } });

    form.fields.age.setRawValue("abc");
    form.reinitialize({
      value: { age: 10 },
      rawValue: { age: "010" },
    });

    expect(form.fields.age).toBe(ageField);
    expect(form.fields.age.value.get()).toBe(10);
    expect(form.fields.age.rawValue.get()).toBe("010");
    expect(form.fields.age.dirty.get()).toBe(false);
    expect(form.fields.age.touched.get()).toBe(false);
    expect(form.fields.age.parseIssue.get()).toBeNull();
    expect(form.fields.age.pending.get()).toBe(false);
    expect(form.fields.age.issues.get()).toHaveLength(0);

    form.fields.age.setValue(11);
    form.fields.age.reset();
    expect(form.fields.age.value.get()).toBe(10);
    expect(form.fields.age.rawValue.get()).toBe("010");
  });

  it("nested group reinitialize with child TValue containing value/rawValue keys", () => {
    type MoneyModel = { value: number; rawValue: string };
    const form = createForm({
      fields: {
        value: createField({ initialValue: "group-value-field" }),
        rawValue: createField({ initialValue: "group-rawValue-field" }),
        nested: createFieldGroup({
          fields: {
            money: createField<MoneyModel>({
              initialValue: { value: 1, rawValue: "€1" },
            }),
            city: createField({ initialValue: "Berlin" }),
          },
        }),
      },
    });

    form.reinitialize({
      value: {
        value: "updated-value-field",
        rawValue: "updated-rawValue-field",
        nested: {
          money: { value: 2, rawValue: "€2" },
          city: "Paris",
        },
      },
      rawValue: {
        value: "updated-value-field",
        rawValue: "updated-rawValue-field",
        nested: {
          money: { value: 2, rawValue: "€2" },
          city: "Paris",
        },
      },
    });

    expect(form.getValue()).toEqual({
      value: "updated-value-field",
      rawValue: "updated-rawValue-field",
      nested: {
        money: { value: 2, rawValue: "€2" },
        city: "Paris",
      },
    });
    expect(form.dirty.get()).toBe(false);
  });

  it("mixed parsed/parserless form reinitialize in one call", () => {
    type MetaModel = { value: string; rawValue: string };
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
        age: createField<number, string>({
          initialValue: 5,
          initialRawValue: "05",
          parser: createNumberParser(),
        }),
        meta: createField<MetaModel>({
          initialValue: { value: "a", rawValue: "A" },
        }),
        address: createFieldGroup({
          fields: {
            city: createField({ initialValue: "Berlin" }),
          },
        }),
      },
    });

    form.fields.name.setValue("Mutated");
    form.fields.age.setRawValue("99");
    form.fields.meta.setValue({ value: "x", rawValue: "X" });
    form.fields.address.fields.city.setValue("Munich");
    expect(form.dirty.get()).toBe(true);

    form.reinitialize({
      value: {
        name: "Bob",
        age: 10,
        meta: { value: "m", rawValue: "M" },
        address: { city: "Paris" },
      },
      rawValue: {
        name: "Bob",
        age: "010",
        meta: { value: "m", rawValue: "M" },
        address: { city: "Paris" },
      },
    });

    expect(form.getValue()).toEqual({
      name: "Bob",
      age: 10,
      meta: { value: "m", rawValue: "M" },
      address: { city: "Paris" },
    });
    expect(form.getRawValue()).toEqual({
      name: "Bob",
      age: "010",
      meta: { value: "m", rawValue: "M" },
      address: { city: "Paris" },
    });
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);
    expect(form.valid.get()).toBe(true);

    form.fields.name.setValue("Bob");
    expect(form.dirty.get()).toBe(false);

    form.fields.name.setValue("Changed");
    form.reset();
    expect(form.getValue().name).toBe("Bob");
    expect(form.dirty.get()).toBe(false);
  });

  it("rejects malformed reinitialize input missing value or rawValue trees", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "A" }),
      },
    });

    expect(() => form.reinitialize(null as never)).toThrow(TypeError);
    expect(() => form.reinitialize(undefined as never)).toThrow(TypeError);
    expect(() => form.reinitialize({ value: { name: "B" } } as never)).toThrow(TypeError);
    expect(() => form.reinitialize({ rawValue: { name: "B" } } as never)).toThrow(TypeError);
    expect(() => form.reinitialize({ value: { name: "B" }, rawValue: {} } as never)).toThrow(
      TypeError,
    );
  });

  it("cancels pending validation on reinitialize", async () => {
    let resolveAsync!: (value: null) => void;
    const asyncPromise = new Promise<null>((resolve) => {
      resolveAsync = resolve;
    });

    const asyncRule: AsyncValidationRule<string> = async () => asyncPromise;

    const form = createForm({
      fields: {
        name: createField({ initialValue: "init", rules: [asyncRule], validateOn: "change" }),
      },
    });

    form.fields.name.setValue("pending");
    expect(form.pending.get()).toBe(true);

    form.reinitialize({
      value: { name: "fresh" },
      rawValue: { name: "fresh" },
    });

    expect(form.pending.get()).toBe(false);
    expect(form.fields.name.getValue()).toBe("fresh");
    expect(form.dirty.get()).toBe(false);

    resolveAsync(null);
    await asyncPromise;
  });
});
