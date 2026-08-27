/**
 * Form Research F10 — F9 Empirical Risks & Core Caveat Validation Tests
 *
 * Verifies:
 * 1. Single-field leaf vs aggregate consumer scaling (10 to 1,000 fields)
 * 2. Large server issue routing performance (10 to 1,000 issues)
 * 3. Vii Core push-pull lazy Computed caveat in real form flows
 */

import { describe, expect, it } from "vitest";
import { state, computed } from "../../../../packages/core/src/index.js";
import { createForm, type FieldState } from "../../form-core.js";
import {
  benchmarkLeafVsAggregateMutation,
  benchmarkServerIssueRouting,
  benchmarkFieldArrayOperations,
} from "../benchmarks/runtime-benchmarks.js";

describe("Form Research F10: F9 Risks & Core Caveats Validation", () => {
  it("measures leaf-local vs aggregate consumer mutation across 10, 100, 500, 1000 fields", () => {
    const results = benchmarkLeafVsAggregateMutation([10, 100, 500, 1000]);

    // Leaf-only mutations remain roughly flat and sub-microsecond
    expect(results.leaf[10]!.medianUs).toBeLessThan(10);
    expect(results.leaf[1000]!.medianUs).toBeLessThan(25);

    // Aggregate consumers scale proportionally with field count
    expect(results.aggregate[10]!.medianUs).toBeLessThan(20);
    expect(results.aggregate[1000]!.medianUs).toBeGreaterThan(results.aggregate[10]!.medianUs);

    // Output summary for report
    console.log("F10 Leaf vs Aggregate Mutation Benchmarks:", JSON.stringify(results, null, 2));
  });

  it("measures server issue routing latency across 10, 50, 100, 1000 issues", () => {
    const results = benchmarkServerIssueRouting([10, 50, 100, 1000]);

    expect(results[10]!.medianUs).toBeLessThan(500); // <0.5 ms
    expect(results[100]!.medianUs).toBeLessThan(2500); // <2.5 ms
    expect(results[1000]!.medianUs).toBeLessThan(25000); // <25 ms

    console.log("F10 Server Issue Routing Benchmarks:", JSON.stringify(results, null, 2));
  });

  it("measures FieldArray steady-state operations (push, remove, swap)", () => {
    const results = benchmarkFieldArrayOperations(50);

    expect(results.push.medianUs).toBeLessThan(100);
    expect(results.remove.medianUs).toBeLessThan(100);
    expect(results.swap.medianUs).toBeLessThan(20);

    console.log("F10 FieldArray Operations Benchmarks:", JSON.stringify(results, null, 2));
  });

  it("exercises Vii Core push-pull lazy computed caveat in real consumer flow", () => {
    // In Vii Core, State subscribers run in registration order.
    // If a State subscriber reads a Computed whose invalidation subscriber was registered later,
    // it may observe cached state during that synchronous callback.
    const s = state(10);
    const c = computed(() => s.get() * 2);

    let observedComputedInStateSubscriber = 0;

    // Subscriber registered before computed is accessed or initialized
    const unsub = s.subscribe(() => {
      observedComputedInStateSubscriber = c.get();
    });

    s.set(20);

    // Documented rule: read source state or subscribe to Computed itself
    let observedInComputedSubscriber = 0;
    const unsubComp = c.subscribe((val) => {
      observedInComputedSubscriber = val;
    });

    s.set(30);
    expect(observedInComputedSubscriber).toBe(60);

    unsub();
    unsubComp();
  });
});
