import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const coreManifestPath = path.join(repositoryRoot, "packages/core/package.json");
const coreChangelogPath = path.join(repositoryRoot, "packages/core/CHANGELOG.md");
const publishWorkflowPath = path.join(repositoryRoot, ".github/workflows/publish-core.yml");

const coreManifest = JSON.parse(await readFile(coreManifestPath, "utf8"));
const coreChangelog = await readFile(coreChangelogPath, "utf8");
const publishWorkflow = await readFile(publishWorkflowPath, "utf8");

assert.equal(coreManifest.version, "0.1.0-experimental.1");
assert.equal(coreManifest.private, false);
assert.deepEqual(coreManifest.publishConfig, { access: "public", tag: "next" });
assert.ok(coreManifest.files.includes("CHANGELOG.md"));
assert.match(coreChangelog, /## 0\.1\.0-experimental\.1/);

for (const requiredFragment of [
  "workflow_dispatch:",
  "environment: npm-publish",
  "refs/tags/v0.1.0-experimental.1",
  "id-token: write",
  "pnpm validate",
  "pnpm audit --prod --json",
  "NPM_TOKEN",
  "npm publish",
  "--tag next",
  "--provenance",
]) {
  assert.ok(
    publishWorkflow.includes(requiredFragment),
    `missing workflow fragment: ${requiredFragment}`,
  );
}

console.log("Core experimental release candidate configuration validated.");
