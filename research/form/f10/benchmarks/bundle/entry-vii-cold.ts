import { createForm, createField, createFieldArray, createFieldGroup } from "../../../form-core.js";
import { useForm, useField, useFieldArray } from "../../../adapters/react.js";
import { createNumberParser } from "../../../parser.js";
import { standardSchema } from "../../../standard-schema.js";

export const form = createForm({ initialValues: { name: "test", count: 0 } });
export const hooks = {
  useForm,
  useField,
  useFieldArray,
  createNumberParser,
  standardSchema,
  createField,
  createFieldArray,
  createFieldGroup,
};
