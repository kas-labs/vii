import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, release, arch } from "node:os";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
const coreEntry = join(root, "packages/core/dist/index.js");
const core = await import(pathToFileURL(coreEntry).href).catch(() => {
  throw new Error("Core is not built. Run `pnpm --filter @vii-labs/core build` first.");
});

const iterations = readPositiveInteger("Vii_BENCH_ITERATIONS", 10_000);
const warmupRounds = readPositiveInteger("Vii_BENCH_WARMUP_ROUNDS", 2);
const repetitions = readPositiveInteger("Vii_BENCH_REPETITIONS", 5);
const fanout = readPositiveInteger("Vii_BENCH_FANOUT", 100);
const chainDepth = readPositiveInteger("Vii_BENCH_CHAIN_DEPTH", 10);

const benchmarks = [
  createStateCreationBenchmark(),
  createWriteBenchmark(),
  createFanoutBenchmark(),
  createComputedChainBenchmark(),
  createBatchBenchmark(),
  createSubscriptionDisposalBenchmark(),
  createScopeCleanupBenchmark(),
  ...["off", "development", "production-safe"].map(createDiagnosticsBenchmark),
];

const results = benchmarks.map((benchmark) => runBenchmark(benchmark));
const source = gitSource();
const output = {
  schemaVersion: "0.1",
  suite: "core-state-baseline",
  package: { name: packageJson.name, version: packageJson.version, entry: "dist/index.js" },
  revision: source.revision,
  workingTreeDirty: source.workingTreeDirty,
  environment: {
    node: process.version,
    platform: `${platform()} ${arch()} ${release()}`,
    cpu: cpus()[0]?.model ?? "unknown",
  },
  configuration: { iterations, warmupRounds, repetitions, fanout, chainDepth },
  results,
};

const resultPath = join(root, "benchmarks/results/core-state-baseline.json");
writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

function runBenchmark(benchmark) {
  for (let round = 0; round < warmupRounds; round += 1) {
    runOperations(benchmark.operation);
  }

  const samples = [];
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const start = performance.now();
    runOperations(benchmark.operation);
    samples.push(performance.now() - start);
  }

  benchmark.cleanup?.();
  const sortedSamples = [...samples].sort((left, right) => left - right);
  const medianMs = sortedSamples[Math.floor(sortedSamples.length / 2)];

  return {
    name: benchmark.name,
    operations: iterations,
    samplesMs: samples.map((sample) => round(sample)),
    medianMs: round(medianMs),
    operationsPerSecond: round((iterations / medianMs) * 1000),
    ...benchmark.metadata(),
  };
}

function runOperations(operation) {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    operation(iteration);
  }
}

function createStateCreationBenchmark() {
  return {
    name: "state-creation",
    operation: (iteration) => core.state(iteration),
    metadata: () => ({}),
  };
}

function createWriteBenchmark() {
  const source = core.state(0);
  return {
    name: "state-write",
    operation: (iteration) => source.set(iteration + 1),
    metadata: () => ({}),
  };
}

function createFanoutBenchmark() {
  const source = core.state(0);
  let notifications = 0;
  const unsubscribe = Array.from({ length: fanout }, () =>
    source.subscribe(() => {
      notifications += 1;
    }),
  );

  return {
    name: "subscriber-fanout",
    operation: (iteration) => source.set(iteration + 1),
    cleanup: () => unsubscribe.forEach((dispose) => dispose()),
    metadata: () => ({ fanout, notifications }),
  };
}

function createComputedChainBenchmark() {
  const source = core.state(0);
  const chain = [];
  let previous = source;
  for (let index = 0; index < chainDepth; index += 1) {
    const dependency = previous;
    previous = core.computed(() => dependency.get() + 1);
    chain.push(previous);
  }
  const final = previous;
  final.get();
  let checksum = 0;

  return {
    name: "computed-chain",
    operation: (iteration) => {
      source.set(iteration + 1);
      checksum += final.get();
    },
    cleanup: () => [...chain].reverse().forEach((computed) => computed.dispose()),
    metadata: () => ({ chainDepth, checksum }),
  };
}

function createBatchBenchmark() {
  const sources = Array.from({ length: fanout }, () => core.state(0));
  let notifications = 0;
  const unsubscribe = sources.map((source) =>
    source.subscribe(() => {
      notifications += 1;
    }),
  );

  return {
    name: "batch-propagation",
    operation: (iteration) =>
      core.batch(() => {
        sources.forEach((source, index) => source.set(iteration * fanout + index + 1));
      }),
    cleanup: () => unsubscribe.forEach((dispose) => dispose()),
    metadata: () => ({ fanout, notifications }),
  };
}

function createSubscriptionDisposalBenchmark() {
  const source = core.state(0);
  return {
    name: "subscription-disposal",
    operation: () => {
      const unsubscribe = source.subscribe(() => {});
      unsubscribe();
    },
    metadata: () => ({}),
  };
}

function createScopeCleanupBenchmark() {
  return {
    name: "scope-cleanup",
    operation: (iteration) => {
      const scope = core.createScope();
      scope.run(() => {
        const source = core.state(iteration);
        const derived = core.computed(() => source.get() + 1);
        derived.get();
        source.subscribe(() => {});
      });
      scope.dispose();
    },
    metadata: () => ({}),
  };
}

function createDiagnosticsBenchmark(mode) {
  const diagnostics = core.createDiagnostics({ mode, maxEvents: 1_000 });
  const source = diagnostics.run(() => core.state(0));
  return {
    name: `diagnostics-${mode}-write`,
    operation: (iteration) => source.set(iteration + 1),
    metadata: () => ({
      events: diagnostics.getEvents().length,
      droppedEvents: diagnostics.droppedEvents,
    }),
  };
}

function readPositiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function round(value) {
  return Number(value.toFixed(3));
}

function gitSource() {
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: root,
    encoding: "utf8",
  });
  return { revision, workingTreeDirty: status.length > 0 };
}
