import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { build } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");
const FORM_DIST = resolve(REPO_ROOT, "packages/form/dist");

async function bundleCode(
  entrySourceOrPath: string,
  options: { isFile?: boolean; external: string[] },
): Promise<{ code: string; minified: number; gzip: number; brotli: number }> {
  const tmpDir = mkdtempSync(join(tmpdir(), "vii-bundle-bench-"));
  let entryPath = entrySourceOrPath;

  if (!options.isFile) {
    entryPath = join(tmpDir, "entry.js");
    writeFileSync(entryPath, entrySourceOrPath, "utf-8");
  }

  try {
    const buildResult = await build({
      build: {
        write: false,
        minify: "esbuild",
        lib: {
          entry: entryPath,
          formats: ["es"],
          fileName: "bundle",
        },
        rollupOptions: {
          external: options.external,
        },
      },
      logLevel: "silent",
    });

    const rollOutput = Array.isArray(buildResult)
      ? buildResult[0]
      : "output" in buildResult
        ? buildResult
        : undefined;
    const outputList = rollOutput && "output" in rollOutput ? rollOutput.output : [];
    const chunk = (outputList as Array<{ fileName: string; code?: string }>).find(
      (o) => o.fileName === "bundle.js",
    );
    const code = chunk && chunk.code ? chunk.code : "";
    const rawBuffer = Buffer.from(code, "utf-8");

    return {
      code,
      minified: rawBuffer.byteLength,
      gzip: gzipSync(rawBuffer, { level: 9 }).byteLength,
      brotli: brotliCompressSync(rawBuffer).byteLength,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("P1l Bundle, Tree-Shaking, and Framework Isolation Gate", () => {
  const externals = [
    "react",
    "react-dom",
    "@angular/core",
    "vue",
    "zod",
    "valibot",
    "arktype",
    "@standard-schema/spec",
  ];

  it("proves root entry does not bundle React, Angular, Vue, or concrete schema libraries", async () => {
    const root = await bundleCode(resolve(FORM_DIST, "index.js"), {
      isFile: true,
      external: ["@vii-labs/core", ...externals],
    });

    expect(root.code.includes("react")).toBe(false);
    expect(root.code.includes("@angular/core")).toBe(false);
    expect(root.code.includes("vue")).toBe(false);
    expect(root.code.includes("zod")).toBe(false);
    expect(root.code.includes("valibot")).toBe(false);
    expect(root.code.includes("arktype")).toBe(false);
  });

  it("proves createField standalone consumer tree-shakes unused form tree features", async () => {
    const root = await bundleCode(resolve(FORM_DIST, "index.js"), {
      isFile: true,
      external: ["@vii-labs/core", ...externals],
    });

    const createFieldOnly = await bundleCode(
      `export { createField } from "${resolve(FORM_DIST, "index.js")}";`,
      { external: ["@vii-labs/core", ...externals] },
    );

    // createField standalone must be significantly smaller than full root
    expect(createFieldOnly.minified).toBeLessThan(root.minified * 0.5);
    expect(createFieldOnly.gzip).toBeLessThan(root.gzip * 0.6);
  });

  it("proves framework adapter subpaths are completely isolated from peer frameworks", async () => {
    const react = await bundleCode(resolve(FORM_DIST, "adapters/react/index.js"), {
      isFile: true,
      external: ["@vii-labs/core", ...externals],
    });
    expect(react.code.includes("@angular/core")).toBe(false);
    expect(react.code.includes("vue")).toBe(false);

    const vanilla = await bundleCode(resolve(FORM_DIST, "adapters/vanilla/index.js"), {
      isFile: true,
      external: ["@vii-labs/core", ...externals],
    });
    expect(vanilla.code.includes("react")).toBe(false);
    expect(vanilla.code.includes("@angular/core")).toBe(false);
    expect(vanilla.code.includes("vue")).toBe(false);

    const angular = await bundleCode(resolve(FORM_DIST, "adapters/angular/index.js"), {
      isFile: true,
      external: ["@vii-labs/core", ...externals],
    });
    expect(angular.code.includes("react")).toBe(false);
    expect(angular.code.includes("vue")).toBe(false);

    const vue = await bundleCode(resolve(FORM_DIST, "adapters/vue/index.js"), {
      isFile: true,
      external: ["@vii-labs/core", ...externals],
    });
    expect(vue.code.includes("react")).toBe(false);
    expect(vue.code.includes("@angular/core")).toBe(false);
  });

  it("verifies packed tarball excludes fixtures, research, and tests", () => {
    const packTmpDir = mkdtempSync(join(tmpdir(), "vii-pack-test-"));
    try {
      const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
      execFileSync(pnpm, ["--filter", "@vii-labs/form", "pack", "--pack-destination", packTmpDir], {
        cwd: REPO_ROOT,
      });
      const tarballName = execFileSync("ls", [packTmpDir], {
        encoding: "utf8",
      }).trim();
      const tarballPath = join(packTmpDir, tarballName);
      const fileList = execFileSync("tar", ["-tzf", tarballPath], {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);

      const invalidEntries = fileList.filter(
        (f) =>
          f.includes("test") ||
          f.includes("fixture") ||
          f.includes("playwright") ||
          f.includes("research"),
      );
      expect(invalidEntries).toEqual([]);
    } finally {
      rmSync(packTmpDir, { recursive: true, force: true });
    }
  });
});
