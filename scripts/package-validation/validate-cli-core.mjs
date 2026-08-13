import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareConsumer } from "./consumer.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const fixtureDirectory = path.join(repositoryRoot, "fixtures/cli-init");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vii-cli-pack-check-"));
const artifactDirectory = path.join(temporaryRoot, "artifact");
const coreArtifactDirectory = path.join(temporaryRoot, "core-artifact");
const consumerDirectory = path.join(temporaryRoot, "consumer");

function run(command, args, cwd = repositoryRoot) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
}

try {
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(coreArtifactDirectory, { recursive: true });
  await mkdir(consumerDirectory, { recursive: true });
  run(pnpm, ["--filter", "@vii/core", "build"]);
  run(pnpm, ["--filter", "@vii/cli-core", "build"]);
  run(pnpm, ["--filter", "@vii/core", "pack", "--pack-destination", coreArtifactDirectory]);
  run(pnpm, ["--filter", "@vii/cli-core", "pack", "--pack-destination", artifactDirectory]);

  const artifactNames = await readdir(artifactDirectory);
  assert.equal(artifactNames.length, 1, "expected one CLI Core package artifact");
  const artifactPath = path.join(artifactDirectory, artifactNames[0]);
  const coreArtifactNames = await readdir(coreArtifactDirectory);
  assert.equal(coreArtifactNames.length, 1, "expected one Core package artifact");
  const coreArtifactPath = path.join(coreArtifactDirectory, coreArtifactNames[0]);
  const entries = execFileSync("tar", ["-tzf", artifactPath], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.deepEqual(
    new Set(entries),
    new Set([
      "package/README.md",
      "package/dist/detect-project.d.ts",
      "package/dist/detect-project.d.ts.map",
      "package/dist/detect-project.js",
      "package/dist/detect-project.js.map",
      "package/dist/add-state.d.ts",
      "package/dist/add-state.d.ts.map",
      "package/dist/add-state.js",
      "package/dist/add-state.js.map",
      "package/dist/doctor-project.d.ts",
      "package/dist/doctor-project.d.ts.map",
      "package/dist/doctor-project.js",
      "package/dist/doctor-project.js.map",
      "package/dist/machine-output.d.ts",
      "package/dist/machine-output.d.ts.map",
      "package/dist/machine-output.js",
      "package/dist/machine-output.js.map",
      "package/dist/trace-inspection.d.ts",
      "package/dist/trace-inspection.d.ts.map",
      "package/dist/trace-inspection.js",
      "package/dist/trace-inspection.js.map",
      "package/dist/init-project.d.ts",
      "package/dist/init-project.d.ts.map",
      "package/dist/init-project.js",
      "package/dist/init-project.js.map",
      "package/dist/index.d.ts",
      "package/dist/index.d.ts.map",
      "package/dist/index.js",
      "package/dist/index.js.map",
      "package/dist/project-files.d.ts",
      "package/dist/project-files.d.ts.map",
      "package/dist/project-files.js",
      "package/dist/project-files.js.map",
      "package/dist/types.d.ts",
      "package/dist/types.d.ts.map",
      "package/dist/types.js",
      "package/dist/types.js.map",
      "package/package.json",
    ]),
    "CLI Core artifact contains unexpected files",
  );

  await prepareConsumer({
    directory: consumerDirectory,
    fixtureDirectory,
    packageJson: {
      name: "vii-packed-cli-consumer",
      private: true,
      type: "module",
      packageManager: "pnpm@10.12.4",
      devDependencies: { "@types/node": "22.17.0" },
      dependencies: {
        "@vii/cli-core": `file:${artifactPath}`,
        "@vii/core": `file:${coreArtifactPath}`,
      },
    },
    repositoryRoot,
    pnpm,
  });
  const consumer = await import(path.join(consumerDirectory, "dist/main.js"));
  assert.equal(consumer.detectedPackageManager, "pnpm");
  assert.deepEqual(consumer.detectedViiPackages, ["@vii/cli-core", "@vii/core"]);
  assert.equal(consumer.initStatus, "dry-run");
  assert.deepEqual(consumer.initFiles, ["vii.config.ts"]);
  assert.equal(consumer.addStateStatus, "dry-run");
  assert.deepEqual(consumer.addStateFiles, ["src/state.ts"]);
  assert.equal(consumer.doctorStatus, "healthy");
  assert.deepEqual(consumer.doctorFindingCodes, []);
  assert.deepEqual(consumer.machineOutputProtocols, ["vii.cli", "vii.cli", "vii.cli"]);
  assert.deepEqual(consumer.machineOutputVersions, [1, 1, 1]);
  assert.equal(consumer.machineOutputJsonRoundTrip.protocol, "vii.cli");
  assert.equal(consumer.machineOutputJsonRoundTrip.command, "doctor");
  assert.equal(consumer.traceInspectionEventCount, 2);
  assert.equal(consumer.traceInspectionDroppedEvents, 0);
  assert.deepEqual(consumer.traceInspectionEventTypes, [
    { type: "state.created", count: 1 },
    { type: "state.updated", count: 1 },
  ]);
  assert.deepEqual(consumer.traceInspectionScopeGraph, {
    scopes: [{ scopeId: "scope-1" }],
    resources: [{ resourceId: "resource-2", scopeId: "scope-1" }],
  });
  console.log("Packed CLI Core artifact with clean consumer validated.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
