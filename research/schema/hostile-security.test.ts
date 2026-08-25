import { describe, expect, it } from "vitest";
import { v } from "./index.js";

describe("S1: Hostile Input & Security Baselines", () => {
  describe("Prototype Pollution Defense", () => {
    it("fails closed on __proto__ property injection in objects", () => {
      const schema = v.object({
        name: v.string(),
      });

      // Simulating JSON.parse('{"__proto__": {"polluted": true}, "name": "alice"}')
      const hostilePayload = JSON.parse('{"__proto__": {"polluted": true}, "name": "alice"}');

      const result = schema.check(hostilePayload);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i) => i.code === "forbidden_property")).toBe(true);
      }
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it("fails closed on constructor or prototype property injection", () => {
      const schema = v.object({
        role: v.string(),
      });

      const hostileConstructor = {
        constructor: { evil: true },
        role: "user",
      };

      const result = schema.check(hostileConstructor);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i) => i.code === "forbidden_property")).toBe(true);
      }
    });
  });

  describe("Getter and Proxy Traps", () => {
    it("safely handles throwing getters without crashing the validator", () => {
      const schema = v.object({
        secret: v.string(),
      });

      const hostileObject = {
        get secret() {
          throw new Error("Explosive getter trap");
        },
      };

      const result = schema.check(hostileObject);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i) => i.code === "unreadable_property")).toBe(true);
      }
    });

    it("safely handles throwing proxy traps", () => {
      const schema = v.object({
        title: v.string(),
      });

      const proxyTrap = new Proxy(
        {},
        {
          get() {
            throw new Error("Proxy get violation");
          },
        },
      );

      const result = schema.check(proxyTrap);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i) => i.code === "unreadable_property")).toBe(true);
      }
    });
  });

  describe("Deep Nesting Limits", () => {
    it("validates deep object structures cleanly", () => {
      const deepSchema = v.object({
        l1: v.object({
          l2: v.object({
            l3: v.object({
              val: v.number(),
            }),
          }),
        }),
      });

      const input = { l1: { l2: { l3: { val: 42 } } } };
      expect(deepSchema.check(input).ok).toBe(true);

      const invalidInput = { l1: { l2: { l3: { val: "nan" } } } };
      const res = deepSchema.check(invalidInput);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.issues[0]!.path).toEqual(["l1", "l2", "l3", "val"]);
      }
    });
  });
});

describe("Issue-helper hardening (audit regressions)", () => {
  it("createFormErrors and groupIssuesByPath survive hostile issue paths", async () => {
    const { createFormErrors, groupIssuesByPath } = await import("./issues.js");
    const schema = v.object({ name: v.string() });
    const hostilePayload = JSON.parse('{"__proto__": {"x": 1}, "constructor": 1, "name": 2}');
    const result = schema.check(hostilePayload);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const formErrors = createFormErrors(result.issues);
    expect(Array.isArray(formErrors["__proto__"])).toBe(true);
    expect(Array.isArray(formErrors["constructor"])).toBe(true);

    const grouped = groupIssuesByPath(result.issues);
    expect(Array.isArray(grouped["__proto__"])).toBe(true);
    expect({} as Record<string, unknown>).not.toHaveProperty("x");
  });

  it("rejects arrays exceeding the element-count complexity limit", () => {
    const schema = v.array(v.number());
    const oversized = new Array<number>(10_001).fill(1);
    const result = schema.check(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.code).toBe("too_many_items");
    }
    expect(schema.check([1, 2, 3]).ok).toBe(true);
  });
});
