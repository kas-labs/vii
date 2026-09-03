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
const reactConsumerDirectory = path.join(temporaryRoot, "react-consumer");
const reactFixtureDirectory = path.join(temporaryRoot, "react-fixture");
const react18ConsumerDirectory = path.join(temporaryRoot, "react18-consumer");
const react18FixtureDirectory = path.join(temporaryRoot, "react18-fixture");
const angular17ConsumerDirectory = path.join(temporaryRoot, "angular17-consumer");
const angular17FixtureDirectory = path.join(temporaryRoot, "angular17-fixture");
const angular22ConsumerDirectory = path.join(temporaryRoot, "angular22-consumer");
const angular22FixtureDirectory = path.join(temporaryRoot, "angular22-fixture");
const vue33ConsumerDirectory = path.join(temporaryRoot, "vue33-consumer");
const vue33FixtureDirectory = path.join(temporaryRoot, "vue33-fixture");
const vue35ConsumerDirectory = path.join(temporaryRoot, "vue35-consumer");
const vue35FixtureDirectory = path.join(temporaryRoot, "vue35-fixture");

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
  await mkdir(reactConsumerDirectory, { recursive: true });
  await mkdir(path.join(reactFixtureDirectory, "src"), { recursive: true });

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
    "package/dist/core/array-adoption.d.ts",
    "package/dist/core/array-adoption.d.ts.map",
    "package/dist/core/array-adoption.js",
    "package/dist/core/array-adoption.js.map",
    "package/dist/core/array-baseline.d.ts",
    "package/dist/core/array-baseline.d.ts.map",
    "package/dist/core/array-baseline.js",
    "package/dist/core/array-baseline.js.map",
    "package/dist/core/array-operations.d.ts",
    "package/dist/core/array-operations.d.ts.map",
    "package/dist/core/array-operations.js",
    "package/dist/core/array-operations.js.map",
    "package/dist/core/array-types.d.ts",
    "package/dist/core/array-types.d.ts.map",
    "package/dist/core/array-types.js",
    "package/dist/core/array-types.js.map",
    "package/dist/core/array.d.ts",
    "package/dist/core/array.d.ts.map",
    "package/dist/core/array.js",
    "package/dist/core/array.js.map",
    "package/dist/core/baseline-types.d.ts",
    "package/dist/core/baseline-types.d.ts.map",
    "package/dist/core/baseline-types.js",
    "package/dist/core/baseline-types.js.map",
    "package/dist/core/reinitialize-tree.d.ts",
    "package/dist/core/reinitialize-tree.d.ts.map",
    "package/dist/core/reinitialize-tree.js",
    "package/dist/core/reinitialize-tree.js.map",
    "package/dist/core/snapshot.d.ts",
    "package/dist/core/snapshot.d.ts.map",
    "package/dist/core/snapshot.js",
    "package/dist/core/snapshot.js.map",
    "package/dist/core/field-parserless.d.ts",
    "package/dist/core/field-parserless.d.ts.map",
    "package/dist/core/field-parserless.js",
    "package/dist/core/field-parserless.js.map",
    "package/dist/core/field-parsed.d.ts",
    "package/dist/core/field-parsed.d.ts.map",
    "package/dist/core/field-parsed.js",
    "package/dist/core/field-parsed.js.map",
    "package/dist/core/field-validation-runtime.d.ts",
    "package/dist/core/field-validation-runtime.d.ts.map",
    "package/dist/core/field-validation-runtime.js",
    "package/dist/core/field-validation-runtime.js.map",
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
    "package/dist/submission/array-snapshot.d.ts",
    "package/dist/submission/array-snapshot.d.ts.map",
    "package/dist/submission/array-snapshot.js",
    "package/dist/submission/array-snapshot.js.map",
    "package/dist/submission/result.d.ts",
    "package/dist/submission/result.d.ts.map",
    "package/dist/submission/result.js",
    "package/dist/submission/result.js.map",
    "package/dist/submission/server-issues.d.ts",
    "package/dist/submission/server-issues.d.ts.map",
    "package/dist/submission/server-issues.js",
    "package/dist/submission/server-issues.js.map",
    "package/dist/submission/state-machine.d.ts",
    "package/dist/submission/state-machine.d.ts.map",
    "package/dist/submission/state-machine.js",
    "package/dist/submission/state-machine.js.map",
    "package/dist/submission/types.d.ts",
    "package/dist/submission/types.d.ts.map",
    "package/dist/submission/types.js",
    "package/dist/submission/types.js.map",
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
    "package/dist/adapters/react/external-store.d.ts",
    "package/dist/adapters/react/external-store.d.ts.map",
    "package/dist/adapters/react/external-store.js",
    "package/dist/adapters/react/external-store.js.map",
    "package/dist/adapters/react/index.d.ts",
    "package/dist/adapters/react/index.d.ts.map",
    "package/dist/adapters/react/index.js",
    "package/dist/adapters/react/index.js.map",
    "package/dist/adapters/react/types.d.ts",
    "package/dist/adapters/react/types.d.ts.map",
    "package/dist/adapters/react/types.js",
    "package/dist/adapters/react/types.js.map",
    "package/dist/adapters/react/use-field-array.d.ts",
    "package/dist/adapters/react/use-field-array.d.ts.map",
    "package/dist/adapters/react/use-field-array.js",
    "package/dist/adapters/react/use-field-array.js.map",
    "package/dist/adapters/react/use-field.d.ts",
    "package/dist/adapters/react/use-field.d.ts.map",
    "package/dist/adapters/react/use-field.js",
    "package/dist/adapters/react/use-field.js.map",
    "package/dist/adapters/react/use-form.d.ts",
    "package/dist/adapters/react/use-form.d.ts.map",
    "package/dist/adapters/react/use-form.js",
    "package/dist/adapters/react/use-form.js.map",
    "package/dist/adapters/vanilla/a11y.d.ts",
    "package/dist/adapters/vanilla/a11y.d.ts.map",
    "package/dist/adapters/vanilla/a11y.js",
    "package/dist/adapters/vanilla/a11y.js.map",
    "package/dist/adapters/vanilla/bind-field.d.ts",
    "package/dist/adapters/vanilla/bind-field.d.ts.map",
    "package/dist/adapters/vanilla/bind-field.js",
    "package/dist/adapters/vanilla/bind-field.js.map",
    "package/dist/adapters/vanilla/bind-form.d.ts",
    "package/dist/adapters/vanilla/bind-form.d.ts.map",
    "package/dist/adapters/vanilla/bind-form.js",
    "package/dist/adapters/vanilla/bind-form.js.map",
    "package/dist/adapters/vanilla/control.d.ts",
    "package/dist/adapters/vanilla/control.d.ts.map",
    "package/dist/adapters/vanilla/control.js",
    "package/dist/adapters/vanilla/control.js.map",
    "package/dist/adapters/vanilla/index.d.ts",
    "package/dist/adapters/vanilla/index.d.ts.map",
    "package/dist/adapters/vanilla/index.js",
    "package/dist/adapters/vanilla/index.js.map",
    "package/dist/adapters/vanilla/types.d.ts",
    "package/dist/adapters/vanilla/types.d.ts.map",
    "package/dist/adapters/vanilla/types.js",
    "package/dist/adapters/vanilla/types.js.map",
    "package/dist/adapters/angular/array.d.ts",
    "package/dist/adapters/angular/array.d.ts.map",
    "package/dist/adapters/angular/array.js",
    "package/dist/adapters/angular/array.js.map",
    "package/dist/adapters/angular/field.d.ts",
    "package/dist/adapters/angular/field.d.ts.map",
    "package/dist/adapters/angular/field.js",
    "package/dist/adapters/angular/field.js.map",
    "package/dist/adapters/angular/form.d.ts",
    "package/dist/adapters/angular/form.d.ts.map",
    "package/dist/adapters/angular/form.js",
    "package/dist/adapters/angular/form.js.map",
    "package/dist/adapters/angular/index.d.ts",
    "package/dist/adapters/angular/index.d.ts.map",
    "package/dist/adapters/angular/index.js",
    "package/dist/adapters/angular/index.js.map",
    "package/dist/adapters/angular/types.d.ts",
    "package/dist/adapters/angular/types.d.ts.map",
    "package/dist/adapters/angular/types.js",
    "package/dist/adapters/angular/types.js.map",
    "package/dist/adapters/vue/array.d.ts",
    "package/dist/adapters/vue/array.d.ts.map",
    "package/dist/adapters/vue/array.js",
    "package/dist/adapters/vue/array.js.map",
    "package/dist/adapters/vue/field.d.ts",
    "package/dist/adapters/vue/field.d.ts.map",
    "package/dist/adapters/vue/field.js",
    "package/dist/adapters/vue/field.js.map",
    "package/dist/adapters/vue/form.d.ts",
    "package/dist/adapters/vue/form.d.ts.map",
    "package/dist/adapters/vue/form.js",
    "package/dist/adapters/vue/form.js.map",
    "package/dist/adapters/vue/index.d.ts",
    "package/dist/adapters/vue/index.d.ts.map",
    "package/dist/adapters/vue/index.js",
    "package/dist/adapters/vue/index.js.map",
    "package/dist/adapters/vue/types.d.ts",
    "package/dist/adapters/vue/types.d.ts.map",
    "package/dist/adapters/vue/types.js",
    "package/dist/adapters/vue/types.js.map",
  ]);

  assertPackageEntries(formArtifactPath, expectedFormEntries, "Form");

  // Create clean consumer fixture source
  const consumerSource = `
import * as form from "@vii-labs/form";
import {
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  createNumberParser,
  standardSchema,
} from "@vii-labs/form";
import * as formVanilla from "@vii-labs/form/vanilla";
import { bindField, bindForm } from "@vii-labs/form/vanilla";

export const rootKeys = Object.keys(form).sort();
export const vanillaKeys = Object.keys(formVanilla).sort();

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
      tags: createFieldArray({
        items: [createField({ initialValue: "typescript" }), createField({ initialValue: "react" })],
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

  // Exercise array mutation, baseline retention, and stable identity
  const initialTagId0 = formInstance.fields.tags.items.get()[0]!.id;
  const initialTagId1 = formInstance.fields.tags.items.get()[1]!.id;
  formInstance.fields.tags.move(0, 1);
  const tagMovedVal = formInstance.fields.tags.getValue();
  const tagMovedId0 = formInstance.fields.tags.items.get()[0]!.id;
  const tagMovedId1 = formInstance.fields.tags.items.get()[1]!.id;

  // Remove baseline item and reset
  formInstance.fields.tags.remove(0);
  const tagRemovedVal = formInstance.fields.tags.getValue();
  formInstance.fields.tags.reset();
  const tagResetVal = formInstance.fields.tags.getValue();

  // Reinitialize
  formInstance.reinitialize({
    value: {
      user: {
        name: "Bob",
        age: 40,
      },
      tags: ["frontend", "signals"],
      settings: { theme: "dark" },
    },
    rawValue: {
      user: {
        name: "Bob",
        age: "40",
      },
      tags: ["frontend", "signals"],
      settings: { theme: "dark" },
    },
  });

  const reinitializedVal = formInstance.getValue();
  const reinitializedRawVal = formInstance.getRawValue();
  const reinitializedDirty = formInstance.dirty.get();

  // Parserless object TValue with value/rawValue keys
  type MoneyModel = { value: number; rawValue: string };
  const moneyBaseline = { value: 2, rawValue: "€2" };
  const moneyForm = createForm({
    fields: {
      money: createField<MoneyModel>({
        initialValue: { value: 1, rawValue: "€1" },
      }),
    },
  });
  moneyForm.fields.money.setValue({ value: 9, rawValue: "€9" });
  moneyForm.reinitialize({
    value: { money: moneyBaseline },
    rawValue: { money: moneyBaseline },
  });
  const moneyReinitialized = moneyForm.fields.money.getValue();
  const moneyDirty = moneyForm.fields.money.dirty.get();
  moneyForm.dispose();

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

  const emptySchema = {
    "~standard": {
      version: 1,
      vendor: "empty-test",
      validate: () => ({}),
    },
  };
  const emptySchemaRule = standardSchema(emptySchema as never);
  let emptySchemaFailedClosed = false;
  try {
    emptySchemaRule("x", { trigger: "manual" });
  } catch {
    emptySchemaFailedClosed = true;
  }
  schemaField.dispose();

  // Test form submit with server issue routing
  const submitResult = await formInstance.submit(async () => ({
    ok: false,
    issues: [
      { code: "theme.error", message: "Dark theme deprecated", path: ["settings", "theme"] },
    ],
  }));
  const submitStatus = formInstance.submissionStatus.get();
  const themeServerIssuesCount = formInstance.fields.settings.fields.theme.serverIssues.get().length;

  // Localized clear on edit
  formInstance.fields.settings.fields.theme.setValue("system");
  const themeServerIssuesCleared = formInstance.fields.settings.fields.theme.serverIssues.get().length;

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
    tagMovedVal,
    tagMovedId0MatchesOld1: tagMovedId0 === initialTagId1,
    tagMovedId1MatchesOld0: tagMovedId1 === initialTagId0,
    reinitializedVal,
    reinitializedRawVal,
    reinitializedDirty,
    moneyReinitialized,
    moneyDirty,
    schemaInitialValid,
    schemaInvalidValid,
    emptySchemaFailedClosed,
    submitStatus,
    themeServerIssuesCount,
    themeServerIssuesCleared,
    postDisposeError,
  };
}

export async function runVanillaScenario() {
  class MockElement {
    value = "";
    checked = false;
    type = "text";
    id = "";
    textContent = "";
    private attrs = new Map<string, string>();
    private listeners = new Map<string, Set<(e: any) => void>>();
    getAttribute(name: string) { return this.attrs.get(name) ?? null; }
    setAttribute(name: string, val: string) { this.attrs.set(name, val); }
    removeAttribute(name: string) { this.attrs.delete(name); }
    addEventListener(event: string, handler: (e: any) => void) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(handler);
    }
    removeEventListener(event: string, handler: (e: any) => void) {
      this.listeners.get(event)?.delete(handler);
    }
    dispatch(event: string, overrides = {}) {
      let prevented = false;
      const evt = { type: event, target: this, preventDefault: () => { prevented = true; }, ...overrides };
      this.listeners.get(event)?.forEach((h) => h(evt));
      return { prevented };
    }
  }

  const field = createField({ initialValue: "initial-val" });
  const input = new MockElement();
  const issueElem = new MockElement();
  issueElem.id = "email-issue";

  const fieldBinding = bindField(field, input as any, { issueElement: issueElem as any });
  const initialInputVal = input.value;
  const initialDescribedBy = input.getAttribute("aria-describedby");

  input.value = "user-edited";
  input.dispatch("input");
  const fieldRawVal = field.rawValue.get();

  fieldBinding.dispose();
  const postDisposeDescribedBy = input.getAttribute("aria-describedby");

  // Form submit binding
  const form = createForm({ fields: { title: createField({ initialValue: "post title" }) } });
  const formElem = new MockElement();
  let submitSucceeded = false;
  let submitResultText = "";

  const formBinding = bindForm(form, formElem as any, {
    action: async (val) => ({ ok: true, result: \`Published: \${val.title}\` }),
    onSubmitSuccess: (res) => {
      submitSucceeded = true;
      submitResultText = res as string;
    },
  });

  formElem.dispatch("submit");
  await new Promise((r) => setTimeout(r, 10));

  formBinding.dispose();
  field.dispose();
  form.dispose();

  return {
    initialInputVal,
    initialDescribedBy,
    fieldRawVal,
    postDisposeDescribedBy,
    submitSucceeded,
    submitResultText,
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
      "createField",
      "createFieldArray",
      "createFieldGroup",
      "createForm",
      "createNumberParser",
      "createStringParser",
      "standardSchema",
    ].sort(),
    "clean consumer root export should contain P1j symbols",
  );
  assert.deepEqual(
    consumer.vanillaKeys,
    ["bindField", "bindForm"].sort(),
    "clean consumer vanilla subpath export must contain P1j bindings",
  );

  const scenarioResult = await consumer.runFormTreeScenario();
  const vanillaScenarioResult = await consumer.runVanillaScenario();
  assert.deepEqual(
    vanillaScenarioResult,
    {
      initialInputVal: "initial-val",
      initialDescribedBy: "email-issue",
      fieldRawVal: "user-edited",
      postDisposeDescribedBy: null,
      submitSucceeded: true,
      submitResultText: "Published: post title",
    },
    "clean consumer vanilla scenario must execute correctly against packed artifact",
  );
  assert.deepEqual(
    scenarioResult,
    {
      initialVal: {
        user: { name: "Vitalii", age: 30 },
        tags: ["typescript", "react"],
        settings: { theme: "light" },
      },
      initialRawVal: {
        user: { name: "Vitalii", age: "30" },
        tags: ["typescript", "react"],
        settings: { theme: "light" },
      },
      initialValid: true,
      ageRaw: "05",
      ageVal: 5,
      parseFailedRaw: "abc",
      parseFailedVal: 5,
      parseFailedValid: false,
      parseIssuesCount: 1,
      tagMovedVal: ["react", "typescript"],
      tagMovedId0MatchesOld1: true,
      tagMovedId1MatchesOld0: true,
      reinitializedVal: {
        user: { name: "Bob", age: 40 },
        tags: ["frontend", "signals"],
        settings: { theme: "dark" },
      },
      reinitializedRawVal: {
        user: { name: "Bob", age: "40" },
        tags: ["frontend", "signals"],
        settings: { theme: "dark" },
      },
      reinitializedDirty: false,
      moneyReinitialized: { value: 2, rawValue: "€2" },
      moneyDirty: false,
      schemaInitialValid: true,
      schemaInvalidValid: false,
      emptySchemaFailedClosed: true,
      submitStatus: "failed",
      themeServerIssuesCount: 1,
      themeServerIssuesCleared: 0,
      postDisposeError: true,
    },
    "clean consumer form tree scenario must execute correctly against packed artifact",
  );

  // React consumer fixture source
  const reactConsumerSource = `
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createField, createFieldArray, createForm } from "@vii-labs/form";
import * as formReact from "@vii-labs/form/react";
import { useField, useForm, useFieldArray } from "@vii-labs/form/react";

