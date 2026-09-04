import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { build } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const FORM_DIST = resolve(REPO_ROOT, "packages/form/dist");

async function bundleCode(entrySourceOrPath, options = { isFile: false, external: [] }) {
  const tmpDir = mkdtempSync(join(tmpdir(), "vii-perf-bundle-"));
  let entryPath = entrySourceOrPath;

  if (!options.isFile) {
    entryPath = join(tmpDir, "entry.js");
    writeFileSync(entryPath, entrySourceOrPath, "utf-8");
  }

  try {
    const result = await build({
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

    const output = Array.isArray(result) ? result[0].output : result.output;
    const chunk = output.find((o) => o.fileName === "bundle.js");
    const code = chunk ? chunk.code : "";
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

export async function measureFormBundles() {
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

  // 1. Root Entry (Core external)
  const root = await bundleCode(resolve(FORM_DIST, "index.js"), {
    isFile: true,
    external: ["@vii-labs/core", ...externals],
  });

  // 2. Root Entry with Core included
  const rootWithCore = await bundleCode(resolve(FORM_DIST, "index.js"), {
    isFile: true,
    external: externals,
  });

  // 3. createField standalone (Core external)
  const createFieldOnly = await bundleCode(
    `export { createField } from "${resolve(FORM_DIST, "index.js")}";`,
    { external: ["@vii-labs/core", ...externals] },
  );

  // 4. createField standalone with Core included
  const createFieldWithCore = await bundleCode(
    `export { createField } from "${resolve(FORM_DIST, "index.js")}";`,
    { external: externals },
  );

  // 5. Adapters (peers external)
  const reactAdapter = await bundleCode(resolve(FORM_DIST, "adapters/react/index.js"), {
    isFile: true,
    external: ["@vii-labs/core", ...externals],
  });

  const vanillaAdapter = await bundleCode(resolve(FORM_DIST, "adapters/vanilla/index.js"), {
    isFile: true,
    external: ["@vii-labs/core", ...externals],
  });

  const angularAdapter = await bundleCode(resolve(FORM_DIST, "adapters/angular/index.js"), {
    isFile: true,
    external: ["@vii-labs/core", ...externals],
  });

  const vueAdapter = await bundleCode(resolve(FORM_DIST, "adapters/vue/index.js"), {
    isFile: true,
    external: ["@vii-labs/core", ...externals],
  });

  // 6. Tarball measurement
  const packTmp = mkdtempSync(join(tmpdir(), "vii-perf-pack-"));
  let compressedBytes;
  let unpackedBytes;
  let fileList;
  let containsExcludedFixtures;

  try {
    const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    execFileSync(pnpm, ["--filter", "@vii-labs/form", "pack", "--pack-destination", packTmp], {
      cwd: REPO_ROOT,
    });
    const tarballName = execFileSync("ls", [packTmp], { encoding: "utf8" }).trim();
    const tarballPath = join(packTmp, tarballName);
    compressedBytes = readFileSync(tarballPath).byteLength;

    fileList = execFileSync("tar", ["-tzf", tarballPath], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    const extractDir = join(packTmp, "extracted");
    mkdirSync(extractDir, { recursive: true });
    execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir]);
    const duOut = execFileSync("du", ["-sk", extractDir], { encoding: "utf8" });
    unpackedBytes = parseInt(duOut.trim().split(/\s+/)[0], 10) * 1024;

    containsExcludedFixtures = fileList.some(
      (f) =>
        f.includes("test") ||
        f.includes("fixture") ||
        f.includes("playwright") ||
        f.includes("research"),
    );
  } finally {
    rmSync(packTmp, { recursive: true, force: true });
  }

  return {
    root,
    rootWithCore,
    createFieldOnly,
    createFieldWithCore,
    reactAdapter,
    vanillaAdapter,
    angularAdapter,
    vueAdapter,
    isolation: {
      rootFrameworkClean:
        !root.code.includes("react") &&
        !root.code.includes("@angular/core") &&
        !root.code.includes("vue"),
      reactClean:
        !reactAdapter.code.includes("@angular/core") && !reactAdapter.code.includes("vue"),
      vanillaClean:
        !vanillaAdapter.code.includes("react") &&
        !vanillaAdapter.code.includes("@angular/core") &&
        !vanillaAdapter.code.includes("vue"),
      angularClean: !angularAdapter.code.includes("react") && !angularAdapter.code.includes("vue"),
      vueClean: !vueAdapter.code.includes("react") && !vueAdapter.code.includes("@angular/core"),
      schemaProvidersClean:
        !root.code.includes("zod") &&
        !root.code.includes("valibot") &&
        !root.code.includes("arktype"),
      standardSchemaSpecRuntimeBytes: 0,
    },
    tarball: {
      compressedBytes,
      unpackedBytes,
      fileCount: fileList.length,
      containsExcludedFixtures,
      fileList,
    },
  };
}
