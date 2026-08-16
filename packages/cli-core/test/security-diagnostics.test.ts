import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { createDiagnostics } from "@vii-labs/core";
import { addState, inspectTrace } from "../src/index.js";

test("addState records a security event when src is a symlink", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vii-security-producer-"));
  const sourceTarget = await mkdtemp(path.join(os.tmpdir(), "vii-security-source-"));

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    );
    await symlink(sourceTarget, path.join(root, "src"), "dir");

    const diagnostics = createDiagnostics({ clock: () => 500 });
    const result = await addState(root, { dryRun: true, diagnostics });
    const inspection = inspectTrace(diagnostics.exportTrace());

    expect(result.report.status).toBe("blocked");
    expect(inspection.eventTypes).toEqual([{ type: "security.event", count: 1 }]);
    expect(diagnostics.getEvents()[0]?.payload).toEqual({
      code: "VII-SEC-008",
      surface: "path",
      reason: "blocked",
      field: "src",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(sourceTarget, { recursive: true, force: true });
  }
});

test("addState records a security event when state file is a symlink", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vii-security-producer-"));
  const sourceTarget = path.join(root, "src");
  const stateTarget = await mkdtemp(path.join(os.tmpdir(), "vii-security-state-"));
  const externalState = path.join(stateTarget, "state.ts");

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    );
    await mkdir(sourceTarget);
    await writeFile(externalState, "export const external = true;\n");
    await symlink(externalState, path.join(sourceTarget, "state.ts"), "file");

    const diagnostics = createDiagnostics({ clock: () => 501 });
    const result = await addState(root, { diagnostics });
    const inspection = inspectTrace(diagnostics.exportTrace());

    expect(result.report.status).toBe("blocked");
    expect(inspection.eventTypes).toEqual([{ type: "security.event", count: 1 }]);
    expect(diagnostics.getEvents()[0]?.payload).toEqual({
      code: "VII-SEC-008",
      surface: "path",
      reason: "blocked",
      field: "src/state.ts",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(stateTarget, { recursive: true, force: true });
  }
});

test("addState does not record security events for a safe dry-run", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vii-security-producer-"));

  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    );
    await mkdir(path.join(root, "src"));

    const diagnostics = createDiagnostics({ clock: () => 502 });
    const result = await addState(root, { dryRun: true, diagnostics });

    expect(result.report.status).toBe("dry-run");
    expect(diagnostics.getEvents()).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
