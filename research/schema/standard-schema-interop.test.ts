import { type } from "arktype";
import * as valibot from "valibot";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toStandardSchema, v, validateStandardSchema } from "./index.js";

describe("S6 / S7: Real Standard Schema v1 Cross-Ecosystem Interoperability", () => {
  const validUser = {
    id: "usr_100",
    name: "Alex",
    age: 28,
  };

  const invalidUser = {
    id: "usr_100",
    name: "A", // too short
    age: -5, // negative
  };

  describe("Zod 4 Standard Schema Compliance", () => {
    const zodSchema = z.object({
      id: z.string(),
      name: z.string().min(2),
      age: z.number().min(0),
    });

    it("validates through generic Vii Standard Schema consumer on valid input", async () => {
      const res = await validateStandardSchema(zodSchema as any, validUser);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual(validUser);
      }
    });

    it("rejects invalid input with structured Standard Schema issues", async () => {
      const res = await validateStandardSchema(zodSchema as any, invalidUser);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Valibot Standard Schema Compliance", () => {
    const valibotSchema = valibot.object({
      id: valibot.string(),
      name: valibot.pipe(valibot.string(), valibot.minLength(2)),
      age: valibot.pipe(valibot.number(), valibot.minValue(0)),
    });

    it("validates through generic Vii Standard Schema consumer on valid input", async () => {
      const res = await validateStandardSchema(valibotSchema as any, validUser);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual(validUser);
      }
    });

    it("rejects invalid input with structured Standard Schema issues", async () => {
      const res = await validateStandardSchema(valibotSchema as any, invalidUser);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("ArkType Standard Schema Compliance", () => {
    const arkSchema = type({
      id: "string",
      name: "string >= 2",
      age: "number >= 0",
    });

    it("validates through generic Vii Standard Schema consumer on valid input", async () => {
      const res = await validateStandardSchema(arkSchema as any, validUser);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual(validUser);
      }
    });

    it("rejects invalid input with structured Standard Schema issues", async () => {
      const res = await validateStandardSchema(arkSchema as any, invalidUser);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Vii Prototype Standard Schema Compliance", () => {
    const viiSchema = toStandardSchema(
      v.object({
        id: v.string(),
        name: v.string().min(2),
        age: v.number().min(0),
      }),
    );

    it("validates through generic Vii Standard Schema consumer on valid input", async () => {
      const res = await validateStandardSchema(viiSchema, validUser);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual(validUser);
      }
    });

    it("rejects invalid input with structured Standard Schema issues", async () => {
      const res = await validateStandardSchema(viiSchema, invalidUser);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
