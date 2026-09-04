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

describe("@vii-labs/form package boundary (P1j)", () => {
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
});
