import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { detectProject } from "../src/index.js";

test("detectProject identifies supported package managers from lockfiles", async () => {
  const cases = [
    ["npm", "package-lock.json"],
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lock"],
  ] as const;

  for (const [packageManager, lockfile] of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), "vii-detect-"));
    try {
      await writeFile(path.join(root, "package.json"), '{"name":"fixture"}\n');
      await writeFile(path.join(root, lockfile), "fixture\n");

      const result = await detectProject(root);

      expect(result.packageManager).toBe(packageManager);
      expect(result.evidence.some((item) => item.field === "packageManager")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("detectProject retains framework evidence and installed Vii packages", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      name: "react-app",
      dependencies: { "@vii/core": "0.0.0", react: "19.0.0", "react-dom": "19.0.0" },
      engines: { node: ">=22" },
    }),
    "package-lock.json": "lockfile\n",
    "tsconfig.json": "{}\n",
    "vite.config.ts": "export default {}\n",
  });

  try {
    const result = await detectProject(root);

    expect(result.framework).toBe("react");
    expect(result.runtime).toBe("node");
    expect(result.packageManager).toBe("npm");
    expect(result.language).toBe("typescript");
    expect(result.rendering).toBe("client");
    expect(result.installedViiPackages).toEqual(["@vii/core"]);
    expect(result.conflicts).toEqual([]);
    expect(result.confidence).toBe("high");
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "framework" }),
        expect.objectContaining({ field: "packageManager" }),
        expect.objectContaining({ field: "language" }),
      ]),
    );
  } finally {
    await removeFixture(root);
  }
});

test("detectProject reports SSR rendering without executing config files", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      name: "next-app",
      dependencies: { next: "15.0.0", react: "19.0.0", "react-dom": "19.0.0" },
    }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "next.config.js": "throw new Error('must not execute');\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await detectProject(root);

    expect(result.framework).toBe("react");
    expect(result.rendering).toBe("mixed");
    expect(result.packageManager).toBe("pnpm");
  } finally {
    await removeFixture(root);
  }
});

test("detectProject classifies Angular, Vue, and Vanilla projects", async () => {
  const cases = [
    {
      files: {
        "package.json": JSON.stringify({
          dependencies: { "@angular/core": "20.0.0", "@angular/ssr": "20.0.0" },
        }),
        "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
        "angular.json": "{}\n",
        "tsconfig.json": "{}\n",
      },
      expected: { framework: "angular", packageManager: "pnpm", rendering: "mixed" },
    },
    {
      files: {
        "package.json": JSON.stringify({ dependencies: { vue: "3.5.0" } }),
        "bun.lock": "lockfile\n",
        "bunfig.toml": "[test]\n",
        "tsconfig.json": "{}\n",
      },
      expected: { framework: "vue", packageManager: "bun", runtime: "bun" },
    },
    {
      files: {
        "package.json": JSON.stringify({ name: "vanilla-app" }),
        "package-lock.json": "lockfile\n",
        "tsconfig.json": "{}\n",
      },
      expected: { framework: "vanilla", packageManager: "npm", language: "typescript" },
    },
  ] as const;

  for (const detectionCase of cases) {
    const root = await createFixture(detectionCase.files);
    try {
      const result = await detectProject(root);

      expect(result).toMatchObject(detectionCase.expected);
    } finally {
      await removeFixture(root);
    }
  }
});

test("detectProject reports a mixed Nx workspace instead of choosing a framework", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      name: "mixed-workspace",
      workspaces: ["apps/*"],
      dependencies: { "@angular/core": "20.0.0", react: "19.0.0" },
    }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
    "nx.json": "{}\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await detectProject(root);

    expect(result.workspace).toBe("nx");
    expect(result.framework).toBe("mixed");
    expect(result.packageManager).toBe("pnpm");
    expect(result.conflicts).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "framework" })]),
    );
    expect(result.confidence).toBe("low");
  } finally {
    await removeFixture(root);
  }
});

test("detectProject reports conflicting lockfiles without selecting a manager", async () => {
  const root = await createFixture({
    "package.json": '{"name":"conflicting-locks"}\n',
    "package-lock.json": "lockfile\n",
    "yarn.lock": "lockfile\n",
  });

  try {
    const result = await detectProject(root);

    expect(result.packageManager).toBe("unknown");
    expect(result.conflicts).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "packageManager" })]),
    );
  } finally {
    await removeFixture(root);
  }
});

test("detectProject keeps malformed manifests explainable and read-only", async () => {
  const root = await createFixture({
    "package.json": "{ malformed\n",
    "tsconfig.json": "{}\n",
  });
  const filesBefore = [...(await readdir(root))].sort();

  try {
    const result = await detectProject(root);

    expect(result.framework).toBe("vanilla");
    expect(result.language).toBe("typescript");
    expect(result.conflicts).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "packageManifest" })]),
    );
    expect([...(await readdir(root))].sort()).toEqual(filesBefore);
  } finally {
    await removeFixture(root);
  }
});

test("detectProject rejects a file as a project root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vii-detect-"));
  const file = path.join(root, "not-a-project");
  await writeFile(file, "fixture\n");

  try {
    await expect(detectProject(file)).rejects.toMatchObject({ code: "invalid-root" });
  } finally {
    await removeFixture(root);
  }
});

async function createFixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "vii-detect-"));
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(root, name), contents);
  }
  return root;
}

async function removeFixture(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}
