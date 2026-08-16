import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { addState, detectProject, doctorProject, initProject } from "../src/index.js";

test("doctorProject reports a healthy Vii React project without mutation", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: {
        "@vii-labs/core": "0.0.0",
        "@vii-labs/react": "0.0.0",
        react: "19.0.0",
      },
    }),
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });
  const filesBefore = [...(await readdir(root))].sort();

  try {
    const result = await doctorProject(root);

    expect(result.phases).toEqual(["analyze", "validate", "report"]);
    expect(result.report.status).toBe("healthy");
    expect(result.report.findings).toEqual([]);
    expect(result.detection.framework).toBe("react");
    expect(result.validation.passed).toBe(true);
    expect([...(await readdir(root))].sort()).toEqual(filesBefore);
  } finally {
    await removeFixture(root);
  }
});

test("doctorProject reports detection conflicts as blocking findings", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: { "@vii-labs/core": "0.0.0", "@vii-labs/react": "0.0.0", react: "19.0.0" },
    }),
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
    "yarn.lock": "lockfile\n",
  });

  try {
    const result = await doctorProject(root);

    expect(result.report.status).toBe("blocked");
    expect(result.report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "detection-conflict", severity: "error" }),
      ]),
    );
    expect(result.validation.passed).toBe(false);
  } finally {
    await removeFixture(root);
  }
});

test("doctorProject reports a missing framework adapter for review", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: { "@vii-labs/core": "0.0.0", react: "19.0.0" },
    }),
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await doctorProject(root);

    expect(result.report.status).toBe("attention");
    expect(result.report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "adapter-missing", severity: "warning" }),
      ]),
    );
    expect(result.validation.passed).toBe(true);
  } finally {
    await removeFixture(root);
  }
});

test("doctorProject blocks a Vii adapter without Core", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: { "@vii-labs/react": "0.0.0", react: "19.0.0" },
    }),
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await doctorProject(root);

    expect(result.report.status).toBe("blocked");
    expect(result.report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "vii-core-missing", severity: "error" }),
      ]),
    );
    expect(result.validation.errors).toContain(
      "Vii packages are declared but @vii-labs/core is missing",
    );
  } finally {
    await removeFixture(root);
  }
});

test("doctorProject does not execute project configuration files", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: { "@vii-labs/core": "0.0.0", "@vii-labs/react": "0.0.0", react: "19.0.0" },
    }),
    "next.config.js": "throw new Error('must not execute');\n",
    "package-lock.json": "lockfile\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    await expect(doctorProject(root)).resolves.toMatchObject({ report: { status: "attention" } });
  } finally {
    await removeFixture(root);
  }
});

test("doctorProject reports missing Nx integration without mutation", async () => {
  const root = await createFixture({
    "nx.json": "{}\n",
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await doctorProject(root);

    expect(result.report.status).toBe("attention");
    expect(result.report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "nx-integration-missing", severity: "warning" }),
      ]),
    );
    expect(result.detection.workspace).toBe("nx");
  } finally {
    await removeFixture(root);
  }
});

test("addState dry-run reports one state file without mutation", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await addState(root, { dryRun: true });

    expect(result.phases).toEqual(["analyze", "plan", "preview", "apply", "validate", "report"]);
    expect(result.report.status).toBe("dry-run");
    expect(result.report.files).toEqual(["src/state.ts"]);
    expect(result.plan.files.map((file) => file.path)).toEqual(["src/state.ts"]);
    expect(result.plan.files[0]?.content).toContain('from "@vii-labs/core"');
    expect(result.validation.passed).toBe(true);
    await expect(readFile(path.join(root, "src/state.ts"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await removeFixture(root);
  }
});

test("addState applies one deterministic state file and is idempotent", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const first = await addState(root);
    const content = await readFile(path.join(root, "src/state.ts"), "utf8");
    const second = await addState(root);

    expect(first.applied).toBe(true);
    expect(first.report).toMatchObject({ status: "applied", files: ["src/state.ts"] });
    expect(first.validation.passed).toBe(true);
    expect(content).toContain('import { state } from "@vii-labs/core"');
    expect(content).toContain("appState");
    expect(second.applied).toBe(false);
    expect(second.report).toMatchObject({ status: "unchanged", files: [] });
    expect(await readFile(path.join(root, "src/state.ts"), "utf8")).toBe(content);
  } finally {
    await removeFixture(root);
  }
});

test("addState blocks when @vii-labs/core is not installed", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await addState(root);

    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.files).toEqual([]);
    expect(result.plan.conflicts).toContain(
      "@vii-labs/core is not installed; install it explicitly before running vii add state",
    );
    expect(result.validation.passed).toBe(false);
    await expect(readFile(path.join(root, "src/state.ts"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await removeFixture(root);
  }
});

test("addState does not overwrite a locally changed state file", async () => {
  const localState = "export const appState = customState();\n";
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "src/state.ts": localState,
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await addState(root);

    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.files).toEqual([]);
    expect(result.plan.conflicts).toContain("src/state.ts already exists with local changes");
    expect(await readFile(path.join(root, "src/state.ts"), "utf8")).toBe(localState);
  } finally {
    await removeFixture(root);
  }
});

