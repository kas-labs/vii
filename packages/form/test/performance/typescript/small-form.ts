import { createField, createFieldGroup, createForm } from "../../../src/index.js";

export function createSmallForm() {
  return createForm({
    fields: {
      username: createField({ initialValue: "user" }),
      email: createField({ initialValue: "user@example.com" }),
      age: createField({ initialValue: 25 }),
      active: createField({ initialValue: true }),
      profile: createFieldGroup({
        fields: {
          firstName: createField({ initialValue: "Jane" }),
          lastName: createField({ initialValue: "Doe" }),
          bio: createField({ initialValue: "Engineer" }),
        },
      }),
      score: createField({ initialValue: 100 }),
      country: createField({ initialValue: "US" }),
      verified: createField({ initialValue: true }),
    },
  });
}

export type SmallFormType = ReturnType<typeof createSmallForm>;
