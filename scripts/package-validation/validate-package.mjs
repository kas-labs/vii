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
const vueFixtureDirectory = path.join(repositoryRoot, "fixtures/vue");
const coreReferenceDirectory = path.join(repositoryRoot, "examples/core-reference");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vii-pack-check-"));
const artifactDirectory = path.join(temporaryRoot, "artifact");
const consumerDirectory = path.join(temporaryRoot, "consumer");
const reactConsumerDirectory = path.join(temporaryRoot, "react-consumer");
const angularConsumerDirectory = path.join(temporaryRoot, "angular-consumer");
const vueConsumerDirectory = path.join(temporaryRoot, "vue-consumer");
const coreReferenceConsumerDirectory = path.join(temporaryRoot, "core-reference-consumer");

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

function readPackageManifest(artifactPath) {
  return JSON.parse(
    execFileSync("tar", ["-xOzf", artifactPath, "package/package.json"], { encoding: "utf8" }),
  );
}

try {
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(consumerDirectory, { recursive: true });
  await mkdir(reactConsumerDirectory, { recursive: true });
  await mkdir(angularConsumerDirectory, { recursive: true });
  await mkdir(vueConsumerDirectory, { recursive: true });
  await mkdir(coreReferenceConsumerDirectory, { recursive: true });

  run(pnpm, ["--filter", "@vii-labs/core", "build"]);
  run(pnpm, ["--filter", "@vii-labs/react", "build"]);
  run(pnpm, ["--filter", "@vii-labs/angular", "build"]);
  run(pnpm, ["--filter", "@vii-labs/vue", "build"]);
  run(pnpm, ["--filter", "@vii-labs/core", "pack", "--pack-destination", artifactDirectory]);
  run(pnpm, ["--filter", "@vii-labs/react", "pack", "--pack-destination", artifactDirectory]);
  run(pnpm, ["--filter", "@vii-labs/angular", "pack", "--pack-destination", artifactDirectory]);
  run(pnpm, ["--filter", "@vii-labs/vue", "pack", "--pack-destination", artifactDirectory]);

  const artifactNames = await readdir(artifactDirectory);
  assert.equal(artifactNames.length, 4, "expected Core, React, Angular, and Vue package artifacts");
  const artifactPaths = new Map(
    artifactNames.map((name) => [
      name.startsWith("vii-labs-core-")
        ? "core"
        : name.startsWith("vii-labs-react-")
          ? "react"
          : name.startsWith("vii-labs-angular-")
            ? "angular"
            : "vue",
      path.join(artifactDirectory, name),
    ]),
  );
  const coreArtifactPath = artifactPaths.get("core");
  const reactArtifactPath = artifactPaths.get("react");
  const angularArtifactPath = artifactPaths.get("angular");
  const vueArtifactPath = artifactPaths.get("vue");
  assert.ok(coreArtifactPath, "expected a Core package artifact");
  assert.ok(reactArtifactPath, "expected a React package artifact");
  assert.ok(angularArtifactPath, "expected an Angular package artifact");
  assert.ok(vueArtifactPath, "expected a Vue package artifact");
  const coreManifest = readPackageManifest(coreArtifactPath);
  assert.equal(coreManifest.license, "Apache-2.0", "Core artifact should declare its license");
  assert.deepEqual(coreManifest.publishConfig, { access: "public", tag: "next" });
  assert.equal(coreManifest.repository?.type, "git");
  assert.equal(coreManifest.repository?.url, "git+https://github.com/kas-labs/vii.git");
  assert.equal(coreManifest.bugs?.url, "https://github.com/kas-labs/vii/issues");
  const expectedCoreEntries = new Set([
    "package/CHANGELOG.md",
    "package/LICENSE",
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
      "package/LICENSE",
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
      "package/LICENSE",
      "package/README.md",
      "package/dist/index.d.ts",
      "package/dist/index.d.ts.map",
      "package/dist/index.js",
      "package/dist/index.js.map",
      "package/package.json",
    ]),
    "Angular",
  );
  assertPackageEntries(
    vueArtifactPath,
    new Set([
      "package/LICENSE",
      "package/README.md",
      "package/dist/index.d.ts",
      "package/dist/index.d.ts.map",
      "package/dist/index.js",
      "package/dist/index.js.map",
      "package/package.json",
    ]),
    "Vue",
  );

  await prepareConsumer({
    directory: consumerDirectory,
    fixtureDirectory,
    packageJson: {
      name: "vii-packed-consumer",
      private: true,
      type: "module",
      dependencies: { "@vii-labs/core": `file:${coreArtifactPath}` },
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
  assert.equal(consumer.diagnosticTraceProtocol, "vii.trace");
  assert.equal(consumer.diagnosticTraceVersion, "0.1");
  assert.equal(consumer.diagnosticTraceId, "vanilla");
  assert.deepEqual(consumer.diagnosticTraceEventTypes, ["state.created", "state.updated"]);
  assert.deepEqual(consumer.diagnosticScopePayloads, [
    { scopeId: "scope-1", name: "application" },
    { scopeId: "scope-2", name: "checkout", parentScopeId: "scope-1" },
  ]);
  assert.equal(consumer.productionSafeTraceId, undefined);
  assert.deepEqual(consumer.productionSafeScopePayloads, [{ scopeId: "scope-1" }]);

  await prepareConsumer({
    directory: coreReferenceConsumerDirectory,
    fixtureDirectory: coreReferenceDirectory,
    packageJson: {
      name: "vii-packed-core-reference",
      private: true,
      type: "module",
      dependencies: { "@vii-labs/core": `file:${coreArtifactPath}` },
    },
    repositoryRoot,
    pnpm,
  });
  const coreReference = await import(path.join(coreReferenceConsumerDirectory, "dist/main.js"));
  assert.deepEqual(coreReference.runCheckoutReference(), {
    finalQuantity: 3,
    observedQuantities: [2, 3],
    totalCents: 2400,
  });

  await prepareConsumer({
    directory: reactConsumerDirectory,
    fixtureDirectory: reactFixtureDirectory,
    packageJson: {
      name: "vii-packed-react-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@vii-labs/core": `file:${coreArtifactPath}`,
        "@vii-labs/react": `file:${reactArtifactPath}`,
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
        "@vii-labs/angular": `file:${angularArtifactPath}`,
        "@vii-labs/core": `file:${coreArtifactPath}`,
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

  await prepareConsumer({
    directory: vueConsumerDirectory,
    fixtureDirectory: vueFixtureDirectory,
    packageJson: {
      name: "vii-packed-vue-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@vii-labs/core": `file:${coreArtifactPath}`,
        "@vii-labs/vue": `file:${vueArtifactPath}`,
        vue: "3.5.41",
      },
    },
    repositoryRoot,
    pnpm,
  });
  const vueConsumer = await import(path.join(vueConsumerDirectory, "dist/main.js"));
  assert.equal(vueConsumer.renderedValue, 2, "packed Vue consumer should read a Core-backed ref");
  console.log("Packed Core, reference, React, Angular, and Vue consumers validated.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
