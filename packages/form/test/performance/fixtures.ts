import { createFieldArray } from "../../src/core/array.js";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createFieldGroup } from "../../src/core/group.js";
import type {
  FieldArray,
  FieldState,
  FormFieldsRecord,
  FormInstance,
} from "../../src/core/types.js";
import type { SyncValidationRule } from "../../src/validation/types.js";

export function createHomogeneousForm(
  fieldCount: number,
  options?: {
    withValidationRule?: boolean;
    ruleCounter?: { count: number };
  },
): {
  form: FormInstance<Record<string, FieldState<string>>>;
  fields: Record<string, FieldState<string>>;
} {
  const fields: Record<string, FieldState<string>> = {};
  const withRule = options?.withValidationRule ?? false;
  const counter = options?.ruleCounter;

  for (let i = 0; i < fieldCount; i++) {
    const key = `field_${i}`;
    const rules: Array<SyncValidationRule<string>> = [];
    if (withRule) {
      rules.push((value: string) => {
        if (counter) counter.count += 1;
        return value && value.length > 0
          ? null
          : { code: "required", message: `${key} is required` };
      });
    }

    fields[key] = createField<string>({
      initialValue: `value_${i}`,
      rules,
    });
  }

  const form = createForm({ fields });
  return { form, fields };
}

export function createHomogeneousFieldArray(count: number): {
  array: FieldArray<FieldState<string>>;
  items: FieldState<string>[];
} {
  const items: FieldState<string>[] = [];
  for (let i = 0; i < count; i++) {
    items.push(
      createField<string>({
        initialValue: `item_${i}`,
      }),
    );
  }
  const array = createFieldArray<FieldState<string>>({ items });
  return { array, items };
}

/**
 * Creates a realistic nested form fixture with exactly 97 leaf fields:
 * - Profile: 5 leaves
 * - Preferences: 2 leaves
 * - Addresses (FieldArray of 10 items with 6 leaves each): 60 leaves
 * - History (FieldArray of 10 items with 3 leaves each): 30 leaves
 * Total: 5 + 2 + 60 + 30 = 97 leaf fields.
 */
export function createRealisticNestedForm(): {
  form: FormInstance<FormFieldsRecord>;
  leafCount: number;
} {
  const addressItems = [];
  for (let i = 0; i < 10; i++) {
    addressItems.push(
      createFieldGroup({
        fields: {
          street: createField({ initialValue: `Street ${i}` }),
          suite: createField({ initialValue: `Apt ${i}` }),
          city: createField({ initialValue: "Berlin" }),
          state: createField({ initialValue: "BE" }),
          zip: createField({ initialValue: `1000${i}` }),
          country: createField({ initialValue: "DE" }),
        },
      }),
    );
  }

  const historyItems = [];
  for (let i = 0; i < 10; i++) {
    historyItems.push(
      createFieldGroup({
        fields: {
          company: createField({ initialValue: `Company ${i}` }),
          role: createField({ initialValue: "Engineer" }),
          years: createField({ initialValue: `${i + 1}` }),
        },
      }),
    );
  }

  const form = createForm({
    fields: {
      profile: createFieldGroup({
        fields: {
          firstName: createField({ initialValue: "Grace" }),
          lastName: createField({ initialValue: "Hopper" }),
          email: createField({ initialValue: "grace@navy.mil" }),
          title: createField({ initialValue: "Rear Admiral" }),
          division: createField({ initialValue: "Systems" }),
        },
      }),
      preferences: createFieldGroup({
        fields: {
          notifications: createField({ initialValue: "enabled" }),
          theme: createField({ initialValue: "system" }),
        },
      }),
      addresses: createFieldArray({ items: addressItems }),
      history: createFieldArray({ items: historyItems }),
    },
  });

  return { form, leafCount: 97 };
}
