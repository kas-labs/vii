import { describe, expect, it } from "vitest";
import canonicalDoc from "./fixtures/tokens.canonical.json" with { type: "json" };
import darkDoc from "./fixtures/theme.dark.json" with { type: "json" };
import type { DTCGDocument } from "./dtcg-types.js";
import {
  formatTokenValueToCss,
  generateCss,
  generateJsonManifest,
  generateTypeScript,
} from "./token-generator.js";
import { resolveTokenGraph } from "./token-resolver.js";

describe("DTCG Token Generator", () => {
  const graph = resolveTokenGraph(canonicalDoc as DTCGDocument);

  it("formats various token types into CSS-compatible representations", () => {
    expect(formatTokenValueToCss({ value: 16, unit: "px" })).toBe("16px");
    expect(formatTokenValueToCss({ value: 200, unit: "ms" })).toBe("200ms");
    expect(formatTokenValueToCss([0.4, 0, 0.2, 1])).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(
      formatTokenValueToCss({
        colorSpace: "srgb",
        components: [1, 1, 1],
        alpha: 1,
      }),
    ).toBe("rgb(255 255 255)");
    expect(
      formatTokenValueToCss({
        colorSpace: "display-p3",
        components: [0.5, 0.4, 0.9],
        alpha: 0.8,
      }),
    ).toBe("color(display-p3 0.5 0.4 0.9 / 0.8)");
  });

  it("generates deterministic, byte-stable CSS output across multiple runs", () => {
    const css1 = generateCss(graph);
    const css2 = generateCss(graph);
    expect(css1).toBe(css2);
    expect(css1).toContain(":root {");
    expect(css1).toContain("--vii-color-primary:");
    expect(css1).toContain("--vii-space-4: 1rem;");
    expect(css1).toContain("--vii-motion-duration-fast: 150ms;");
  });

  it("supports generating CSS preserving alias references as var()", () => {
    const cssWithVars = generateCss(graph, { preserveAliases: true });
    expect(cssWithVars).toContain("--vii-color-background: var(--vii-color-white);");
    expect(cssWithVars).toContain("--vii-color-primary: var(--vii-color-violet-600);");
    expect(cssWithVars).toContain("--vii-button-height-md: var(--vii-space-8);");
  });

  it("generates scoped theme CSS blocks for dark mode", () => {
    const mergedDark = {
      ...canonicalDoc,
      ...darkDoc,
      color: {
        ...(canonicalDoc as any).color,
        ...(darkDoc as any).color,
      },
    };
    const darkGraph = resolveTokenGraph(mergedDark as DTCGDocument);
    const darkCss = generateCss(darkGraph, { selector: '[data-theme="dark"]' });

    expect(darkCss).toContain('[data-theme="dark"] {');
    expect(darkCss).toContain("--vii-color-background: rgb(3 7 15);"); // gray-950
  });

  it("generates valid TypeScript output with token maps and type definitions", () => {
    const tsOutput = generateTypeScript(graph);
    expect(tsOutput).toContain("export const TOKENS = {");
    expect(tsOutput).toContain("export const CSS_VARIABLES = {");
    expect(tsOutput).toContain("export type TokenName = keyof typeof TOKENS;");
    expect(tsOutput).toContain('"color.primary":');
  });

  it("generates a machine-readable JSON manifest for tooling", () => {
    const jsonOutput = generateJsonManifest(graph);
    const parsed = JSON.parse(jsonOutput);
    expect(parsed["color.primary"]).toBeDefined();
    expect(parsed["color.primary"].cssVariable).toBe("--vii-color-primary");
    expect(parsed["color.primary"].type).toBe("color");
  });
});

describe("Generator injection hardening (audit regressions)", () => {
  it("escapes hostile token names in generated TypeScript", () => {
    const hostileDoc = {
      group: {
        'x": 0} as const; export const pwned = 1; //': {
          $type: "dimension",
          $value: { value: 4, unit: "px" },
        },
      },
    };
    const graph = resolveTokenGraph(hostileDoc as unknown as DTCGDocument);
    const ts = generateTypeScript(graph);

    // The hostile name must stay inside an escaped string literal: exactly the
    // two intended top-level bindings, no injected statements.
    expect(ts.match(/^export const /gm)).toHaveLength(2);
    expect(ts).toContain('\\"');
  });

  it("refuses to emit CSS when a string token value contains braces", () => {
    const hostileDoc = {
      danger: {
        breakout: {
          $type: "fontFamily",
          $value: "serif;} body{background:url(//evil.example)} .x{",
        },
      },
    };
    const graph = resolveTokenGraph(hostileDoc as unknown as DTCGDocument);

    expect(() => generateCss(graph)).toThrow(/braces/);
  });
});
