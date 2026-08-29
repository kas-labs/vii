import { describe, expect, it } from "vitest";
import {
  createField,
  isStandardSchema,
  standardSchema,
  type FieldIssue,
  type StandardSchemaV1,
} from "../../src/index.js";
import { normalizeStandardSchemaIssue } from "../../src/validation/standard-schema.js";

describe("P1e: Standard Schema v1 Validation Bridge", () => {
  const createMockSchema = <TInput>(
    validateFn: (
      value: TInput,
    ) => StandardSchemaV1.Result<TInput> | Promise<StandardSchemaV1.Result<TInput>>,
    vendor = "mock-vendor",
  ): StandardSchemaV1<TInput, TInput> => ({
    "~standard": {
      version: 1,
      vendor,
      validate: (val: unknown) => validateFn(val as TInput),
    },
  });

  it("validates successful sync standard schema", () => {
    const schema = createMockSchema<string>((val) => ({ value: val }));
    expect(isStandardSchema(schema)).toBe(true);

    const field = createField({
      initialValue: "hello",
      rules: [standardSchema(schema)],
    });

    expect(field.valid.get()).toBe(true);
    expect(field.issues.get()).toHaveLength(0);
  });

  it("normalizes sync schema issues into Vii ValidationIssue", () => {
    const schema = createMockSchema<string>((val) => {
      if (val.length < 3) {
        return {
          issues: [
            {
              message: "String must contain at least 3 character(s)",
              path: ["name"],
            },
          ],
        };
      }
      return { value: val };
    });

    const field = createField({
      initialValue: "hello",
      rules: [standardSchema(schema)],
    });

    field.setValue("a");
    expect(field.valid.get()).toBe(false);
    expect(field.issues.get()).toHaveLength(1);
    const issue = field.issues.get()[0];
    expect(issue?.code).toBe("schema.validation");
    expect(issue?.message).toBe("String must contain at least 3 character(s)");
    expect(issue?.path).toEqual(["name"]);
    expect(issue?.source).toBe("validation");
  });

  it("handles async standard schema with pending state transitions", async () => {
    const asyncSchema = createMockSchema<string>(async (val) => {
      await new Promise((r) => setTimeout(r, 20));
      if (val === "taken") {
        return {
          issues: [{ message: "Username is taken", path: ["username"] }],
        };
      }
      return { value: val };
    });

    const field = createField({
      initialValue: "available",
      rules: [standardSchema(asyncSchema)],
    });

    field.setValue("taken");
    expect(field.pending.get()).toBe(true);

    await new Promise((r) => setTimeout(r, 40));

    expect(field.pending.get()).toBe(false);
    expect(field.valid.get()).toBe(false);
    expect(field.issues.get()).toHaveLength(1);
  });

  describe("Fail-Closed Boundary Enforcement", () => {
    it("fails closed on non-object / null schema results", async () => {
      const invalidNullSchema = createMockSchema<string>(
        () => null as unknown as StandardSchemaV1.Result<string>,
      );
      const rule = standardSchema(invalidNullSchema);

      expect(() => rule("test", { trigger: "manual" })).toThrow(TypeError);
    });

    it("fails closed on non-array issues property (sync)", () => {
      const malformedIssuesSchema = createMockSchema<string>(
        () => ({ issues: "malformed-not-an-array" }) as unknown as StandardSchemaV1.Result<string>,
      );
      const rule = standardSchema(malformedIssuesSchema);

      expect(() => rule("test", { trigger: "manual" })).toThrow(TypeError);
    });

    it("fails closed on non-array issues property (async)", async () => {
      const malformedAsyncSchema = createMockSchema<string>(
        async () =>
          ({ issues: { 0: "not an array" } }) as unknown as StandardSchemaV1.Result<string>,
      );
      const rule = standardSchema(malformedAsyncSchema);

      await expect(
        rule("test", { trigger: "manual" }) as Promise<readonly FieldIssue[]>,
      ).rejects.toThrow(TypeError);
    });

    it("rejects non-standard-schema objects in standardSchema factory", () => {
      expect(() => standardSchema({} as unknown as StandardSchemaV1<unknown>)).toThrow(TypeError);
      expect(() => standardSchema(null as unknown as StandardSchemaV1<unknown>)).toThrow(TypeError);
      expect(() =>
        standardSchema({ "~standard": { version: 2 } } as unknown as StandardSchemaV1<unknown>),
      ).toThrow(TypeError);
    });
  });

  describe("Security & reserved issue codes as data", () => {
    it("accepts reserved strings as legitimate issue codes", () => {
      const protoIssue = normalizeStandardSchemaIssue({
        message: "Hostile issue",
        code: "__proto__",
      } as unknown as StandardSchemaV1.Issue);
      expect(protoIssue.code).toBe("__proto__");

      const ctorIssue = normalizeStandardSchemaIssue({
        message: "Hostile issue",
        code: "constructor",
      } as unknown as StandardSchemaV1.Issue);
      expect(ctorIssue.code).toBe("constructor");
    });

    it("accepts reserved property names in issue paths as pure data", () => {
      const issue = normalizeStandardSchemaIssue({
        message: "Error on constructor field",
        path: ["user", "constructor", { key: "prototype" }, "__proto__"],
      } as unknown as StandardSchemaV1.Issue);

      expect(issue.path).toEqual(["user", "constructor", "prototype", "__proto__"]);
      expect(issue.source).toBe("validation");

      // Verify Object.prototype is unpolluted
      expect((Object.prototype as unknown as Record<string, unknown>)["constructor"]).toBe(Object);
    });
  });
});
