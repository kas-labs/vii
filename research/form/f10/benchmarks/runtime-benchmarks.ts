/**
 * Form Research F10 — Runtime Comparative Benchmarks
 *
 * Implements reproducible, fair timing harnesses for:
 * 1. Single-field keystroke latency: leaf-local vs aggregate consumers (10 to 1,000 fields)
 * 2. FieldArray steady-state operations (push, remove, swap, move)
 * 3. Server issue routing across tree and array nodes (10, 50, 100, 1,000 issues)
 */

import { performance } from "node:perf_hooks";
import {
  createForm,
  type FormInstance,
  type FieldState,
  type FieldArray,
  type ServerIssueInput,
} from "../../form-core.js";
import { generateServerIssues } from "../fixtures/domain-data.js";

export interface BenchmarkMeasurement {
  readonly scenario: string;
  readonly iterations: number;
  readonly medianUs: number;
  readonly p95Us: number;
  readonly opsPerSec: number;
}

export function runTimingHarness(
  iterations: number,
  warmupCount: number,
  operation: (i: number) => void,
  reset?: (i: number) => void,
): { medianUs: number; p95Us: number; opsPerSec: number } {
  // Warmup
  for (let i = 0; i < warmupCount; i++) {
    operation(i);
    if (reset) reset(i);
  }

  const timesUs: number[] = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    operation(i);
    const end = performance.now();
    timesUs[i] = (end - start) * 1000;
    if (reset) reset(i);
  }

  timesUs.sort((a, b) => a - b);
  const medianUs = timesUs[Math.floor(iterations / 2)]!;
  const p95Us = timesUs[Math.floor(iterations * 0.95)]!;
  const totalMs = timesUs.reduce((sum, t) => sum + t, 0) / 1000;
  const opsPerSec = Math.round(iterations / (totalMs / 1000));

  return { medianUs, p95Us, opsPerSec };
}

export function benchmarkLeafVsAggregateMutation(fieldCounts: number[] = [10, 100, 500, 1000]): {
  leaf: Record<number, BenchmarkMeasurement>;
  aggregate: Record<number, BenchmarkMeasurement>;
} {
  const leafResults: Record<number, BenchmarkMeasurement> = {};
  const aggResults: Record<number, BenchmarkMeasurement> = {};

  for (const count of fieldCounts) {
    // Build initial object
    const initial: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      initial[`field_${i}`] = `val_${i}`;
    }

    // 1. Leaf-only scenario
    const leafForm = createForm<Record<string, string>>({ initialValues: initial });
    const targetNode = leafForm.getNode("field_0") as FieldState<string>;
    let leafNotificationCount = 0;
    const unsub = targetNode.value.subscribe(() => {
      leafNotificationCount++;
    });

    const leafTiming = runTimingHarness(500, 50, (i) => {
      targetNode.setValue(`next_${i}`);
    });
    unsub();
    leafForm.dispose();

    leafResults[count] = {
      scenario: `leaf-mutation-${count}-fields`,
      iterations: 500,
      medianUs: Number(leafTiming.medianUs.toFixed(3)),
      p95Us: Number(leafTiming.p95Us.toFixed(3)),
      opsPerSec: leafTiming.opsPerSec,
    };

    // 2. Aggregate scenario (reading form.values, form.dirty, form.issues)
    const aggForm = createForm<Record<string, string>>({ initialValues: initial });
    const aggTargetNode = aggForm.getNode("field_0") as FieldState<string>;

    const aggTiming = runTimingHarness(500, 50, (i) => {
      aggTargetNode.setValue(`next_${i}`);
      // Simulate an active UI aggregate reading values, dirty, and issues
      const v = aggForm.values.get();
      const d = aggForm.dirty.get();
      const iss = aggForm.issues.get();
      if (!v || d === undefined || !iss) throw new Error("read failed");
    });
    aggForm.dispose();

    aggResults[count] = {
      scenario: `aggregate-mutation-${count}-fields`,
      iterations: 500,
      medianUs: Number(aggTiming.medianUs.toFixed(3)),
      p95Us: Number(aggTiming.p95Us.toFixed(3)),
      opsPerSec: aggTiming.opsPerSec,
    };
  }

  return { leaf: leafResults, aggregate: aggResults };
}

export function benchmarkServerIssueRouting(
  issueCounts: number[] = [10, 50, 100, 1000],
): Record<number, BenchmarkMeasurement> {
  const results: Record<number, BenchmarkMeasurement> = {};

  for (const count of issueCounts) {
    const issues = generateServerIssues(count, "onboarding");
    const form = createForm({
      initialValues: {
        account: { email: "user@example.com" },
        addresses: [{ street: "123 Main St", city: "SF", postalCode: "94105" }],
        profile: {},
      },
    });

    const timing = runTimingHarness(
      100,
      20,
      () => {
        form.setServerIssues(issues);
      },
      () => {
        form.clearServerIssues();
      },
    );

    form.dispose();

    results[count] = {
      scenario: `server-issues-routing-${count}`,
      iterations: 100,
      medianUs: Number(timing.medianUs.toFixed(3)),
      p95Us: Number(timing.p95Us.toFixed(3)),
      opsPerSec: timing.opsPerSec,
    };
  }

  return results;
}

export function benchmarkFieldArrayOperations(itemCount = 50): {
  push: BenchmarkMeasurement;
  remove: BenchmarkMeasurement;
  swap: BenchmarkMeasurement;
} {
  const initialItems = Array.from({ length: itemCount }, (_, i) => ({
    id: `item_${i}`,
    title: `Task ${i}`,
    done: false,
  }));

  const form = createForm({
    initialValues: { items: initialItems },
    keyExtractor: (item: any) =>
      item && typeof item === "object" && "id" in item ? String(item.id) : String(Math.random()),
  });
  const arrayNode = form.getNode("items") as FieldArray<any>;

  // 1. Push
  const pushTiming = runTimingHarness(
    200,
    20,
    (i) => {
      arrayNode.push({ id: `dyn_${i}`, title: `Dynamic ${i}`, done: false });
    },
    () => {
      arrayNode.remove(arrayNode.items.get().length - 1);
    },
  );

  // 2. Remove
  const removeTiming = runTimingHarness(
    200,
    20,
    () => {
      arrayNode.remove(0);
    },
    (i) => {
      arrayNode.insert(0, { id: `restore_${i}`, title: `Restore ${i}`, done: false });
    },
  );

  // 3. Swap
  const swapTiming = runTimingHarness(500, 50, (i) => {
    arrayNode.swap(0, 1);
  });

  form.dispose();

  return {
    push: {
      scenario: "field-array-push-50-items",
      iterations: 200,
      medianUs: Number(pushTiming.medianUs.toFixed(3)),
      p95Us: Number(pushTiming.p95Us.toFixed(3)),
      opsPerSec: pushTiming.opsPerSec,
    },
    remove: {
      scenario: "field-array-remove-50-items",
      iterations: 200,
      medianUs: Number(removeTiming.medianUs.toFixed(3)),
      p95Us: Number(removeTiming.p95Us.toFixed(3)),
      opsPerSec: removeTiming.opsPerSec,
    },
    swap: {
      scenario: "field-array-swap-50-items",
      iterations: 500,
      medianUs: Number(swapTiming.medianUs.toFixed(3)),
      p95Us: Number(swapTiming.p95Us.toFixed(3)),
      opsPerSec: swapTiming.opsPerSec,
    },
  };
}
