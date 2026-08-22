import { describe, expect, it } from "vitest";
import { createFormErrors, jsonCodec, toStandardSchema, urlSearchParamsCodec, v } from "./index.js";

describe("S6: Integration Contract Fixtures (Form / HTTP / Query)", () => {
  describe("Vii Form Integration Fixture", () => {
    const registrationFormSchema = v.object({
      username: v.string().min(3),
      email: v.string().email(),
      password: v.string().min(8),
      acceptTerms: v.literal(true),
    });

    it("supports single-field validation on change/blur", () => {
      const emailFieldSchema = registrationFormSchema.shape.email;

      const validEmailRes = emailFieldSchema.check("test@kas-labs.com");
      expect(validEmailRes.ok).toBe(true);

      const invalidEmailRes = emailFieldSchema.check("not-an-email");
      expect(invalidEmailRes.ok).toBe(false);
      if (!invalidEmailRes.ok) {
        expect(invalidEmailRes.issues[0]!.code).toBe("invalid_email");
      }
    });

    it("supports full-form validation on submit and produces form errors map", () => {
      const invalidFormData = {
        username: "ab", // too short (< 3)
        email: "invalid-email",
        password: "pass", // too short (< 8)
        acceptTerms: false as any,
      };

      const result = registrationFormSchema.check(invalidFormData);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const formErrors = createFormErrors(result.issues);
        expect(formErrors["username"]).toBeDefined();
        expect(formErrors["email"]).toBeDefined();
        expect(formErrors["password"]).toBeDefined();
        expect(formErrors["acceptTerms"]).toBeDefined();
      }
    });

    it("returns zero-copy validated payload on valid form submit", () => {
      const validFormData = {
        username: "developer",
        email: "dev@vii.dev",
        password: "supersecretpass",
        acceptTerms: true as const,
      };

      const result = registrationFormSchema.check(validFormData);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(validFormData); // Zero-copy identity preserved
      }
    });
  });

  describe("Vii HTTP Client & Transport Integration Fixture", () => {
    const listParamsCodec = urlSearchParamsCodec({
      page: v.number().min(1),
      search: v.string(),
      status: v.union(v.literal("active"), v.literal("archived")),
    });

    const userProfileSchema = v.object({
      id: v.string(),
      username: v.string(),
      role: v.union(v.literal("admin"), v.literal("member")),
      meta: v.object({
        createdAt: v.string(),
        loginCount: v.number(),
      }),
    });

    const profileJsonCodec = jsonCodec(userProfileSchema);

    it("serializes and deserializes HTTP query parameters cleanly", () => {
      const queryStr = "page=2&search=sdk&status=active";
      const decodeRes = listParamsCodec.decode(queryStr);

      expect(decodeRes.ok).toBe(true);
      if (decodeRes.ok) {
        expect(decodeRes.value).toEqual({
          page: 2,
          search: "sdk",
          status: "active",
        });

        const reEncoded = listParamsCodec.encode(decodeRes.value);
        expect(reEncoded.includes("page=2")).toBe(true);
        expect(reEncoded.includes("status=active")).toBe(true);
      }
    });

    it("decodes and validates HTTP JSON response payload fail-closed", () => {
      const validHttpResponse = JSON.stringify({
        id: "usr_42",
        username: "maintainer",
        role: "admin",
        meta: {
          createdAt: "2026-08-22T12:00:00Z",
          loginCount: 15,
        },
      });

      const result = profileJsonCodec.decode(validHttpResponse);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("usr_42");
        expect(result.value.role).toBe("admin");
      }

      const invalidHttpResponse = JSON.stringify({
        id: "usr_42",
        username: "maintainer",
        role: "superadmin", // invalid union branch
        meta: { createdAt: "2026-08-22T12:00:00Z", loginCount: "nan" },
      });

      const invalidResult = profileJsonCodec.decode(invalidHttpResponse);
      expect(invalidResult.ok).toBe(false);
      if (!invalidResult.ok) {
        expect(invalidResult.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Vii Query / Hydration Integration Fixture", () => {
    const cacheEntrySchema = v.object({
      queryKey: v.string(),
      data: v.object({
        id: v.string(),
        title: v.string(),
        completed: v.boolean(),
      }),
      updatedAt: v.number(),
    });

    it("safely hydrates cache state and discards corrupted or tampered entries", () => {
      const rawDehydratedEntries = [
        {
          queryKey: "todo:1",
          data: { id: "1", title: "Learn Vii", completed: true },
          updatedAt: 1724340000,
        },
        // Tampered entry with prototype pollution attempt (parsed from untrusted JSON transport)
        JSON.parse(
          '{"queryKey":"todo:2","__proto__":{"injected":true},"data":{"id":"2","title":"Hack","completed":false},"updatedAt":1724340000}',
        ),
        {
          // Corrupted entry with wrong data types
          queryKey: "todo:3",
          data: { id: "3", title: 12345 as any, completed: "yes" as any },
          updatedAt: "invalid-time" as any,
        },
      ];

      const hydratedCache = new Map<string, any>();

      for (const entry of rawDehydratedEntries) {
        const checkRes = cacheEntrySchema.check(entry);
        if (checkRes.ok) {
          hydratedCache.set(checkRes.value.queryKey, checkRes.value.data);
        }
      }

      // Only clean untampered entry "todo:1" must be restored
      expect(hydratedCache.size).toBe(1);
      expect(hydratedCache.has("todo:1")).toBe(true);
      expect(hydratedCache.get("todo:1")).toEqual({
        id: "1",
        title: "Learn Vii",
        completed: true,
      });
      expect(hydratedCache.has("todo:2")).toBe(false);
      expect(hydratedCache.has("todo:3")).toBe(false);
    });
  });

  describe("Standard Schema v1 Interoperability", () => {
    it("conforms to Standard Schema v1 specification", async () => {
      const userSchema = v.object({
        id: v.string(),
        age: v.number().min(18),
      });

      const standardSchema = toStandardSchema(userSchema);

      expect(standardSchema["~standard"].version).toBe(1);
      expect(standardSchema["~standard"].vendor).toBe("vii");

      // Valid input
      const validResult = await standardSchema["~standard"].validate({
        id: "usr_1",
        age: 25,
      });
      expect(validResult.value).toEqual({ id: "usr_1", age: 25 });
      expect(validResult.issues).toBeUndefined();

      // Invalid input
      const invalidResult = await standardSchema["~standard"].validate({
        id: "usr_1",
        age: 15,
      });
      expect(invalidResult.value).toBeUndefined();
      expect(invalidResult.issues).toBeDefined();
      expect(invalidResult.issues![0]!.path).toEqual(["age"]);
    });
  });
});
