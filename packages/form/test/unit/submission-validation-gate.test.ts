import { describe, expect, it } from "vitest";
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

  describe("Async validation and user edit race conditions", () => {
    it("never submits a stale pre-validation snapshot when field is edited during async submit validation", async () => {
      let submittedValues: unknown = null;

      const form = createForm({
        fields: {
          title: createField<string>({
            initialValue: "Initial Title A",
            rules: [
              async (val: string) => {
                await new Promise((resolve) => setTimeout(resolve, 30));
                return val.length < 3 ? { code: "min_len" } : null;
              },
            ],
          }),
        },
      });

      // Submit begins with "Initial Title A"
      const submitPromise = form.submit(async (values) => {
        submittedValues = values;
        return { ok: true };
      });

      // While async submit validation is in-flight, user edits to "Updated Title B"
      form.fields.title.setValue("Updated Title B");

      const result = await submitPromise;

      expect(result.status).toBe("succeeded");
      // Action MUST receive the post-validation snapshot ("Updated Title B"), NEVER the stale "Initial Title A"!
      expect(submittedValues).toEqual({ title: "Updated Title B" });
    });
  });
});
