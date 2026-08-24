import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("enforces allowedRoots option in installSourceItem", async () => {
    // sampleManifest targets "components/ui/button.tsx"
    // When allowedRoots is ["src/components"], it must be rejected with DISALLOWED_ROOT
    await expect(
      installSourceItem(tempDir, sampleManifest, samplePayloads, {
        allowedRoots: ["src/components"],
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "DISALLOWED_ROOT",
      }),
    );

    // When allowedRoots is ["components"], it succeeds
    const successResult = await installSourceItem(tempDir, sampleManifest, samplePayloads, {
      allowedRoots: ["components"],
    });
    expect(successResult.applied).toBe(true);
    expect(successResult.report.status).toBe("applied");
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

  describe("rollback on failure and corrupt lockfile handling", () => {
    const code1 = "export const A = 1;\n";
    const code2 = "export const B = 2;\n";
    const code3 = "export const C = 3;\n";
    const hash1 = computeSha256(code1);
    const hash2 = computeSha256(code2);
    const hash3 = computeSha256(code3);

    const multiFileManifest: RegistryItemManifest = {
      schemaVersion: 1,
      name: "widget",
      type: "ui:component",
      version: "0.1.0",
      target: "react",
      mode: "source",
      files: [
        { source: "a.tsx", target: "components/widget/a.tsx", integrity: hash1 },
        { source: "b.tsx", target: "components/widget/b.tsx", integrity: hash2 },
        { source: "c.tsx", target: "components/widget/blocked/c.tsx", integrity: hash3 },
      ],
    };

    const multiPayloads = {
      "a.tsx": code1,
      "b.tsx": code2,
      "c.tsx": code3,
    };

    it("rolls back all created files when a subsequent file write fails", async () => {
      const { chmod, mkdir } = await import("node:fs/promises");
      const readonlyDir = path.join(tempDir, "components/widget/readonly");
      await mkdir(readonlyDir, { recursive: true });

      const failManifest: RegistryItemManifest = {
        schemaVersion: 1,
        name: "widget",
        type: "ui:component",
        version: "0.1.0",
        target: "react",
        mode: "source",
        files: [
          { source: "a.tsx", target: "components/widget/a.tsx", integrity: hash1 },
          { source: "b.tsx", target: "components/widget/b.tsx", integrity: hash2 },
          { source: "c.tsx", target: "components/widget/readonly/c.tsx", integrity: hash3 },
        ],
      };

      // Make directory read-only so writeFile fails with EACCES during apply phase
      await chmod(readonlyDir, 0o555);

      try {
        await expect(installSourceItem(tempDir, failManifest, multiPayloads)).rejects.toThrow();

        // Files a.tsx and b.tsx must have been rolled back (unlinked)
        await expect(
          readFile(path.join(tempDir, "components/widget/a.tsx"), "utf8"),
        ).rejects.toThrow();
        await expect(
          readFile(path.join(tempDir, "components/widget/b.tsx"), "utf8"),
        ).rejects.toThrow();
      } finally {
        await chmod(readonlyDir, 0o777);
      }
    });

    it("does not delete pre-existing skipped files during rollback", async () => {
      const { chmod, mkdir } = await import("node:fs/promises");
      const readonlyDir = path.join(tempDir, "components/widget/readonly");
      await mkdir(readonlyDir, { recursive: true });

      // Pre-install a.tsx so it is classified as 'skip'
      await writeFile(path.join(tempDir, "components/widget/a.tsx"), code1, "utf8");

      const failManifest: RegistryItemManifest = {
        schemaVersion: 1,
        name: "widget",
        type: "ui:component",
        version: "0.1.0",
        target: "react",
        mode: "source",
        files: [
          { source: "a.tsx", target: "components/widget/a.tsx", integrity: hash1 },
          { source: "b.tsx", target: "components/widget/b.tsx", integrity: hash2 },
          { source: "c.tsx", target: "components/widget/readonly/c.tsx", integrity: hash3 },
        ],
      };

      // Make directory read-only so writeFile fails with EACCES during apply phase
      await chmod(readonlyDir, 0o555);

      try {
        await expect(installSourceItem(tempDir, failManifest, multiPayloads)).rejects.toThrow();

        // a.tsx was pre-existing (skip action), so it must NOT be deleted
        const existingFile = await readFile(path.join(tempDir, "components/widget/a.tsx"), "utf8");
        expect(existingFile).toBe(code1);

        // b.tsx was created in this run, so it must have been rolled back
        await expect(
          readFile(path.join(tempDir, "components/widget/b.tsx"), "utf8"),
        ).rejects.toThrow();
      } finally {
        await chmod(readonlyDir, 0o777);
      }
    });

    it("throws hard error on malformed vii.lock instead of silently resetting it", async () => {
      const lockPath = path.join(tempDir, "vii.lock");
      const corruptContent = '{"schemaVersion": 1, "items": { INVALID JSON }';
      await writeFile(lockPath, corruptContent, "utf8");

      await expect(installSourceItem(tempDir, sampleManifest, samplePayloads)).rejects.toThrow(
        /Failed to parse lockfile JSON|Lockfile/,
      );

      // Lockfile content was not silently overwritten
      const lockOnDisk = await readFile(lockPath, "utf8");
      expect(lockOnDisk).toBe(corruptContent);
    });

    it("starts fresh when vii.lock does not exist", async () => {
      const lockPath = path.join(tempDir, "vii.lock");
      await expect(readFile(lockPath, "utf8")).rejects.toThrow();

      const result = await installSourceItem(tempDir, sampleManifest, samplePayloads);
      expect(result.applied).toBe(true);

      const rawLock = await readFile(lockPath, "utf8");
      const parsed = parseLockfile(rawLock);
      expect(parsed.items["button"]).toBeDefined();
    });
  });
});
