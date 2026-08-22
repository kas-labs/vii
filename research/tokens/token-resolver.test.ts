import { describe, expect, it } from "vitest";
import type { DTCGDocument } from "./dtcg-types.js";
import { normalizeCssVarName, resolveTokenGraph } from "./token-resolver.js";
import { TokenValidationError } from "./token-validator.js";

describe("DTCG Token Resolver", () => {
  it("normalizes CSS variable names consistently", () => {
    expect(normalizeCssVarName(["color", "violet", "500"])).toBe("--vii-color-violet-500");
    expect(normalizeCssVarName(["button", "primaryBackground"])).toBe(
      "--vii-button-primary-background",
    );
    expect(normalizeCssVarName(["font", "size", "lg"], "app")).toBe("--app-font-size-lg");
  });

  it("resolves direct and multi-hop aliases correctly", () => {
    const doc: DTCGDocument = {
      color: {
        $type: "color",
        raw: {
          $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3] },
        },
        semantic: {
          $value: "{color.raw}",
        },
        component: {
          $value: "{color.semantic}",
        },
      },
    };

    const graph = resolveTokenGraph(doc);
    expect(graph.tokens.size).toBe(3);

    const componentToken = graph.tokens.get("color.component")!;
    expect(componentToken.isAlias).toBe(true);
    expect(componentToken.originalAlias).toBe("{color.semantic}");
    expect(componentToken.value).toEqual({
      colorSpace: "srgb",
      components: [0.1, 0.2, 0.3],
    });
  });

  it("fails deterministically on unresolved aliases", () => {
    const doc: DTCGDocument = {
      color: {
        $type: "color",
        primary: {
          $value: "{color.nonExistent}",
        },
      },
    };

    expect(() => resolveTokenGraph(doc)).toThrow(TokenValidationError);
    expect(() => resolveTokenGraph(doc)).toThrow(/Unresolved alias.*color\.nonExistent/);
  });

  it("detects and reports exact circular dependency chains", () => {
    const doc: DTCGDocument = {
      color: {
        $type: "color",
        a: { $value: "{color.b}" },
        b: { $value: "{color.c}" },
        c: { $value: "{color.a}" },
      },
    };

    expect(() => resolveTokenGraph(doc)).toThrow(TokenValidationError);
    expect(() => resolveTokenGraph(doc)).toThrow(
      /Circular alias dependency detected: color\.a -> color\.b -> color\.c -> color\.a/,
    );
  });

  it("detects type mismatches in alias substitution", () => {
    const doc: DTCGDocument = {
      color: {
        $type: "color",
        primary: {
          $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3] },
        },
      },
      space: {
        $type: "dimension",
        invalidRef: {
          $value: "{color.primary}",
        },
      },
    };

    expect(() => resolveTokenGraph(doc)).toThrow(TokenValidationError);
    expect(() => resolveTokenGraph(doc)).toThrow(/Type mismatch in alias chain/);
  });

  it("detects CSS variable name collisions", () => {
    const doc: DTCGDocument = {
      color: {
        $type: "color",
        primaryColor: {
          $value: { colorSpace: "srgb", components: [1, 1, 1] },
        },
        "primary-color": {
          $value: { colorSpace: "srgb", components: [0, 0, 0] },
        },
      },
    };

    expect(() => resolveTokenGraph(doc)).toThrow(TokenValidationError);
    expect(() => resolveTokenGraph(doc)).toThrow(/CSS variable collision/);
  });
});
