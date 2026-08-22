import { describe, expect, it } from "vitest";
import type { DTCGDocument } from "./dtcg-types.js";
import { isAlias, TokenValidationError, validateAndCollectTokens } from "./token-validator.js";

describe("DTCG Token Validator", () => {
  it("identifies aliases correctly", () => {
    expect(isAlias("{color.violet.500}")).toBe(true);
    expect(isAlias(" {space.4} ")).toBe(true);
    expect(isAlias("color.violet.500")).toBe(false);
    expect(isAlias(123)).toBe(false);
    expect(isAlias(null)).toBe(false);
  });

  it("validates a correct DTCG document with inherited group types", () => {
    const doc: DTCGDocument = {
      color: {
        $type: "color",
        primary: {
          $value: {
            colorSpace: "srgb",
            components: [0.5, 0.5, 0.5],
            alpha: 1,
          },
        },
      },
      space: {
        $type: "dimension",
        small: {
          $value: { value: 4, unit: "px" },
        },
      },
    };

    const tokens = validateAndCollectTokens(doc);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.effectiveType).toBe("color");
    expect(tokens[1]!.effectiveType).toBe("dimension");
  });

  it("rejects prototype pollution attempts", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "color": {"$type": "color"}}');
    expect(() => validateAndCollectTokens(malicious)).toThrow(TokenValidationError);
    expect(() => validateAndCollectTokens(malicious)).toThrow(/Prototype pollution/);
  });

  it("rejects unsupported token types", () => {
    const doc: DTCGDocument = {
      foo: {
        $type: "unsupportedCustomType" as any,
        token: { $value: "bar" },
      },
    };
    expect(() => validateAndCollectTokens(doc)).toThrow(TokenValidationError);
    expect(() => validateAndCollectTokens(doc)).toThrow(/Unsupported token \$type/);
  });

  it("rejects malformed color values", () => {
    const invalidColor: DTCGDocument = {
      color: {
        $type: "color",
        badComponents: {
          $value: {
            colorSpace: "srgb",
            components: [0.5, 0.5] as any, // Only 2 components
          },
        },
      },
    };
    expect(() => validateAndCollectTokens(invalidColor)).toThrow(/3-element tuple/);
  });

  it("rejects invalid dimension units", () => {
    const invalidDim: DTCGDocument = {
      space: {
        $type: "dimension",
        badUnit: {
          $value: { value: 10, unit: "" as any },
        },
      },
    };
    expect(() => validateAndCollectTokens(invalidDim)).toThrow(/non-empty string/);
  });

  it("rejects cubicBezier control points out of range", () => {
    const invalidCurve: DTCGDocument = {
      motion: {
        $type: "cubicBezier",
        badCurve: {
          $value: [1.5, 0, 0.2, 1] as any, // P1x > 1
        },
      },
    };
    expect(() => validateAndCollectTokens(invalidCurve)).toThrow(/range \[0, 1\]/);
  });

  it("enforces maximum depth limits against deeply nested hostile payloads", () => {
    let current: any = { leaf: { $type: "number", $value: 42 } };
    for (let i = 0; i < 25; i++) {
      current = { nested: current };
    }
    expect(() => validateAndCollectTokens(current, { maxDepth: 20 })).toThrow(
      /maximum nesting depth/,
    );
  });

  it("strictly preserves non-mutation of input document", () => {
    const original: DTCGDocument = {
      color: {
        $type: "color",
        base: {
          $value: {
            colorSpace: "srgb",
            components: [0.1, 0.2, 0.3],
          },
        },
      },
    };
    const cloned = JSON.parse(JSON.stringify(original));
    validateAndCollectTokens(original);
    expect(original).toEqual(cloned);
  });
});
