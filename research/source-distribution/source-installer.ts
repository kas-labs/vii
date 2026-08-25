import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { verifyContentIntegrity } from "../registry/integrity.js";
import {
  createInitialLockState,
  parseLockfile,
  recordInstalledItem,
  serializeLockfile,
} from "../registry/lockfile.js";
import { validateRegistryManifest } from "../registry/manifest-validator.js";
import type { LockState, RegistryItemManifest } from "../registry/types.js";
import type {
  UIAddOptions,
  UIAddPhase,
  UIAddPlan,
  UIAddPlannedFile,
  UIAddReport,
  UIAddReportStatus,
  UIAddResult,
  UIAddValidation,
} from "./types.js";

const PHASES: readonly UIAddPhase[] = [
  "resolve",
  "validate",
  "analyze",
  "plan",
  "preview",
  "apply",
  "validate-result",
  "record-lock",
  "report",
];

const LOCKFILE_NAME = "vii.lock";

export async function installSourceItem(
  projectRoot: string,
  rawManifest: unknown,
  filePayloads: Record<string, string>,
  options: UIAddOptions = {},
): Promise<UIAddResult> {
  const manifest = validateRegistryManifest(rawManifest, {
    allowedRoots: options.allowedRoots,
  });
  const conflicts: string[] = [];

  validateFilePayloadIntegrities(manifest, filePayloads, conflicts);
  const plannedFiles: UIAddPlannedFile[] = [];

  if (conflicts.length === 0) {
    await analyzeAndPlanFiles(projectRoot, manifest, filePayloads, plannedFiles, conflicts);
  }

  const plan: UIAddPlan = {
    item: manifest.name,
    version: manifest.version,
    conflicts,
    files: plannedFiles,
  };

  const isBlocked = conflicts.length > 0;
  const isDryRun = options.dryRun === true;
  let applied = false;
  let lockState: LockState | undefined;

  if (!isBlocked && !isDryRun && plannedFiles.some((f) => f.action === "create")) {
    const createdPaths: string[] = [];
    try {
      await applyFilePlan(projectRoot, plannedFiles, createdPaths);
      lockState = await updateProjectLockfile(projectRoot, manifest, plannedFiles);
      applied = true;
    } catch (err) {
      for (const createdPath of createdPaths) {
        try {
          await unlink(createdPath);
        } catch {
          // ignore rollback cleanup errors
        }
      }
      throw err;
    }
  }

  const validation = validatePlanResult(plan, isBlocked, isDryRun, applied);
  const status = determineStatus(isBlocked, isDryRun, applied, plannedFiles);

  const report: UIAddReport = {
    status,
    item: manifest.name,
    files: plannedFiles.map((f) => f.target),
    message: createReportMessage(status, manifest.name, plannedFiles),
    lockState,
  };

  return {
    applied,
    phases: PHASES,
    manifest,
    plan,
    validation,
    report,
  };
}

function validateFilePayloadIntegrities(
  manifest: RegistryItemManifest,
  payloads: Record<string, string>,
  conflicts: string[],
): void {
  for (const entry of manifest.files) {
    const content = payloads[entry.source];
    if (content === undefined) {
      conflicts.push(`Missing file payload for declared source "${entry.source}"`);
      continue;
    }
    const check = verifyContentIntegrity(content, entry.integrity);
    if (!check.valid) {
      conflicts.push(
        `Integrity mismatch for "${entry.source}": expected ${entry.integrity} but computed ${check.actual}`,
      );
    }
  }
}

type DestinationInspection = "missing" | "same" | "different" | "symlink";

