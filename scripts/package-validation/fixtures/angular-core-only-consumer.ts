import { createField, createForm, createFieldArray } from "@vii-labs/form";
import {
  createAngularField,
  createAngularForm,
  createAngularFieldArray,
  provideViiForm,
  VII_FORM_TOKEN,
} from "@vii-labs/form/angular";

export const angularKeys = [
  "VII_FORM_TOKEN",
  "createAngularField",
  "createAngularFieldArray",
  "createAngularForm",
  "provideViiForm",
].sort();

export function runAngularCoreOnlySmoke(): {
  fieldValue: string;
  formValid: boolean;
  arrayLength: number;
  hasToken: boolean;
} {
  const field = createField({ initialValue: "core-only" });
  const handle = createAngularField(field);
  const form = createForm({
    fields: {
      name: createField({ initialValue: "user" }),
    },
  });
  const formHandle = createAngularForm(form);
  const array = createFieldArray({
    items: [createField({ initialValue: "row-a" })],
  });
  const arrayHandle = createAngularFieldArray(array);

  const provider = provideViiForm(form);
  const hasToken =
    typeof provider === "object" &&
    provider !== null &&
    "provide" in provider &&
    provider.provide === VII_FORM_TOKEN &&
    "useValue" in provider &&
    provider.useValue === form;

  field.setRawValue("mutated");
  return {
    fieldValue: handle.rawValue(),
    formValid: formHandle.valid(),
    arrayLength: arrayHandle.length(),
    hasToken,
  };
}
