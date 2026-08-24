import { describe, expect, it } from "vitest";
import buttonManifest from "./fixtures/button.manifest.json" with { type: "json" };
import {
  checkFileModifications,
  createInitialLockState,
  detachRegistryItem,
  parseLockfile,
  recordInstalledItem,
  serializeLockfile,
} from "./lockfile.js";
import { validateRegistryManifest } from "./manifest-validator.js";

describe("Lockfile Management & Source Detachment", () => {
  const manifest = validateRegistryManifest(buttonManifest);

  it("records installed items and original file integrity hashes into lockfile state", () => {
    const lock = createInitialLockState();
    const installedFiles = {
      "button.tsx": {
        target: "components/ui/button.tsx",
        integrity: "sha256-abc123hash",
      },
    };

    const updatedLock = recordInstalledItem(
      lock,
      manifest,
      installedFiles,
      "2026-08-22T00:00:00.000Z",
    );
    expect(updatedLock.items["button"]).toBeDefined();

    const record = updatedLock.items["button"]!;
    expect(record.version).toBe("0.1.0");
    expect(record.files["button.tsx"]!.originalIntegrity).toBe("sha256-abc123hash");
  });

  it("serializes and parses lockfile deterministically with sorted item keys", () => {
    let lock = createInitialLockState();
    lock = recordInstalledItem(lock, manifest, {
      "button.tsx": { target: "components/ui/button.tsx", integrity: "sha256-hash1" },
    });

    const serialized1 = serializeLockfile(lock);
    const serialized2 = serializeLockfile(lock);
    expect(serialized1).toBe(serialized2);

    const parsed = parseLockfile(serialized1);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.items["button"]).toBeDefined();
  });

  it("detects user modifications compared to original recorded lockfile hashes", () => {
    const lock = recordInstalledItem(createInitialLockState(), manifest, {
      "button.tsx": { target: "components/ui/button.tsx", integrity: "sha256-original" },
    });

    const unmodifiedDisk = { "components/ui/button.tsx": "sha256-original" };
    const check1 = checkFileModifications(lock.items["button"]!, unmodifiedDisk);
    expect(check1.isModified).toBe(false);

    const modifiedDisk = { "components/ui/button.tsx": "sha256-user-edited-hash" };
    const check2 = checkFileModifications(lock.items["button"]!, modifiedDisk);
    expect(check2.isModified).toBe(true);
    expect(check2.modifiedFiles).toContain("components/ui/button.tsx");
  });

  it("detects deleted files separately from modified files and marks isModified as true", () => {
    const lock = recordInstalledItem(createInitialLockState(), manifest, {
      "button.tsx": { target: "components/ui/button.tsx", integrity: "sha256-btn-hash" },
      "dialog.tsx": { target: "components/ui/dialog.tsx", integrity: "sha256-dlg-hash" },
      "icon.tsx": { target: "components/ui/icon.tsx", integrity: "sha256-ico-hash" },
    });

    // button.tsx is untouched, dialog.tsx is modified, icon.tsx is deleted (missing from disk map)
    const diskState = {
      "components/ui/button.tsx": "sha256-btn-hash",
      "components/ui/dialog.tsx": "sha256-dlg-custom-hash",
    };

    const check = checkFileModifications(lock.items["button"]!, diskState);
    expect(check.isModified).toBe(true);
    expect(check.modifiedFiles).toEqual(["components/ui/dialog.tsx"]);
    expect((check as any).deletedFiles).toEqual(["components/ui/icon.tsx"]);
    expect(check.modifiedFiles).not.toContain("components/ui/button.tsx");
    expect((check as any).deletedFiles).not.toContain("components/ui/button.tsx");
  });

  it("reports isModified true when only deleted files exist", () => {
    const lock = recordInstalledItem(createInitialLockState(), manifest, {
      "button.tsx": { target: "components/ui/button.tsx", integrity: "sha256-original" },
    });

    // Empty disk - button.tsx was deleted
    const emptyDisk = {};
    const check = checkFileModifications(lock.items["button"]!, emptyDisk);
    expect(check.isModified).toBe(true);
    expect(check.modifiedFiles).toHaveLength(0);
    expect((check as any).deletedFiles).toEqual(["components/ui/button.tsx"]);
  });

  it("detaches an item cleanly from the lockfile without deleting local source files", () => {
    let lock = recordInstalledItem(createInitialLockState(), manifest, {
      "button.tsx": { target: "components/ui/button.tsx", integrity: "sha256-hash" },
    });

    expect(lock.items["button"]).toBeDefined();

    const detachedLock = detachRegistryItem(lock, "button");
    expect(detachedLock.items["button"]).toBeUndefined();
  });
});
