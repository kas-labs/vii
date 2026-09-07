import { createForm, createField, type FieldState } from "../../../src/index.js";

type FormShape = {
  required: FieldState<string, string>;
  optional?: FieldState<string, string>;
};

const form = createForm<FormShape>({
  fields: {
    required: createField({ initialValue: "a" }),
  },
});

// @ts-expect-error Cannot unregister a statically required key
form.unregister("required");

// Can unregister an optional key
form.unregister("optional");

// @ts-expect-error Cannot register a statically required key that is not optional
form.register("required", createField({ initialValue: "c" }));

// Can register an optional key
form.register("optional", createField({ initialValue: "c" }));
