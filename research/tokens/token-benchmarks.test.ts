import { describe, expect, it } from "vitest";
import canonicalDoc from "./fixtures/tokens.canonical.json" with { type: "json" };
import type { DTCGDocument } from "./dtcg-types.js";
import { generateCss, generateJsonManifest, generateTypeScript } from "./token-generator.js";
import { resolveTokenGraph } from "./token-resolver.js";
import { validateAndCollectTokens } from "./token-validator.js";

describe("DTCG Token Pipeline Benchmarks & Determinism", () => {
  it("achieves high parsing and validation throughput (> 5,000 docs/sec)", () => {
    const doc = canonicalDoc as DTCGDocument;
    const iterations = 500;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      validateAndCollectTokens(doc);
    }
    const elapsedMs = performance.now() - start;
    const opsPerSec = (iterations / elapsedMs) * 1000;

    expect(opsPerSec).toBeGreaterThan(5000);
  });

  it("resolves graph and generates full CSS, TS, and JSON outputs with low latency (< 1ms per run)", () => {
    const doc = canonicalDoc as DTCGDocument;
    const iterations = 200;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const graph = resolveTokenGraph(doc);
      generateCss(graph);
      generateTypeScript(graph);
      generateJsonManifest(graph);
    }
    const elapsedMs = performance.now() - start;
    const avgLatencyMs = elapsedMs / iterations;

    expect(avgLatencyMs).toBeLessThan(1.0);
  });

  it("guarantees strict byte-for-byte output identity across 100 consecutive runs", () => {
    const doc = canonicalDoc as DTCGDocument;
    const baselineGraph = resolveTokenGraph(doc);
    const baselineCss = generateCss(baselineGraph);
    const baselineTs = generateTypeScript(baselineGraph);
    const baselineJson = generateJsonManifest(baselineGraph);

    for (let i = 0; i < 100; i++) {
      const graph = resolveTokenGraph(doc);
      expect(generateCss(graph)).toBe(baselineCss);
      expect(generateTypeScript(graph)).toBe(baselineTs);
      expect(generateJsonManifest(graph)).toBe(baselineJson);
    }
  });
});
