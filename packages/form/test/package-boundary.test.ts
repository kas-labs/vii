import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import * as formAngular from "../src/adapters/angular/index.js";
import * as formReact from "../src/adapters/react/index.js";
import * as formVanilla from "../src/adapters/vanilla/index.js";
import * as formVue from "../src/adapters/vue/index.js";
import * as formRoot from "../src/index.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDirectory, "..");
const manifestPath = path.join(packageRoot, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

describe("@vii-labs/form package boundary (P1m)", () => {
  test("root exports createField, createFieldGroup, createFieldArray, createForm, standardSchema, and parsers; React, Vanilla, Angular, and Vue adapters export public hooks/bindings/signals", () => {
    expect(formRoot).toBeDefined();
    expect(Object.keys(formRoot).sort()).toEqual(
      [
        "createField",
        "createFieldArray",
        "createFieldGroup",
        "createForm",
        "createNumberParser",
        "createStringParser",
        "standardSchema",
      ].sort(),
    );

    expect(formReact).toBeDefined();
    expect(Object.keys(formReact).sort()).toEqual(["useField", "useFieldArray", "useForm"].sort());

    expect(formVanilla).toBeDefined();
    expect(Object.keys(formVanilla).sort()).toEqual(["bindField", "bindForm"].sort());

    expect(formAngular).toBeDefined();
    expect(Object.keys(formAngular).sort()).toEqual(
      ["createAngularField", "createAngularFieldArray", "createAngularForm"].sort(),
    );

    expect(formVue).toBeDefined();
    expect(Object.keys(formVue).sort()).toEqual(
      ["createVueField", "createVueFieldArray", "createVueForm"].sort(),
    );
  });

  test("package manifest establishes correct identity, exports map, and safety metadata", () => {
    expect(manifest.name).toBe("@vii-labs/form");
    expect(manifest.type).toBe("module");
    expect(manifest.private).toBe(true);
    expect(manifest.sideEffects).toBe(false);
    expect(manifest.license).toBe("Apache-2.0");
    expect(manifest.vii?.stability).toBe("preview");
    expect(manifest.description).toContain("Preview reactive headless form state");

    expect(manifest.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
      "./react": {
        types: "./dist/adapters/react/index.d.ts",
        import: "./dist/adapters/react/index.js",
      },
      "./vanilla": {
        types: "./dist/adapters/vanilla/index.d.ts",
        import: "./dist/adapters/vanilla/index.js",
      },
      "./angular": {
        types: "./dist/adapters/angular/index.d.ts",
        import: "./dist/adapters/angular/index.js",
      },
      "./vue": {
        types: "./dist/adapters/vue/index.d.ts",
        import: "./dist/adapters/vue/index.js",
      },
    });
  });

  test("package dependencies adhere to Standard Schema and Core peer governance", () => {
    expect(manifest.dependencies).toBeDefined();
    expect(manifest.dependencies["@standard-schema/spec"]).toBe("^1.1.0");

    expect(manifest.peerDependencies).toEqual({
      "@vii-labs/core": ">=0.1.0-experimental.2",
      react: ">=18.0.0",
      "@angular/core": ">=17.0.0",
      vue: ">=3.3.0",
    });

    expect(manifest.peerDependenciesMeta).toEqual({
      react: { optional: true },
      "@angular/core": { optional: true },
      vue: { optional: true },
    });
  });

  test("root entrypoint source is framework-neutral and free of framework imports", () => {
    const rootSource = readFileSync(path.join(packageRoot, "src/index.ts"), "utf8");
    const forbiddenFrameworks = ["react", "react-dom", "@angular/core", "vue"];

    for (const framework of forbiddenFrameworks) {
      expect(rootSource).not.toContain(`"${framework}"`);
      expect(rootSource).not.toContain(`'${framework}'`);
    }
  });

  test("package contains zero runtime references or imports to research/form", () => {
    const rootSource = readFileSync(path.join(packageRoot, "src/index.ts"), "utf8");
    const reactSource = readFileSync(path.join(packageRoot, "src/adapters/react/index.ts"), "utf8");
    const vanillaSource = readFileSync(
      path.join(packageRoot, "src/adapters/vanilla/index.ts"),
      "utf8",
    );
    const angularSource = readFileSync(
      path.join(packageRoot, "src/adapters/angular/index.ts"),
      "utf8",
    );
    const vueSource = readFileSync(path.join(packageRoot, "src/adapters/vue/index.ts"), "utf8");

    const allSources = [rootSource, reactSource, vanillaSource, angularSource, vueSource];
    for (const source of allSources) {
      expect(source).not.toContain("research/form");
      expect(source).not.toContain("../research");
      expect(source).not.toContain("../../research");
    }
  });

  test("public API surface strictly matches machine-readable snapshot (api-surface.json)", () => {
    const snapshotPath = path.join(packageRoot, "api-surface.json");
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

    expect(snapshot.name).toBe("@vii-labs/form");
    expect(snapshot.stability).toBe("preview");

    expect(Object.keys(formRoot).sort()).toEqual(
      snapshot.entrypoints["."].runtimeExports.slice().sort(),
    );
    expect(Object.keys(formReact).sort()).toEqual(
      snapshot.entrypoints["./react"].runtimeExports.slice().sort(),
    );
    expect(Object.keys(formVanilla).sort()).toEqual(
      snapshot.entrypoints["./vanilla"].runtimeExports.slice().sort(),
    );
    expect(Object.keys(formAngular).sort()).toEqual(
      snapshot.entrypoints["./angular"].runtimeExports.slice().sort(),
    );
    expect(Object.keys(formVue).sort()).toEqual(
      snapshot.entrypoints["./vue"].runtimeExports.slice().sort(),
    );

    function extractExportedTypes(source: string): string[] {
      const matches = [...source.matchAll(/export\s+type\s*\{([^}]+)\}/gs)];
      const types: string[] = [];
      for (const match of matches) {
        const rawGroup = match[1];
        if (!rawGroup) continue;
        const symbols = rawGroup
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        types.push(...symbols);
      }
      return types.sort();
    }

    const rootSource = readFileSync(path.join(packageRoot, "src/index.ts"), "utf8");
    const reactSource = readFileSync(path.join(packageRoot, "src/adapters/react/index.ts"), "utf8");
    const vanillaSource = readFileSync(
      path.join(packageRoot, "src/adapters/vanilla/index.ts"),
      "utf8",
    );
    const angularSource = readFileSync(
      path.join(packageRoot, "src/adapters/angular/index.ts"),
      "utf8",
    );
    const vueSource = readFileSync(path.join(packageRoot, "src/adapters/vue/index.ts"), "utf8");

    expect(extractExportedTypes(rootSource)).toEqual(
      snapshot.entrypoints["."].publicTypes.slice().sort(),
    );
    expect(extractExportedTypes(reactSource)).toEqual(
      snapshot.entrypoints["./react"].publicTypes.slice().sort(),
    );
    expect(extractExportedTypes(vanillaSource)).toEqual(
      snapshot.entrypoints["./vanilla"].publicTypes.slice().sort(),
    );
    expect(extractExportedTypes(angularSource)).toEqual(
      snapshot.entrypoints["./angular"].publicTypes.slice().sort(),
    );
    expect(extractExportedTypes(vueSource)).toEqual(
      snapshot.entrypoints["./vue"].publicTypes.slice().sort(),
    );
  });

  test("package exports map disallows unsupported deep internal imports", () => {
    const allowedExportKeys = Object.keys(manifest.exports).sort();
    expect(allowedExportKeys).toEqual([".", "./angular", "./react", "./vanilla", "./vue"].sort());

    const forbiddenDeepPaths = [
      "./dist/core/field.js",
      "./dist/index.js",
      "./core/field",
      "./submission/server-issues",
      "./validation/executor",
      "./internal",
      "./test",
    ];

    for (const subpath of forbiddenDeepPaths) {
      expect(manifest.exports[subpath]).toBeUndefined();
    }
  });
});
