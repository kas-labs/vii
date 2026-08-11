import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const fixtureDirectory = path.join(repositoryRoot, "fixtures/vanilla");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vii-pack-check-"));
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

  run(pnpm, ["--filter", "@vii/core", "build"]);
  run(pnpm, ["--filter", "@vii/core", "pack", "--pack-destination", artifactDirectory]);

  const artifactNames = await readdir(artifactDirectory);
  assert.equal(artifactNames.length, 1, "expected exactly one Core package artifact");
  const artifactPath = path.join(artifactDirectory, artifactNames[0]);
  const entries = execFileSync("tar", ["-tzf", artifactPath], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  const expectedEntries = new Set([
    "package/README.md",
    "package/dist/batch.d.ts",
    "package/dist/batch.d.ts.map",
    "package/dist/batch.js",
    "package/dist/batch.js.map",
    "package/dist/computed.d.ts",
    "package/dist/computed.d.ts.map",
    "package/dist/computed.js",
    "package/dist/computed.js.map",
    "package/dist/index.d.ts",
    "package/dist/index.d.ts.map",
    "package/dist/index.js",
    "package/dist/index.js.map",
    "package/dist/notifier.d.ts",
    "package/dist/notifier.d.ts.map",
    "package/dist/notifier.js",
    "package/dist/notifier.js.map",
    "package/dist/state.d.ts",
    "package/dist/state.d.ts.map",
    "package/dist/state.js",
    "package/dist/state.js.map",
    "package/dist/scheduler.d.ts",
    "package/dist/scheduler.d.ts.map",
    "package/dist/scheduler.js",
    "package/dist/scheduler.js.map",
    "package/dist/scope-context.d.ts",
    "package/dist/scope-context.d.ts.map",
    "package/dist/scope-context.js",
    "package/dist/scope-context.js.map",
    "package/dist/scope.d.ts",
    "package/dist/scope.d.ts.map",
    "package/dist/scope.js",
    "package/dist/scope.js.map",
    "package/dist/tracking.d.ts",
    "package/dist/tracking.d.ts.map",
    "package/dist/tracking.js",
    "package/dist/tracking.js.map",
    "package/package.json",
  ]);
  assert.deepEqual(new Set(entries), expectedEntries, "Core artifact contains unexpected files");

  await cp(path.join(fixtureDirectory, "src"), path.join(consumerDirectory, "src"), {
    recursive: true,
  });
  await writeFile(
    path.join(consumerDirectory, "package.json"),
    JSON.stringify(
      {
        name: "vii-packed-consumer",
        private: true,
        type: "module",
        dependencies: { "@vii/core": `file:${artifactPath}` },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(consumerDirectory, "tsconfig.json"),
    JSON.stringify(
      {
        extends: path.join(repositoryRoot, "tsconfig.base.json"),
        compilerOptions: {
          noEmit: false,
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );

  run(pnpm, ["install", "--ignore-scripts", "--no-frozen-lockfile"], consumerDirectory);
  run(pnpm, ["exec", "tsc", "-p", path.join(consumerDirectory, "tsconfig.json")]);
  const consumer = await import(path.join(consumerDirectory, "dist/main.js"));
  assert.equal(consumer.countValue, 2, "packed Vanilla consumer should read and write State");
  assert.deepEqual(
    consumer.observedValues,
    [1, 2],
    "packed Vanilla consumer should observe State changes",
  );
  console.log("Packed Core artifact and clean Vanilla consumer validated.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
