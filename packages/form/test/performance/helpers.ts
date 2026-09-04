import { execFileSync } from "node:child_process";
import { arch, cpus, platform, release } from "node:os";
import { performance } from "node:perf_hooks";

export interface EnvironmentInfo {
  os: string;
  arch: string;
  cpuModel: string;
  cpuCount: number;
  nodeVersion: string;
  pnpmVersion: string;
  tsVersion: string;
  v8Version: string;
  gitRevision: string;
  timestamp: string;
}

export function getEnvironmentInfo(): EnvironmentInfo {
  let gitRevision = "unknown";
  try {
    gitRevision = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    // Ignore error if git fails in sandbox
  }

  let pnpmVersion = "10.12.4";
  try {
    pnpmVersion = execFileSync("pnpm", ["--version"], {
      encoding: "utf8",
    }).trim();
  } catch {
    // fallback
  }

  const cpuList = cpus();
  return {
    os: `${platform()} ${release()}`,
    arch: arch(),
    cpuModel: cpuList[0]?.model ?? "unknown",
    cpuCount: cpuList.length,
    nodeVersion: process.version,
    pnpmVersion,
    tsVersion: "6.0.2",
    v8Version: process.versions.v8,
    gitRevision,
    timestamp: new Date().toISOString(),
  };
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  return sorted[index]!;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  medianMs: number;
  p95Ms: number;
  medianUs: number;
  opsPerSec: number;
}

export function benchmarkWithSetup<T>(options: {
  name: string;
  iterations: number;
  warmup: number;
  setup: () => T;
  operation: (ctx: T) => void;
  teardown?: (ctx: T) => void;
}): BenchmarkResult {
  const { name, iterations, warmup, setup, operation, teardown } = options;

  for (let w = 0; w < warmup; w++) {
    const ctx = setup();
    operation(ctx);
    teardown?.(ctx);
  }

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ctx = setup();
    const start = performance.now();
    operation(ctx);
    const duration = performance.now() - start;
    samples.push(duration);
    teardown?.(ctx);
  }

  const medianMs = calculateMedian(samples);
  const p95Ms = calculateP95(samples);

  return {
    name,
    iterations,
    medianMs,
    p95Ms,
    medianUs: medianMs * 1000,
    opsPerSec: medianMs > 0 ? 1 / (medianMs / 1000) : 0,
  };
}

export function benchmarkBatch(options: {
  name: string;
  iterations: number;
  batchSize: number;
  warmup: number;
  operation: (step: number) => void;
}): BenchmarkResult {
  const { name, iterations, batchSize, warmup, operation } = options;

  for (let w = 0; w < warmup * batchSize; w++) {
    operation(w);
  }

  const samplesPerOp: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    for (let b = 0; b < batchSize; b++) {
      operation(i * batchSize + b);
    }
    const totalMs = performance.now() - start;
    const perOpMs = totalMs / batchSize;
    samplesPerOp.push(perOpMs);
  }

  const medianMs = calculateMedian(samplesPerOp);
  const p95Ms = calculateP95(samplesPerOp);

  return {
    name,
    iterations: iterations * batchSize,
    medianMs,
    p95Ms,
    medianUs: medianMs * 1000,
    opsPerSec: medianMs > 0 ? 1 / (medianMs / 1000) : 0,
  };
}

export async function benchmarkAsyncWithSetup<T>(options: {
  name: string;
  iterations: number;
  warmup: number;
  setup: () => Promise<T> | T;
  operation: (ctx: T) => Promise<void>;
  teardown?: (ctx: T) => Promise<void> | void;
}): Promise<BenchmarkResult> {
  const { name, iterations, warmup, setup, operation, teardown } = options;

  for (let w = 0; w < warmup; w++) {
    const ctx = await setup();
    await operation(ctx);
    await teardown?.(ctx);
  }

  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ctx = await setup();
    const start = performance.now();
    await operation(ctx);
    const duration = performance.now() - start;
    samples.push(duration);
    await teardown?.(ctx);
  }

  const medianMs = calculateMedian(samples);
  const p95Ms = calculateP95(samples);

  return {
    name,
    iterations,
    medianMs,
    p95Ms,
    medianUs: medianMs * 1000,
    opsPerSec: medianMs > 0 ? 1 / (medianMs / 1000) : 0,
  };
}
