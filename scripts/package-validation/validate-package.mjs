import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareConsumer } from "./consumer.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const fixtureDirectory = path.join(repositoryRoot, "fixtures/vanilla");
const reactFixtureDirectory = path.join(repositoryRoot, "fixtures/react");
const angularFixtureDirectory = path.join(repositoryRoot, "fixtures/angular");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vii-pack-check-"));
const artifactDirectory = path.join(temporaryRoot, "artifact");
const consumerDirectory = path.join(temporaryRoot, "consumer");
const reactConsumerDirectory = path.join(temporaryRoot, "react-consumer");
const angularConsumerDirectory = path.join(temporaryRoot, "angular-consumer");

function run(command, args, cwd = repositoryRoot) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
}

function assertPackageEntries(artifactPath, expectedEntries, label) {
  const entries = execFileSync("tar", ["-tzf", artifactPath], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.deepEqual(
    new Set(entries),
    expectedEntries,
    `${label} artifact contains unexpected files`,
  );
}

try {
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(consumerDirectory, { recursive: true });
  await mkdir(reactConsumerDirectory, { recursive: true });
  await mkdir(angularConsumerDirectory, { recursive: true });

  run(pnpm, ["--filter", "@vii/core", "build"]);
  run(pnpm, ["--filter", "@vii/react", "build"]);
  run(pnpm, ["--filter", "@vii/angular", "build"]);
  run(pnpm, ["--filter", "@vii/core", "pack", "--pack-destination", artifactDirectory]);
  run(pnpm, ["--filter", "@vii/react", "pack", "--pack-destination", artifactDirectory]);
  run(pnpm, ["--filter", "@vii/angular", "pack", "--pack-destination", artifactDirectory]);

  const artifactNames = await readdir(artifactDirectory);
  assert.equal(artifactNames.length, 3, "expected Core, React, and Angular package artifacts");
  const artifactPaths = new Map(
    artifactNames.map((name) => [
      name.startsWith("vii-core-") ? "core" : name.startsWith("vii-react-") ? "react" : "angular",
      path.join(artifactDirectory, name),
    ]),
  );
  const coreArtifactPath = artifactPaths.get("core");
  const reactArtifactPath = artifactPaths.get("react");
  const angularArtifactPath = artifactPaths.get("angular");
  assert.ok(coreArtifactPath, "expected a Core package artifact");
  assert.ok(reactArtifactPath, "expected a React package artifact");
  assert.ok(angularArtifactPath, "expected an Angular package artifact");
  const expectedCoreEntries = new Set([
    "package/README.md",
    "package/dist/batch.d.ts",
    "package/dist/batch.d.ts.map",
    "package/dist/batch.js",
    "package/dist/batch.js.map",
    "package/dist/computed.d.ts",
    "package/dist/computed.d.ts.map",
    "package/dist/computed.js",
    "package/dist/computed.js.map",
    "package/dist/diagnostics.d.ts",
    "package/dist/diagnostics.d.ts.map",
    "package/dist/diagnostics.js",
    "package/dist/diagnostics.js.map",
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
  assertPackageEntries(coreArtifactPath, expectedCoreEntries, "Core");
  assertPackageEntries(
    reactArtifactPath,
    new Set([
      "package/README.md",
      "package/dist/index.d.ts",
      "package/dist/index.d.ts.map",
      "package/dist/index.js",
      "package/dist/index.js.map",
      "package/package.json",
    ]),
    "React",
  );
  assertPackageEntries(
    angularArtifactPath,
    new Set([
      "package/README.md",
      "package/dist/index.d.ts",
      "package/dist/index.d.ts.map",
      "package/dist/index.js",
      "package/dist/index.js.map",
      "package/package.json",
    ]),
    "Angular",
  );

  await prepareConsumer({
    directory: consumerDirectory,
    fixtureDirectory,
    packageJson: {
      name: "vii-packed-consumer",
      private: true,
      type: "module",
      dependencies: { "@vii/core": `file:${coreArtifactPath}` },
    },
    repositoryRoot,
    pnpm,
  });
  const consumer = await import(path.join(consumerDirectory, "dist/main.js"));
  assert.equal(consumer.countValue, 2, "packed Vanilla consumer should read and write State");
  assert.deepEqual(
    consumer.observedValues,
    [1, 2],
    "packed Vanilla consumer should observe State changes",
  );
  assert.equal(consumer.doubledValue, 4, "packed Vanilla consumer should read Computed");
  assert.equal(consumer.batchedValue, 2, "packed Vanilla consumer should commit batched writes");
  assert.deepEqual(
    consumer.batchedObservedValues,
    [2],
    "packed Vanilla consumer should observe one final batched value",
  );
  assert.deepEqual(
    consumer.scopedObservedValues,
    [1],
    "packed Vanilla consumer should dispose Scope-owned subscriptions",
  );
  assert.equal(
    consumer.scopedFinalValue,
    2,
    "packed Vanilla consumer should keep State usable after Scope disposal",
  );

  await prepareConsumer({
    directory: reactConsumerDirectory,
    fixtureDirectory: reactFixtureDirectory,
    packageJson: {
      name: "vii-packed-react-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@vii/core": `file:${coreArtifactPath}`,
        "@vii/react": `file:${reactArtifactPath}`,
        react: "19.2.8",
        "react-dom": "19.2.8",
      },
      devDependencies: {
        "@types/react": "19.2.17",
        "@types/react-dom": "19.2.3",
      },
    },
    repositoryRoot,
    pnpm,
  });
  const reactConsumer = await import(path.join(reactConsumerDirectory, "dist/main.js"));
  assert.equal(
    reactConsumer.renderedMarkup,
    '<span data-value="2">2</span>',
    "packed React consumer should render the Core server snapshot",
  );

  await prepareConsumer({
    directory: angularConsumerDirectory,
    fixtureDirectory: angularFixtureDirectory,
    packageJson: {
      name: "vii-packed-angular-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@angular/compiler": "22.1.1",
        "@angular/core": "22.1.1",
        "@vii/angular": `file:${angularArtifactPath}`,
        "@vii/core": `file:${coreArtifactPath}`,
        rxjs: "7.8.2",
        "zone.js": "0.16.0",
      },
    },
    repositoryRoot,
    pnpm,
  });
  const angularConsumer = await import(path.join(angularConsumerDirectory, "dist/main.js"));
  assert.equal(
    angularConsumer.renderedValue,
    2,
    "packed Angular consumer should read a Core-backed signal",
  );
  console.log("Packed Core, React, and Angular artifacts with clean consumers validated.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
