import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  resolve: {
    alias: {
      "@angular/forms": resolve(__dirname, "node_modules/@angular/forms/fesm2022/forms.mjs"),
      "@angular/platform-browser": resolve(
        __dirname,
        "node_modules/@angular/platform-browser/fesm2022/platform-browser.mjs",
      ),
      "@angular/platform-browser-dynamic": resolve(
        __dirname,
        "node_modules/@angular/platform-browser-dynamic/fesm2022/platform-browser-dynamic.mjs",
      ),
      react: resolve(__dirname, "packages/react/node_modules/react"),
      "react-dom/server": resolve(
        __dirname,
        "packages/react/node_modules/react-dom/server.node.js",
      ),
      "react-dom": resolve(__dirname, "packages/react/node_modules/react-dom"),
      "react-test-renderer": resolve(__dirname, "packages/react/node_modules/react-test-renderer"),
      "@angular/core": resolve(__dirname, "node_modules/@angular/core/fesm2022/core.mjs"),
      vue: resolve(__dirname, "packages/vue/node_modules/vue/dist/vue.runtime.esm-bundler.js"),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "**/test/browser/**"],
  },
});
