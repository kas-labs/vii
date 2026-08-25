import { lstat, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectProject } from "./detect-project.js";
import { inspectExistingFile, type ExistingFileInspection } from "./project-files.js";
import type {
  AddStateOptions,
  AddStatePlan,
  AddStatePlannedFile,
  AddStateReportStatus,
  AddStateResult,
  AddStateValidation,
  DetectedProject,
  InitPhase,
} from "./types.js";

const stateFile = "src/state.ts";
const phases: readonly InitPhase[] = ["analyze", "plan", "preview", "apply", "validate", "report"];

export async function addState(
  inputRoot: string,
  options: AddStateOptions = {},
): Promise<AddStateResult> {
  const detection = await detectProject(inputRoot);
  const target = path.resolve(detection.root, stateFile);
  const expectedContent = createStateSource();
  const inspection = await inspectExistingFile(target, expectedContent);
  const sourceDirectory = await inspectSourceDirectory(path.dirname(target));
  const conflicts = createConflicts(detection, inspection, sourceDirectory);
  recordSecurityConflict(options.diagnostics, inspection, sourceDirectory);
  const files =
    inspection === "missing" && sourceDirectory === "directory" && conflicts.length === 0
      ? [createPlannedFile(expectedContent)]
      : [];
  const plan: AddStatePlan = { conflicts, files };
  const blocked = conflicts.length > 0;
  let applied = false;

  if (!blocked && !options.dryRun && files.length > 0) {
    const srcDir = path.dirname(target);
    const [realRoot, realSrc] = await Promise.all([realpath(detection.root), realpath(srcDir)]);
    const relative = path.relative(realRoot, realSrc);
    if (relative !== "src") {
      throw new Error("Security violation: source directory escapes project root");
    }
    const srcStat = await lstat(srcDir);
    if (srcStat.isSymbolicLink() || !srcStat.isDirectory()) {
      throw new Error("Security violation: source directory is not a safe directory");
    }
    await writeFile(target, expectedContent, { encoding: "utf8", flag: "wx" });
    applied = true;
  }

  const validation = await validateTarget(target, expectedContent, plan, options.dryRun === true);
  const status: AddStateReportStatus = blocked
    ? "blocked"
    : options.dryRun
      ? "dry-run"
      : applied
        ? "applied"
        : "unchanged";

  return {
    applied,
    detection,
    phases,
    plan,
    report: {
      status,
      files: files.map((file) => file.path),
      message: createMessage(status, files),
    },
    validation,
  };
}

function createStateSource(): string {
  return [
    'import { state } from "@vii-labs/core";',
    "",
    "export const appState = state({});",
    "",
  ].join("\n");
}

function createPlannedFile(content: string): AddStatePlannedFile {
  return { action: "create", content, path: stateFile };
}

function createConflicts(
  detection: DetectedProject,
  inspection: ExistingFileInspection,
  sourceDirectory: SourceDirectoryInspection,
): readonly string[] {
  const conflicts = detection.conflicts.map((conflict) => conflict.message);
  if (!detection.installedViiPackages.includes("@vii-labs/core")) {
    conflicts.push(
      "@vii-labs/core is not installed; install it explicitly before running vii add state",
    );
  }
  if (inspection === "different") {
    conflicts.push(`${stateFile} already exists with local changes`);
  }
  if (inspection === "symlink") {
    conflicts.push(`${stateFile} is a symbolic link and cannot be changed safely`);
  }
  if (sourceDirectory === "missing") {
    conflicts.push(
      "src directory does not exist; create it explicitly before running vii add state",
    );
  }
  if (sourceDirectory === "symlink") {
    conflicts.push("src directory is a symbolic link and cannot be changed safely");
  }
  if (sourceDirectory === "not-directory") {
    conflicts.push(
      "src path is not a directory; create the application source directory explicitly",
    );
  }
  return conflicts;
}

type SourceDirectoryInspection = "directory" | "missing" | "not-directory" | "symlink";

async function inspectSourceDirectory(sourceDirectory: string): Promise<SourceDirectoryInspection> {
  try {
    const directory = await lstat(sourceDirectory);
    if (directory.isSymbolicLink()) {
      return "symlink";
    }
    return directory.isDirectory() ? "directory" : "not-directory";
  } catch (error) {
    return isMissingError(error) ? "missing" : "not-directory";
  }
}

function isMissingError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function recordSecurityConflict(
  diagnostics: AddStateOptions["diagnostics"],
  inspection: ExistingFileInspection,
  sourceDirectory: SourceDirectoryInspection,
): void {
  const field =
    inspection === "symlink" ? stateFile : sourceDirectory === "symlink" ? "src" : undefined;
  if (field === undefined) {
    return;
  }

  diagnostics?.recordSecurity({
    code: "VII-SEC-008",
    surface: "path",
    reason: "blocked",
    field,
  });
}

async function validateTarget(
  target: string,
  expectedContent: string,
  plan: AddStatePlan,
  dryRun: boolean,
): Promise<AddStateValidation> {
  if (plan.conflicts.length > 0) {
    return { errors: plan.conflicts, files: [], passed: false };
  }
  if (dryRun && plan.files.length > 0) {
    return { errors: [], files: plan.files.map((file) => file.path), passed: true };
  }
  const inspection = await inspectExistingFile(target, expectedContent);
  return inspection === "same"
    ? { errors: [], files: [], passed: true }
    : { errors: [`${stateFile} failed validation`], files: [], passed: false };
}

function createMessage(
  status: AddStateReportStatus,
  files: readonly AddStatePlannedFile[],
): string {
  if (status === "blocked") {
    return "vii add state did not change the project";
  }
  if (status === "unchanged") {
    return "vii add state found no changes to apply";
  }
  return status === "dry-run"
    ? `vii add state would create ${files.length} file`
    : `vii add state created ${files.length} file`;
}
