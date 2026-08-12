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

export type InitPhase = "analyze" | "plan" | "preview" | "apply" | "validate" | "report";
export type InitReportStatus = "dry-run" | "applied" | "unchanged" | "blocked";

export interface InitOptions {
  readonly dryRun?: boolean;
}

export interface InitPlannedFile {
  readonly action: "create";
  readonly content: string;
  readonly path: string;
}

export interface InitPlan {
  readonly conflicts: readonly string[];
  readonly files: readonly InitPlannedFile[];
}

export interface InitValidation {
  readonly errors: readonly string[];
  readonly files: readonly string[];
  readonly passed: boolean;
}

export interface InitReport {
  readonly files: readonly string[];
  readonly message: string;
  readonly status: InitReportStatus;
}

export interface InitResult {
  readonly applied: boolean;
  readonly detection: DetectedProject;
  readonly phases: readonly InitPhase[];
  readonly plan: InitPlan;
  readonly report: InitReport;
  readonly validation: InitValidation;
}

export type AddStateReportStatus = "dry-run" | "applied" | "unchanged" | "blocked";

export interface AddStateOptions {
  readonly dryRun?: boolean;
}

export interface AddStatePlannedFile {
  readonly action: "create";
  readonly content: string;
  readonly path: string;
}

export interface AddStatePlan {
  readonly conflicts: readonly string[];
  readonly files: readonly AddStatePlannedFile[];
}

export interface AddStateValidation {
  readonly errors: readonly string[];
  readonly files: readonly string[];
  readonly passed: boolean;
}

export interface AddStateReport {
  readonly files: readonly string[];
  readonly message: string;
  readonly status: AddStateReportStatus;
}

export interface AddStateResult {
  readonly applied: boolean;
  readonly detection: DetectedProject;
  readonly phases: readonly InitPhase[];
  readonly plan: AddStatePlan;
  readonly report: AddStateReport;
  readonly validation: AddStateValidation;
}

export type DoctorPhase = "analyze" | "validate" | "report";
export type DoctorSeverity = "error" | "warning" | "info";
export type DoctorStatus = "healthy" | "attention" | "blocked";
export type DoctorFindingCode =
  | "detection-conflict"
  | "framework-unknown"
  | "package-manager-unknown"
  | "language-unknown"
  | "vii-core-missing"
  | "adapter-missing"
  | "nx-integration-missing"
  | "rendering-ambiguous";

export interface DoctorFinding {
  readonly code: DoctorFindingCode;
  readonly message: string;
  readonly severity: DoctorSeverity;
  readonly sources: readonly string[];
}

export interface DoctorValidation {
  readonly errors: readonly string[];
  readonly passed: boolean;
}

export interface DoctorReport {
  readonly findings: readonly DoctorFinding[];
  readonly message: string;
  readonly status: DoctorStatus;
}

export interface DoctorResult {
  readonly detection: DetectedProject;
  readonly findings: readonly DoctorFinding[];
  readonly phases: readonly DoctorPhase[];
  readonly report: DoctorReport;
  readonly validation: DoctorValidation;
}

export class ProjectDetectionError extends Error {
  readonly code: ProjectDetectionErrorCode;

  constructor(code: ProjectDetectionErrorCode, message: string) {
    super(message);
    this.name = "ProjectDetectionError";
    this.code = code;
  }
}
