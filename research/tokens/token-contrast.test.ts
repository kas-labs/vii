import { describe, expect, it } from "vitest";
import canonicalDoc from "./fixtures/tokens.canonical.json" with { type: "json" };
import darkDoc from "./fixtures/theme.dark.json" with { type: "json" };
import {
  auditGraphContrast,
  calculateContrastRatio,
  calculateRelativeLuminance,
  evaluateContrast,
  type ContrastRequirement,
  type WCAGCriterion,
} from "./contrast-evaluator.js";
import type { DTCGColorValue, DTCGDocument } from "./dtcg-types.js";
import { resolveTokenGraph } from "./token-resolver.js";

describe("WCAG Contrast Evaluator", () => {
  const white: DTCGColorValue = { colorSpace: "srgb", components: [1, 1, 1] };
  const black: DTCGColorValue = { colorSpace: "srgb", components: [0, 0, 0] };

  it("calculates theoretical boundary luminance and ratios", () => {
    expect(calculateRelativeLuminance(white)).toBeCloseTo(1.0, 4);
    expect(calculateRelativeLuminance(black)).toBeCloseTo(0.0, 4);

    const maxRatio = calculateContrastRatio(white, black);
    expect(maxRatio).toBe(21.0);

    const minRatio = calculateContrastRatio(white, white);
    expect(minRatio).toBe(1.0);
  });

  it("evaluates explicit WCAG criteria distinctions on light canonical tokens", () => {
    const graph = resolveTokenGraph(canonicalDoc as DTCGDocument);

    const requirements: ContrastRequirement[] = [
      {
        name: "Body text on default background",
        foregroundToken: "color.foreground",
        backgroundToken: "color.background",
        targetCriterion: "WCAG_1_4_6_AAA_NORMAL",
        contextDescription: "Normal paragraph text (16px) requires 7.0:1 for AAA",
      },
      {
        name: "Muted text on default background",
        foregroundToken: "color.mutedForeground",
        backgroundToken: "color.background",
        targetCriterion: "WCAG_1_4_3_AA_NORMAL",
        contextDescription: "Secondary labels require 4.5:1 for AA",
      },
      {
        name: "Primary button label on primary button background",
        foregroundToken: "color.primaryForeground",
        backgroundToken: "color.primary",
        targetCriterion: "WCAG_1_4_3_AA_NORMAL",
        contextDescription: "Button text requires 4.5:1 for AA",
      },
      {
        name: "Focus indicator against background",
        foregroundToken: "focus.ring",
        backgroundToken: "color.background",
        targetCriterion: "FOCUS_RING_ADJACENT",
        contextDescription: "Focus ring against adjacent canvas requires 3.0:1",
      },
    ];

    const audit = auditGraphContrast(graph, requirements);
    expect(audit.allPassed).toBe(true);
    expect(audit.violations).toHaveLength(0);

    // Verify detailed results
    const bodyText = audit.results[0];
    expect(bodyText).toBeDefined();
    expect(bodyText!.evaluation.ratio).toBeGreaterThanOrEqual(18.0);
    expect(bodyText!.evaluation.passes.WCAG_1_4_6_AAA_NORMAL).toBe(true);
  });

  it("evaluates dark theme contrast requirements across semantic pairs", () => {
    // Merge canonical base with dark overrides
    const mergedDark = {
      ...canonicalDoc,
      ...darkDoc,
      color: {
        ...(canonicalDoc as any).color,
        ...(darkDoc as any).color,
      },
    };

    const graph = resolveTokenGraph(mergedDark as DTCGDocument);

    const requirements: ContrastRequirement[] = [
      {
        name: "Dark body text on dark canvas",
        foregroundToken: "color.foreground",
        backgroundToken: "color.background",
        targetCriterion: "WCAG_1_4_6_AAA_NORMAL",
        contextDescription: "Normal text on dark background",
      },
      {
        name: "Dark muted text on dark canvas",
        foregroundToken: "color.mutedForeground",
        backgroundToken: "color.background",
        targetCriterion: "WCAG_1_4_3_AA_NORMAL",
        contextDescription: "Muted text on dark background",
      },
    ];

    const audit = auditGraphContrast(graph, requirements);
    expect(audit.allPassed).toBe(true);
  });

  it("fails deterministically with actionable details when a contrast criterion is violated", () => {
    const lowContrastFg: DTCGColorValue = {
      colorSpace: "srgb",
      components: [0.8, 0.8, 0.8], // Light gray
    };
    const evaluation = evaluateContrast(
      lowContrastFg,
      white,
      "color.faintText",
      "color.background",
    );

    expect(evaluation.ratio).toBeLessThan(4.5);
    expect(evaluation.passes.WCAG_1_4_3_AA_NORMAL).toBe(false);
    expect(evaluation.passes.WCAG_1_4_6_AAA_NORMAL).toBe(false);
  });
});
