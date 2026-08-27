/**
 * Form Research F10 — Runtime Comparative Benchmarks (Isolated Setup/Timed/Restore)
 *
 * Implements rigorous isolated timing harnesses where compensation and fixture
 * setup are strictly kept outside the timed measurement window:
 *
 * SETUP -> TIMED TARGET OPERATION -> RESTORE
 *
 * Benchmarks:
 * 1. Single-field keystroke latency: Vii Form vs TanStack Form (10 to 1,000 fields)
 * 2. Aggregate Query Invalidation: Vii Form vs TanStack Form (10 to 1,000 fields)
 * 3. FieldArray steady-state operations (Push, Remove, Swap) with isolated compensation
 * 4. Server Issue Routing (isolated timed setServerIssues) & Server Issue Clear
 *
 * Note on Comparison Scope:
 * - Direct engine microbenchmarks are executed between Vii Form and TanStack Form (equivalent headless form engine models).
 * - React Hook Form uses an uncontrolled ref-first architecture evaluated via React render instrumentation rather than engine leaf mutation.
 * - Angular Signal Forms is evaluated via Angular-native functional and DX benchmarks rather than raw signal mutation.
 */

import { performance } from "node:perf_hooks";
import {
  createForm,
  type FormInstance,
  type FieldState,
  type FieldArray,
  type ServerIssueInput,
} from "../../form-core.js";
import { FormApi } from "@tanstack/react-form";
import { generateServerIssues } from "../fixtures/domain-data.js";

export interface BenchmarkMeasurement {
  readonly library: "Vii Form" | "TanStack Form";
  readonly scenario: string;
  readonly iterations: number;
  readonly batchSize: number;
  readonly medianUs: number;
  readonly p95Us: number;
  readonly opsPerSec: number;
}

export interface IsolatedBenchmarkOptions<T> {
  readonly setup?: (batchIndex: number) => T;
  readonly timed: (ctx: T, batchIndex: number) => void;
  readonly restore?: (ctx: T, batchIndex: number) => void;
}

/**
 * Executes an isolated timing harness where setup and restore/compensation
 * are strictly untimed:
 *
 * for each batch:
 *   ctx = setup()       [UNTIMED]
 *   t0 = now()
 *   timed(ctx)          [TIMED]
 *   t1 = now()
 *   restore(ctx)        [UNTIMED]
 */
export function runIsolatedTimingHarness<T = void>(
  iterations: number,
  warmupCount: number,
  batchSize: number,
  options: IsolatedBenchmarkOptions<T>,
): { medianUs: number; p95Us: number; opsPerSec: number } {
  const { setup, timed, restore } = options;

  // 1. Warmup phase (untimed setup + timed op + untimed restore)
  for (let i = 0; i < warmupCount; i++) {
    for (let k = 0; k < batchSize; k++) {
      const ctx = setup ? setup(k) : (undefined as unknown as T);
      timed(ctx, k);
      if (restore) restore(ctx, k);
    }
  }

  // 2. Measurement phase
  const timesUs: number[] = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    let batchDurationMs = 0;
    for (let k = 0; k < batchSize; k++) {
      const ctx = setup ? setup(k) : (undefined as unknown as T);
      const start = performance.now();
      timed(ctx, k);
      const end = performance.now();
      batchDurationMs += end - start;
      if (restore) restore(ctx, k);
    }
    timesUs[i] = (batchDurationMs * 1000) / batchSize;
  }

  timesUs.sort((a, b) => a - b);
  const medianUs = timesUs[Math.floor(iterations / 2)]!;
  const p95Us = timesUs[Math.floor(iterations * 0.95)]!;
  const totalMs = (timesUs.reduce((sum, t) => sum + t, 0) * batchSize) / 1000;
  const opsPerSec = Math.round((iterations * batchSize) / (totalMs / 1000));

  return { medianUs, p95Us, opsPerSec };
}

/**
 * 1. Comparative Single-Field Leaf Mutation Benchmark (Vii Form vs TanStack Form)
 */
