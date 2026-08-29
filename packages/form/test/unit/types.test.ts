import { describe, expect, expectTypeOf, test } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createFieldGroup } from "../../src/core/group.js";
import { createNumberParser } from "../../src/index.js";
import type {
  FieldGroup,
  FieldState,
  FormInstance,
  FormReinitializeBaseline,
  ParsedCreateFieldOptions,
} from "../../src/core/types.js";

describe("Type inference matrix (P1e corrections)", () => {
  test("infers exact nested types from createForm and canonical createFieldGroup", () => {
    const nameField = createField({ initialValue: "Vitalii" });
    const ageField = createField({ initialValue: 30 });
    const activeField = createField({ initialValue: true });

    const addressGroup = createFieldGroup({
      fields: {
        street: createField({ initialValue: "Hauptstr" }),
        city: createField({ initialValue: "Berlin" }),
        zip: createField({ initialValue: 10115 }),
      },
    });

    const form = createForm({
      fields: {
        name: nameField,
        age: ageField,
        active: activeField,
        address: addressGroup,
      },
    });

    type ExpectedFormValues = {
      name: string;
      age: number;
      active: boolean;
      address: {
        street: string;
        city: string;
        zip: number;
      };
    };

    expectTypeOf(form.getValue()).toEqualTypeOf<ExpectedFormValues>();
    expectTypeOf(form.getRawValue()).toEqualTypeOf<ExpectedFormValues>();
    expectTypeOf(form.value.get()).toEqualTypeOf<ExpectedFormValues>();
    expectTypeOf(form.rawValue.get()).toEqualTypeOf<ExpectedFormValues>();

    expectTypeOf(form.fields.name).toEqualTypeOf<FieldState<string>>();
    expectTypeOf(form.fields.age).toEqualTypeOf<FieldState<number>>();
    expectTypeOf(form.fields.active).toEqualTypeOf<FieldState<boolean>>();
    expectTypeOf(form.fields.address.fields.city).toEqualTypeOf<FieldState<string>>();
    expectTypeOf(form.fields.address.fields.zip).toEqualTypeOf<FieldState<number>>();

    expectTypeOf(addressGroup).toEqualTypeOf<
      FieldGroup<{
        street: FieldState<string>;
        city: FieldState<string>;
        zip: FieldState<number>;
      }>
    >();

    expectTypeOf(form).toEqualTypeOf<
      FormInstance<{
        name: FieldState<string>;
        age: FieldState<number>;
        active: FieldState<boolean>;
        address: FieldGroup<{
          street: FieldState<string>;
          city: FieldState<string>;
          zip: FieldState<number>;
        }>;
      }>
    >();

    expectTypeOf(form.reinitialize).parameter(0).toEqualTypeOf<
      FormReinitializeBaseline<{
        name: FieldState<string>;
        age: FieldState<number>;
        active: FieldState<boolean>;
        address: FieldGroup<{
          street: FieldState<string>;
          city: FieldState<string>;
          zip: FieldState<number>;
        }>;
      }>
    >();
  });

  test("parserless string field works without initialRawValue", () => {
    const field = createField({ initialValue: "hello" });
    expectTypeOf(field).toEqualTypeOf<FieldState<string>>();
    expectTypeOf(field.setRawValue).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(field.setValue).parameter(0).toEqualTypeOf<string>();
  });

  test("parsed string -> number requires initialRawValue", () => {
    const options: ParsedCreateFieldOptions<string, number> = {
      initialValue: 5,
      initialRawValue: "05",
      parser: createNumberParser(),
    };
    const field = createField<number, string>(options);
    expectTypeOf(field).toEqualTypeOf<FieldState<number, string>>();
    expectTypeOf(field.setRawValue).parameter(0).toEqualTypeOf<string>();
    expectTypeOf(field.setValue).parameter(0).toEqualTypeOf<number>();
  });

  test("parsed field missing initialRawValue is rejected at compile time", () => {
    // @ts-expect-error parsed fields require explicit initialRawValue
    createField<number, string>({
      initialValue: 5,
      parser: createNumberParser(),
    });
  });

  test("mixed nested form raw/value aggregate types differ correctly", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
        age: createField<number, string>({
          initialValue: 5,
          initialRawValue: "05",
          parser: createNumberParser(),
        }),
      },
    });

    expectTypeOf(form.getValue()).toEqualTypeOf<{ name: string; age: number }>();
    expectTypeOf(form.getRawValue()).toEqualTypeOf<{ name: string; age: string }>();
  });

  test("reset() accepts zero arguments only", () => {
    const field = createField({ initialValue: "x" });
    expectTypeOf(field.reset).parameters.toEqualTypeOf<[]>();
  });

  test("initial baselines are NOT public FieldState properties", () => {
    const field = createField({ initialValue: "x" });
    expect("initialValue" in field).toBe(false);
    expect("initialRawValue" in field).toBe(false);
  });

  test("infers strongly typed access for child named 'fields'", () => {
    const group = createFieldGroup({
      fields: {
        fields: createField({ initialValue: "user-value" }),
        count: createField({ initialValue: 42 }),
      },
    });

    type ExpectedGroupValues = {
      fields: string;
      count: number;
    };

    expectTypeOf(group.getValue()).toEqualTypeOf<ExpectedGroupValues>();
    expectTypeOf(group.fields.fields).toEqualTypeOf<FieldState<string>>();
    expectTypeOf(group.fields.count).toEqualTypeOf<FieldState<number>>();
  });
});
