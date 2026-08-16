import { detectProject } from "./detect-project.js";
import type {
  DetectedProject,
  DoctorFinding,
  DoctorFindingCode,
  DoctorResult,
  DoctorSeverity,
  DoctorStatus,
} from "./types.js";

const phases = ["analyze", "validate", "report"] as const;

export async function doctorProject(inputRoot: string): Promise<DoctorResult> {
  const detection = await detectProject(inputRoot);
  const findings = createFindings(detection);
  const errors = findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => finding.message);
  const validation = { errors, passed: errors.length === 0 };
  const status = createStatus(findings);

  return {
    detection,
    findings,
    phases,
    report: {
      findings,
      message: createMessage(status, findings),
      status,
    },
    validation,
  };
}

function createFindings(detection: DetectedProject): readonly DoctorFinding[] {
  const findings = detection.conflicts.map((conflict) =>
    createFinding("detection-conflict", "error", conflict.message, conflict.sources),
  );

  if (detection.framework === "unknown") {
    findings.push(
      createFinding(
        "framework-unknown",
        "warning",
        "framework could not be identified from safe project metadata",
        ["project detection"],
      ),
    );
  }
  if (detection.packageManager === "unknown") {
    findings.push(
      createFinding(
        "package-manager-unknown",
        "warning",
        "package manager could not be identified from lockfiles or package metadata",
        ["project detection"],
      ),
    );
  }
  if (detection.language === "unknown") {
    findings.push(
      createFinding(
        "language-unknown",
        "warning",
        "project language could not be identified from safe source metadata",
        ["project detection"],
      ),
    );
  }
  addViiFindings(findings, detection);
  return findings;
}

function addViiFindings(findings: DoctorFinding[], detection: DetectedProject): void {
  const packages = new Set(detection.installedViiPackages);
  if (packages.size === 0) {
    findings.push(
      createFinding("vii-core-missing", "info", "no Vii package is declared in the project", [
        "package.json",
      ]),
    );
    return;
  }
  if (!packages.has("@vii-labs/core")) {
    findings.push(
      createFinding(
        "vii-core-missing",
        "error",
        "Vii packages are declared but @vii-labs/core is missing",
        ["package.json"],
      ),
    );
  }
  addAdapterFinding(findings, detection, packages);
  if (detection.workspace === "nx" && !packages.has("@vii-labs/nx")) {
    findings.push(
      createFinding(
        "nx-integration-missing",
        "warning",
        "Nx workspace detected without the Vii Nx integration",
        ["nx.json", "package.json"],
      ),
    );
  }
  if (detection.rendering === "mixed") {
    findings.push(
      createFinding(
        "rendering-ambiguous",
        "warning",
        "client and SSR rendering markers both require explicit review",
        ["project detection"],
      ),
    );
  }
}

function addAdapterFinding(
  findings: DoctorFinding[],
  detection: DetectedProject,
  packages: ReadonlySet<string>,
): void {
  const adapter =
    detection.framework === "react"
      ? "@vii-labs/react"
      : detection.framework === "angular"
        ? "@vii-labs/angular"
        : detection.framework === "vue"
          ? "@vii-labs/vue"
          : undefined;
  if (adapter !== undefined && !packages.has(adapter)) {
    findings.push(
      createFinding(
        "adapter-missing",
        "warning",
        `${adapter} is missing for the detected ${detection.framework} project`,
        ["package.json", "project detection"],
      ),
    );
  }
}

function createFinding(
  code: DoctorFindingCode,
  severity: DoctorSeverity,
  message: string,
  sources: readonly string[],
): DoctorFinding {
  return { code, message, severity, sources };
}

function createStatus(findings: readonly DoctorFinding[]): DoctorStatus {
  if (findings.some((finding) => finding.severity === "error")) {
    return "blocked";
  }
  return findings.some((finding) => finding.severity === "warning") ? "attention" : "healthy";
}

function createMessage(status: DoctorStatus, findings: readonly DoctorFinding[]): string {
  if (status === "healthy") {
    return "vii doctor found no actionable issues";
  }
  return status === "blocked"
    ? `vii doctor found ${findings.length} blocking issue${findings.length === 1 ? "" : "s"}`
    : `vii doctor found ${findings.length} issue${findings.length === 1 ? "" : "s"} for review`;
}
