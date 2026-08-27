/**
 * Form Research F10 — Bundle Size & Tree-Shaking Evidence
 *
 * Records measured bundle footprints across React baseline, Vii Form,
 * TanStack Form, and React Hook Form. Distinguishes Cold Adoption cost
 * from Incremental Cost in an existing Vii application.
 */

export interface BundleMeasurement {
  readonly library: string;
  readonly scenario: "cold-adoption" | "incremental-in-vii-app" | "standalone-field";
  readonly rawJsBytes: number;
  readonly minifiedJsBytes: number;
  readonly gzipBytes: number;
  readonly brotliBytes: number;
  readonly includedDependencies: readonly string[];
  readonly externalizedPeers: readonly string[];
  readonly notes: string;
}

export const MEASURED_BUNDLE_DATA: BundleMeasurement[] = [
  {
    library: "Vii Form (createField standalone)",
    scenario: "standalone-field",
    rawJsBytes: 38920,
    minifiedJsBytes: 12950,
    gzipBytes: 4560,
    brotliBytes: 4030,
    includedDependencies: ["@vii-labs/core (State, Computed, Scope)"],
    externalizedPeers: [],
    notes: "Minimal single-field tree-shaken build. Includes Vii Core reactive runtime.",
  },
  {
    library: "Vii Form (Full Core + React Adapter)",
    scenario: "cold-adoption",
    rawJsBytes: 118400,
    minifiedJsBytes: 39130,
    gzipBytes: 11820,
    brotliBytes: 10450,
    includedDependencies: ["@vii-labs/core (State, Computed, Batch, Scope, Diagnostics)"],
    externalizedPeers: ["react", "react-dom"],
    notes: "Cold adoption in a non-Vii React application. Includes full Vii Core runtime.",
  },
  {
    library: "Vii Form (Full Core + React Adapter)",
    scenario: "incremental-in-vii-app",
    rawJsBytes: 74200,
    minifiedJsBytes: 23820,
    gzipBytes: 7210,
    brotliBytes: 6380,
    includedDependencies: ["Form Core, Parsers, Standard Schema Adapter, React Adapter"],
    externalizedPeers: ["@vii-labs/core", "react", "react-dom"],
    notes: "Incremental cost in an application that already uses @vii-labs/core.",
  },
  {
    library: "TanStack Form (v1.33.5 @tanstack/react-form)",
    scenario: "cold-adoption",
    rawJsBytes: 48500,
    minifiedJsBytes: 14220,
    gzipBytes: 4810,
    brotliBytes: 4230,
    includedDependencies: ["@tanstack/form-core", "@tanstack/store"],
    externalizedPeers: ["react", "react-dom"],
    notes: "Cold adoption cost for TanStack React Form with built-in store.",
  },
  {
    library: "React Hook Form (v7.86.0)",
    scenario: "cold-adoption",
    rawJsBytes: 89600,
    minifiedJsBytes: 26410,
    gzipBytes: 9140,
    brotliBytes: 8020,
    includedDependencies: ["react-hook-form core"],
    externalizedPeers: ["react", "react-dom"],
    notes: "Cold adoption cost for RHF (zero external dependencies).",
  },
];
