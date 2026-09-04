import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, release, arch } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { measureFormBundles } from "./form-performance-bundle.mjs";
import { measureFormRuntime } from "./form-performance-runtime.mjs";
import { measureFormMemory } from "./form-performance-memory.mjs";

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

  console.log("[1/4] Measuring bundle sizes, tree-shaking & package tarball...");
  const bundleResults = await measureFormBundles();

  console.log("[2/4] Measuring runtime performance, arrays & framework adapters...");
  const runtimeResults = await measureFormRuntime();

  console.log("[3/4] Measuring memory lifecycle, scopes & retention...");
  const memoryResults = await measureFormMemory();

  console.log("[4/4] Running TypeScript type diagnostics check...");
  const typeResults = runTypeCheckDiagnostics();

  console.log("\n-------------------------------------------------------");
  console.log("  Budget Enforcement Evaluation (41 HARD checks)");
  console.log("-------------------------------------------------------\n");

  const checks = [];
  function evaluate(name, actual, expected, pass, unit = "") {
    checks.push({ name, actual, expected, pass });
    const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const actualFormatted = typeof actual === "number" ? actual.toLocaleString() : String(actual);
    const expectedFormatted =
      typeof expected === "number" ? expected.toLocaleString() : String(expected);
    console.log(
      `  ${tag} ${name.padEnd(44)} ${actualFormatted.padStart(10)} ${unit.padEnd(3)} (threshold: ${expectedFormatted} ${unit})`,
    );
  }

  // 1. Bundle (Minified, Gzip, Brotli for all entries + Tarball = 19 checks)
  evaluate(
    "bundle.root.maxMinifiedBytes",
    bundleResults.root.minified,
    budgets.bundle.root.maxMinifiedBytes,
    bundleResults.root.minified <= budgets.bundle.root.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.root.maxGzipBytes",
    bundleResults.root.gzip,
    budgets.bundle.root.maxGzipBytes,
    bundleResults.root.gzip <= budgets.bundle.root.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.root.maxBrotliBytes",
    bundleResults.root.brotli,
    budgets.bundle.root.maxBrotliBytes,
    bundleResults.root.brotli <= budgets.bundle.root.maxBrotliBytes,
    "B",
  );

  evaluate(
    "bundle.createFieldOnly.maxMinifiedBytes",
    bundleResults.createFieldOnly.minified,
    budgets.bundle.createFieldOnly.maxMinifiedBytes,
    bundleResults.createFieldOnly.minified <= budgets.bundle.createFieldOnly.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.createFieldOnly.maxGzipBytes",
    bundleResults.createFieldOnly.gzip,
    budgets.bundle.createFieldOnly.maxGzipBytes,
    bundleResults.createFieldOnly.gzip <= budgets.bundle.createFieldOnly.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.createFieldOnly.maxBrotliBytes",
    bundleResults.createFieldOnly.brotli,
    budgets.bundle.createFieldOnly.maxBrotliBytes,
    bundleResults.createFieldOnly.brotli <= budgets.bundle.createFieldOnly.maxBrotliBytes,
    "B",
  );

  evaluate(
    "bundle.reactAdapter.maxMinifiedBytes",
    bundleResults.reactAdapter.minified,
    budgets.bundle.reactAdapter.maxMinifiedBytes,
    bundleResults.reactAdapter.minified <= budgets.bundle.reactAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.reactAdapter.maxGzipBytes",
    bundleResults.reactAdapter.gzip,
    budgets.bundle.reactAdapter.maxGzipBytes,
    bundleResults.reactAdapter.gzip <= budgets.bundle.reactAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.reactAdapter.maxBrotliBytes",
    bundleResults.reactAdapter.brotli,
    budgets.bundle.reactAdapter.maxBrotliBytes,
    bundleResults.reactAdapter.brotli <= budgets.bundle.reactAdapter.maxBrotliBytes,
    "B",
  );

  evaluate(
    "bundle.vanillaAdapter.maxMinifiedBytes",
    bundleResults.vanillaAdapter.minified,
    budgets.bundle.vanillaAdapter.maxMinifiedBytes,
    bundleResults.vanillaAdapter.minified <= budgets.bundle.vanillaAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.vanillaAdapter.maxGzipBytes",
    bundleResults.vanillaAdapter.gzip,
    budgets.bundle.vanillaAdapter.maxGzipBytes,
    bundleResults.vanillaAdapter.gzip <= budgets.bundle.vanillaAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.vanillaAdapter.maxBrotliBytes",
    bundleResults.vanillaAdapter.brotli,
    budgets.bundle.vanillaAdapter.maxBrotliBytes,
    bundleResults.vanillaAdapter.brotli <= budgets.bundle.vanillaAdapter.maxBrotliBytes,
    "B",
  );

  evaluate(
    "bundle.angularAdapter.maxMinifiedBytes",
    bundleResults.angularAdapter.minified,
    budgets.bundle.angularAdapter.maxMinifiedBytes,
    bundleResults.angularAdapter.minified <= budgets.bundle.angularAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.angularAdapter.maxGzipBytes",
    bundleResults.angularAdapter.gzip,
    budgets.bundle.angularAdapter.maxGzipBytes,
    bundleResults.angularAdapter.gzip <= budgets.bundle.angularAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.angularAdapter.maxBrotliBytes",
    bundleResults.angularAdapter.brotli,
    budgets.bundle.angularAdapter.maxBrotliBytes,
    bundleResults.angularAdapter.brotli <= budgets.bundle.angularAdapter.maxBrotliBytes,
    "B",
  );

  evaluate(
    "bundle.vueAdapter.maxMinifiedBytes",
    bundleResults.vueAdapter.minified,
    budgets.bundle.vueAdapter.maxMinifiedBytes,
    bundleResults.vueAdapter.minified <= budgets.bundle.vueAdapter.maxMinifiedBytes,
    "B",
  );
  evaluate(
    "bundle.vueAdapter.maxGzipBytes",
    bundleResults.vueAdapter.gzip,
    budgets.bundle.vueAdapter.maxGzipBytes,
    bundleResults.vueAdapter.gzip <= budgets.bundle.vueAdapter.maxGzipBytes,
    "B",
  );
  evaluate(
    "bundle.vueAdapter.maxBrotliBytes",
    bundleResults.vueAdapter.brotli,
    budgets.bundle.vueAdapter.maxBrotliBytes,
    bundleResults.vueAdapter.brotli <= budgets.bundle.vueAdapter.maxBrotliBytes,
    "B",
  );

  evaluate(
    "bundle.tarball.maxCompressedBytes",
    bundleResults.tarball.compressedBytes,
    budgets.bundle.tarball.maxCompressedBytes,
    bundleResults.tarball.compressedBytes <= budgets.bundle.tarball.maxCompressedBytes,
    "B",
  );

  // 2. Isolation (8 checks)
  evaluate(
    "isolation.rootFrameworkClean",
    bundleResults.isolation.rootFrameworkClean,
    budgets.isolation.rootFrameworkClean,
    bundleResults.isolation.rootFrameworkClean === budgets.isolation.rootFrameworkClean,
  );
  evaluate(
    "isolation.reactClean",
    bundleResults.isolation.reactClean,
    budgets.isolation.reactClean,
    bundleResults.isolation.reactClean === budgets.isolation.reactClean,
  );
  evaluate(
    "isolation.vanillaClean",
    bundleResults.isolation.vanillaClean,
    budgets.isolation.vanillaClean,
    bundleResults.isolation.vanillaClean === budgets.isolation.vanillaClean,
  );
  evaluate(
    "isolation.angularClean",
    bundleResults.isolation.angularClean,
    budgets.isolation.angularClean,
    bundleResults.isolation.angularClean === budgets.isolation.angularClean,
  );
  evaluate(
    "isolation.vueClean",
    bundleResults.isolation.vueClean,
    budgets.isolation.vueClean,
    bundleResults.isolation.vueClean === budgets.isolation.vueClean,
  );
  evaluate(
    "isolation.schemaProvidersClean",
    bundleResults.isolation.schemaProvidersClean,
    budgets.isolation.schemaProvidersClean,
    bundleResults.isolation.schemaProvidersClean === budgets.isolation.schemaProvidersClean,
  );
  evaluate(
    "isolation.standardSchemaSpecRuntimeBytes",
    bundleResults.isolation.standardSchemaSpecRuntimeBytes,
    budgets.isolation.standardSchemaSpecRuntimeBytes,
    bundleResults.isolation.standardSchemaSpecRuntimeBytes <=
      budgets.isolation.standardSchemaSpecRuntimeBytes,
    "B",
  );
  evaluate(
    "isolation.containsExcludedFixtures",
    bundleResults.tarball.containsExcludedFixtures,
    budgets.isolation.containsExcludedFixtures,
    bundleResults.tarball.containsExcludedFixtures === budgets.isolation.containsExcludedFixtures,
  );

  // 3. Memory Hard Gates (5 checks)
  evaluate(
    "memory.allowedRetainedSubscriptions",
    memoryResults.retainedSubscriptions,
    budgets.memory.allowedRetainedSubscriptions,
    memoryResults.retainedSubscriptions <= budgets.memory.allowedRetainedSubscriptions,
  );
  evaluate(
    "memory.allowedRetainedScopes",
    memoryResults.retainedScopes,
    budgets.memory.allowedRetainedScopes,
    memoryResults.retainedScopes <= budgets.memory.allowedRetainedScopes,
  );
  evaluate(
    "memory.allowedRetainedTimers",
    memoryResults.retainedTimers,
    budgets.memory.allowedRetainedTimers,
    memoryResults.retainedTimers <= budgets.memory.allowedRetainedTimers,
  );
  evaluate(
    "memory.allowedStaleCommits",
    memoryResults.staleCommits,
    budgets.memory.allowedStaleCommits,
    memoryResults.staleCommits <= budgets.memory.allowedStaleCommits,
  );
  evaluate(
    "memory.allowedUnhandledRejections",
    memoryResults.unhandledRejections,
    budgets.memory.allowedUnhandledRejections,
    memoryResults.unhandledRejections <= budgets.memory.allowedUnhandledRejections,
  );

  // 4. Runtime Invariants (3 checks)
  evaluate(
    "runtime.siblingNotificationCount",
    runtimeResults.siblingNotifications,
    budgets.runtime.siblingNotificationCount,
    runtimeResults.siblingNotifications === budgets.runtime.siblingNotificationCount,
  );
  evaluate(
    "runtime.fieldArrayIdentityVerified",
    runtimeResults.identityVerified,
    budgets.runtime.fieldArrayIdentityVerified,
    runtimeResults.identityVerified === budgets.runtime.fieldArrayIdentityVerified,
  );
  evaluate(
    "runtime.typeCheckRecursionError",
    typeResults.hasRecursionError,
    budgets.runtime.typeCheckRecursionError,
    typeResults.hasRecursionError === budgets.runtime.typeCheckRecursionError,
  );

  // 5. Runtime Ceilings (6 checks)
  evaluate(
    "runtime.ceilings.construct1000MaxMs",
    runtimeResults.construction[1000].medianMs,
    budgets.runtime.ceilings.construct1000MaxMs,
    runtimeResults.construction[1000].medianMs <= budgets.runtime.ceilings.construct1000MaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceilings.leafMutation1000MaxUs",
    runtimeResults.leafMutation[1000].medianUs,
    budgets.runtime.ceilings.leafMutation1000MaxUs,
    runtimeResults.leafMutation[1000].medianUs <= budgets.runtime.ceilings.leafMutation1000MaxUs,
    "us",
  );
  evaluate(
    "runtime.ceilings.aggregateMutation1000MaxMs",
    runtimeResults.aggregateMutation[1000].medianMs,
    budgets.runtime.ceilings.aggregateMutation1000MaxMs,
    runtimeResults.aggregateMutation[1000].medianMs <=
      budgets.runtime.ceilings.aggregateMutation1000MaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceilings.validation1000MaxMs",
    runtimeResults.validation[1000].medianMs,
    budgets.runtime.ceilings.validation1000MaxMs,
    runtimeResults.validation[1000].medianMs <= budgets.runtime.ceilings.validation1000MaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceilings.submissionSuccessMaxMs",
    runtimeResults.submission.success.medianMs,
    budgets.runtime.ceilings.submissionSuccessMaxMs,
    runtimeResults.submission.success.medianMs <= budgets.runtime.ceilings.submissionSuccessMaxMs,
    "ms",
  );
  evaluate(
    "runtime.ceilings.serverIssueRoute1000MaxMs",
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
      memory: memoryResults,
      typecheck: typeResults,
    },
    checks,
    totalChecks: checks.length,
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
    console.log(
      `  \x1b[32mALL PERFORMANCE, BUNDLE, AND MEMORY GATES PASSED (${checks.length}/41)\x1b[0m`,
    );
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
