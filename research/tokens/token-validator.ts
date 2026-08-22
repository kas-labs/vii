import type {
  DTCGColorValue,
  DTCGDimensionValue,
  DTCGDocument,
  DTCGDurationValue,
  DTCGGroup,
  DTCGToken,
  DTCGTokenType,
} from "./dtcg-types.js";

export class TokenValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string[] = [],
    public readonly code: string = "VALIDATION_ERROR",
  ) {
    super(`[${code}] at path "${path.join(".")}": ${message}`);
    this.name = "TokenValidationError";
  }
}

export const VALID_TOKEN_TYPES: ReadonlySet<DTCGTokenType> = new Set([
  "color",
  "dimension",
  "duration",
  "cubicBezier",
  "number",
  "fontFamily",
  "fontWeight",
  "shadow",
  "border",
  "typography",
]);

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 20;
const MAX_NODE_COUNT = 5000;

export function isAlias(value: unknown): value is string {
  return typeof value === "string" && /^\{([^}]+)\}$/.test(value.trim());
}

export function extractAliasPath(alias: string): string[] {
  const match = /^\{([^}]+)\}$/.exec(alias.trim());
  if (!match || !match[1]) return [];
  return match[1].split(".");
}

function validateColorValue(value: unknown, path: string[]): void {
  if (isAlias(value)) return;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TokenValidationError("Color value must be an object or alias", path, "INVALID_COLOR");
  }
  const color = value as Partial<DTCGColorValue>;
  if (!color.colorSpace || typeof color.colorSpace !== "string") {
    throw new TokenValidationError("Color must declare a valid colorSpace", path, "INVALID_COLOR");
  }
  if (!Array.isArray(color.components) || color.components.length !== 3) {
    throw new TokenValidationError(
      "Color components must be a 3-element tuple",
      path,
      "INVALID_COLOR",
    );
  }
  for (let i = 0; i < color.components.length; i++) {
    const comp = color.components[i];
    if (typeof comp !== "number" || !Number.isFinite(comp)) {
      throw new TokenValidationError(
        "Color components must be finite numbers",
        path,
        "INVALID_COLOR",
      );
    }
  }
  if (
    color.alpha !== undefined &&
    (typeof color.alpha !== "number" || color.alpha < 0 || color.alpha > 1)
  ) {
    throw new TokenValidationError("Alpha must be between 0 and 1", path, "INVALID_COLOR");
  }
}

function validateDimensionValue(value: unknown, path: string[]): void {
  if (isAlias(value)) return;
  if (typeof value !== "object" || value === null) {
    throw new TokenValidationError(
      "Dimension must be an object with value and unit",
      path,
      "INVALID_DIMENSION",
    );
  }
  const dim = value as Partial<DTCGDimensionValue>;
  if (typeof dim.value !== "number" || !Number.isFinite(dim.value)) {
    throw new TokenValidationError(
      "Dimension value must be a finite number",
      path,
      "INVALID_DIMENSION",
    );
  }
  if (typeof dim.unit !== "string" || dim.unit.trim().length === 0) {
    throw new TokenValidationError(
      "Dimension unit must be a non-empty string",
      path,
      "INVALID_DIMENSION",
    );
  }
}

function validateDurationValue(value: unknown, path: string[]): void {
  if (isAlias(value)) return;
  if (typeof value !== "object" || value === null) {
    throw new TokenValidationError(
      "Duration must be an object with value and unit",
      path,
      "INVALID_DURATION",
    );
  }
  const dur = value as Partial<DTCGDurationValue>;
  if (typeof dur.value !== "number" || !Number.isFinite(dur.value) || dur.value < 0) {
    throw new TokenValidationError(
      "Duration value must be a non-negative number",
      path,
      "INVALID_DURATION",
    );
  }
  if (dur.unit !== "ms" && dur.unit !== "s") {
    throw new TokenValidationError('Duration unit must be "ms" or "s"', path, "INVALID_DURATION");
  }
}

