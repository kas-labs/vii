import { describe, expect, it } from "vitest";
import { SchemaError, v } from "./index.js";

describe("S1: Schema Validation Baseline", () => {
  describe("Primitives", () => {
    it("validates string and its constraints", () => {
      const schema = v.string().min(3).max(10);
      expect(schema.check("hello").ok).toBe(true);
      expect(schema.check("hi").ok).toBe(false);
      expect(schema.check("superlongstring").ok).toBe(false);
      expect(schema.check(123).ok).toBe(false);
    });

    it("validates email and regex patterns", () => {
      const emailSchema = v.string().email();
      expect(emailSchema.check("test@example.com").ok).toBe(true);
      expect(emailSchema.check("invalid-email").ok).toBe(false);

      const regexSchema = v.string().regex(/^[A-Z]{3}$/);
      expect(regexSchema.check("ABC").ok).toBe(true);
      expect(regexSchema.check("abc").ok).toBe(false);
    });

    it("validates number constraints (min, max, int, finite)", () => {
      const schema = v.number().min(0).max(100).int();
      expect(schema.check(42).ok).toBe(true);
      expect(schema.check(-1).ok).toBe(false);
      expect(schema.check(101).ok).toBe(false);
      expect(schema.check(3.14).ok).toBe(false);
      expect(schema.check(Infinity).ok).toBe(false);
      expect(schema.check(NaN).ok).toBe(false);
      expect(schema.check("42").ok).toBe(false);
    });

    it("validates boolean, literal, null, undefined, unknown", () => {
      expect(v.boolean().check(true).ok).toBe(true);
      expect(v.boolean().check(false).ok).toBe(true);
      expect(v.boolean().check("true").ok).toBe(false);

      expect(v.literal("admin").check("admin").ok).toBe(true);
      expect(v.literal("admin").check("user").ok).toBe(false);

      expect(v.null().check(null).ok).toBe(true);
      expect(v.null().check(undefined).ok).toBe(false);

      expect(v.undefined().check(undefined).ok).toBe(true);
      expect(v.undefined().check(null).ok).toBe(false);

      expect(v.unknown().check("any").ok).toBe(true);
      expect(v.unknown().check(123).ok).toBe(true);
    });
  });

  describe("Modifiers", () => {
    it("handles optional and nullable", () => {
      const optStr = v.string().optional();
      expect(optStr.check("hello").ok).toBe(true);
      expect(optStr.check(undefined).ok).toBe(true);
      expect(optStr.check(null).ok).toBe(false);

      const nullNum = v.number().nullable();
      expect(nullNum.check(42).ok).toBe(true);
      expect(nullNum.check(null).ok).toBe(true);
      expect(nullNum.check(undefined).ok).toBe(false);
    });

    it("handles custom refinements", () => {
      const evenNumber = v.number().refine((n) => n % 2 === 0, {
        code: "must_be_even",
        message: "Number must be even",
      });

      expect(evenNumber.check(4).ok).toBe(true);
      const invalid = evenNumber.check(5);
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(invalid.issues[0]!.code).toBe("must_be_even");
      }
    });
  });

  describe("Structures", () => {
    it("validates object schemas with path tracking", () => {
      const userSchema = v.object({
        id: v.string(),
        age: v.number().min(18),
        address: v.object({
          city: v.string(),
          zip: v.string().min(5),
        }),
      });

      const validUser = {
        id: "usr_1",
        age: 25,
        address: {
          city: "Berlin",
          zip: "10115",
        },
      };

      expect(userSchema.check(validUser).ok).toBe(true);

      const invalidUser = {
        id: "usr_2",
        age: 16,
        address: {
          city: "Berlin",
          zip: "123", // too short
        },
      };

      const result = userSchema.check(invalidUser);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.length).toBe(2);
        expect(result.issues[0]!.path).toEqual(["age"]);
        expect(result.issues[1]!.path).toEqual(["address", "zip"]);
      }
    });

    it("validates array schemas with element index path", () => {
      const tagList = v.array(v.string().min(2));
      expect(tagList.check(["react", "vue", "angular"]).ok).toBe(true);

      const invalidTags = tagList.check(["a", "valid", "b"]);
      expect(invalidTags.ok).toBe(false);
      if (!invalidTags.ok) {
        expect(invalidTags.issues.length).toBe(2);
        expect(invalidTags.issues[0]!.path).toEqual([0]);
        expect(invalidTags.issues[1]!.path).toEqual([2]);
      }
    });

    it("validates unions", () => {
      const stringOrNumber = v.union(v.string(), v.number());
      expect(stringOrNumber.check("test").ok).toBe(true);
      expect(stringOrNumber.check(42).ok).toBe(true);
      expect(stringOrNumber.check(true).ok).toBe(false);
    });
  });

  describe("Throwing Convenience: parse()", () => {
    it("returns value on success and throws SchemaError on failure", () => {
      const schema = v.string().min(3);
      expect(schema.parse("valid")).toBe("valid");

      expect(() => schema.parse("no")).toThrow(SchemaError);
      try {
        schema.parse(123);
      } catch (err: any) {
        expect(err).toBeInstanceOf(SchemaError);
        expect(err.issues[0].code).toBe("invalid_type");
      }
    });
  });
});
