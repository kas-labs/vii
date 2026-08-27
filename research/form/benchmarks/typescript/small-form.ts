import { createForm, createField, type FieldState } from "../../form-core.js";
import { createNumberParser } from "../../parser.js";

// Small Form: 10 fields with nested group and array in initialValues
export interface SmallFormModel {
  username: string;
  email: string;
  age: number;
  active: boolean;
  profile: {
    firstName: string;
    lastName: string;
    bio: string;
  };
  tags: string[];
  score: number;
}

export function buildSmallForm() {
  const form = createForm<SmallFormModel>({
    initialValues: {
      username: "user",
      email: "user@example.com",
      age: 25,
      active: true,
      profile: {
        firstName: "Jane",
        lastName: "Doe",
        bio: "Engineer",
      },
      tags: ["admin", "staff"],
      score: 100,
    },
    rules: [
      (values: SmallFormModel) =>
        values.username.length > 0
          ? null
          : { code: "required", message: "Username required", path: ["username"] },
    ],
  });

  return form;
}

export function createSmallStandaloneField(): FieldState<number, string> {
  return createField({
    initialValue: 42,
    parser: createNumberParser(),
  });
}

const form = buildSmallForm();
export type SmallFormValues = typeof form.values;
export type SmallFormOutput = ReturnType<typeof form.getOutput>;
