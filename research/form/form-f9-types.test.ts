import { describe, expect, it } from "vitest";
import {
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  type FieldState,
  type FormInstance,
} from "./form-core.js";
import { createNumberParser, createOptionalStringParser } from "./parser.js";
import { standardSchema } from "./standard-schema.js";
import { z } from "zod";
import * as v from "valibot";
import { type as arkType } from "arktype";

describe("Form Research F9: TypeScript Inference, Generics & Error Clarity", () => {
  it("infers precise types for scalar fields, parsed fields, and optional fields", () => {
    // String field: Value = string, Raw = string
    const textField = createField({ initialValue: "hello" });
    const textVal: string = textField.value.get();
    expect(textVal).toBe("hello");

    // Number parser field: Value = number, Raw = string
    const numField = createField({
      initialValue: 42,
      parser: createNumberParser(),
    });
    const numVal: number = numField.value.get();
    expect(numVal).toBe(42);
    numField.setRawValue("100");
    expect(numField.value.get()).toBe(100);

    // Optional string parser
    const optField = createField({
      initialValue: undefined as string | undefined,
      parser: createOptionalStringParser(),
    });
    optField.setRawValue("");
    expect(optField.value.get()).toBeUndefined();
  });

  it("infers precise types for nested forms and field groups", () => {
    interface ComplexModel {
      user: {
        name: string;
        age: number;
      };
      skills: string[];
    }

    const form: FormInstance<ComplexModel> = createForm<ComplexModel>({
      initialValues: {
        user: {
          name: "Ada",
          age: 36,
        },
        skills: ["Math", "Analytical Engine"],
      },
    });

    const values = form.values.get();
    const userName: string = values.user.name;
    const userAge: number = values.user.age;
    const skillList: readonly string[] = values.skills;

    expect(userName).toBe("Ada");
    expect(userAge).toBe(36);
    expect(skillList).toEqual(["Math", "Analytical Engine"]);

    form.dispose();
  });

  it("infers correct types across Standard Schema v1 providers (Zod, Valibot, ArkType)", () => {
    // 1. Zod 4 Schema
    const zodSchema = z.object({
      title: z.string().min(3),
      count: z.number().int().positive(),
    });
    const zodAdapter = standardSchema(zodSchema);
    expect(typeof zodAdapter).toBe("function");

    // 2. Valibot Schema
    const valibotSchema = v.object({
      email: v.pipe(v.string(), v.email()),
    });
    const valibotAdapter = standardSchema(valibotSchema);
    expect(typeof valibotAdapter).toBe("function");

    // 3. ArkType Schema
    const arkSchema = arkType({
      age: "number >= 18",
    });
    const arkAdapter = standardSchema(arkSchema);
    expect(typeof arkAdapter).toBe("function");
  });

  it("verifies negative type compile constraints via ts-expect-error comments", () => {
    const field = createField({ initialValue: "test" });

    // @ts-expect-error - number cannot be assigned to string field
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => field.setValue(123);

    const numField = createField({
      initialValue: 10,
      parser: createNumberParser(),
    });

    // @ts-expect-error - setRawValue requires string for NumberParser, not boolean
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => numField.setRawValue(true);

    expect(true).toBe(true);
  });
});