test("addState blocks when the application source directory is missing", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await addState(root);

    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.files).toEqual([]);
    expect(result.plan.conflicts).toContain(
      "src directory does not exist; create it explicitly before running vii add state",
    );
  } finally {
    await removeFixture(root);
  }
});

test("addState blocks ambiguous framework detection without mutation", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: { "@vii-labs/core": "0.0.0", "@angular/core": "20.0.0", react: "19.0.0" },
    }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await addState(root, { dryRun: true });

    expect(result.detection.framework).toBe("mixed");
    expect(result.report.status).toBe("blocked");
    expect(result.report.files).toEqual([]);
    expect(result.validation.passed).toBe(false);
    await expect(readFile(path.join(root, "src/state.ts"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await removeFixture(root);
  }
});

test("addState refuses a state symlink that escapes the project root", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/main.ts": "export {};\n",
    "tsconfig.json": "{}\n",
  });
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), "vii-add-state-outside-"));
  const outsideState = path.join(outsideRoot, "state.ts");
  const localState = "export const appState = outsideState();\n";
  await writeFile(outsideState, localState);
  await symlink(outsideState, path.join(root, "src/state.ts"));

  try {
    const result = await addState(root);

    expect(result.report.status).toBe("blocked");
    expect(result.plan.conflicts).toContain(
      "src/state.ts is a symbolic link and cannot be changed safely",
    );
    expect(await readFile(outsideState, "utf8")).toBe(localState);
  } finally {
    await removeFixture(root);
    await removeFixture(outsideRoot);
  }
});

test("initProject dry-run reports the exact config file without mutating the project", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "next.config.js": "throw new Error('must not execute');\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await initProject(root, { dryRun: true });

    expect(result.phases).toEqual(["analyze", "plan", "preview", "apply", "validate", "report"]);
    expect(result.report.status).toBe("dry-run");
    expect(result.report.files).toEqual(["vii.config.ts"]);
    expect(result.plan.files.map((file) => file.path)).toEqual(["vii.config.ts"]);
    expect(result.validation.passed).toBe(true);
    await expect(readFile(path.join(root, "vii.config.ts"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await removeFixture(root);
  }
});

test("initProject applies one deterministic config and is idempotent", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { vue: "3.5.0" } }),
    "bun.lock": "lockfile\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const first = await initProject(root);
    const content = await readFile(path.join(root, "vii.config.ts"), "utf8");
    const second = await initProject(root);

    expect(first.applied).toBe(true);
    expect(first.report).toMatchObject({ status: "applied", files: ["vii.config.ts"] });
    expect(first.validation.passed).toBe(true);
    expect(content).toContain('"framework": "vue"');
    expect(second.applied).toBe(false);
    expect(second.report).toMatchObject({ status: "unchanged", files: [] });
    expect(await readFile(path.join(root, "vii.config.ts"), "utf8")).toBe(content);
  } finally {
    await removeFixture(root);
  }
});

test("initProject does not overwrite a locally changed config", async () => {
  const localConfig = "export default { framework: 'custom' };\n";
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    "package-lock.json": "lockfile\n",
    "tsconfig.json": "{}\n",
    "vii.config.ts": localConfig,
  });

  try {
    const result = await initProject(root);

    expect(result.applied).toBe(false);
    expect(result.report.status).toBe("blocked");
    expect(result.plan.files).toEqual([]);
    expect(result.plan.conflicts).toContain("vii.config.ts already exists with local changes");
    expect(await readFile(path.join(root, "vii.config.ts"), "utf8")).toBe(localConfig);
  } finally {
    await removeFixture(root);
  }
});

test("initProject blocks ambiguous detection without mutation", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      dependencies: { "@angular/core": "20.0.0", react: "19.0.0" },
    }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "tsconfig.json": "{}\n",
  });

  try {
    const result = await initProject(root, { dryRun: true });

    expect(result.detection.framework).toBe("mixed");
    expect(result.report.status).toBe("blocked");
    expect(result.report.files).toEqual([]);
    expect(result.validation.passed).toBe(false);
    await expect(readFile(path.join(root, "vii.config.ts"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await removeFixture(root);
  }
});

test("initProject refuses a config symlink that escapes the project root", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ dependencies: { vue: "3.5.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "tsconfig.json": "{}\n",
  });
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), "vii-init-outside-"));
  const outsideConfig = path.join(outsideRoot, "config.ts");
  const localConfig = "export default { framework: 'outside' };\n";
  await writeFile(outsideConfig, localConfig);
  await symlink(outsideConfig, path.join(root, "vii.config.ts"));

  try {
    const result = await initProject(root);

    expect(result.report.status).toBe("blocked");
    expect(result.plan.conflicts).toContain(
      "vii.config.ts is a symbolic link and cannot be changed safely",
    );
    expect(await readFile(outsideConfig, "utf8")).toBe(localConfig);
  } finally {
    await removeFixture(root);
    await removeFixture(outsideRoot);
  }
});

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
      dependencies: { "@vii-labs/core": "0.0.0", react: "19.0.0", "react-dom": "19.0.0" },
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
    expect(result.installedViiPackages).toEqual(["@vii-labs/core"]);
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
    const filePath = path.join(root, name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
  }
  return root;
}

async function removeFixture(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}
