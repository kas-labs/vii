import { describe, expect, it } from "vitest";
import canonicalTokens from "../tokens/fixtures/tokens.canonical.json" with { type: "json" };
import { generateCss } from "../tokens/token-generator.js";
import { resolveTokenGraph } from "../tokens/token-resolver.js";
import { createSafeStylesheet, evaluateCspSafety } from "./csp-compliance.js";
import { evaluateDomBoundary } from "./dom-boundary.js";

describe("Security Hardening & Distribution Mode Consolidation (P6.6)", () => {
  describe("CSP & Trusted Types Compliance", () => {
    it("verifies safe component payloads pass CSP evaluation", () => {
      const safeCode = `
        export function Button(props) {
          const btn = document.createElement('button');
          btn.textContent = props.label;
          btn.setAttribute('type', props.type || 'button');
          return btn;
        }
      `;
      const report = evaluateCspSafety(safeCode);
      expect(report.isSafe).toBe(true);
      expect(report.violations).toHaveLength(0);
    });

    it("detects and rejects unsafe CSP execution patterns", () => {
      const unsafeCode = `
        const fn = new Function('return 42');
        eval('console.log("unsafe")');
        element.innerHTML = '<script>alert(1)</script>';
        element.outerHTML = '<div onclick="bad()"></div>';
        const link = 'javascript:exploit()';
      `;
      const report = evaluateCspSafety(unsafeCode);
      expect(report.isSafe).toBe(false);
      expect(report.violations).toHaveLength(5);
    });

    it("verifies generated token CSS is strictly CSP compliant", () => {
      const graph = resolveTokenGraph(canonicalTokens as any);
      const generatedCss = generateCss(graph);

      const report = evaluateCspSafety(generatedCss);
      expect(report.isSafe).toBe(true);

      const stylesheet = createSafeStylesheet(generatedCss);
      expect(stylesheet.type).toBe("stylesheet");
      expect(stylesheet.css).toContain("--vii-color-primary:");
    });
  });

  describe("Custom Elements DOM Boundary Decision", () => {
    it("selects Light DOM for components requiring cross-root ARIA relationships", () => {
      const disclosure = evaluateDomBoundary(["aria-controls", "aria-expanded"]);
      expect(disclosure.boundary).toBe("light-dom");
      expect(disclosure.reasons[0]).toContain("Cross-element ARIA attributes");

      const dialog = evaluateDomBoundary(["focus-trap", "dialog-modal"]);
      expect(dialog.boundary).toBe("light-dom");

      const tabs = evaluateDomBoundary(["aria-controls", "aria-labelledby"]);
      expect(tabs.boundary).toBe("light-dom");
    });

    it("selects Light DOM for form-associated inputs", () => {
      const formInput = evaluateDomBoundary([], true);
      expect(formInput.boundary).toBe("light-dom");
      expect(formInput.reasons[0]).toContain("Form-associated elements");
    });

    it("selects Shadow DOM for self-contained visual widgets without external ARIA", () => {
      const avatar = evaluateDomBoundary(["visual-only"], false);
      expect(avatar.boundary).toBe("shadow-dom");
      expect(avatar.reasons[0]).toContain("Self-contained visual component");
    });
  });
});
