import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transformWithEsbuild } from "vite";
import { defineConfig } from "vitest/config";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const formRoot = resolve(repoRoot, "packages/form");

export default defineConfig({
  root: formRoot,
  plugins: [
    {
      name: "vii-form-angular-decorators",
      enforce: "pre",
      async transform(code, id) {
        const isAngularAdapter = id.includes(`${formRoot}/src/adapters/angular/`);
        const isAngularTemplateTest = id.includes(`${formRoot}/test/unit/angular-`);
        if (!isAngularAdapter && !isAngularTemplateTest) {
          return;
        }
        if (!id.endsWith(".ts")) {
          return;
        }
        return transformWithEsbuild(code, id, {
          loader: "ts",
          tsconfigRaw: {
            compilerOptions: {
              experimentalDecorators: true,
              useDefineForClassFields: false,
            },
          },
        });
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: "@angular/platform-browser-dynamic/testing",
        replacement: resolve(
          repoRoot,
          "node_modules/@angular/platform-browser-dynamic/fesm2022/testing.mjs",
        ),
      },
      {
        find: "@angular/core/testing",
        replacement: resolve(repoRoot, "node_modules/@angular/core/fesm2022/testing.mjs"),
      },
      {
        find: "@angular/core",
        replacement: resolve(repoRoot, "node_modules/@angular/core/fesm2022/core.mjs"),
      },
      {
        find: "@angular/common",
        replacement: resolve(repoRoot, "node_modules/@angular/common/fesm2022/common.mjs"),
      },
      {
        find: "@angular/compiler",
        replacement: resolve(repoRoot, "node_modules/@angular/compiler/fesm2022/compiler.mjs"),
      },
      {
        find: "@angular/forms",
        replacement: resolve(repoRoot, "node_modules/@angular/forms/fesm2022/forms.mjs"),
      },
      {
        find: "@angular/platform-browser",
        replacement: resolve(
          repoRoot,
          "node_modules/@angular/platform-browser/fesm2022/platform-browser.mjs",
        ),
      },
      {
        find: "@angular/platform-browser-dynamic",
        replacement: resolve(
          repoRoot,
          "node_modules/@angular/platform-browser-dynamic/fesm2022/platform-browser-dynamic.mjs",
        ),
      },
      {
        find: "react-dom/server",
        replacement: resolve(repoRoot, "packages/react/node_modules/react-dom/server.node.js"),
      },
      {
        find: "react-dom",
        replacement: resolve(repoRoot, "packages/react/node_modules/react-dom"),
      },
      {
        find: "react-test-renderer",
        replacement: resolve(repoRoot, "packages/react/node_modules/react-test-renderer"),
      },
      { find: "react", replacement: resolve(repoRoot, "packages/react/node_modules/react") },
      {
        find: "vue",
        replacement: resolve(
          repoRoot,
          "packages/vue/node_modules/vue/dist/vue.runtime.esm-bundler.js",
        ),
      },
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["./test/vitest-angular-setup.ts"],
    include: ["test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "test/browser/**"],
  },
});