export const reactKeys = Object.keys(formReact).sort();

export function runReactApp() {
  const form = createForm({
    fields: {
      username: createField({ initialValue: "test-user" }),
      items: createFieldArray({
        items: [createField({ initialValue: "item-1" })],
      }),
    },
  });

  function UserView({ target }: { target: typeof form.fields.username }) {
    const binding = useField(target);
    return createElement("span", { "data-field": "username" }, binding.value);
  }

  function ListView({ target }: { target: typeof form.fields.items }) {
    const arrayBinding = useFieldArray(target);
    return createElement(
      "ul",
      null,
      arrayBinding.items.map((it) => createElement("li", { key: it.id }, it.node.value.get())),
    );
  }

  function App({ target }: { target: typeof form }) {
    const formBinding = useForm(target);
    return createElement(
      "div",
      null,
      createElement(UserView, { target: target.fields.username }),
      createElement(ListView, { target: target.fields.items }),
      createElement("span", { "data-status": formBinding.submissionStatus }, formBinding.submissionStatus),
    );
  }

  const markup = renderToStaticMarkup(createElement(App, { target: form }));
  form.dispose();
  return { markup };
}
`;

  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(reactFixtureDirectory, "src/main.ts"), reactConsumerSource, "utf8"),
  );

  await prepareConsumer({
    directory: reactConsumerDirectory,
    fixtureDirectory: reactFixtureDirectory,
    packageJson: {
      name: "vii-packed-form-react-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@vii-labs/form": `file:${formArtifactPath}`,
        "@vii-labs/core": `file:${coreArtifactPath}`,
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
  assert.deepEqual(
    reactConsumer.reactKeys,
    ["useField", "useFieldArray", "useForm"].sort(),
    "clean React consumer subpath export must contain P1h hooks",
  );

  const reactScenarioResult = reactConsumer.runReactApp();
  assert.ok(
    reactScenarioResult.markup.includes("test-user"),
    "React consumer should render useField output",
  );
  assert.ok(
    reactScenarioResult.markup.includes("item-1"),
    "React consumer should render useFieldArray output",
  );
  assert.ok(
    reactScenarioResult.markup.includes("idle"),
    "React consumer should render useForm output",
  );

  // React 18 clean consumer smoke validation
  await mkdir(react18ConsumerDirectory, { recursive: true });
  await mkdir(path.join(react18FixtureDirectory, "src"), { recursive: true });

  await import("node:fs/promises").then((fs) =>
    fs.writeFile(path.join(react18FixtureDirectory, "src/main.ts"), reactConsumerSource, "utf8"),
  );

  await prepareConsumer({
    directory: react18ConsumerDirectory,
    fixtureDirectory: react18FixtureDirectory,
    packageJson: {
      name: "vii-packed-form-react18-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@vii-labs/form": `file:${formArtifactPath}`,
        "@vii-labs/core": `file:${coreArtifactPath}`,
        react: "18.3.1",
        "react-dom": "18.3.1",
      },
      devDependencies: {
        "@types/react": "18.3.18",
        "@types/react-dom": "18.3.5",
      },
    },
    repositoryRoot,
    pnpm,
  });

  const react18Consumer = await import(path.join(react18ConsumerDirectory, "dist/main.js"));
  assert.deepEqual(
    react18Consumer.reactKeys,
    ["useField", "useFieldArray", "useForm"].sort(),
    "clean React 18 consumer subpath export must contain P1h hooks",
  );

  const react18ScenarioResult = react18Consumer.runReactApp();
  assert.ok(
    react18ScenarioResult.markup.includes("test-user"),
    "React 18 consumer should render useField output",
  );
  assert.ok(
    react18ScenarioResult.markup.includes("item-1"),
    "React 18 consumer should render useFieldArray output",
  );
  assert.ok(
    react18ScenarioResult.markup.includes("idle"),
    "React 18 consumer should render useForm output",
  );

  // Angular and Vue clean consumer validation helpers
  async function validateAngularVersion({ version, consumerDir, fixtureDir, label }) {
    await mkdir(consumerDir, { recursive: true });
    await mkdir(path.join(fixtureDir, "src"), { recursive: true });

    const angularConsumerSource = `
