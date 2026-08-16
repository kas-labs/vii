import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import {
  addState,
  createMachineOutput,
  doctorProject,
  initProject,
  stringifyMachineOutput,
} from "../src/index.js";

test("machine output wraps doctor diagnostics in a versioned JSON envelope", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await doctorProject(root);
    const output = createMachineOutput("doctor", result);

    expect(output).toMatchObject({
      protocol: "vii.cli",
      version: 1,
      command: "doctor",
      kind: "diagnostics",
      status: "healthy",
      findings: [],
    });
    expect(JSON.parse(stringifyMachineOutput(output))).toEqual(output);
  } finally {
    await removeFixture(root);
  }
});

test("machine output preserves an init plan and validation result", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "package-lock.json": "lockfile\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await initProject(root, { dryRun: true });
    const output = createMachineOutput("init", result);

    expect(output).toMatchObject({
      command: "init",
      kind: "mutation",
      status: "dry-run",
      plan: { conflicts: [], files: [{ action: "create", path: "vii.config.ts" }] },
      validation: { passed: true },
    });
    expect(output.plan.files[0]?.content).toContain('"framework": "react"');
  } finally {
    await removeFixture(root);
  }
});

test("machine output preserves the add state planned file", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await addState(root, { dryRun: true });
    const output = createMachineOutput("add state", result);

    expect(output).toMatchObject({
      command: "add state",
      kind: "mutation",
      status: "dry-run",
      plan: { conflicts: [], files: [{ action: "create", path: "src/state.ts" }] },
      validation: { passed: true },
    });
    expect(output.plan.files[0]?.content).toContain('from "@vii-labs/core"');
  } finally {
    await removeFixture(root);
  }
});

async function createFixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "vii-machine-output-"));
  for (const [name, contents] of Object.entries(files)) {
    const filePath = path.join(root, name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
  }
  return root;
}

async function removeFixture(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}
