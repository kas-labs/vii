import { describe, expectTypeOf, test } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createFieldGroup } from "../../src/core/group.js";
import type { FieldGroup, FieldState, FormInstance } from "../../src/core/types.js";

describe("Type inference matrix (P1d)", () => {
  test("infers exact nested types from createForm and createFieldGroup", () => {
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

    // Form value type
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

    // Field access typing
    expectTypeOf(form.fields.name).toEqualTypeOf<FieldState<string>>();
    expectTypeOf(form.fields.age).toEqualTypeOf<FieldState<number>>();
    expectTypeOf(form.fields.active).toEqualTypeOf<FieldState<boolean>>();
    expectTypeOf(form.fields.address.fields.city).toEqualTypeOf<FieldState<string>>();
    expectTypeOf(form.fields.address.fields.zip).toEqualTypeOf<FieldState<number>>();

    // Group typing
    expectTypeOf(addressGroup).toEqualTypeOf<
      FieldGroup<{
        street: FieldState<string>;
        city: FieldState<string>;
        zip: FieldState<number>;
      }>
    >();

    // Form typing
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

    // Reinitialize argument typing
    expectTypeOf(form.reinitialize).parameter(0).toEqualTypeOf<ExpectedFormValues>();
  });
});
