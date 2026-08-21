import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const repositoryRoot = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixtureRoot = join(repositoryRoot, "research/flow/typecheck-fixtures");
const fixtureConfig = join(fixtureRoot, "tsconfig.json");
const baselines = ["direct.ts", "rxjs.ts", "prototype.ts"];
const modes = ["cold", "incremental"];

function parseDiagnostics(output) {
  const metrics = {};
  for (const line of output.split(/\r?\n/)) {
    const match =
      /^(Files|Lines of Library|Lines of Definitions|Lines of TypeScript|Lines of JavaScript|Lines of JSON|Lines of Other|Identifiers|Symbols|Types|Instantiations|Memory used|Assignability cache size|Identity cache size|Subtype cache size|Strict subtype cache size|I\/O Read time|Parse time|ResolveModule time|ResolveLibrary time|Program time|Bind time|Check time|transformTime time|commentTime time|I\/O Write time|Print time|Emit time|Total time):\s+(.+)$/.exec(
        line,
      );
    if (match !== null) {
      metrics[match[1]] = match[2];
    }
  }
  return metrics;
}

function runTypecheck(fixture, mode, temporaryRoot) {
  const buildInfo = join(temporaryRoot, `${basename(fixture, ".ts")}.tsbuildinfo`);
  const project = join(temporaryRoot, `${basename(fixture, ".ts")}.json`);
  writeFileSync(
    project,
    JSON.stringify({
      extends: fixtureConfig,
      files: [fixture],
    }),
  );
  const args = [
    "exec",
    "tsc",
    "--noEmit",
    "--pretty",
    "false",
    "--extendedDiagnostics",
    "--project",
    project,
  ];
  if (mode === "incremental") {
    args.push("--incremental", "--tsBuildInfoFile", buildInfo);
  }
  const start = performance.now();
  try {
    const output = execFileSync("pnpm", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      status: "passed",
      elapsedMs: performance.now() - start,
      buildInfoCreated: existsSync(buildInfo),
      metrics: parseDiagnostics(output),
      rawOutput: output,
    };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    return {
      status: "failed",
      elapsedMs: performance.now() - start,
      buildInfoCreated: existsSync(buildInfo),
      metrics: parseDiagnostics(output),
      rawOutput: output,
    };
  }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "vii-flow-typecheck-"));
try {
  const report = {
    status: "typecheck-comparison",
    environment: {
      node: process.version,
      pnpm: "10.12.4",
      typescript: "6.0.2",
      rxjs: "7.8.2",
    },
    methodology: {
      modes,
      cold: "no incremental build-info file exists before the run",
      incremental: "second run reuses the same temporary build-info file",
      diagnostics: "tsc --extendedDiagnostics --pretty false",
      fixtureFiles: baselines,
      sourceLines: Object.fromEntries(
        baselines.map((fixture) => [
          fixture,
          readFileSync(join(fixtureRoot, fixture), "utf8").split(/\r?\n/).length - 1,
        ]),
      ),
    },
    results: [],
  };

  for (const fixtureName of baselines) {
    const fixture = join(fixtureRoot, fixtureName);
    const cold = runTypecheck(fixture, "cold", temporaryRoot);
    const incrementalFirst = runTypecheck(fixture, "incremental", temporaryRoot);
    const incrementalSecond = runTypecheck(fixture, "incremental", temporaryRoot);
    report.results.push({
      fixture: fixtureName,
      cold,
      incrementalFirst,
      incrementalSecond,
    });
  }

  console.log(JSON.stringify(report, null, 2));
  if (
    report.results.some(({ cold, incrementalFirst, incrementalSecond }) =>
      [cold, incrementalFirst, incrementalSecond].some(({ status }) => status !== "passed"),
    )
  ) {
    process.exitCode = 1;
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
