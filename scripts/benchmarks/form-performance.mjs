import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, release, arch } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { measureFormBundles } from "./form-performance-bundle.mjs";
import { measureFormRuntime } from "./form-performance-runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BUDGET_FILE = resolve(REPO_ROOT, "packages/form/performance-budgets.json");

function getGitRevision() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function runTypeCheckDiagnostics() {
  const tsconfig = resolve(REPO_ROOT, "packages/form/test/performance/typescript/tsconfig.json");
  let output = "";
  try {
    output = execFileSync(
      "pnpm",
      ["exec", "tsc", "-p", tsconfig, "--extendedDiagnostics", "--noEmit"],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      },
    );
  } catch (err) {
    output = (err.stdout ?? "") + "\n" + (err.stderr ?? "");
  }

  const parseNum = (re) => {
    const m = output.match(re);
    return m ? parseFloat(m[1]) : 0;
  };

  return {
    files: parseNum(/Files:\s+(\d+)/),
    linesOfTs: parseNum(/Lines of TypeScript:\s+(\d+)/),
    symbols: parseNum(/Symbols:\s+(\d+)/),
    types: parseNum(/Types:\s+(\d+)/),
    instantiations: parseNum(/Instantiations:\s+(\d+)/),
    memoryUsedMb: parseNum(/Memory used:\s+(\d+)K/) / 1024,
    checkTimeSeconds: parseNum(/Check time:\s+([\d.]+)s/),
    totalTimeSeconds: parseNum(/Total time:\s+([\d.]+)s/),
    hasRecursionError: output.includes("TS2589") || output.includes("excessively deep"),
  };
}