export function benchmarkComparativeLeafMutation(fieldCounts: number[] = [10, 100, 500, 1000]): {
  vii: Record<number, BenchmarkMeasurement>;
  tanstack: Record<number, BenchmarkMeasurement>;
} {
  const viiResults: Record<number, BenchmarkMeasurement> = {};
  const tsResults: Record<number, BenchmarkMeasurement> = {};

  for (const count of fieldCounts) {
    const initial: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      initial[`field_${i}`] = `val_${i}`;
    }

    // Vii Form
    const viiForm = createForm<Record<string, string>>({ initialValues: initial });
    const viiField = viiForm.getNode("field_0") as FieldState<string>;

    const viiTiming = runIsolatedTimingHarness(100, 20, 50, {
      timed: (_ctx, k) => {
        viiField.setValue(k % 2 === 0 ? "val_a" : "val_b");
      },
    });
    viiForm.dispose();

    viiResults[count] = {
      library: "Vii Form",
      scenario: `vii-leaf-mutation-${count}-fields`,
      iterations: 100,
      batchSize: 50,
      medianUs: Number(viiTiming.medianUs.toFixed(3)),
      p95Us: Number(viiTiming.p95Us.toFixed(3)),
      opsPerSec: viiTiming.opsPerSec,
    };

    // TanStack Form
    const tsForm = new FormApi({ defaultValues: initial });
    const tsTiming = runIsolatedTimingHarness(100, 20, 50, {
      timed: (_ctx, k) => {
        tsForm.setFieldValue("field_0", k % 2 === 0 ? "val_a" : "val_b");
      },
    });

    tsResults[count] = {
      library: "TanStack Form",
      scenario: `tanstack-leaf-mutation-${count}-fields`,
      iterations: 100,
      batchSize: 50,
      medianUs: Number(tsTiming.medianUs.toFixed(3)),
      p95Us: Number(tsTiming.p95Us.toFixed(3)),
      opsPerSec: tsTiming.opsPerSec,
    };
  }

  return { vii: viiResults, tanstack: tsResults };
}

/**
 * 2. Comparative Aggregate Query Invalidation Benchmark (Vii Form vs TanStack Form)
 */
export function benchmarkComparativeAggregateMutation(
  fieldCounts: number[] = [10, 100, 500, 1000],
): {
  vii: Record<number, BenchmarkMeasurement>;
  tanstack: Record<number, BenchmarkMeasurement>;
} {
  const viiResults: Record<number, BenchmarkMeasurement> = {};
  const tsResults: Record<number, BenchmarkMeasurement> = {};

  for (const count of fieldCounts) {
    const initial: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      initial[`field_${i}`] = `val_${i}`;
    }

    // Vii Form Aggregate read
    const viiForm = createForm<Record<string, string>>({ initialValues: initial });
    const viiField = viiForm.getNode("field_0") as FieldState<string>;

    const viiTiming = runIsolatedTimingHarness(50, 10, 20, {
      timed: (_ctx, k) => {
        viiField.setValue(k % 2 === 0 ? "val_a" : "val_b");
        const _v = viiForm.values.get();
        const _d = viiForm.dirty.get();
        const _e = viiForm.issues.get();
      },
    });
    viiForm.dispose();

    viiResults[count] = {
      library: "Vii Form",
      scenario: `vii-aggregate-mutation-${count}-fields`,
      iterations: 50,
      batchSize: 20,
      medianUs: Number(viiTiming.medianUs.toFixed(3)),
      p95Us: Number(viiTiming.p95Us.toFixed(3)),
      opsPerSec: viiTiming.opsPerSec,
    };

    // TanStack Form Aggregate read
    const tsForm = new FormApi({ defaultValues: initial });
    const tsTiming = runIsolatedTimingHarness(50, 10, 20, {
      timed: (_ctx, k) => {
        tsForm.setFieldValue("field_0", k % 2 === 0 ? "val_a" : "val_b");
        const _v = tsForm.state.values;
        const _d = tsForm.state.isDirty;
        const _e = tsForm.state.errors;
      },
    });

    tsResults[count] = {
      library: "TanStack Form",
      scenario: `tanstack-aggregate-mutation-${count}-fields`,
      iterations: 50,
      batchSize: 20,
      medianUs: Number(tsTiming.medianUs.toFixed(3)),
      p95Us: Number(tsTiming.p95Us.toFixed(3)),
      opsPerSec: tsTiming.opsPerSec,
    };
  }

  return { vii: viiResults, tanstack: tsResults };
}