import { createField, createFieldArray, createForm } from "@vii-labs/form";
import * as formAngular from "@vii-labs/form/angular";
import {
  createAngularField,
  createAngularFieldArray,
  createAngularForm,
} from "@vii-labs/form/angular";

export const angularKeys = Object.keys(formAngular).sort();

export function runAngularSmoke() {
  const form = createForm({
    fields: {
      username: createField({ initialValue: "test-user" }),
      items: createFieldArray({
        items: [createField({ initialValue: "item-1" })],
      }),
    },
  });

  const fieldHandle = createAngularField(form.fields.username);
  const initialValue = fieldHandle.value();
  fieldHandle.setValue("mutated-user");
  const mutatedValue = fieldHandle.value();
  const canonicalValue = form.fields.username.getValue();
  fieldHandle.dispose();

  form.fields.username.setValue("post-dispose");
  const postDisposeValue = form.fields.username.getValue();

  const formHandle = createAngularForm(form);
  const formValue = formHandle.value();
  const submissionStatus = formHandle.submissionStatus();
  formHandle.dispose();

  const arrayHandle = createAngularFieldArray(form.fields.items);
  const arrayLen = arrayHandle.length();
  const firstItemId = arrayHandle.items()[0]?.id;
  arrayHandle.dispose();

  form.dispose();

  return {
    initialValue,
    mutatedValue,
    canonicalValue,
    postDisposeValue,
    formValue,
    submissionStatus,
    arrayLen,
    firstItemId,
  };
}
`;

    await import("node:fs/promises").then((fs) =>
      fs.writeFile(path.join(fixtureDir, "src/main.ts"), angularConsumerSource, "utf8"),
    );

    await prepareConsumer({
      directory: consumerDir,
      fixtureDirectory: fixtureDir,
      packageJson: {
        name: `vii-packed-form-${label}-consumer`,
        private: true,
        type: "module",
        dependencies: {
          "@vii-labs/form": `file:${formArtifactPath}`,
          "@vii-labs/core": `file:${coreArtifactPath}`,
          "@angular/core": version,
        },
      },
      repositoryRoot,
      pnpm,
    });

    const angularConsumer = await import(path.join(consumerDir, "dist/main.js"));
    assert.deepEqual(
      angularConsumer.angularKeys,
      ["createAngularField", "createAngularFieldArray", "createAngularForm"].sort(),
      `clean ${label} consumer subpath export must contain P1j signals functions`,
    );

    const angularSmokeResult = angularConsumer.runAngularSmoke();
    assert.equal(angularSmokeResult.initialValue, "test-user");
    assert.equal(angularSmokeResult.mutatedValue, "mutated-user");
    assert.equal(angularSmokeResult.canonicalValue, "mutated-user");
    assert.equal(angularSmokeResult.postDisposeValue, "post-dispose");
    assert.equal(angularSmokeResult.submissionStatus, "idle");
    assert.equal(angularSmokeResult.arrayLen, 1);
    assert.ok(angularSmokeResult.firstItemId);
  }

  async function validateVueVersion({ version, consumerDir, fixtureDir, label }) {
    await mkdir(consumerDir, { recursive: true });
    await mkdir(path.join(fixtureDir, "src"), { recursive: true });

    const vueConsumerSource = `