async function main() {
  console.log("\n=======================================================");
  console.log("  Vii Form Production Performance & Size Gate (P1l)");
  console.log("=======================================================\n");

  const budgets = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
  const gitRevision = getGitRevision();
  const env = {
    platform: `${platform()} ${arch()} ${release()}`,
    cpuModel: cpus()[0]?.model ?? "unknown",
    cpuCount: cpus().length,
    nodeVersion: process.version,
    gitRevision,
    timestamp: new Date().toISOString(),
  };

  console.log(`Environment: ${env.platform} | CPU: ${env.cpuModel} (${env.cpuCount} cores)`);
  console.log(`Node: ${env.nodeVersion} | Git: ${env.gitRevision.slice(0, 10)}\n`);

  console.log("[1/3] Measuring bundle sizes, tree-shaking & package tarball...");
  const bundleResults = await measureFormBundles();

  console.log("[2/3] Measuring runtime performance, arrays & framework adapters...");
  const runtimeResults = await measureFormRuntime();

  console.log("[3/3] Running TypeScript type diagnostics check...");
  const typeResults = runTypeCheckDiagnostics();

  console.log("\n-------------------------------------------------------");
  console.log("  Budget Enforcement Evaluation");
  console.log("-------------------------------------------------------\n");

  const checks = [];
  function evaluate(name, actual, expected, pass, unit = "") {
    checks.push({ name, actual, expected, pass });
    const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const actualFormatted = typeof actual === "number" ? actual.toLocaleString() : String(actual);
    const expectedFormatted =
      typeof expected === "number" ? expected.toLocaleString() : String(expected);
    console.log(
      `  ${tag} ${name.padEnd(42)} ${actualFormatted.padStart(10)} ${unit}  (max/target: ${expectedFormatted} ${unit})`,
    );
  }

  // Bundle checks
  evaluate(
    "bundle.root.minified",
    bundleResults.root.minified,
    budgets.bundle.root.maxMinifiedBytes,
    bundleResults.root.minified <= budgets.bundle.root.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.root.gzip",
    bundleResults.root.gzip,
    budgets.bundle.root.maxGzipBytes,
    bundleResults.root.gzip <= budgets.bundle.root.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.createFieldOnly.minified",
    bundleResults.createFieldOnly.minified,
    budgets.bundle.createFieldOnly.maxMinifiedBytes,
    bundleResults.createFieldOnly.minified <= budgets.bundle.createFieldOnly.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.createFieldOnly.gzip",
    bundleResults.createFieldOnly.gzip,
    budgets.bundle.createFieldOnly.maxGzipBytes,
    bundleResults.createFieldOnly.gzip <= budgets.bundle.createFieldOnly.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.reactAdapter.minified",
    bundleResults.reactAdapter.minified,
    budgets.bundle.reactAdapter.maxMinifiedBytes,
    bundleResults.reactAdapter.minified <= budgets.bundle.reactAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.reactAdapter.gzip",
    bundleResults.reactAdapter.gzip,
    budgets.bundle.reactAdapter.maxGzipBytes,
    bundleResults.reactAdapter.gzip <= budgets.bundle.reactAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.vanillaAdapter.minified",
    bundleResults.vanillaAdapter.minified,
    budgets.bundle.vanillaAdapter.maxMinifiedBytes,
    bundleResults.vanillaAdapter.minified <= budgets.bundle.vanillaAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.vanillaAdapter.gzip",
    bundleResults.vanillaAdapter.gzip,
    budgets.bundle.vanillaAdapter.maxGzipBytes,
    bundleResults.vanillaAdapter.gzip <= budgets.bundle.vanillaAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.angularAdapter.minified",
    bundleResults.angularAdapter.minified,
    budgets.bundle.angularAdapter.maxMinifiedBytes,
    bundleResults.angularAdapter.minified <= budgets.bundle.angularAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.angularAdapter.gzip",
    bundleResults.angularAdapter.gzip,
    budgets.bundle.angularAdapter.maxGzipBytes,
    bundleResults.angularAdapter.gzip <= budgets.bundle.angularAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.vueAdapter.minified",
    bundleResults.vueAdapter.minified,
    budgets.bundle.vueAdapter.maxMinifiedBytes,
    bundleResults.vueAdapter.minified <= budgets.bundle.vueAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.vueAdapter.gzip",
    bundleResults.vueAdapter.gzip,
    budgets.bundle.vueAdapter.maxGzipBytes,
    bundleResults.vueAdapter.gzip <= budgets.bundle.vueAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.tarball.compressed",
    bundleResults.tarball.compressedBytes,
    budgets.bundle.tarball.maxCompressedBytes,
    bundleResults.tarball.compressedBytes <= budgets.bundle.tarball.maxCompressedBytes,
    "B",
  );

  // Isolation checks
  evaluate(
    "isolation.rootFrameworkClean",
    bundleResults.isolation.rootFrameworkClean,
    true,
    bundleResults.isolation.rootFrameworkClean === true,
  );
  evaluate(
    "isolation.reactClean",
    bundleResults.isolation.reactClean,
    true,
    bundleResults.isolation.reactClean === true,
  );
  evaluate(
    "isolation.vanillaClean",
    bundleResults.isolation.vanillaClean,
    true,
    bundleResults.isolation.vanillaClean === true,
  );
  evaluate(
    "isolation.angularClean",
    bundleResults.isolation.angularClean,
    true,
    bundleResults.isolation.angularClean === true,
  );
  evaluate(
    "isolation.vueClean",
    bundleResults.isolation.vueClean,
    true,
    bundleResults.isolation.vueClean === true,
  );
  evaluate(
    "isolation.schemaProvidersClean",
    bundleResults.isolation.schemaProvidersClean,
    true,
    bundleResults.isolation.schemaProvidersClean === true,
  );
  evaluate(
    "isolation.standardSchemaRuntimeBytes",
    bundleResults.isolation.standardSchemaSpecRuntimeBytes,
    0,
    bundleResults.isolation.standardSchemaSpecRuntimeBytes === 0,
    "B",
  );
  evaluate(
    "isolation.excludedFixtures",
    !bundleResults.tarball.containsExcludedFixtures,
    true,
    !bundleResults.tarball.containsExcludedFixtures,
  );

  // Runtime checks
  evaluate(
    "runtime.siblingNotificationCount",
    runtimeResults.siblingNotifications,
    0,
    runtimeResults.siblingNotifications === 0,
  );
  evaluate(
    "runtime.fieldArrayIdentityVerified",
    runtimeResults.identityVerified,
    true,
    runtimeResults.identityVerified === true,
  );
  evaluate(
    "runtime.typeCheckRecursionError",
    typeResults.hasRecursionError,
    false,
    !typeResults.hasRecursionError,
  );

  // Ceilings (for CI protection)
  evaluate(
    "runtime.ceiling.construct1000",
    runtimeResults.construction[1000].medianMs,
    budgets.runtime.ceilings.construct1000MaxMs,
    runtimeResults.construction[1000].medianMs <= budgets.runtime.ceilings.construct1000MaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceiling.leafMutation1000",
    runtimeResults.leafMutation[1000].medianUs,
    budgets.runtime.ceilings.leafMutation1000MaxUs,
    runtimeResults.leafMutation[1000].medianUs <= budgets.runtime.ceilings.leafMutation1000MaxUs,
    "us",
  );
  evaluate(
    "runtime.ceiling.aggregateMutation1000",
    runtimeResults.aggregateMutation[1000].medianMs,
    budgets.runtime.ceilings.aggregateMutation1000MaxMs,
    runtimeResults.aggregateMutation[1000].medianMs <=
      budgets.runtime.ceilings.aggregateMutation1000MaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceiling.validation1000",
    runtimeResults.validation[1000].medianMs,
    budgets.runtime.ceilings.validation1000MaxMs,
    runtimeResults.validation[1000].medianMs <= budgets.runtime.ceilings.validation1000MaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceiling.submissionSuccess",
    runtimeResults.submission.success.medianMs,
    budgets.runtime.ceilings.submissionSuccessMaxMs,
    runtimeResults.submission.success.medianMs <= budgets.runtime.ceilings.submissionSuccessMaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceiling.serverIssueRoute1000",
    runtimeResults.serverIssues[1000].medianMs,
    budgets.runtime.ceilings.serverIssueRoute1000MaxMs,
    runtimeResults.serverIssues[1000].medianMs <=
      budgets.runtime.ceilings.serverIssueRoute1000MaxMs,
    "ms",
  );

  const report = {
    schemaVersion: "1.0",
    suite: "form-p1l-performance-gate",
    environment: env,
    budgets,
    results: {
      bundle: bundleResults,
      runtime: runtimeResults,
      typecheck: typeResults,
    },
    checks,
    passed: checks.every((c) => c.pass),
  };

  mkdirSync(resolve(REPO_ROOT, ".tmp"), { recursive: true });
  writeFileSync(
    resolve(REPO_ROOT, ".tmp/form-performance-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log("\n-------------------------------------------------------");
  if (report.passed) {
    console.log("  \x1b[32mALL PERFORMANCE, BUNDLE, AND MEMORY GATES PASSED\x1b[0m");
    console.log("-------------------------------------------------------\n");
    process.exit(0);
  } else {
    console.error("  \x1b[31mONE OR MORE PERFORMANCE GATES FAILED\x1b[0m");
    console.log("-------------------------------------------------------\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
