export type ProjectFramework = "react" | "angular" | "vue" | "vanilla" | "mixed" | "unknown";
export type ProjectRuntime = "browser" | "node" | "bun" | "deno" | "unknown";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";
export type WorkspaceType = "single" | "nx" | "other-monorepo" | "unknown";
export type ProjectLanguage = "typescript" | "javascript" | "mixed" | "unknown";
export type RenderingMode = "client" | "ssr" | "static" | "mixed" | "unknown";
export type DetectionConfidence = "high" | "medium" | "low";
export type DetectionField =
  | "framework"
  | "runtime"
  | "packageManager"
  | "workspace"
  | "language"
  | "rendering"
  | "packageManifest";

export interface DetectionEvidence {
  readonly field: DetectionField;
  readonly source: string;
  readonly detail: string;
}

export interface DetectionConflict {
  readonly field: DetectionField;
  readonly message: string;
  readonly sources: readonly string[];
}

export interface DetectedWorkspaceProject {
  readonly root: string;
  readonly name: string;
  readonly framework: ProjectFramework;
  readonly runtime: ProjectRuntime;
  readonly language: ProjectLanguage;
  readonly rendering: RenderingMode;
}

export interface DetectedProject {
  readonly root: string;
  readonly workspace: WorkspaceType;
  readonly framework: ProjectFramework;
  readonly runtime: ProjectRuntime;
  readonly packageManager: PackageManager;
  readonly language: ProjectLanguage;
  readonly rendering: RenderingMode;
  readonly installedViiPackages: readonly string[];
  readonly projects: readonly DetectedWorkspaceProject[];
  readonly evidence: readonly DetectionEvidence[];
  readonly confidence: DetectionConfidence;
  readonly conflicts: readonly DetectionConflict[];
}

export type ProjectDetectionErrorCode = "invalid-root" | "unreadable-root";

export class ProjectDetectionError extends Error {
  readonly code: ProjectDetectionErrorCode;

  constructor(code: ProjectDetectionErrorCode, message: string) {
    super(message);
    this.name = "ProjectDetectionError";
    this.code = code;
  }
}
