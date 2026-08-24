/**
 * Phase 6 UI Foundation: Source Distribution Mutation Lifecycle Types (P6.4)
 */

import type { LockState, RegistryItemManifest } from "../registry/types.js";

export type UIAddPhase =
  | "resolve"
  | "validate"
  | "analyze"
  | "plan"
  | "preview"
  | "apply"
  | "validate-result"
  | "record-lock"
  | "report";

export type UIAddReportStatus = "applied" | "dry-run" | "unchanged" | "blocked";

export type PlannedFileAction = "create" | "skip";

export interface UIAddPlannedFile {
  action: PlannedFileAction;
  source: string;
  target: string;
  content: string;
  integrity: string;
}

export interface UIAddPlan {
  item: string;
  version: string;
  conflicts: readonly string[];
  files: readonly UIAddPlannedFile[];
}

export interface UIAddValidation {
  passed: boolean;
  errors: readonly string[];
  files: readonly string[];
}

export interface UIAddReport {
  status: UIAddReportStatus;
  item: string;
  files: readonly string[];
  message: string;
  lockState?: LockState | undefined;
}

export interface UIAddResult {
  applied: boolean;
  phases: readonly UIAddPhase[];
  manifest: RegistryItemManifest;
  plan: UIAddPlan;
  validation: UIAddValidation;
  report: UIAddReport;
}

export interface UIAddOptions {
  dryRun?: boolean | undefined;
  projectRoot?: string | undefined;
  allowedRoots?: readonly string[] | string[] | undefined;
}
