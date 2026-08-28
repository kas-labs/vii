import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareConsumer } from "./consumer.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vii-form-pack-check-"));
const artifactDirectory = path.join(temporaryRoot, "artifact");
const coreArtifactDirectory = path.join(temporaryRoot, "core-artifact");
const consumerDirectory = path.join(temporaryRoot, "consumer");
const fixtureDirectory = path.join(temporaryRoot, "fixture");

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
    `${label} artifact contains unexpected files: ${JSON.stringify(entries)}`,
  );
}

function readPackageManifest(artifactPath) {
  return JSON.parse(
    execFileSync("tar", ["-xOzf", artifactPath, "package/package.json"], { encoding: "utf8" }),
  );
}

try {
  await mkdir(artifactDirectory, { recursive: true });
  await mkdir(coreArtifactDirectory, { recursive: true });
  await mkdir(consumerDirectory, { recursive: true });
  await mkdir(path.join(fixtureDirectory, "src"), { recursive: true });

  run(pnpm, ["--filter", "@vii-labs/core", "build"]);
  run(pnpm, ["--filter", "@vii-labs/form", "build"]);
  run(pnpm, ["--filter", "@vii-labs/core", "pack", "--pack-destination", coreArtifactDirectory]);
  run(pnpm, ["--filter", "@vii-labs/form", "pack", "--pack-destination", artifactDirectory]);

  const artifactNames = await readdir(artifactDirectory);
  assert.equal(artifactNames.length, 1, "expected one Form package artifact");
  const formArtifactPath = path.join(artifactDirectory, artifactNames[0]);

  const coreArtifactNames = await readdir(coreArtifactDirectory);
  assert.equal(coreArtifactNames.length, 1, "expected one Core package artifact");
  const coreArtifactPath = path.join(coreArtifactDirectory, coreArtifactNames[0]);

  const formManifest = readPackageManifest(formArtifactPath);
  assert.equal(formManifest.name, "@vii-labs/form");
  assert.equal(formManifest.license, "Apache-2.0");
  assert.equal(formManifest.private, true);
  assert.equal(formManifest.sideEffects, false);
  assert.equal(formManifest.dependencies?.["@standard-schema/spec"], "^1.1.0");
  assert.equal(formManifest.peerDependencies?.["@vii-labs/core"], ">=0.1.0-experimental.2");

  const expectedFormEntries = new Set([
    "package/LICENSE",
    "package/README.md",
    "package/package.json",
    "package/dist/index.d.ts",
    "package/dist/index.d.ts.map",
    "package/dist/index.js",
    "package/dist/index.js.map",
    "package/dist/core/field.d.ts",
    "package/dist/core/field.d.ts.map",
    "package/dist/core/field.js",
    "package/dist/core/field.js.map",
    "package/dist/core/form.d.ts",
    "package/dist/core/form.d.ts.map",
    "package/dist/core/form.js",
    "package/dist/core/form.js.map",
    "package/dist/core/group.d.ts",
    "package/dist/core/group.d.ts.map",
    "package/dist/core/group.js",
    "package/dist/core/group.js.map",
    "package/dist/core/internal.d.ts",
    "package/dist/core/internal.d.ts.map",
    "package/dist/core/internal.js",
    "package/dist/core/internal.js.map",
    "package/dist/core/tree-types.d.ts",
    "package/dist/core/tree-types.d.ts.map",
    "package/dist/core/tree-types.js",
    "package/dist/core/tree-types.js.map",
    "package/dist/core/types.d.ts",
    "package/dist/core/types.d.ts.map",
    "package/dist/core/types.js",
    "package/dist/core/types.js.map",
    "package/dist/adapters/react/index.d.ts",
    "package/dist/adapters/react/index.d.ts.map",
    "package/dist/adapters/react/index.js",
    "package/dist/adapters/react/index.js.map",
    "package/dist/adapters/vanilla/index.d.ts",
    "package/dist/adapters/vanilla/index.d.ts.map",
    "package/dist/adapters/vanilla/index.js",
    "package/dist/adapters/vanilla/index.js.map",
    "package/dist/adapters/angular/index.d.ts",
    "package/dist/adapters/angular/index.d.ts.map",
    "package/dist/adapters/angular/index.js",
    "package/dist/adapters/angular/index.js.map",
    "package/dist/adapters/vue/index.d.ts",
    "package/dist/adapters/vue/index.d.ts.map",
    "package/dist/adapters/vue/index.js",
    "package/dist/adapters/vue/index.js.map",
  ]);

  assertPackageEntries(formArtifactPath, expectedFormEntries, "Form");

  // Create clean consumer fixture source
  const consumerSource = `
import * as form from "@vii-labs/form";
import { createField, createFieldGroup, createForm } from "@vii-labs/form";
import * as formReact from "@vii-labs/form/react";
import * as formVanilla from "@vii-labs/form/vanilla";
import * as formAngular from "@vii-labs/form/angular";
import * as formVue from "@vii-labs/form/vue";

export const rootKeys = Object.keys(form).sort();
export const reactKeys = Object.keys(formReact);
export const vanillaKeys = Object.keys(formVanilla);
export const angularKeys = Object.keys(formAngular);
export const vueKeys = Object.keys(formVue);

export function runFormTreeScenario() {
  const formInstance = createForm({
    fields: {
      user: createFieldGroup({
        fields: {
          name: createField({ initialValue: "Vitalii" }),
        },
      }),
      settings: createFieldGroup({
        fields: {
          theme: createField({ initialValue: "light" }),
        },
      }),
    },
  });

  const initialVal = formInstance.getValue();
  const initialDirty = formInstance.dirty.get();
  const initialTouched = formInstance.touched.get();

  formInstance.fields.user.fields.name.setValue("Alice");
  formInstance.fields.user.fields.name.markTouched();

  const mutatedVal = formInstance.getValue();
  const mutatedDirty = formInstance.dirty.get();
  const mutatedTouched = formInstance.touched.get();

  formInstance.reinitialize({
    user: { name: "Bob" },
    settings: { theme: "dark" },
  });

  const reinitializedVal = formInstance.getValue();
  const reinitializedDirty = formInstance.dirty.get();
  const reinitializedTouched = formInstance.touched.get();

  formInstance.fields.settings.fields.theme.setValue("system");
  const postRebaseDirty = formInstance.dirty.get();

  formInstance.reset();
  const resetVal = formInstance.getValue();
  const resetDirty = formInstance.dirty.get();

  formInstance.dispose();

  let postDisposeError = false;
  try {
    formInstance.getValue();
  } catch (err) {
    postDisposeError = true;
  }

  return {
    initialVal,
    initialDirty,
    initialTouched,
    mutatedVal,
    mutatedDirty,
    mutatedTouched,
    reinitializedVal,
    reinitializedDirty,
    reinitializedTouched,
    postRebaseDirty,
    resetVal,
    resetDirty,
    postDisposeError,
  };
}
`;

  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(fixtureDirectory, "src/main.ts"), consumerSource, "utf8"),
  );

  await prepareConsumer({
    directory: consumerDirectory,
    fixtureDirectory,
    packageJson: {
      name: "vii-packed-form-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@vii-labs/form": `file:${formArtifactPath}`,
        "@vii-labs/core": `file:${coreArtifactPath}`,
      },
    },
    repositoryRoot,
    pnpm,
  });

  const consumer = await import(path.join(consumerDirectory, "dist/main.js"));
  assert.deepEqual(
    consumer.rootKeys,
    ["createField", "createFieldGroup", "createForm"].sort(),
    "clean consumer root export should contain createField, createFieldGroup, createForm in P1d",
  );
  assert.deepEqual(
    consumer.reactKeys,
    [],
    "clean consumer react subpath export should be empty in P1d",
  );
  assert.deepEqual(
    consumer.vanillaKeys,
    [],
    "clean consumer vanilla subpath export should be empty in P1d",
  );
  assert.deepEqual(
    consumer.angularKeys,
    [],
    "clean consumer angular subpath export should be empty in P1d",
  );
  assert.deepEqual(
    consumer.vueKeys,
    [],
    "clean consumer vue subpath export should be empty in P1d",
  );

  const scenarioResult = consumer.runFormTreeScenario();
  assert.deepEqual(
    scenarioResult,
    {
      initialVal: { user: { name: "Vitalii" }, settings: { theme: "light" } },
      initialDirty: false,
      initialTouched: false,
      mutatedVal: { user: { name: "Alice" }, settings: { theme: "light" } },
      mutatedDirty: true,
      mutatedTouched: true,
      reinitializedVal: { user: { name: "Bob" }, settings: { theme: "dark" } },
      reinitializedDirty: false,
      reinitializedTouched: false,
      postRebaseDirty: true,
      resetVal: { user: { name: "Bob" }, settings: { theme: "dark" } },
      resetDirty: false,
      postDisposeError: true,
    },
    "clean consumer form tree scenario must execute correctly against packed artifact",
  );

  // Sanity size logging
  const distDir = path.join(repositoryRoot, "packages/form/dist");
  const rootSize = (await stat(path.join(distDir, "index.js"))).size;
  const reactSize = (await stat(path.join(distDir, "adapters/react/index.js"))).size;
  const vanillaSize = (await stat(path.join(distDir, "adapters/vanilla/index.js"))).size;
  const angularSize = (await stat(path.join(distDir, "adapters/angular/index.js"))).size;
  const vueSize = (await stat(path.join(distDir, "adapters/vue/index.js"))).size;

  console.log(
    `[validate-form] Pack and clean consumer validation passed. Artifact sanity sizes (raw JS bytes): root=${rootSize}, react=${reactSize}, vanilla=${vanillaSize}, angular=${angularSize}, vue=${vueSize}`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