import { createField, createFieldArray, createForm } from "@vii-labs/form";
import * as formVue from "@vii-labs/form/vue";
import {
  createVueField,
  createVueFieldArray,
  createVueForm,
} from "@vii-labs/form/vue";
import { effectScope } from "vue";

export const vueKeys = Object.keys(formVue).sort();

export function runVueSmoke() {
  const form = createForm({
    fields: {
      username: createField({ initialValue: "test-user" }),
      items: createFieldArray({
        items: [createField({ initialValue: "item-1" })],
      }),
    },
  });

  const fieldHandle = createVueField(form.fields.username);
  const initialValue = fieldHandle.value.value;
  fieldHandle.setValue("mutated-user");
  const mutatedValue = fieldHandle.value.value;
  const canonicalValue = form.fields.username.getValue();
  fieldHandle.dispose();

  form.fields.username.setValue("post-dispose");
  const postDisposeValue = form.fields.username.getValue();

  const scope = effectScope();
  let scopedHandle!: ReturnType<typeof createVueField<string>>;
  scope.run(() => {
    scopedHandle = createVueField(form.fields.username);
  });
  const scopedInitial = scopedHandle.value.value;
  scope.stop();
  form.fields.username.setValue("after-scope-stop");
  const scopedAfterStop = scopedHandle.value.value;
  const canonicalAfterScope = form.fields.username.getValue();

  const formHandle = createVueForm(form);
  const formValue = formHandle.value.value;
  const submissionStatus = formHandle.submissionStatus.value;
  formHandle.dispose();

  const arrayHandle = createVueFieldArray(form.fields.items);
  const arrayLen = arrayHandle.length.value;
  const firstItemId = arrayHandle.items.value[0]?.id;
  arrayHandle.dispose();

  form.dispose();

  return {
    initialValue,
    mutatedValue,
    canonicalValue,
    postDisposeValue,
    scopedInitial,
    scopedAfterStop,
    canonicalAfterScope,
    formValue,
    submissionStatus,
    arrayLen,
    firstItemId,
  };
}
`;

    await import("node:fs/promises").then((fs) =>
      fs.writeFile(path.join(fixtureDir, "src/main.ts"), vueConsumerSource, "utf8"),
    );

    await prepareConsumer({
      directory: consumerDir,
      fixtureDirectory: fixtureDir,
      packageJson: {
        name: `vii-packed-form-${label}-consumer`,
        private: true,
        type: "module",
        dependencies: {
          "@vii-labs/form": `file:${formArtifactPath}`,
          "@vii-labs/core": `file:${coreArtifactPath}`,
          vue: version,
        },
      },
      repositoryRoot,
      pnpm,
    });

    const vueConsumer = await import(path.join(consumerDir, "dist/main.js"));
    assert.deepEqual(
      vueConsumer.vueKeys,
      ["createVueField", "createVueFieldArray", "createVueForm"].sort(),
      `clean ${label} consumer subpath export must contain P1j shallowRef functions`,
    );

    const vueSmokeResult = vueConsumer.runVueSmoke();
    assert.equal(vueSmokeResult.initialValue, "test-user");
    assert.equal(vueSmokeResult.mutatedValue, "mutated-user");
    assert.equal(vueSmokeResult.canonicalValue, "mutated-user");
    assert.equal(vueSmokeResult.postDisposeValue, "post-dispose");
    assert.equal(vueSmokeResult.scopedInitial, "post-dispose");
    assert.equal(vueSmokeResult.scopedAfterStop, "post-dispose");
    assert.equal(vueSmokeResult.canonicalAfterScope, "after-scope-stop");
    assert.equal(vueSmokeResult.submissionStatus, "idle");
    assert.equal(vueSmokeResult.arrayLen, 1);
    assert.ok(vueSmokeResult.firstItemId);
  }

  // 1. Angular 17 minimum supported consumer
  await validateAngularVersion({
    version: "17.3.12",
    consumerDir: angular17ConsumerDirectory,
    fixtureDir: angular17FixtureDirectory,
    label: "angular-17",
  });

  // 2. Angular 22 latest tested consumer
  await validateAngularVersion({
    version: "22.1.4",
    consumerDir: angular22ConsumerDirectory,
    fixtureDir: angular22FixtureDirectory,
    label: "angular-22",
  });

  // 3. Vue 3.3 minimum supported consumer
  await validateVueVersion({
    version: "3.3.13",
    consumerDir: vue33ConsumerDirectory,
    fixtureDir: vue33FixtureDirectory,
    label: "vue-33",
  });

  // 4. Vue 3.5 latest tested consumer
  await validateVueVersion({
    version: "3.5.41",
    consumerDir: vue35ConsumerDirectory,
    fixtureDir: vue35FixtureDirectory,
    label: "vue-35",
  });

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
