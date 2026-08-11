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
    "package/dist/index.d.ts",
    "package/dist/index.d.ts.map",
    "package/dist/index.js",
    "package/dist/index.js.map",
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
  const result = execFileSync(process.execPath, [path.join(consumerDirectory, "dist/main.js")], {
    encoding: "utf8",
  });
  assert.equal(result, "", "packed Vanilla consumer should not write to stdout");
  console.log("Packed Core artifact and clean Vanilla consumer validated.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
