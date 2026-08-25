import type { DTCGColorValue, TokenGraph } from "./dtcg-types.js";

export type WCAGCriterion =
  | "WCAG_1_4_3_AA_NORMAL"
  | "WCAG_1_4_3_AA_LARGE"
  | "WCAG_1_4_6_AAA_NORMAL"
  | "WCAG_1_4_6_AAA_LARGE"
  | "WCAG_1_4_11_NON_TEXT"
  | "FOCUS_RING_ADJACENT";

export const WCAG_THRESHOLDS: Readonly<Record<WCAGCriterion, number>> = {
  WCAG_1_4_3_AA_NORMAL: 4.5,
  WCAG_1_4_3_AA_LARGE: 3.0,
  WCAG_1_4_6_AAA_NORMAL: 7.0,
  WCAG_1_4_6_AAA_LARGE: 4.5,
  WCAG_1_4_11_NON_TEXT: 3.0,
  FOCUS_RING_ADJACENT: 3.0,
};

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  fgLuminance: number;
  bgLuminance: number;
  passes: Record<WCAGCriterion, boolean>;
}

export interface ContrastRequirement {
  name: string;
  foregroundToken: string;
  backgroundToken: string;
  targetCriterion: WCAGCriterion;
  contextDescription: string;
}

export function srgbChannelToLinear(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.04045 ? clamped / 12.92 : Math.pow((clamped + 0.055) / 1.055, 2.4);
}

export function calculateRelativeLuminance(color: DTCGColorValue): number {
  if (color.colorSpace === "srgb") {
    const [r, g, b] = color.components;
    const rLin = srgbChannelToLinear(r);
    const gLin = srgbChannelToLinear(g);
    const bLin = srgbChannelToLinear(b);
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  if (color.colorSpace === "display-p3") {
    // Standard conversion matrix Display P3 -> Linear sRGB (D65)
    const [r, g, b] = color.components;
    const rLin = srgbChannelToLinear(r);
    const gLin = srgbChannelToLinear(g);
    const bLin = srgbChannelToLinear(b);
    const rSrgb = 1.2249 * rLin - 0.2247 * gLin + 0.0;
    const gSrgb = -0.042 * rLin + 1.0419 * gLin + 0.0;
    const bSrgb = -0.0197 * rLin - 0.0786 * gLin + 1.0979 * bLin;
    return Math.max(0, Math.min(1, 0.2126 * rSrgb + 0.7152 * gSrgb + 0.0722 * bSrgb));
  }

  // Fallback for custom spaces: normalize components
  const [r, g, b] = color.components;
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/**
 * Alpha-composites a translucent foreground over an opaque background in the
 * token's own (gamma-encoded) space, matching how CSS composites colors.
 * WCAG contrast is defined for the rendered result, so evaluating the raw
 * translucent components would inflate the ratio (e.g. 40% black on white
 * renders as rgb(153 153 153), not black). Colors in different spaces are
 * returned unblended, as composition across spaces is undefined here.
 */
export function compositeOverBackground(
  foreground: DTCGColorValue,
  background: DTCGColorValue,
): DTCGColorValue {
  const alpha = foreground.alpha ?? 1;
  if (alpha >= 1 || foreground.colorSpace !== background.colorSpace) {
    return foreground;
  }
  const clampedAlpha = Math.max(0, alpha);
  const [fr, fgreen, fb] = foreground.components;
  const [br, bgreen, bb] = background.components;
  return {
    colorSpace: foreground.colorSpace,
    components: [
      fr * clampedAlpha + br * (1 - clampedAlpha),
      fgreen * clampedAlpha + bgreen * (1 - clampedAlpha),
      fb * clampedAlpha + bb * (1 - clampedAlpha),
    ],
  };
}

export function calculateContrastRatio(colorA: DTCGColorValue, colorB: DTCGColorValue): number {
  const lumA = calculateRelativeLuminance(colorA);
  const lumB = calculateRelativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function evaluateContrast(
  fgColor: DTCGColorValue,
  bgColor: DTCGColorValue,
  fgName = "foreground",
  bgName = "background",
): ContrastResult {
  const effectiveFg = compositeOverBackground(fgColor, bgColor);
  const fgLuminance = Math.round(calculateRelativeLuminance(effectiveFg) * 10000) / 10000;
  const bgLuminance = Math.round(calculateRelativeLuminance(bgColor) * 10000) / 10000;
  const ratio = calculateContrastRatio(effectiveFg, bgColor);

  const passes: Record<WCAGCriterion, boolean> = {
    WCAG_1_4_3_AA_NORMAL: ratio >= WCAG_THRESHOLDS.WCAG_1_4_3_AA_NORMAL,
    WCAG_1_4_3_AA_LARGE: ratio >= WCAG_THRESHOLDS.WCAG_1_4_3_AA_LARGE,
    WCAG_1_4_6_AAA_NORMAL: ratio >= WCAG_THRESHOLDS.WCAG_1_4_6_AAA_NORMAL,
    WCAG_1_4_6_AAA_LARGE: ratio >= WCAG_THRESHOLDS.WCAG_1_4_6_AAA_LARGE,
    WCAG_1_4_11_NON_TEXT: ratio >= WCAG_THRESHOLDS.WCAG_1_4_11_NON_TEXT,
    FOCUS_RING_ADJACENT: ratio >= WCAG_THRESHOLDS.FOCUS_RING_ADJACENT,
  };

  return {
    foreground: fgName,
    background: bgName,
    ratio,
    fgLuminance,
    bgLuminance,
    passes,
  };
}

export interface ContrastAuditReport {
  results: Array<{
    requirement: ContrastRequirement;
    evaluation: ContrastResult;
    satisfied: boolean;
  }>;
  allPassed: boolean;
  violations: string[];
}

export function auditGraphContrast(
  graph: TokenGraph,
  requirements: ContrastRequirement[],
): ContrastAuditReport {
  const results: ContrastAuditReport["results"] = [];
  const violations: string[] = [];

  for (const req of requirements) {
    const fgToken = graph.tokens.get(req.foregroundToken);
    const bgToken = graph.tokens.get(req.backgroundToken);

    if (!fgToken || fgToken.type !== "color") {
      violations.push(`Foreground token "${req.foregroundToken}" not found or not a color`);
      continue;
    }
    if (!bgToken || bgToken.type !== "color") {
      violations.push(`Background token "${req.backgroundToken}" not found or not a color`);
      continue;
    }

    const evaluation = evaluateContrast(
      fgToken.value as DTCGColorValue,
      bgToken.value as DTCGColorValue,
      req.foregroundToken,
      req.backgroundToken,
    );

    const satisfied = evaluation.passes[req.targetCriterion];
    if (!satisfied) {
      violations.push(
        `Contrast violation for "${req.name}" (${req.contextDescription}): ratio ${evaluation.ratio}:1 fails threshold ${WCAG_THRESHOLDS[req.targetCriterion]}:1 for ${req.targetCriterion}`,
      );
    }

    results.push({ requirement: req, evaluation, satisfied });
  }

  return {
    results,
    allPassed: violations.length === 0,
    violations,
  };
}
