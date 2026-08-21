import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryClient } from "./query-client-prototype.js";
import { dehydrate, hydrate } from "./query-hydration.js";

// ==========================================
// 1. Direct Promise + Map Baseline
// ==========================================
class DirectPromiseMapBaseline {
  private readonly map = new Map<string, { data?: unknown; promise?: Promise<unknown> }>();

  get(key: string): unknown | undefined {
    return this.map.get(key)?.data;
  }

  set(key: string, data: unknown): void {
    const entry = this.map.get(key) ?? {};
    entry.data = data;
    this.map.set(key, entry);
  }

  async fetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let entry = this.map.get(key);
    if (!entry) {
      entry = {};
      this.map.set(key, entry);
    }
    if (entry.promise) {
      return entry.promise as Promise<T>;
    }
    const p = (async () => {
      try {
        const res = await fn();
        entry.data = res;
        return res;
      } finally {
        entry.promise = undefined;
      }
    })();
    entry.promise = p;
    return p;
  }
}

// ==========================================
// 2. Reference Mature Query Model
// ==========================================
class ReferenceQueryEngine {
  private readonly cache = new Map<
    string,
    { data?: unknown; listeners: Set<(d: unknown) => void>; promise?: Promise<unknown> }
  >();

  private hashKey(key: unknown): string {
    return JSON.stringify(key);
  }

  get(key: unknown): unknown | undefined {
    return this.cache.get(this.hashKey(key))?.data;
  }

  set(key: unknown, data: unknown): void {
    const hk = this.hashKey(key);
    let entry = this.cache.get(hk);
    if (!entry) {
      entry = { listeners: new Set() };
      this.cache.set(hk, entry);
    }
    entry.data = data;
    for (const l of entry.listeners) {
      l(data);
    }
  }

  subscribe(key: unknown, listener: (d: unknown) => void): () => void {
    const hk = this.hashKey(key);
    let entry = this.cache.get(hk);
    if (!entry) {
      entry = { listeners: new Set() };
      this.cache.set(hk, entry);
    }
    entry.listeners.add(listener);
    return () => {
      entry?.listeners.delete(listener);
    };
  }

  async fetch<T>(key: unknown, fn: () => Promise<T>): Promise<T> {
    const hk = this.hashKey(key);
    let entry = this.cache.get(hk);
    if (!entry) {
      entry = { listeners: new Set() };
      this.cache.set(hk, entry);
    }
    if (entry.promise) {
      return entry.promise as Promise<T>;
    }
    const p = (async () => {
      try {
        const res = await fn();
        this.set(key, res);
        return res;
      } finally {
        if (entry) entry.promise = undefined;
      }
    })();
    entry.promise = p;
    return p;
  }
}

interface BenchmarkMetric {
  readonly operation: string;
  readonly directBaselineOpsPerSec: number;
  readonly viiQueryOpsPerSec: number;
  readonly referenceQueryOpsPerSec: number;
  readonly viiOverheadVsBaselinePercent: number;
}

function runTiming(iterations: number, action: () => void): number {
  action(); // warmup
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    action();
  }
  const totalMs = performance.now() - start;
  return Math.round(iterations / (totalMs / 1000));
}

describe("P5.8 Comparative Benchmarks & Build-vs-Buy Evaluation", () => {
  it("collects comparative benchmarks across Baseline, Vii Query, and Reference", async () => {
    const direct = new DirectPromiseMapBaseline();
    const vii = new ResearchQueryClient();
    const ref = new ReferenceQueryEngine();

    const sampleKey: QueryKey = ["users", 42, { filter: "active" }];
    const directKey = JSON.stringify(sampleKey);

    // Warm up data
    direct.set(directKey, { id: 42, name: "Alice" });
    vii.setQueryData(sampleKey, { id: 42, name: "Alice" });
    ref.set(sampleKey, { id: 42, name: "Alice" });

    // 1. Cache Read Hit
    const directReadOps = runTiming(20_000, () => {
      direct.get(directKey);
    });
    const viiReadOps = runTiming(20_000, () => {
      vii.getQueryData(sampleKey);
    });
    const refReadOps = runTiming(20_000, () => {
      ref.get(sampleKey);
    });

    // 2. Cache Write
    const directWriteOps = runTiming(20_000, () => {
      direct.set(directKey, { id: 42, updated: true });
    });
    const viiWriteOps = runTiming(20_000, () => {
      vii.setQueryData(sampleKey, { id: 42, updated: true });
    });
    const refWriteOps = runTiming(20_000, () => {
      ref.set(sampleKey, { id: 42, updated: true });
    });

    // 3. Observer Lifecycle
    const viiObserverOps = runTiming(2_000, () => {
      const obs = vii.observeQuery(sampleKey);
      vii.setQueryData(sampleKey, { id: 42, v: Math.random() });
      obs.dispose();
    });
    const refObserverOps = runTiming(2_000, () => {
      const unsub = ref.subscribe(sampleKey, () => {});
      ref.set(sampleKey, { id: 42, v: Math.random() });
      unsub();
    });

    // 4. Dehydration / Hydration (100 queries)
    const dehydrateClient = new ResearchQueryClient();
    for (let i = 0; i < 100; i++) {
      dehydrateClient.setQueryData(["item", i], { val: i });
    }
    const viiHydrateOps = runTiming(200, () => {
      const envelope = dehydrate(dehydrateClient);
      const targetClient = new ResearchQueryClient();
      hydrate(targetClient, envelope);
    });

    const report: BenchmarkMetric[] = [
      {
        operation: "cache-read-hit",
        directBaselineOpsPerSec: directReadOps,
        viiQueryOpsPerSec: viiReadOps,
        referenceQueryOpsPerSec: refReadOps,
        viiOverheadVsBaselinePercent: Math.round(
          ((directReadOps - viiReadOps) / directReadOps) * 100,
        ),
      },
      {
        operation: "cache-write",
        directBaselineOpsPerSec: directWriteOps,
        viiQueryOpsPerSec: viiWriteOps,
        referenceQueryOpsPerSec: refWriteOps,
        viiOverheadVsBaselinePercent: Math.round(
          ((directWriteOps - viiWriteOps) / directWriteOps) * 100,
        ),
      },
      {
        operation: "observer-lifecycle",
        directBaselineOpsPerSec: 0,
        viiQueryOpsPerSec: viiObserverOps,
        referenceQueryOpsPerSec: refObserverOps,
        viiOverheadVsBaselinePercent: 0,
      },
      {
        operation: "dehydrate-hydrate-100-queries",
        directBaselineOpsPerSec: 0,
        viiQueryOpsPerSec: viiHydrateOps,
        referenceQueryOpsPerSec: 0,
        viiOverheadVsBaselinePercent: 0,
      },
    ];

    console.log("QUERY_COMPARATIVE_BENCHMARK_REPORT:\n" + JSON.stringify(report, null, 2));

    expect(viiReadOps).toBeGreaterThan(100_000);
    expect(viiWriteOps).toBeGreaterThan(100_000);
    expect(viiObserverOps).toBeGreaterThan(10_000);
    expect(viiHydrateOps).toBeGreaterThan(50);

    vii.dispose();
    dehydrateClient.dispose();
  });
});
