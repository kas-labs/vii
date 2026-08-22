/**
 * Phase 6 UI Foundation: Registry & Lockfile Types (P6.3)
 */

export type RegistryItemType =
  | "ui:component"
  | "ui:primitive"
  | "ui:block"
  | "ui:theme"
  | "ui:tokens"
  | "example:application"
  | "template:project";

export type TargetFramework = "react" | "angular" | "vue" | "vanilla" | "elements";

export type DistributionMode = "source" | "package";

export type TrustClassification = "official" | "trusted-private" | "community" | "untrusted";

export interface RegistryFileEntry {
  source: string;
  target: string;
  integrity: string;
  executable?: boolean | undefined;
}

export interface RegistryDependency {
  name: string;
  versionRange: string;
  isPeer?: boolean | undefined;
}

export interface RegistryItemProvenance {
  registryUrl?: string | undefined;
  author?: string | undefined;
  license?: string | undefined;
  trustLevel?: TrustClassification | undefined;
}

export interface RegistryItemManifest {
  schemaVersion: 1;
  name: string;
  type: RegistryItemType;
  version: string;
  target: TargetFramework;
  mode: DistributionMode;
  description?: string | undefined;
  files: RegistryFileEntry[];
  dependencies?: RegistryDependency[] | undefined;
  tokens?: string[] | undefined;
  capabilities?: string[] | undefined;
  provenance?: RegistryItemProvenance | undefined;
}

export interface LockfileFileRecord {
  target: string;
  originalIntegrity: string;
  installedAt: string;
}

export interface LockfileItemRecord {
  name: string;
  type: RegistryItemType;
  version: string;
  target: TargetFramework;
  mode: DistributionMode;
  registry?: string | undefined;
  manifestIntegrity: string;
  files: Record<string, LockfileFileRecord>;
  dependencies?: RegistryDependency[] | undefined;
  tokens?: string[] | undefined;
  detached?: boolean | undefined;
}

export interface LockState {
  schemaVersion: 1;
  items: Record<string, LockfileItemRecord>;
}
