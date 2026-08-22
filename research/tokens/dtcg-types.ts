/**
 * DTCG 2025.10 Specification Type Definitions
 *
 * Source: W3C Design Tokens Community Group (Published Report 2025.10)
 * Note: DTCG is a W3C Community Group Specification, not a W3C Recommendation.
 */

export type ColorSpace =
  | "srgb"
  | "display-p3"
  | "a98-rgb"
  | "prophoto-rgb"
  | "rec2020"
  | "lab"
  | "oklab"
  | "lch"
  | "oklch";

export interface DTCGColorValue {
  colorSpace: ColorSpace;
  components: [number, number, number];
  alpha?: number;
  hex?: string;
}

export type DimensionUnit = "px" | "rem" | "em" | "%" | "vw" | "vh" | "pt";

export interface DTCGDimensionValue {
  value: number;
  unit: DimensionUnit;
}

export type DurationUnit = "ms" | "s";

export interface DTCGDurationValue {
  value: number;
  unit: DurationUnit;
}

export type DTCGCubicBezierValue = [number, number, number, number];

export type DTCGNumberValue = number;

export type DTCGFontFamilyValue = string | string[];

export type DTCGFontWeightValue = number | string;

export interface DTCGShadowValue {
  color: DTCGColorValue | string;
  offsetX: DTCGDimensionValue | string;
  offsetY: DTCGDimensionValue | string;
  blur: DTCGDimensionValue | string;
  spread?: DTCGDimensionValue | string;
  inset?: boolean;
}

export interface DTCGBorderValue {
  color: DTCGColorValue | string;
  width: DTCGDimensionValue | string;
  style: "solid" | "dashed" | "dotted" | "double" | "none";
}

export type DTCGTokenValue =
  | DTCGColorValue
  | DTCGDimensionValue
  | DTCGDurationValue
  | DTCGCubicBezierValue
  | DTCGNumberValue
  | DTCGFontFamilyValue
  | DTCGFontWeightValue
  | DTCGShadowValue
  | DTCGBorderValue
  | string;

export type DTCGTokenType =
  | "color"
  | "dimension"
  | "duration"
  | "cubicBezier"
  | "number"
  | "fontFamily"
  | "fontWeight"
  | "shadow"
  | "border"
  | "typography";

export interface DTCGToken {
  $value: DTCGTokenValue;
  $type?: DTCGTokenType;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

export interface DTCGGroup {
  $type?: DTCGTokenType;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: DTCGToken | DTCGGroup | unknown;
}

export interface DTCGDocument {
  $schema?: string;
  $description?: string;
  [key: string]: DTCGToken | DTCGGroup | unknown;
}

export interface ResolvedToken {
  name: string;
  path: string[];
  type: DTCGTokenType;
  raw: DTCGToken;
  value: DTCGTokenValue;
  isAlias: boolean;
  originalAlias?: string | undefined;
  cssVariable: string;
}

export interface TokenGraph {
  tokens: Map<string, ResolvedToken>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  byType: Map<DTCGTokenType, ResolvedToken[]>;
}
