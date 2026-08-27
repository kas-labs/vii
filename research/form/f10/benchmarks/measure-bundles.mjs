/**
 * Form Research F10 — Executable Bundle Footprint Runner
 *
 * Compiles production bundle entrypoints using `bun build --minify --target=browser`,
 * measures raw minified bytes, gzip (level 9), and brotli compression across all
 * form candidates, and cleans up temporary build artifacts.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, brotliCompressSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "../../../..");
const BUNDLE_DIR = resolve(__dirname, "bundle");
const TMP_DIR = resolve(ROOT_DIR, ".tmp/f10-bundle-measurements");

export const SCENARIOS = [
  {
    name: "Vii Standalone createField",
    entry: resolve(BUNDLE_DIR, "entry-vii-standalone-field.ts"),
    scenario: "standalone-field",
    externals: [],
    includedDeps: ["@vii-labs/core (State, Computed, Scope)"],
    notes: "Minimal single-field tree-shaken build with core reactive runtime.",
  },
  {
    name: "Vii Form Cold Adoption (Core + React)",
    entry: resolve(BUNDLE_DIR, "entry-vii-cold.ts"),
    scenario: "cold-adoption",
    externals: ["react", "react-dom"],
    includedDeps: ["Form Core, Parsers, Standard Schema, React Adapter, @vii-labs/core runtime"],
    notes: "Cold adoption in non-Vii application including full @vii-labs/core engine.",
  },
  {
    name: "Vii Form Incremental (in Vii Core app)",
    entry: resolve(BUNDLE_DIR, "entry-vii-incremental.ts"),
    scenario: "incremental-in-vii-app",
    externals: [
      "react",
      "react-dom",
      "@vii-labs/core",
      resolve(ROOT_DIR, "packages/core/src/index.js"),
      resolve(ROOT_DIR, "packages/core/src/index.ts"),
      resolve(ROOT_DIR, "packages/core/dist/index.js"),
    ],
    includedDeps: ["Form Core, Parsers, Standard Schema Adapter, React Adapter"],
    notes: "Incremental cost for application already using @vii-labs/core as reactive engine.",
  },
  {
    name: "TanStack React Form (v1.33.5)",
    entry: resolve(BUNDLE_DIR, "entry-tanstack.ts"),
    scenario: "cold-adoption",
    externals: ["react", "react-dom"],
    includedDeps: ["@tanstack/react-form", "@tanstack/form-core", "@tanstack/store"],
    notes: "Cold adoption of TanStack React Form with built-in store runtime.",
  },
  {
    name: "React Hook Form (v7.86.0)",
    entry: resolve(BUNDLE_DIR, "entry-rhf.ts"),
    scenario: "cold-adoption",
    externals: ["react", "react-dom"],
    includedDeps: ["react-hook-form core"],
    notes: "Cold adoption of React Hook Form core library.",
  },
];

export function measureAllBundles() {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TMP_DIR, { recursive: true });

  const results = [];

  for (const item of SCENARIOS) {
    const outFile = resolve(TMP_DIR, `out-${item.scenario}-${results.length}.js`);

    const args = [
      "build",
      item.entry,
      "--outfile",
      outFile,
      "--minify",
      "--target=browser",
      ...item.externals.flatMap((ext) => ["--external", ext]),
    ];

    const proc = spawnSync("bun", args, { encoding: "utf-8", cwd: ROOT_DIR });
    if (proc.status !== 0) {
      throw new Error(`Build failed for ${item.name}: ${proc.stderr || proc.stdout}`);
    }

    const content = readFileSync(outFile);
    const minifiedBytes = content.byteLength;
    const gzipBytes = gzipSync(content, { level: 9 }).byteLength;
    const brotliBytes = brotliCompressSync(content).byteLength;

    results.push({
      library: item.name,
      scenario: item.scenario,
      minifiedBytes,
      gzipBytes,
      brotliBytes,
      includedDependencies: item.includedDeps,
      externalizedPeers: item.externals,
      notes: item.notes,
    });
  }

  // Clean up temporary build output
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }

  return results;
}

if (process.argv[1]?.endsWith("measure-bundles.mjs")) {
  const data = measureAllBundles();
  console.log(JSON.stringify(data, null, 2));
}
