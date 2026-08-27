/**
 * Form Research F10 — Bundle Size & Tree-Shaking Evidence (Reproducible Build Data)
 *
 * Generated via production bundler build (`bun build --minify --target=browser`)
 * with gzip (level 9) and brotli compression across all evaluated form libraries.
 * Distinguishes Cold Adoption cost from Incremental Cost in an existing Vii application.
 */

export interface BundleMeasurement {
  readonly library: string;
  readonly scenario: "cold-adoption" | "incremental-in-vii-app" | "standalone-field";
  readonly minifiedJsBytes: number;
  readonly gzipBytes: number;
  readonly brotliBytes: number;
  readonly includedDependencies: readonly string[];
  readonly externalizedPeers: readonly string[];
  readonly buildCommand: string;
  readonly notes: string;
}

export const MEASURED_BUNDLE_DATA: BundleMeasurement[] = [
  {
    library: "Vii Form (createField standalone)",
    scenario: "standalone-field",
    minifiedJsBytes: 12950,
    gzipBytes: 4560,
    brotliBytes: 4030,
    includedDependencies: ["@vii-labs/core (State, Computed, Scope)"],
    externalizedPeers: [],
    buildCommand: "bun build research/form/form-core.ts --minify --target=browser",
    notes: "Minimal single-field tree-shaken build including Vii Core reactive runtime.",
  },
  {
    library: "Vii Form (Full Core + React Adapter)",
    scenario: "cold-adoption",
    minifiedJsBytes: 36582,
    gzipBytes: 11315,
    brotliBytes: 9866,
    includedDependencies: ["@vii-labs/core (State, Computed, Batch, Scope, Diagnostics)"],
    externalizedPeers: ["react", "react-dom"],
    buildCommand:
      "bun build entry-vii-cold.ts --outfile bundle.js --minify --target=browser --external react --external react-dom",
    notes:
      "Cold adoption in an application without existing Vii packages. Includes full Vii Core runtime.",
  },
  {
    library: "Vii Form (Full Core + React Adapter)",
    scenario: "incremental-in-vii-app",
    minifiedJsBytes: 30316,
    gzipBytes: 9134,
    brotliBytes: 7948,
    includedDependencies: ["Form Core, Parsers, Standard Schema Adapter, React Adapter"],
    externalizedPeers: ["@vii-labs/core", "react", "react-dom"],
    buildCommand:
      "bun build entry-vii-inc.ts --outfile bundle.js --minify --target=browser --external @vii-labs/core --external react --external react-dom",
    notes: "Incremental cost for an application already using @vii-labs/core as its state engine.",
  },
  {
    library: "TanStack Form (v1.33.5 @tanstack/react-form)",
    scenario: "cold-adoption",
    minifiedJsBytes: 68661,
    gzipBytes: 17983,
    brotliBytes: 15713,
    includedDependencies: ["@tanstack/form-core", "@tanstack/store"],
    externalizedPeers: ["react", "react-dom"],
    buildCommand:
      "bun build entry-tanstack.ts --outfile bundle.js --minify --target=browser --external react --external react-dom",
    notes: "Cold adoption cost for TanStack React Form with built-in store runtime.",
  },
  {
    library: "React Hook Form (v7.86.0)",
    scenario: "cold-adoption",
    minifiedJsBytes: 38499,
    gzipBytes: 13752,
    brotliBytes: 12426,
    includedDependencies: ["react-hook-form core"],
    externalizedPeers: ["react", "react-dom"],
    buildCommand:
      "bun build entry-rhf.ts --outfile bundle.js --minify --target=browser --external react --external react-dom",
    notes: "Cold adoption cost for RHF (zero external dependencies).",
  },
];
