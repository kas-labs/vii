import { computeManifestIntegrity } from "./integrity.js";
import { ManifestValidationError } from "./manifest-validator.js";
import type { LockfileItemRecord, LockState, RegistryItemManifest } from "./types.js";

export function createInitialLockState(): LockState {
  return {
    schemaVersion: 1,
    items: {},
  };
}

export function recordInstalledItem(
  currentLock: LockState,
  manifest: RegistryItemManifest,
  installedFiles: Record<string, { target: string; integrity: string }>,
  installedAt = new Date().toISOString(),
): LockState {
  const fileRecords: LockfileItemRecord["files"] = {};
  for (const [key, file] of Object.entries(installedFiles)) {
    fileRecords[key] = {
      target: file.target,
      originalIntegrity: file.integrity,
      installedAt,
    };
  }

  const itemRecord: LockfileItemRecord = {
    name: manifest.name,
    type: manifest.type,
    version: manifest.version,
    target: manifest.target,
    mode: manifest.mode,
    registry: manifest.provenance?.registryUrl,
    manifestIntegrity: computeManifestIntegrity(manifest),
    files: fileRecords,
    dependencies: manifest.dependencies,
    tokens: manifest.tokens,
    detached: false,
  };

  return {
    schemaVersion: 1,
    items: {
      ...currentLock.items,
      [manifest.name]: itemRecord,
    },
  };
}

export function detachRegistryItem(currentLock: LockState, itemName: string): LockState {
  if (!currentLock.items[itemName]) {
    throw new ManifestValidationError(
      `Cannot detach unregistered item "${itemName}"`,
      "ITEM_NOT_FOUND",
      itemName,
    );
  }

  const updatedItems = { ...currentLock.items };
  delete updatedItems[itemName];

  return {
    schemaVersion: 1,
    items: updatedItems,
  };
}

export function serializeLockfile(lockState: LockState): string {
  const sortedItemKeys = Object.keys(lockState.items).sort();
  const sortedItems: Record<string, LockfileItemRecord> = {};

  for (const key of sortedItemKeys) {
    sortedItems[key] = lockState.items[key]!;
  }

  const payload = {
    schemaVersion: lockState.schemaVersion,
    items: sortedItems,
  };

  return JSON.stringify(payload, null, 2) + "\n";
}

export function parseLockfile(raw: string): LockState {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return createInitialLockState();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    throw new ManifestValidationError(
      `Failed to parse lockfile JSON: ${err.message}`,
      "LOCKFILE_PARSE_ERROR",
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new ManifestValidationError("Lockfile must be a JSON object", "INVALID_LOCKFILE");
  }

  const lock = parsed as Partial<LockState>;
  if (lock.schemaVersion !== 1) {
    throw new ManifestValidationError(
      `Unsupported lockfile schemaVersion: ${lock.schemaVersion}`,
      "UNSUPPORTED_LOCK_VERSION",
    );
  }

  return {
    schemaVersion: 1,
    items: lock.items ?? {},
  };
}

export function checkFileModifications(
  lockRecord: LockfileItemRecord,
  currentFileHashes: Record<string, string>,
): { isModified: boolean; modifiedFiles: string[] } {
  const modifiedFiles: string[] = [];

  for (const [sourceKey, fileRecord] of Object.entries(lockRecord.files)) {
    const currentHash = currentFileHashes[fileRecord.target];
    if (currentHash !== undefined && currentHash !== fileRecord.originalIntegrity) {
      modifiedFiles.push(fileRecord.target);
    }
  }

  return {
    isModified: modifiedFiles.length > 0,
    modifiedFiles,
  };
}