/**
 * 3. Comparative FieldArray Operations (50 Items) with STRICT Isolated Compensation
 */
export function benchmarkComparativeFieldArray(itemCount: number = 50): {
  vii: { push: BenchmarkMeasurement; remove: BenchmarkMeasurement; swap: BenchmarkMeasurement };
  tanstack: {
    push: BenchmarkMeasurement;
    remove: BenchmarkMeasurement;
    swap: BenchmarkMeasurement;
  };
} {
  const makeInitial = () =>
    Array.from({ length: itemCount }, (_, i) => ({
      id: `item_${i}`,
      title: `Task Item ${i}`,
      done: false,
    }));

  // --- Vii Form Array ---
  const viiForm = createForm({
    initialValues: { items: makeInitial() },
    keyExtractor: (item: any) => (item?.id ? String(item.id) : String(Math.random())),
  });
  const viiArray = viiForm.getNode("items") as FieldArray<any>;

  // PUSH: Setup ensures baseline -> Timed pushes 1 item -> Restore removes pushed item
  const viiPush = runIsolatedTimingHarness(50, 10, 20, {
    timed: (_ctx, k) => {
      viiArray.push({ id: `pushed_${k}`, title: `New Task ${k}`, done: false });
    },
    restore: () => {
      // Untimed compensation
      viiArray.remove(viiArray.items.get().length - 1);
    },
  });

  // REMOVE: Setup pushes 1 removable item -> Timed removes that item -> Restore verifies baseline
  const viiRemove = runIsolatedTimingHarness(50, 10, 20, {
    setup: (k) => {
      // Untimed setup
      viiArray.push({ id: `temp_remove_${k}`, title: "Temp Remove", done: false });
      return { targetIndex: viiArray.items.get().length - 1 };
    },
    timed: (ctx) => {
      viiArray.remove(ctx.targetIndex);
    },
  });

  // SWAP: Timed executes swap(0, 1) -> Restore restores original order untimed
  const viiSwap = runIsolatedTimingHarness(100, 20, 50, {
    timed: () => {
      viiArray.swap(0, 1);
    },
    restore: () => {
      viiArray.swap(0, 1);
    },
  });

  viiForm.dispose();

  // --- TanStack Form Array ---
  const tsForm = new FormApi({
    defaultValues: { items: makeInitial() },
  });

  // PUSH: Timed pushes 1 item -> Restore removes pushed item
  const tsPush = runIsolatedTimingHarness(50, 10, 20, {
    timed: (_ctx, k) => {
      tsForm.pushFieldValue("items", { id: `pushed_${k}`, title: `New Task ${k}`, done: false });
    },
    restore: () => {
      // Untimed compensation
      const len = tsForm.getFieldValue("items").length;
      tsForm.removeFieldValue("items", len - 1);
    },
  });

  // REMOVE: Setup pushes 1 removable item -> Timed removes that item
  const tsRemove = runIsolatedTimingHarness(50, 10, 20, {
    setup: (k) => {
      tsForm.pushFieldValue("items", { id: `temp_remove_${k}`, title: "Temp Remove", done: false });
      return { targetIndex: tsForm.getFieldValue("items").length - 1 };
    },
    timed: (ctx) => {
      tsForm.removeFieldValue("items", ctx.targetIndex);
    },
  });

  // SWAP: Timed executes swapFieldValues -> Restore restores untimed
  const tsSwap = runIsolatedTimingHarness(100, 20, 50, {
    timed: () => {
      tsForm.swapFieldValues("items", 0, 1);
    },
    restore: () => {
      tsForm.swapFieldValues("items", 0, 1);
    },
  });

  return {
    vii: {
      push: {
        library: "Vii Form",
        scenario: `vii-array-push-${itemCount}`,
        iterations: 50,
        batchSize: 20,
        medianUs: Number(viiPush.medianUs.toFixed(3)),
        p95Us: Number(viiPush.p95Us.toFixed(3)),
        opsPerSec: viiPush.opsPerSec,
      },
      remove: {
        library: "Vii Form",
        scenario: `vii-array-remove-${itemCount}`,
        iterations: 50,
        batchSize: 20,
        medianUs: Number(viiRemove.medianUs.toFixed(3)),
        p95Us: Number(viiRemove.p95Us.toFixed(3)),
        opsPerSec: viiRemove.opsPerSec,
      },
      swap: {
        library: "Vii Form",
        scenario: `vii-array-swap-${itemCount}`,
        iterations: 100,
        batchSize: 50,
        medianUs: Number(viiSwap.medianUs.toFixed(3)),
        p95Us: Number(viiSwap.p95Us.toFixed(3)),
        opsPerSec: viiSwap.opsPerSec,
      },
    },
    tanstack: {
      push: {
        library: "TanStack Form",
        scenario: `tanstack-array-push-${itemCount}`,
        iterations: 50,
        batchSize: 20,
        medianUs: Number(tsPush.medianUs.toFixed(3)),
        p95Us: Number(tsPush.p95Us.toFixed(3)),
        opsPerSec: tsPush.opsPerSec,
      },
      remove: {
        library: "TanStack Form",
        scenario: `tanstack-array-remove-${itemCount}`,
        iterations: 50,
        batchSize: 20,
        medianUs: Number(tsRemove.medianUs.toFixed(3)),
        p95Us: Number(tsRemove.p95Us.toFixed(3)),
        opsPerSec: tsRemove.opsPerSec,
      },
      swap: {
        library: "TanStack Form",
        scenario: `tanstack-array-swap-${itemCount}`,
        iterations: 100,
        batchSize: 50,
        medianUs: Number(tsSwap.medianUs.toFixed(3)),
        p95Us: Number(tsSwap.p95Us.toFixed(3)),
        opsPerSec: tsSwap.opsPerSec,
      },
    },
  };
}

