import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Form Research F9: Bundle Footprint, Tree-Shaking, Framework & Provider Isolation", () => {
  // ---------------------------------------------------------------------------
  // 1. SSR & Node Import Safety
  // ---------------------------------------------------------------------------
  describe("SSR / Node Runtime Import Safety", () => {
    it("imports framework-neutral form core, parser, submission, standard-schema in Node without DOM globals", async () => {
      // Ensure running under Node without throwing
      const formCore = await import("./form-core.js");
      const parser = await import("./parser.js");
      const submission = await import("./submission.js");
      const standardSchema = await import("./standard-schema.js");

      expect(typeof formCore.createForm).toBe("function");
      expect(typeof parser.createNumberParser).toBe("function");
      expect(typeof submission.deepCloneSnapshot).toBe("function");
      expect(typeof standardSchema.standardSchema).toBe("function");

      // Verify basic instantiation without window or document
      const form = formCore.createForm({ initialValues: { a: 1 } });
      expect(form.values.get()).toEqual({ a: 1 });
      form.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Framework & Provider Isolation in Code Topology
  // ---------------------------------------------------------------------------
  describe("Static Architectural Isolation Audit", () => {
    const researchDir = resolve(process.cwd(), "research/form");

    it("verifies form-core.ts does NOT import React, Angular, Vue, Zod, Valibot, ArkType", () => {
      const content = readFileSync(resolve(researchDir, "form-core.ts"), "utf-8");

      expect(content).not.toMatch(/from\s+["']react["']/);
      expect(content).not.toMatch(/from\s+["']@angular/);
      expect(content).not.toMatch(/from\s+["']vue["']/);
      expect(content).not.toMatch(/from\s+["']zod["']/);
      expect(content).not.toMatch(/from\s+["']valibot["']/);
      expect(content).not.toMatch(/from\s+["']arktype["']/);
    });

    it("verifies adapters/vanilla.ts does NOT import React, Angular, Vue", () => {
      const content = readFileSync(resolve(researchDir, "adapters/vanilla.ts"), "utf-8");
      expect(content).not.toMatch(/from\s+["']react["']/);
      expect(content).not.toMatch(/from\s+["']@angular/);
      expect(content).not.toMatch(/from\s+["']vue["']/);
    });

    it("verifies adapters/react.ts does NOT import Angular or Vue", () => {
      const content = readFileSync(resolve(researchDir, "adapters/react.ts"), "utf-8");
      expect(content).not.toMatch(/from\s+["']@angular/);
      expect(content).not.toMatch(/from\s+["']vue["']/);
    });

    it("verifies adapters/angular.ts does NOT import React or Vue", () => {
      const content = readFileSync(resolve(researchDir, "adapters/angular.ts"), "utf-8");
      expect(content).not.toMatch(/from\s+["']react["']/);
      expect(content).not.toMatch(/from\s+["']vue["']/);
    });

    it("verifies adapters/vue.ts does NOT import React or Angular", () => {
      const content = readFileSync(resolve(researchDir, "adapters/vue.ts"), "utf-8");
      expect(content).not.toMatch(/from\s+["']react["']/);
      expect(content).not.toMatch(/from\s+["']@angular/);
    });

    it("verifies standard-schema.ts does NOT import concrete providers (Zod, Valibot, ArkType)", () => {
      const content = readFileSync(resolve(researchDir, "standard-schema.ts"), "utf-8");
      expect(content).not.toMatch(/from\s+["']zod["']/);
      expect(content).not.toMatch(/from\s+["']valibot["']/);
      expect(content).not.toMatch(/from\s+["']arktype["']/);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Browser Global Usage Audit
  // ---------------------------------------------------------------------------
  describe("Browser Global Audit in Framework-Neutral Modules", () => {
    const researchDir = resolve(process.cwd(), "research/form");

    it("ensures form-core.ts, parser.ts, submission.ts, standard-schema.ts do NOT access window or document at module top level", () => {
      const neutralFiles = ["form-core.ts", "parser.ts", "submission.ts", "standard-schema.ts"];

      for (const file of neutralFiles) {
        const content = readFileSync(resolve(researchDir, file), "utf-8");
        // Check for unchecked top-level window/document usage
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
          if (
            line.includes("window.") ||
            line.includes("document.") ||
            line.includes("HTMLElement")
          ) {
            // If present, verify it's inside type definition or guard
            const isTypeOrGuarded =
              line.includes("typeof window") ||
              line.includes("typeof document") ||
              line.includes("type ") ||
              line.includes("interface ") ||
              line.includes("//");
            expect(isTypeOrGuarded).toBe(true);
          }
        }
      }
    });
  });
});