async function inspectDestination(
  absTarget: string,
  expectedContent: string,
): Promise<DestinationInspection> {
  // On POSIX the O_NOFOLLOW open below refuses symlinks atomically, so no
  // lstat probe is needed (avoiding a check-then-open TOCTOU pattern).
  // Windows has no O_NOFOLLOW (the constant is undefined and the open
  // silently follows links), so there lstat is the only available symlink
  // probe - inherently racy, but strictly better than never detecting links.
  if (constants.O_NOFOLLOW === undefined) {
    try {
      if ((await lstat(absTarget)).isSymbolicLink()) {
        return "symlink";
      }
    } catch (err: any) {
      if (err?.code === "ENOENT") return "missing";
      return "different";
    }
  }

  let handle;
  try {
    handle = await open(absTarget, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const content = await handle.readFile("utf8");
    return content === expectedContent ? "same" : "different";
  } catch (err: any) {
    if (err?.code === "ENOENT") return "missing";
    if (err?.code === "ELOOP" || err?.code === "EINVAL") return "symlink";
    return "different";
  } finally {
    await handle?.close();
  }
}

async function analyzeAndPlanFiles(
  projectRoot: string,
  manifest: RegistryItemManifest,
  payloads: Record<string, string>,
  plannedFiles: UIAddPlannedFile[],
  conflicts: string[],
): Promise<void> {
  for (const entry of manifest.files) {
    const absTarget = path.resolve(projectRoot, entry.target);
    const content = payloads[entry.source]!;
    const inspection = await inspectDestination(absTarget, content);

    switch (inspection) {
      case "missing":
        plannedFiles.push({
          action: "create",
          source: entry.source,
          target: entry.target,
          content,
          integrity: entry.integrity,
        });
        break;
      case "same":
        plannedFiles.push({
          action: "skip",
          source: entry.source,
          target: entry.target,
          content,
          integrity: entry.integrity,
        });
        break;
      case "symlink":
        conflicts.push(
          `Destination "${entry.target}" is a symbolic link and cannot be changed safely`,
        );
        break;
      case "different":
        conflicts.push(`Destination "${entry.target}" already exists with local changes`);
        break;
    }
  }
}

async function applyFilePlan(
  projectRoot: string,
  files: UIAddPlannedFile[],
  createdPaths: string[] = [],
): Promise<void> {
  try {
    for (const file of files) {
      if (file.action !== "create") continue;
      const absTarget = path.resolve(projectRoot, file.target);
      await mkdir(path.dirname(absTarget), { recursive: true });
      await writeFile(absTarget, file.content, { encoding: "utf8", flag: "wx" });
      createdPaths.push(absTarget);
    }
  } catch (err) {
    for (const createdPath of createdPaths) {
      try {
        await unlink(createdPath);
      } catch {
        // ignore rollback cleanup errors
      }
    }
    throw err;
  }
}

async function updateProjectLockfile(
  projectRoot: string,
  manifest: RegistryItemManifest,
  files: UIAddPlannedFile[],
): Promise<LockState> {
  const lockPath = path.resolve(projectRoot, LOCKFILE_NAME);
  let currentLock: LockState;
  try {
    const rawLock = await readFile(lockPath, "utf8");
    currentLock = parseLockfile(rawLock);
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      currentLock = createInitialLockState();
    } else {
      throw err;
    }
  }

  const installedFiles: Record<string, { target: string; integrity: string }> = {};
  for (const file of files) {
    installedFiles[file.source] = { target: file.target, integrity: file.integrity };
  }

  const updatedLock = recordInstalledItem(currentLock, manifest, installedFiles);
  await writeFile(lockPath, serializeLockfile(updatedLock), "utf8");
  return updatedLock;
}

function validatePlanResult(
  plan: UIAddPlan,
  isBlocked: boolean,
  isDryRun: boolean,
  applied: boolean,
): UIAddValidation {
  if (isBlocked) {
    return { passed: false, errors: plan.conflicts, files: [] };
  }
  if (isDryRun) {
    return { passed: true, errors: [], files: plan.files.map((f) => f.target) };
  }
  return {
    passed: true,
    errors: [],
    files: plan.files.filter((f) => f.action === "create").map((f) => f.target),
  };
}

function determineStatus(
  isBlocked: boolean,
  isDryRun: boolean,
  applied: boolean,
  files: UIAddPlannedFile[],
): UIAddReportStatus {
  if (isBlocked) return "blocked";
  if (isDryRun) return "dry-run";
  if (applied) return "applied";
  return "unchanged";
}

function createReportMessage(
  status: UIAddReportStatus,
  itemName: string,
  files: UIAddPlannedFile[],
): string {
  const createdCount = files.filter((f) => f.action === "create").length;
  switch (status) {
    case "blocked":
      return `vii ui add ${itemName} did not change the project due to safety conflicts`;
    case "unchanged":
      return `vii ui add ${itemName} found no changes to apply (already up to date)`;
    case "dry-run":
      return `vii ui add ${itemName} would create ${createdCount} file(s)`;
    case "applied":
      return `vii ui add ${itemName} created ${createdCount} file(s)`;
  }
}
