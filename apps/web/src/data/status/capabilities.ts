export type CapabilityMaturity =
  | "Stable"
  | "Experimental"
  | "In Development"
  | "Research Accepted"
  | "Research"
  | "Planned"
  | "Vision"
  | "Deprecated";

export type CapabilityAvailability =
  "public" | "private" | "repository-only" | "not-implemented" | "retired";

export interface CompatibilityFact {
  readonly label: string;
  readonly value: string;
  readonly evidence: string;
}

export interface CapabilityStatus {
  readonly id: string;
  readonly name: string;
  readonly maturity: CapabilityMaturity;
  readonly availability: CapabilityAvailability;
  readonly summary: string;
  readonly package?: string;
  readonly version?: string;
  readonly documentation: "none" | "internal" | "partial-public" | "public";
  readonly lastVerified: string;
  readonly evidence: readonly string[];
  readonly compatibility?: readonly CompatibilityFact[];
}

const verified = "2026-08-29";

export const capabilities: readonly CapabilityStatus[] = [
  {
    id: "core",
    name: "Core",
    maturity: "Experimental",
    availability: "repository-only",
    summary:
      "State, Computed, Batch, Scope, and Diagnostics are implemented. Public package publication remains separately gated.",
    package: "@vii-labs/core",
    version: "0.1.0-experimental.2",
    documentation: "public",
    lastVerified: verified,
    evidence: [
      "https://github.com/kas-labs/vii/blob/main/packages/core/package.json",
      "https://github.com/kas-labs/vii/blob/main/packages/core/README.md",
    ],
  },
  {
    id: "vanilla",
    name: "Vanilla",
    maturity: "Experimental",
    availability: "repository-only",
    summary:
      "Framework-free consumers use Core directly; there is no separate Vanilla adapter package.",
    documentation: "public",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/packages/core"],
  },
  {
    id: "react",
    name: "React adapter",
    maturity: "Experimental",
    availability: "private",
    summary: "Private adapter built on React useSyncExternalStore.",
    package: "@vii-labs/react",
    version: "0.0.0",
    documentation: "public",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/blob/main/packages/react/package.json"],
    compatibility: [
      {
        label: "React peer range",
        value: ">=18.0.0",
        evidence: "https://github.com/kas-labs/vii/blob/main/packages/react/package.json",
      },
    ],
  },
  {
    id: "angular",
    name: "Angular adapter",
    maturity: "Experimental",
    availability: "private",
    summary:
      "Private adapter bridging Core readable state into Angular Signals and DestroyRef ownership.",
    package: "@vii-labs/angular",
    version: "0.0.0",
    documentation: "public",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/blob/main/packages/angular/package.json"],
    compatibility: [
      {
        label: "Angular peer range",
        value: ">=17.0.0",
        evidence: "https://github.com/kas-labs/vii/blob/main/packages/angular/package.json",
      },
    ],
  },
  {
    id: "vue",
    name: "Vue adapter",
    maturity: "Experimental",
    availability: "private",
    summary: "Private adapter exposing Core readable state as readonly shallow refs.",
    package: "@vii-labs/vue",
    version: "0.0.0",
    documentation: "public",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/blob/main/packages/vue/package.json"],
    compatibility: [
      {
        label: "Vue peer range",
        value: ">=3.2.0",
        evidence: "https://github.com/kas-labs/vii/blob/main/packages/vue/package.json",
      },
    ],
  },
  {
    id: "cli",
    name: "CLI Core",
    maturity: "In Development",
    availability: "private",
    summary:
      "Substantial CLI foundation exists, but no public terminal package is represented as available.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/packages/cli-core"],
  },
  {
    id: "form",
    name: "Form",
    maturity: "In Development",
    availability: "private",
    summary:
      "Phase 1 implementation is active. The package describes itself as an internal development / experimental candidate and remains private.",
    package: "@vii-labs/form",
    version: "0.1.0-experimental.1",
    documentation: "internal",
    lastVerified: verified,
    evidence: [
      "https://github.com/kas-labs/vii/blob/main/packages/form/package.json",
      "https://github.com/kas-labs/vii/blob/main/packages/form/README.md",
    ],
  },
  {
    id: "query",
    name: "Query",
    maturity: "Research Accepted",
    availability: "not-implemented",
    summary: "Architecture direction has graduated research; no production package is claimed.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/blob/main/docs/architecture/QUERY_ARCHITECTURE.md"],
  },
  {
    id: "http",
    name: "HTTP",
    maturity: "Research Accepted",
    availability: "not-implemented",
    summary: "Accepted architecture direction exists; production implementation remains deferred.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs/architecture"],
  },
  {
    id: "schema",
    name: "Schema",
    maturity: "Research",
    availability: "not-implemented",
    summary: "Research/architecture work exists without a production capability claim.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs"],
  },
  {
    id: "flow",
    name: "Flow",
    maturity: "Research",
    availability: "not-implemented",
    summary: "Research track only; no shipped package is implied.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs"],
  },
  {
    id: "devtools",
    name: "Devtools",
    maturity: "Planned",
    availability: "not-implemented",
    summary: "Planned capability, not a current product surface.",
    documentation: "none",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs/roadmap"],
  },
  {
    id: "ui",
    name: "UI",
    maturity: "Planned",
    availability: "not-implemented",
    summary: "Planned ecosystem area; no public UI package is claimed.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs"],
  },
  {
    id: "native",
    name: "Native components / build",
    maturity: "Research",
    availability: "not-implemented",
    summary: "Research direction only.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs"],
  },
  {
    id: "app-framework",
    name: "Application framework",
    maturity: "Vision",
    availability: "not-implemented",
    summary: "Long-horizon ecosystem direction, not a release promise.",
    documentation: "internal",
    lastVerified: verified,
    evidence: ["https://github.com/kas-labs/vii/tree/main/docs/roadmap"],
  },
];

export function capability(id: string): CapabilityStatus {
  const value = capabilities.find((entry) => entry.id === id);
  if (!value) throw new Error(`Unknown capability: ${id}`);
  return value;
}
