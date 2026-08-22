import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
  auditCSPCompliance,
  createValidationContext,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_PROPERTIES,
  v,
} from "./index.js";

describe("S4: Security, CSP & Complexity Consolidation", () => {
  describe("ReDoS (Catastrophic Backtracking) Defense", () => {
    it("safely limits regex input length to prevent catastrophic ReDoS", () => {
      // Dynamic pattern for ReDoS defense verification (crafted input defense)
      const evilRegex = new RegExp("^" + "(a+)+" + "$");
      const schema = v.string().regex(evilRegex);

      // Normal input
      expect(schema.check("aaaa").ok).toBe(true);

      // Oversized crafted attack string (length > MAX_REGEX_INPUT_LENGTH)
      const oversizedAttack = "a".repeat(1005) + "!";
      const result = schema.check(oversizedAttack);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("invalid_format");
      }
    });
  });

  describe("Cyclic Object & Array Graph Detection", () => {
    it("fails closed on self-referential cyclic objects without call-stack crash", () => {
      const nodeSchema: any = v.object({
        name: v.string(),
        self: v.object({ name: v.string() }),
      });

      const cyclicObj: any = { name: "cycle" };
      cyclicObj.self = cyclicObj;

      const result = nodeSchema.check(cyclicObj);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i: any) => i.code === "cyclic_reference")).toBe(true);
      }
    });

    it("fails closed on cyclic arrays without infinite loops", () => {
      const listSchema = v.array(v.array(v.unknown()));
      const cyclicArray: any[] = [];
      cyclicArray.push(cyclicArray);

      const result = listSchema.check(cyclicArray);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i) => i.code === "cyclic_reference")).toBe(true);
      }
    });
  });

  describe("Nesting Depth & Property Limits", () => {
    it("fails closed when nesting depth exceeds maximum limit", () => {
      // Build a schema and object with depth > DEFAULT_MAX_DEPTH (32)
      let currentSchema: any = v.object({ val: v.number() });
      for (let i = 0; i < DEFAULT_MAX_DEPTH + 2; i++) {
        currentSchema = v.object({ child: currentSchema });
      }

      let currentObj: any = { val: 42 };
      for (let i = 0; i < DEFAULT_MAX_DEPTH + 2; i++) {
        currentObj = { child: currentObj };
      }

      const result = currentSchema.check(currentObj);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i: any) => i.code === "max_depth_exceeded")).toBe(true);
      }
    });

    it("fails closed on objects with excessively wide property counts", () => {
      const schema = v.object({
        validKey: v.string(),
      });

      const wideObj: Record<string, any> = { validKey: "ok" };
      for (let i = 0; i < DEFAULT_MAX_PROPERTIES + 10; i++) {
        wideObj[`prop_${i}`] = i;
      }

      const result = schema.check(wideObj);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("too_many_properties");
      }
    });
  });

  describe("CSP Compliance & Zero Dynamic Code Generation", () => {
    it("verifies that all schema prototype source files comply with strict CSP (zero eval/new Function)", () => {
      const schemaDir = path.resolve(__dirname, ".");
      const files = [
        "index.ts",
        "primitives.ts",
        "structures.ts",
        "types.ts",
        "issues.ts",
        "codec.ts",
        "security.ts",
      ];

      for (const file of files) {
        const fullPath = path.join(schemaDir, file);
        const source = readFileSync(fullPath, "utf8");
        const audit = auditCSPCompliance(source);
        expect(
          audit.compliant,
          `CSP audit failed for ${file}: ${audit.violations.join(", ")}`,
        ).toBe(true);
      }
    });
  });
});
