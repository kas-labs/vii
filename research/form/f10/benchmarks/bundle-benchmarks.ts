/**
 * Form Research F10 — Bundle Size & Tree-Shaking Evidence
 *
 * Sourced directly from executable runner `measure-bundles.mjs`
 * (`node research/form/f10/benchmarks/measure-bundles.mjs`).
 *
 * Generated via `bun build --minify --target=browser` with node:zlib gzip (level 9)
 * and brotli compression across dedicated entrypoint files in `bundle/`.
 */

export interface BundleMeasurement {
  readonly library: string;
  readonly scenario: "cold-adoption" | "incremental-in-vii-app" | "standalone-field";
  readonly minifiedBytes: number;
  readonly gzipBytes: number;
  readonly brotliBytes: number;
  readonly includedDependencies: readonly string[];
  readonly externalizedPeers: readonly string[];
  readonly notes: string;
}

export const MEASURED_BUNDLE_DATA: BundleMeasurement[] = [
  {
    library: "Vii Standalone createField",
    scenario: "standalone-field",
    minifiedBytes: 12977,
    gzipBytes: 4567,
    brotliBytes: 4049,
    includedDependencies: ["@vii-labs/core (State, Computed, Scope)"],
    externalizedPeers: [],
    notes: "Minimal single-field tree-shaken build with core reactive runtime.",
  },
  {
    library: "Vii Form Cold Adoption (Core + React)",
    scenario: "cold-adoption",
    minifiedBytes: 41176,
    gzipBytes: 12257,
    brotliBytes: 10730,
    includedDependencies: [
      "Form Core, Parsers, Standard Schema, React Adapter, @vii-labs/core runtime",
    ],
    externalizedPeers: ["react", "react-dom"],
    notes: "Cold adoption in non-Vii application including full @vii-labs/core engine.",
  },
  {
    library: "Vii Form Incremental (in Vii Core app)",
    scenario: "incremental-in-vii-app",
    minifiedBytes: 34911,
    gzipBytes: 10067,
    brotliBytes: 8723,
    includedDependencies: ["Form Core, Parsers, Standard Schema Adapter, React Adapter"],
    externalizedPeers: ["react", "react-dom", "@vii-labs/core"],
    notes: "Incremental cost for application already using @vii-labs/core as reactive engine.",
  },
  {
    library: "TanStack React Form (v1.33.5)",
    scenario: "cold-adoption",
    minifiedBytes: 68762,
    gzipBytes: 18042,
    brotliBytes: 15713,
    includedDependencies: ["@tanstack/react-form", "@tanstack/form-core", "@tanstack/store"],
    externalizedPeers: ["react", "react-dom"],
    notes: "Cold adoption of TanStack React Form with built-in store runtime.",
  },
  {
    library: "React Hook Form (v7.86.0)",
    scenario: "cold-adoption",
    minifiedBytes: 38513,
    gzipBytes: 13767,
    brotliBytes: 12429,
    includedDependencies: ["react-hook-form core"],
    externalizedPeers: ["react", "react-dom"],
    notes: "Cold adoption of React Hook Form core library.",
  },
];
