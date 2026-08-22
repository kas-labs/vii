import { describe, expect, it } from "vitest";
import canonicalTokens from "../tokens/fixtures/tokens.canonical.json" with { type: "json" };
import { generateCss } from "../tokens/token-generator.js";
import { resolveTokenGraph } from "../tokens/token-resolver.js";
import { createDialogBehavior } from "../ui-behaviors/dialog.js";
import { createDisclosureBehavior } from "../ui-behaviors/disclosure.js";
import { defaultDOMCapabilities } from "../ui-behaviors/dom-capabilities.js";
import { createTabsBehavior } from "../ui-behaviors/tabs.js";

describe("UI Foundation Performance Benchmarks (P6.7)", () => {
  it("benchmarks token graph resolution and CSS generation speed (< 1ms per run)", () => {
    const start = performance.now();
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const graph = resolveTokenGraph(canonicalTokens as any);
      generateCss(graph);
    }

    const duration = performance.now() - start;
    const avgPerRun = duration / iterations;
    expect(avgPerRun).toBeLessThan(1.0); // Less than 1ms per compilation
  });

  it("benchmarks headless behavior state machine throughput (> 200,000 ops/sec)", () => {
    const disclosure = createDisclosureBehavior();
    const start = performance.now();
    const iterations = 20000;

    for (let i = 0; i < iterations; i++) {
      disclosure.toggle();
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it("benchmarks tabs roving tabIndex keyboard intent throughput", () => {
    const tabs = createTabsBehavior({
      tabs: [{ id: "tab-1" }, { id: "tab-2" }, { id: "tab-3" }, { id: "tab-4" }],
    });

    const start = performance.now();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      tabs.handleKeyDown({ key: "ArrowRight" });
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    expect(tabs.getSelectedId()).toBe("tab-1");
  });

  it("benchmarks DOM capability attachment and disposal lifecycle", () => {
    const start = performance.now();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const dialog = createDialogBehavior({
        domCapabilities: defaultDOMCapabilities,
      });
      dialog.open();
      dialog.destroy();
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