/**
 * 4. Server Issue Routing Latency (Isolated Timed Routing vs Isolated Timed Clear)
 */
export function benchmarkServerIssueRouting(issueCounts: number[] = [10, 50, 100, 1000]): {
  routing: Record<number, BenchmarkMeasurement>;
  clear: Record<number, BenchmarkMeasurement>;
} {
  const routingResults: Record<number, BenchmarkMeasurement> = {};
  const clearResults: Record<number, BenchmarkMeasurement> = {};

  for (const count of issueCounts) {
    const initial: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      initial[`field_${i}`] = `val_${i}`;
    }
    const form = createForm<Record<string, string>>({ initialValues: initial });
    const issues = generateServerIssues(count);

    // Iterations tuned for count: 1000 issues use smaller batch to avoid excessive run duration
    const iterations = count >= 1000 ? 10 : 20;
    const batchSize = count >= 1000 ? 2 : 10;

    // ROUTING: Timed setServerIssues -> Restore clearServerIssues untimed
    const routeTiming = runIsolatedTimingHarness(iterations, 2, batchSize, {
      timed: () => {
        form.setServerIssues(issues);
      },
      restore: () => {
        form.clearServerIssues();
      },
    });

    routingResults[count] = {
      library: "Vii Form",
      scenario: `vii-server-issue-routing-${count}`,
      iterations,
      batchSize,
      medianUs: Number(routeTiming.medianUs.toFixed(3)),
      p95Us: Number(routeTiming.p95Us.toFixed(3)),
      opsPerSec: routeTiming.opsPerSec,
    };

    // CLEAR: Setup setServerIssues untimed -> Timed clearServerIssues
    const clearTiming = runIsolatedTimingHarness(iterations, 2, batchSize, {
      setup: () => {
        form.setServerIssues(issues);
      },
      timed: () => {
        form.clearServerIssues();
      },
    });

    clearResults[count] = {
      library: "Vii Form",
      scenario: `vii-server-issue-clear-${count}`,
      iterations,
      batchSize,
      medianUs: Number(clearTiming.medianUs.toFixed(3)),
      p95Us: Number(clearTiming.p95Us.toFixed(3)),
      opsPerSec: clearTiming.opsPerSec,
    };

    form.dispose();
  }

  return { routing: routingResults, clear: clearResults };
}
