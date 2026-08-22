import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeSha256 } from "../registry/integrity.js";
import { detachRegistryItem, parseLockfile } from "../registry/lockfile.js";
import type { RegistryItemManifest } from "../registry/types.js";
import { installSourceItem } from "./source-installer.js";

describe("Source Distribution Mutation Lifecycle (P6.4)", () => {
  let tempDir: string;

  const buttonSourceCode = "export function Button() { return <button>Click</button>; }\n";
  const buttonHash = computeSha256(buttonSourceCode);

  const sampleManifest: RegistryItemManifest = {
    schemaVersion: 1,
    name: "button",
    type: "ui:component",
    version: "0.1.0",
    target: "react",
    mode: "source",
    files: [
      {
        source: "button.tsx",
        target: "components/ui/button.tsx",
        integrity: buttonHash,
      },
    ],
  };

  const samplePayloads = {
    "button.tsx": buttonSourceCode,
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "vii-source-dist-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("performs clean first-time installation and records lock state", async () => {
    const result = await installSourceItem(tempDir, sampleManifest, samplePayloads);

    expect(result.applied).toBe(true);
    expect(result.report.status).toBe("applied");
    expect(result.phases).toHaveLength(9);

    const writtenFile = await readFile(path.join(tempDir, "components/ui/button.tsx"), "utf8");
    expect(writtenFile).toBe(buttonSourceCode);

    const rawLock = await readFile(path.join(tempDir, "vii.lock"), "utf8");
    const lock = parseLockfile(rawLock);
    expect(lock.items["button"]).toBeDefined();
    expect(lock.items["button"]!.files["button.tsx"]!.originalIntegrity).toBe(buttonHash);
  });

  it("executes byte-for-byte non-mutating dry-run", async () => {
    const result = await installSourceItem(tempDir, sampleManifest, samplePayloads, {
      dryRun: true,
    });

    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("dry-run");
    expect(result.plan.files).toHaveLength(1);

    // Verify zero mutations on disk
    await expect(
      readFile(path.join(tempDir, "components/ui/button.tsx"), "utf8"),
    ).rejects.toThrow();
    await expect(readFile(path.join(tempDir, "vii.lock"), "utf8")).rejects.toThrow();
  });

  it("handles repeated apply as idempotent unchanged when disk state matches", async () => {
    await installSourceItem(tempDir, sampleManifest, samplePayloads);

    // Run second time on identical workspace
    const repeated = await installSourceItem(tempDir, sampleManifest, samplePayloads);
    expect(repeated.applied).toBe(false);
    expect(repeated.report.status).toBe("unchanged");
    expect(repeated.plan.files[0]!.action).toBe("skip");
  });

  it("fails closed when destination file already exists with local user modifications", async () => {
    await installSourceItem(tempDir, sampleManifest, samplePayloads);

    // User edits local component
    const userModified = "export function Button() { return <button>Custom User Edit</button>; }\n";
    await writeFile(path.join(tempDir, "components/ui/button.tsx"), userModified, "utf8");

    // Attempt to re-add component
    const result = await installSourceItem(tempDir, sampleManifest, samplePayloads);
    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.conflicts).toContain(
      'Destination "components/ui/button.tsx" already exists with local changes',
    );

    // Verify user edit is strictly preserved
    const diskContent = await readFile(path.join(tempDir, "components/ui/button.tsx"), "utf8");
    expect(diskContent).toBe(userModified);
  });

  it("blocks installation before writes if payload integrity does not match manifest", async () => {
    const corruptedPayloads = {
      "button.tsx": "export function Corrupted() {}",
    };

    const result = await installSourceItem(tempDir, sampleManifest, corruptedPayloads);
    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.conflicts[0]).toContain("Integrity mismatch");

    // Verify zero files written
    await expect(
      readFile(path.join(tempDir, "components/ui/button.tsx"), "utf8"),
    ).rejects.toThrow();
  });

  it("blocks installation if destination target is a symbolic link", async () => {
    const realTarget = path.join(tempDir, "real-target.tsx");
    await writeFile(realTarget, "real", "utf8");

    const linkPath = path.join(tempDir, "symlink-btn.tsx");
    await symlink(realTarget, linkPath);

    const symlinkManifest: RegistryItemManifest = {
      ...sampleManifest,
      files: [{ source: "button.tsx", target: "symlink-btn.tsx", integrity: buttonHash }],
    };

    const result = await installSourceItem(tempDir, symlinkManifest, samplePayloads);
    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.conflicts[0]).toContain("is a symbolic link");
  });

  it("supports source detachment removing lock tracking while preserving files", async () => {
    const result = await installSourceItem(tempDir, sampleManifest, samplePayloads);
    expect(result.applied).toBe(true);

    const lockPath = path.join(tempDir, "vii.lock");
    const rawLock = await readFile(lockPath, "utf8");
    const lock = parseLockfile(rawLock);

    const detached = detachRegistryItem(lock, "button");
    expect(detached.items["button"]).toBeUndefined();

    // Verify file still exists on disk
    const diskFile = await readFile(path.join(tempDir, "components/ui/button.tsx"), "utf8");
    expect(diskFile).toBe(buttonSourceCode);
  });
});
