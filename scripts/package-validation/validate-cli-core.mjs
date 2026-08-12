import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareConsumer } from "./consumer.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const fixtureDirectory = path.join(repositoryRoot, "fixtures/cli-detection");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vii-cli-pack-check-"));
const artifactDirectory = path.join(temporaryRoot, "artifact");
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
  await mkdir(consumerDirectory, { recursive: true });
  run(pnpm, ["--filter", "@vii/cli-core", "build"]);
  run(pnpm, ["--filter", "@vii/cli-core", "pack", "--pack-destination", artifactDirectory]);

  const artifactNames = await readdir(artifactDirectory);
  assert.equal(artifactNames.length, 1, "expected one CLI Core package artifact");
  const artifactPath = path.join(artifactDirectory, artifactNames[0]);
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
      dependencies: { "@vii/cli-core": `file:${artifactPath}` },
      devDependencies: { "@types/node": "22.17.0" },
    },
    repositoryRoot,
    pnpm,
  });
  const consumer = await import(path.join(consumerDirectory, "dist/main.js"));
  assert.equal(consumer.detectedPackageManager, "pnpm");
  assert.deepEqual(consumer.detectedViiPackages, ["@vii/cli-core"]);
  console.log("Packed CLI Core artifact with clean consumer validated.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
