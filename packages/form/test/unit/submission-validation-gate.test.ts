import { describe, expect, it } from "vitest";
import { createFieldArray } from "../../src/core/array.js";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createNumberParser } from "../../src/parsers/builtins.js";

describe("Submission Validation Gate", () => {
  it("blocks submission if synchronous client validation fails", async () => {
    let actionCalled = false;

    const form = createForm({
      fields: {
        email: createField<string>({
          initialValue: "",
          rules: [
            (val: string) => (!val ? { code: "required", message: "Email is required" } : null),
          ],
        }),
      },
    });

    const result = await form.submit(async () => {
      actionCalled = true;
    });

    expect(actionCalled).toBe(false);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues).toEqual([
        {
          code: "required",
          message: "Email is required",
          path: ["email"],
          source: "validation",
        },
      ]);
    }
    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.submitting.get()).toBe(false);
  });

  it("awaits and blocks submission if asynchronous validation fails", async () => {
    let actionCalled = false;

    const form = createForm({
      fields: {
        username: createField<string>({
          initialValue: "taken_user",
          rules: [
            async (val: string) => {
              await new Promise((resolve) => setTimeout(resolve, 20));
              return val === "taken_user"
                ? { code: "taken", message: "Username already taken" }
                : null;
            },
          ],
        }),
      },
    });

    const result = await form.submit(async () => {
      actionCalled = true;
    });

    expect(actionCalled).toBe(false);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues).toEqual([
        {
          code: "taken",
          message: "Username already taken",
          path: ["username"],
          source: "validation",
        },
      ]);
    }
    expect(form.submissionStatus.get()).toBe("idle");
  });

  it("blocks submission if parser fails (parseStatus === invalid)", async () => {
    let actionCalled = false;

    const form = createForm({
      fields: {
        age: createField<number, string>({
          initialValue: 25,
          initialRawValue: "25",
          parser: createNumberParser(),
        }),
      },
    });

    // Enter invalid text
    form.fields.age.setRawValue("abc");

    expect(form.fields.age.parseStatus.get()).toBe("invalid");
    expect(form.fields.age.value.get()).toBe(25); // Last good value retained
    expect(form.fields.age.rawValue.get()).toBe("abc");

    const result = await form.submit(async () => {
      actionCalled = true;
    });

    expect(actionCalled).toBe(false);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.source).toBe("parse");
    }
    expect(form.submissionStatus.get()).toBe("idle");
  });

  it("proceeds to submit action when all fields and groups are valid", async () => {
    let actionCalledWith: unknown = null;

    const form = createForm({
      fields: {
        name: createField<string>({
          initialValue: "Bob",
          rules: [(val: string) => (!val ? { code: "req", message: "Required" } : null)],
        }),
        age: createField<number, string>({
          initialValue: 30,
          initialRawValue: "30",
          parser: createNumberParser(),
        }),
      },
    });

    const result = await form.submit(async (values) => {
      actionCalledWith = values;
      return { success: true };
    });

    expect(result).toEqual({ status: "succeeded", result: { success: true } });
    expect(actionCalledWith).toEqual({ name: "Bob", age: 30 });
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  describe("Async validation and user edit race conditions (Validation Authority)", () => {
    it("1. valid A -> invalid B during async submit validation: action never runs", async () => {
      let actionCalled = false;
      let resolveValidationA!: (issue: { code: string } | null) => void;

      const form = createForm({
        fields: {
          title: createField<string>({
            initialValue: "VALID_A",
            rules: [
              (val: string) =>
                new Promise<{ code: string } | null>((resolve) => {
                  if (val === "VALID_A") {
                    resolveValidationA = resolve;
                  } else {
                    resolve({ code: "invalid_b" });
                  }
                }),
            ],
          }),
        },
      });

      // Submit begins for VALID_A
      const submitPromise = form.submit(async () => {
        actionCalled = true;
        return { ok: true };
      });

      expect(form.submissionStatus.get()).toBe("validating");

      // While submit validation is pending, user edits to INVALID_B
      form.fields.title.setValue("INVALID_B");

      // Now resolve the original submit validation promise
      resolveValidationA(null);

      const result = await submitPromise;

      // Action MUST NEVER run
      expect(actionCalled).toBe(false);
      expect(result.status).toBe("cancelled");
      expect(form.submissionStatus.get()).toBe("cancelled");
    });

    it("2. valid A -> valid B during async submit validation: cancels in-flight submit, next submit validates B", async () => {
      let actionCalledCount = 0;
      let submittedValues: unknown = null;
      let resolveValidationA!: (issue: { code: string } | null) => void;

      const form = createForm({
        fields: {
          title: createField<string>({
            initialValue: "VALID_A",
            rules: [
              (val: string) =>
                new Promise<{ code: string } | null>((resolve) => {
                  if (val === "VALID_A") {
                    resolveValidationA = resolve;
                  } else {
                    resolve(null);
                  }
                }),
            ],
          }),
        },
      });

      const submitPromise1 = form.submit(async (values) => {
        actionCalledCount++;
        submittedValues = values;
        return { ok: true };
      });

      // User edits to VALID_B while validation A is pending
      form.fields.title.setValue("VALID_B");

      // Resolve A
      resolveValidationA(null);

      const result1 = await submitPromise1;
      expect(result1.status).toBe("cancelled");
      expect(actionCalledCount).toBe(0);

      // Now submit again on VALID_B
      const result2 = await form.submit(async (values) => {
        actionCalledCount++;
        submittedValues = values;
        return { ok: true };
      });

      expect(result2.status).toBe("succeeded");
      expect(actionCalledCount).toBe(1);
      expect(submittedValues).toEqual({ title: "VALID_B" });
      expect(form.submissionStatus.get()).toBe("succeeded");
    });

    it("3. B validation still pending: action cannot run early while validation generation is unresolved", async () => {
      let actionCalled = false;
      let resolveValidationA!: (res: null) => void;

      const form = createForm({
        fields: {
          username: createField<string>({
            initialValue: "USER_A",
            rules: [
              (val: string) =>
                new Promise<{ code: string } | null>((resolve) => {
                  if (val === "USER_A") {
                    resolveValidationA = resolve;
                  }
                  // B will hang indefinitely
                }),
            ],
          }),
        },
      });

      const submitPromise = form.submit(async () => {
        actionCalled = true;
        return { ok: true };
      });

      // User edits to USER_B
      form.fields.username.setValue("USER_B");

      // Resolve old validation pass A
      resolveValidationA(null);

      const result = await submitPromise;
      expect(result.status).toBe("cancelled");
      expect(actionCalled).toBe(false);
    });

    it("4. parse-invalid setRawValue during submit validation: cancels submission and action never runs", async () => {
      let actionCalled = false;
      let resolveValidationA!: (res: null) => void;

      const form = createForm({
        fields: {
          age: createField<number, string>({
            initialValue: 20,
            initialRawValue: "20",
            parser: createNumberParser(),
            rules: [
              () =>
                new Promise<{ code: string } | null>((resolve) => {
                  resolveValidationA = resolve;
                }),
            ],
          }),
        },
      });

      const submitPromise = form.submit(async () => {
        actionCalled = true;
        return { ok: true };
      });

      // User enters invalid raw text "abc" during submit validation
      form.fields.age.setRawValue("abc");

      resolveValidationA(null);

      const result = await submitPromise;
      expect(result.status).toBe("cancelled");
      expect(actionCalled).toBe(false);
    });

    it("5. FieldArray structural mutation during submit validation: cancels submission and never submits unvalidated structure", async () => {
      let actionCalled = false;
      let resolveValidationA!: (res: null) => void;

      const form = createForm({
        fields: {
          items: createFieldArray({
            items: [
              createField<string>({
                initialValue: "Item 0",
                rules: [
                  () =>
                    new Promise<{ code: string } | null>((resolve) => {
                      resolveValidationA = resolve;
                    }),
                ],
              }),
            ],
          }),
        },
      });

      const submitPromise = form.submit(async () => {
        actionCalled = true;
        return { ok: true };
      });

      // While validation is pending, mutate the array
      form.fields.items.append(createField<string>({ initialValue: "Item 1" }));

      resolveValidationA(null);

      const result = await submitPromise;
      expect(result.status).toBe("cancelled");
      expect(actionCalled).toBe(false);
    });

    it("6. multiple rapid edits: no stale validation generation can authorize submit", async () => {
      let actionCalled = false;
      const resolvers: Array<(res: null) => void> = [];

      const form = createForm({
        fields: {
          query: createField<string>({
            initialValue: "v1",
            rules: [
              () =>
                new Promise<{ code: string } | null>((resolve) => {
                  resolvers.push(resolve);
                }),
            ],
          }),
        },
      });

      const submitPromise = form.submit(async () => {
        actionCalled = true;
        return { ok: true };
      });

      form.fields.query.setValue("v2");
      form.fields.query.setValue("v3");
      form.fields.query.setValue("v4");

      for (const r of resolvers) {
        r(null);
      }

      const result = await submitPromise;
      expect(result.status).toBe("cancelled");
      expect(actionCalled).toBe(false);
    });

    it("7. unchanged form: normal submit path executes cleanly", async () => {
      let submittedValues: unknown = null;

      const form = createForm({
        fields: {
          name: createField<string>({
            initialValue: "Alice",
            rules: [
              async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return null;
              },
            ],
          }),
        },
      });

      const result = await form.submit(async (values) => {
        submittedValues = values;
        return { ok: true, result: "all_good" };
      });

      expect(result).toEqual({ status: "succeeded", result: "all_good" });
      expect(submittedValues).toEqual({ name: "Alice" });
      expect(form.submissionStatus.get()).toBe("succeeded");
    });
  });
});
