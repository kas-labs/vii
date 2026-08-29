import { describe, expect, it, vi } from "vitest";
import {
  createField,
  createFieldGroup,
  createForm,
  createNumberParser,
  type AsyncValidationRule,
  type FieldIssue,
  type SyncValidationRule,
} from "../../src/index.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("P1e: Group & Form Aggregate Validation State", () => {
  it("aggregates valid, invalid, and issues across nested fields and groups", () => {
    const nameRule: SyncValidationRule<string> = (val) =>
      val.length < 3 ? { code: "min_length", message: "Name too short" } : null;

    const ageRule: SyncValidationRule<number> = (val) =>
      val < 18 ? { code: "min_age", message: "Must be 18+" } : null;

    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alex", rules: [nameRule] }),
        profile: createFieldGroup({
          fields: {
            age: createField<number, string>({
              initialValue: 20,
              initialRawValue: "20",
              parser: createNumberParser(),
              rules: [ageRule],
            }),
          },
        }),
      },
    });

    expect(form.valid.get()).toBe(true);
    expect(form.invalid.get()).toBe(false);
    expect(form.issues.get()).toHaveLength(0);

    // Make name invalid
    form.fields.name.setValue("A");
    expect(form.valid.get()).toBe(false);
    expect(form.invalid.get()).toBe(true);
    expect(form.issues.get()).toHaveLength(1);
    expect(form.issues.get()[0]?.path).toEqual(["name"]);

    // Make age unparseable
    form.fields.profile.fields.age.setRawValue("invalid-age");
    expect(form.valid.get()).toBe(false);
    expect(form.issues.get()).toHaveLength(2);
    expect(form.issues.get().some((iss) => iss.path?.[0] === "name")).toBe(true);
    expect(
      form.issues.get().some((iss) => iss.path?.[0] === "profile" && iss.path?.[1] === "age"),
    ).toBe(true);

    // Fix name
    form.fields.name.setValue("Alexander");
    expect(form.issues.get()).toHaveLength(1);
    expect(form.issues.get()[0]?.path).toEqual(["profile", "age"]);

    // Fix age
    form.fields.profile.fields.age.setRawValue("25");
    expect(form.valid.get()).toBe(true);
    expect(form.invalid.get()).toBe(false);
    expect(form.issues.get()).toHaveLength(0);
  });

  it("aggregates pending state across tree when any child is validating asynchronously", async () => {
    const deferred = createDeferred<FieldIssue | null>();
    const asyncRule: AsyncValidationRule<string> = async () => deferred.promise;

    const form = createForm({
      fields: {
        syncField: createField({ initialValue: "test" }),
        asyncField: createField({ initialValue: "init", rules: [asyncRule] }),
      },
    });

    expect(form.pending.get()).toBe(false);

    form.fields.asyncField.setValue("new_val");
    expect(form.pending.get()).toBe(true);

    deferred.resolve(null);
    await new Promise((r) => setTimeout(r, 10));

    expect(form.pending.get()).toBe(false);
    expect(form.valid.get()).toBe(true);
  });

  it("preserves granular reactivity: mutation in groupA does not notify groupB subscribers", () => {
    const form = createForm({
      fields: {
        groupA: createFieldGroup({
          fields: {
            fieldA: createField({ initialValue: "A" }),
          },
        }),
        groupB: createFieldGroup({
          fields: {
            fieldB: createField({ initialValue: "B" }),
          },
        }),
      },
    });

    const groupBListener = vi.fn();
    const unsubscribe = form.fields.groupB.valid.subscribe(groupBListener);

    groupBListener.mockClear();

    // Mutate field in groupA
    form.fields.groupA.fields.fieldA.setValue("A_mutated");

    // Group B must NOT receive any notifications
    expect(groupBListener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("reinitializes whole-form baseline with new domain values and resets dirty and validation", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
        profile: createFieldGroup({
          fields: {
            theme: createField({ initialValue: "light" }),
          },
        }),
      },
    });

    form.fields.name.setValue("Bob");
    expect(form.dirty.get()).toBe(true);

    form.reinitialize({
      name: "Charlie",
      profile: { theme: "dark" },
    });

    expect(form.getValue()).toEqual({
      name: "Charlie",
      profile: { theme: "dark" },
    });
    expect(form.getRawValue()).toEqual({
      name: "Charlie",
      profile: { theme: "dark" },
    });
    expect(form.dirty.get()).toBe(false);
    expect(form.valid.get()).toBe(true);
  });
});
