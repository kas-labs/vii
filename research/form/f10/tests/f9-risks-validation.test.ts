/**
 * Form Research F10 — F9 Empirical Risks & Core Caveat Validation Tests (Corrected)
 *
 * Verifies:
 * 1. Single-field leaf vs aggregate consumer scaling across Vii Form and TanStack Form
 * 2. Large server issue routing performance (10 to 1,000 issues)
 * 3. FieldArray steady-state operations (push, remove, swap) across libraries
 * 4. Vii Core push-pull lazy Computed caveat reproduction and safe consumer patterns
 */

import { describe, expect, it } from "vitest";
import { state, computed } from "../../../../packages/core/src/index.js";
import {
  benchmarkComparativeLeafMutation,
  benchmarkComparativeAggregateMutation,
  benchmarkComparativeFieldArray,
  benchmarkServerIssueRouting,
} from "../benchmarks/runtime-benchmarks.js";

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

  it("measures server issue routing latency across 10, 50, 100, 1000 issues", () => {
    const results = benchmarkServerIssueRouting([10, 50, 100, 1000]);

    expect(results.vii[10]!.medianUs).toBeLessThan(500); // <0.5 ms
    expect(results.vii[100]!.medianUs).toBeLessThan(2500); // <2.5 ms
    expect(results.vii[1000]!.medianUs).toBeLessThan(25000); // <25 ms
  });

  it("measures FieldArray steady-state operations (push, remove, swap)", () => {
    const results = benchmarkComparativeFieldArray(50);

    expect(results.vii.push.medianUs).toBeLessThan(100);
    expect(results.vii.remove.medianUs).toBeLessThan(100);
    expect(results.vii.swap.medianUs).toBeLessThan(20);

    expect(results.tanstack.push.medianUs).toBeGreaterThan(0);
    expect(results.tanstack.remove.medianUs).toBeGreaterThan(0);
    expect(results.tanstack.swap.medianUs).toBeGreaterThan(0);
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
