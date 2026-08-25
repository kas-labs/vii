import { constants } from "node:fs";
import { open, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { type DetectionConflict, type DetectionEvidence, ProjectDetectionError } from "./types.js";

export interface PackageManifest {
  readonly name?: unknown;
  readonly packageManager?: unknown;
  readonly dependencies?: unknown;
  readonly devDependencies?: unknown;
  readonly peerDependencies?: unknown;
  readonly engines?: unknown;
  readonly workspaces?: unknown;
}

export interface DetectionContext {
  readonly root: string;
  readonly files: ReadonlySet<string>;
  readonly manifest: PackageManifest;
  readonly evidence: DetectionEvidence[];
  readonly conflicts: DetectionConflict[];
}

export type ExistingFileInspection = "missing" | "same" | "different" | "symlink";

export async function inspectExistingFile(
  target: string,
  expectedContent: string,
): Promise<ExistingFileInspection> {
  let handle;
  try {
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    return (await handle.readFile("utf8")) === expectedContent ? "same" : "different";
  } catch (error) {
    if (isFileMissing(error)) {
      return "missing";
    }
    if (isSymlink(error)) {
      return "symlink";
    }
    return "different";
  } finally {
    await handle?.close();
  }
}

export async function readRootFiles(root: string): Promise<ReadonlySet<string>> {
  try {
    const rootStats = await stat(root);
    if (!rootStats.isDirectory()) {
      throw new ProjectDetectionError("invalid-root", `Project root is not a directory: ${root}`);
    }

    const entries = await readdir(root, { withFileTypes: true });
    return new Set(entries.map((entry) => entry.name));
  } catch (error) {
    if (error instanceof ProjectDetectionError) {
      throw error;
    }

    throw new ProjectDetectionError("unreadable-root", `Project root cannot be read: ${root}`);
  }
}

export async function readManifest(
  root: string,
  evidence: DetectionEvidence[],
  conflicts: DetectionConflict[],
): Promise<PackageManifest> {
  const manifestPath = path.join(root, "package.json");

  try {
    const content = await readFile(manifestPath, "utf8");
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) {
      throw new Error("manifest is not an object");
    }

    evidence.push({ field: "packageManifest", source: "package.json", detail: "manifest read" });
    return parsed;
  } catch (error) {
    if (isFileMissing(error)) {
      return {};
    }

    conflicts.push({
      field: "packageManifest",
      message: "package.json is malformed and was ignored",
      sources: ["package.json"],
    });
    return {};
  }
}

export async function readSourceFiles(root: string): Promise<readonly string[]> {
  const sourceRoot = path.join(root, "src");
  try {
    const entries = await readdir(sourceRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileMissing(error: unknown): boolean {
  return isRecord(error) && error["code"] === "ENOENT";
}

function isSymlink(error: unknown): boolean {
  return isRecord(error) && error["code"] === "ELOOP";
}
