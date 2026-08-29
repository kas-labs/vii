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
    "package/dist/parsers/builtins.d.ts",
    "package/dist/parsers/builtins.d.ts.map",
    "package/dist/parsers/builtins.js",
    "package/dist/parsers/builtins.js.map",
    "package/dist/parsers/types.d.ts",
    "package/dist/parsers/types.d.ts.map",
    "package/dist/parsers/types.js",
    "package/dist/parsers/types.js.map",
    "package/dist/validation/executor.d.ts",
    "package/dist/validation/executor.d.ts.map",
    "package/dist/validation/executor.js",
    "package/dist/validation/executor.js.map",
    "package/dist/validation/revision.d.ts",
    "package/dist/validation/revision.d.ts.map",
    "package/dist/validation/revision.js",
    "package/dist/validation/revision.js.map",
    "package/dist/validation/standard-schema.d.ts",
    "package/dist/validation/standard-schema.d.ts.map",
    "package/dist/validation/standard-schema.js",
    "package/dist/validation/standard-schema.js.map",
    "package/dist/validation/types.d.ts",
    "package/dist/validation/types.d.ts.map",
    "package/dist/validation/types.js",
    "package/dist/validation/types.js.map",
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
import {
  createField,
  createFieldGroup,
  createForm,
  createNumberParser,
  standardSchema,
} from "@vii-labs/form";
import * as formReact from "@vii-labs/form/react";
import * as formVanilla from "@vii-labs/form/vanilla";
import * as formAngular from "@vii-labs/form/angular";
import * as formVue from "@vii-labs/form/vue";

export const rootKeys = Object.keys(form).sort();
export const reactKeys = Object.keys(formReact);
export const vanillaKeys = Object.keys(formVanilla);
export const angularKeys = Object.keys(formAngular);
export const vueKeys = Object.keys(formVue);

export async function runFormTreeScenario() {
  const formInstance = createForm({
    fields: {
      user: createFieldGroup({
        fields: {
          name: createField({
            initialValue: "Vitalii",
            rules: [(v: string) => (v.length < 2 ? { code: "min_len" } : null)],
          }),
          age: createField<number, string>({
            initialValue: 30,
            initialRawValue: "30",
            parser: createNumberParser(),
            rules: [(v: number) => (v < 0 ? { code: "positive" } : null)],
          }),
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
  const initialRawVal = formInstance.getRawValue();
  const initialValid = formInstance.valid.get();

  // Test raw '05' retention while value is 5
  formInstance.fields.user.fields.age.setRawValue("05");
  const ageRaw = formInstance.fields.user.fields.age.rawValue.get();
  const ageVal = formInstance.fields.user.fields.age.value.get();

  // Test parse failure retains raw and marks invalid
  formInstance.fields.user.fields.age.setRawValue("abc");
  const parseFailedRaw = formInstance.fields.user.fields.age.rawValue.get();
  const parseFailedVal = formInstance.fields.user.fields.age.value.get();
  const parseFailedValid = formInstance.valid.get();
  const parseIssuesCount = formInstance.issues.get().length;

  // Restore age to valid
  formInstance.fields.user.fields.age.setRawValue("35");

  // Reinitialize
  formInstance.reinitialize({
    user: { name: "Bob", age: 40 },
    settings: { theme: "dark" },
  });

  const reinitializedVal = formInstance.getValue();
  const reinitializedDirty = formInstance.dirty.get();

  // Standard Schema bridge test
  const mockSchema = {
    "~standard": {
      version: 1,
      vendor: "clean-test",
      validate: (val: unknown) => (val === "invalid" ? { issues: [{ message: "bad", path: [] }] } : { value: val }),
    },
  };
  const schemaField = createField({
    initialValue: "valid",
    rules: [standardSchema(mockSchema as never)],
  });
  const schemaInitialValid = schemaField.valid.get();
  schemaField.setValue("invalid");
  const schemaInvalidValid = schemaField.valid.get();

  formInstance.dispose();

  let postDisposeError = false;
  try {
    formInstance.getValue();
  } catch {
    postDisposeError = true;
  }

  return {
    initialVal,
    initialRawVal,
    initialValid,
    ageRaw,
    ageVal,
    parseFailedRaw,
    parseFailedVal,
    parseFailedValid,
    parseIssuesCount,
    reinitializedVal,
    reinitializedDirty,
    schemaInitialValid,
    schemaInvalidValid,
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
    [
      "createBooleanParser",
      "createField",
      "createFieldGroup",
      "createForm",
      "createNumberParser",
      "createOptionalStringParser",
      "createStringParser",
      "isStandardSchema",
      "normalizeStandardSchemaIssue",
      "sanitizeParseIssue",
      "standardSchema",
    ].sort(),
    "clean consumer root export should contain P1e symbols",
  );
  assert.deepEqual(
    consumer.reactKeys,
    [],
    "clean consumer react subpath export should be empty in P1e",
  );
  assert.deepEqual(
    consumer.vanillaKeys,
    [],
    "clean consumer vanilla subpath export should be empty in P1e",
  );
  assert.deepEqual(
    consumer.angularKeys,
    [],
    "clean consumer angular subpath export should be empty in P1e",
  );
  assert.deepEqual(
    consumer.vueKeys,
    [],
    "clean consumer vue subpath export should be empty in P1e",
  );

  const scenarioResult = await consumer.runFormTreeScenario();
  assert.deepEqual(
    scenarioResult,
    {
      initialVal: { user: { name: "Vitalii", age: 30 }, settings: { theme: "light" } },
      initialRawVal: { user: { name: "Vitalii", age: "30" }, settings: { theme: "light" } },
      initialValid: true,
      ageRaw: "05",
      ageVal: 5,
      parseFailedRaw: "abc",
      parseFailedVal: 5,
      parseFailedValid: false,
      parseIssuesCount: 1,
      reinitializedVal: { user: { name: "Bob", age: 40 }, settings: { theme: "dark" } },
      reinitializedDirty: false,
      schemaInitialValid: true,
      schemaInvalidValid: false,
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
