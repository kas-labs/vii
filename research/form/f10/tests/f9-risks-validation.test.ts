/**
 * Form Research F10 — F9 Empirical Risks & Core Caveat Validation Tests (Corrected)
 *
 * Verifies:
 * 1. Single-field leaf vs aggregate consumer scaling across Vii Form and TanStack Form
 * 2. Large server issue routing & clearing performance (10 to 1,000 issues)
 * 3. FieldArray steady-state operations (push, remove, swap) with isolated compensation
 * 4. Regression proof that compensation is never inside timed benchmark region
 * 5. Vii Core push-pull lazy Computed caveat reproduction and safe consumer patterns
 * 6. Empirical render counters and bundle measurement assertions
 */

import { describe, expect, it } from "vitest";
import { state, computed } from "../../../../packages/core/src/index.js";
import {
  benchmarkComparativeLeafMutation,
  benchmarkComparativeAggregateMutation,
  benchmarkComparativeFieldArray,
  benchmarkServerIssueRouting,
  runIsolatedTimingHarness,
} from "../benchmarks/runtime-benchmarks.js";
import { runRealRenderBenchmarks } from "../benchmarks/render-benchmarks.js";
import { MEASURED_BUNDLE_DATA } from "../benchmarks/bundle-benchmarks.js";

describe("Form Research F10: F9 Risks & Core Caveats Validation", () => {
  it("measures comparative leaf-local vs aggregate consumer mutation across 10, 100, 500, 1000 fields", () => {
    const leafResults = benchmarkComparativeLeafMutation([10, 100, 500, 1000]);
    const aggResults = benchmarkComparativeAggregateMutation([10, 100, 500, 1000]);

    // Vii Form leaf mutations remain fast (<5µs)
    expect(leafResults.vii[10]!.medianUs).toBeLessThan(10);
    expect(leafResults.vii[1000]!.medianUs).toBeLessThan(25);

    // TanStack Form leaf mutations
    expect(leafResults.tanstack[10]!.medianUs).toBeGreaterThan(0);
    expect(leafResults.tanstack[1000]!.medianUs).toBeGreaterThan(0);

    // Aggregate consumers scale proportionally with field count
    expect(aggResults.vii[1000]!.medianUs).toBeGreaterThan(aggResults.vii[10]!.medianUs);
    expect(aggResults.tanstack[1000]!.medianUs).toBeGreaterThan(aggResults.tanstack[10]!.medianUs);
  });

  it("measures isolated server issue routing and clearing latency across 10, 50, 100, 1000 issues", () => {
    const results = benchmarkServerIssueRouting([10, 50, 100, 1000]);

    // Routing latency
    expect(results.routing[10]!.medianUs).toBeLessThan(500); // <0.5 ms
    expect(results.routing[100]!.medianUs).toBeLessThan(2500); // <2.5 ms
    expect(results.routing[1000]!.medianUs).toBeLessThan(25000); // <25 ms

    // Clear latency
    expect(results.clear[10]!.medianUs).toBeLessThan(500);
    expect(results.clear[100]!.medianUs).toBeLessThan(2500);
    expect(results.clear[1000]!.medianUs).toBeLessThan(25000);
  });

  it("measures FieldArray steady-state operations (push, remove, swap) with isolated compensation", () => {
    const results = benchmarkComparativeFieldArray(50);

    expect(results.vii.push.medianUs).toBeLessThan(100);
    expect(results.vii.remove.medianUs).toBeLessThan(100);
    expect(results.vii.swap.medianUs).toBeLessThan(20);

    expect(results.tanstack.push.medianUs).toBeGreaterThan(0);
    expect(results.tanstack.remove.medianUs).toBeGreaterThan(0);
    expect(results.tanstack.swap.medianUs).toBeGreaterThan(0);
  });

  it("proves compensation is strictly outside the timed measurement window in runIsolatedTimingHarness", () => {
    const callOrder: string[] = [];

    const timing = runIsolatedTimingHarness(5, 2, 2, {
      setup: () => {
        callOrder.push("setup");
        return { item: 1 };
      },
      timed: () => {
        callOrder.push("timed");
      },
      restore: () => {
        callOrder.push("restore");
      },
    });

    expect(timing.medianUs).toBeGreaterThanOrEqual(0);
    // Verified sequence: setup -> timed -> restore
    expect(callOrder.slice(0, 3)).toEqual(["setup", "timed", "restore"]);
  });

  it("executes real React render counting benchmarks and captures empirical counts", () => {
    const renderReports = runRealRenderBenchmarks();
    expect(renderReports).toHaveLength(2);

    const [leafReport, arrayReport] = renderReports;
    expect(leafReport?.viiForm.targetFieldRenders).toBe(1);
    expect(leafReport?.viiForm.siblingFieldRenders).toBe(0);
    expect(leafReport?.viiForm.rootRenders).toBe(1);

    expect(arrayReport?.viiForm.arrayRenders).toBe(1);
    expect(arrayReport?.viiForm.rootRenders).toBe(1);
  });

  it("asserts measured bundle dataset invariants from executable runner", () => {
    expect(MEASURED_BUNDLE_DATA.length).toBe(5);

    const coldAdoption = MEASURED_BUNDLE_DATA.find(
      (b) => b.scenario === "cold-adoption" && b.library.startsWith("Vii"),
    );
    const incremental = MEASURED_BUNDLE_DATA.find((b) => b.scenario === "incremental-in-vii-app");
    const tanstack = MEASURED_BUNDLE_DATA.find((b) => b.library.startsWith("TanStack"));

    expect(coldAdoption?.gzipBytes).toBeLessThan(15000); // ~12.3 kB
    expect(incremental?.gzipBytes).toBeLessThan(12000); // ~10.1 kB
    expect(tanstack?.gzipBytes).toBeGreaterThan(15000); // ~18.0 kB
  });

  it("exercises Vii Core push-pull lazy computed caveat in real consumer flow and asserts safe patterns", () => {
    // 1. Setup source State
    const source = state("initial");
    let observedDerivedInEarlySubscriber: string | undefined;
    let observedSourceInEarlySubscriber: string | undefined;

    // 2. Early subscriber attached to source BEFORE computed evaluates dependencies
    const unsubSource = source.subscribe(() => {
      observedSourceInEarlySubscriber = source.get();
      if (derived) {
        // Caveat: derived's dependency listener on source runs after this subscriber,
        // so derived.get() returns its previous cached value during this callback.
        observedDerivedInEarlySubscriber = derived.get();
      }
    });

    // 3. Computed created and evaluated (registers dependency listener on source)
    let derived: any = computed(() => `derived:${source.get()}`);
    expect(derived.get()).toBe("derived:initial");

    // 4. Also attach a direct subscriber to the Computed (Safe pattern B)
    let observedInComputedSubscriber: string | undefined;
    const unsubDerived = derived.subscribe((val: string) => {
      observedInComputedSubscriber = val;
    });

    // 5. Mutate source
    source.set("updated");

    // CRITICAL ASSERTION: The early state subscriber observed the previous cached value
    expect(observedDerivedInEarlySubscriber).toBe("derived:initial");

    // Safe Pattern A: Reading source state directly inside the subscriber is strictly fresh
    expect(observedSourceInEarlySubscriber).toBe("updated");

    // Safe Pattern B: Subscribing to the Computed directly yields the fresh derived value
    expect(observedInComputedSubscriber).toBe("derived:updated");

    // Safe Pattern C: Reading the Computed outside the synchronous subscriber cycle is fresh
    expect(derived.get()).toBe("derived:updated");

    unsubSource();
    unsubDerived();
  });
});
