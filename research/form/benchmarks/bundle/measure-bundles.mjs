import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

const TMP_DIR = resolve(process.cwd(), ".tmp/form-bundles");
mkdirSync(TMP_DIR, { recursive: true });

const ENTRIES = {
  "form-core-only": `
    export { createField, createFieldGroup, createFieldArray, createForm } from "../../research/form/form-core.ts";
  `,
  "form-tree-shaking-minimal": `
    export { createField } from "../../research/form/form-core.ts";
  `,
  "form-parser": `
    export { createNumberParser, createBooleanParser, createOptionalStringParser } from "../../research/form/parser.ts";
  `,
  "form-standard-schema": `
    export { standardSchema, isStandardSchema } from "../../research/form/standard-schema.ts";
  `,
  "form-submission": `
    export { deepCloneSnapshot, sanitizeServerIssue } from "../../research/form/submission.ts";
  `,
  "adapter-vanilla": `
    export { bindForm, bindField } from "../../research/form/adapters/vanilla.ts";
  `,
  "adapter-react": `
    export { useForm, useField, useFieldArray } from "../../research/form/adapters/react.ts";
  `,
  "adapter-angular": `
    export { createAngularForm, createAngularField } from "../../research/form/adapters/angular.ts";
  `,
  "adapter-vue": `
    export { createVueForm, createVueField } from "../../research/form/adapters/vue.ts";
  `,
  "form-full-bundle": `
    export * from "../../research/form/form-core.ts";
    export * from "../../research/form/parser.ts";
    export * from "../../research/form/standard-schema.ts";
    export * from "../../research/form/submission.ts";
  `,
};

export function measureBundles() {
  const results = {};

  for (const [name, source] of Object.entries(ENTRIES)) {
    const entryPath = resolve(TMP_DIR, `entry-${name}.ts`);
    const outPath = resolve(TMP_DIR, `bundle-${name}.js`);
    writeFileSync(entryPath, source.trim(), "utf-8");

    // Externalize frameworks and schema libraries to measure isolated adapter/core overhead
    const externals = [
      "react",
      "react-dom",
      "@angular/core",
      "vue",
      "zod",
      "valibot",
      "arktype",
      "@standard-schema/spec",
    ];

    const args = [
      "build",
      entryPath,
      "--outfile",
      outPath,
      "--minify",
      "--target=browser",
      ...externals.flatMap((ext) => ["--external", ext]),
    ];

    const res = spawnSync("bun", args, { encoding: "utf-8" });
    if (res.status !== 0) {
      results[name] = { error: res.stderr || "Build failed" };
      continue;
    }

    const bundleContent = readFileSync(outPath);
    const rawBytes = bundleContent.byteLength;
    const gzipBytes = gzipSync(bundleContent, { level: 9 }).byteLength;
    const brotliBytes = brotliCompressSync(bundleContent).byteLength;

    results[name] = {
      minified: rawBytes,
      gzip: gzipBytes,
      brotli: brotliBytes,
    };
  }

  return results;
}

if (process.argv[1]?.endsWith("measure-bundles.mjs")) {
  const data = measureBundles();
  console.log(JSON.stringify(data, null, 2));
}