function validateCubicBezierValue(value: unknown, path: string[]): void {
  if (isAlias(value)) return;
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TokenValidationError(
      "CubicBezier must be a 4-number array [P1x, P1y, P2x, P2y]",
      path,
      "INVALID_CURVE",
    );
  }
  for (let i = 0; i < 4; i++) {
    if (typeof value[i] !== "number" || !Number.isFinite(value[i])) {
      throw new TokenValidationError(
        `CubicBezier value at index ${i} must be a finite number`,
        path,
        "INVALID_CURVE",
      );
    }
  }
  if (value[0] < 0 || value[0] > 1 || value[2] < 0 || value[2] > 1) {
    throw new TokenValidationError(
      "CubicBezier control x coordinates must be in range [0, 1]",
      path,
      "INVALID_CURVE",
    );
  }
}

function validateTokenValue(type: DTCGTokenType, value: unknown, path: string[]): void {
  if (value === undefined || value === null) {
    throw new TokenValidationError("Token $value cannot be null or undefined", path, "EMPTY_VALUE");
  }
  if (isAlias(value)) return;

  switch (type) {
    case "color":
      validateColorValue(value, path);
      break;
    case "dimension":
      validateDimensionValue(value, path);
      break;
    case "duration":
      validateDurationValue(value, path);
      break;
    case "cubicBezier":
      validateCubicBezierValue(value, path);
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TokenValidationError(
          "Number token value must be a finite number",
          path,
          "INVALID_NUMBER",
        );
      }
      break;
  }
}

export function isTokenNode(node: unknown): node is DTCGToken {
  return typeof node === "object" && node !== null && "$value" in node;
}

export interface DiscoveredToken {
  path: string[];
  token: DTCGToken;
  effectiveType: DTCGTokenType;
}

export function validateAndCollectTokens(
  doc: DTCGDocument,
  options: { maxDepth?: number; maxNodes?: number } = {},
): DiscoveredToken[] {
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const maxNodes = options.maxNodes ?? MAX_NODE_COUNT;
  let nodeCount = 0;
  const discovered: DiscoveredToken[] = [];

  function traverse(node: unknown, path: string[], inheritedType?: DTCGTokenType, depth = 0): void {
    if (depth > maxDepth) {
      throw new TokenValidationError(
        `Exceeded maximum nesting depth of ${maxDepth}`,
        path,
        "MAX_DEPTH_EXCEEDED",
      );
    }
    if (++nodeCount > maxNodes) {
      throw new TokenValidationError(
        `Exceeded maximum node count limit of ${maxNodes}`,
        path,
        "MAX_NODES_EXCEEDED",
      );
    }
    if (typeof node !== "object" || node === null) return;

    for (const key of Object.keys(node)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new TokenValidationError(
          `Prototype pollution key "${key}" detected`,
          [...path, key],
          "SECURITY_VIOLATION",
        );
      }
    }

    const record = node as Record<string, unknown>;
    const groupType = (record["$type"] as DTCGTokenType | undefined) ?? inheritedType;

    if (isTokenNode(record)) {
      const type = (record["$type"] as DTCGTokenType | undefined) ?? groupType;
      if (!type) {
        throw new TokenValidationError(
          "Token has no explicit or inherited $type",
          path,
          "MISSING_TYPE",
        );
      }
      if (!VALID_TOKEN_TYPES.has(type)) {
        throw new TokenValidationError(
          `Unsupported token $type: "${type}"`,
          path,
          "UNSUPPORTED_TYPE",
        );
      }
      validateTokenValue(type, record.$value, path);
      discovered.push({ path, token: record, effectiveType: type });
      return;
    }

    for (const [key, child] of Object.entries(record)) {
      if (key.startsWith("$")) continue;
      traverse(child, [...path, key], groupType, depth + 1);
    }
  }

  traverse(doc, [], undefined, 0);
  return discovered;
}
