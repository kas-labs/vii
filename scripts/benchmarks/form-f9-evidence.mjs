/**
 * Vii Form Research F9 — Comprehensive Evidence Harness (Corrected & Hardened)
 *
 * Measures:
 * 1. Runtime scaling (Small 10, Medium 100, Large 500, Stress 1,000, Nested 97 leaf fields)
 *    - Leaf-Only Subscriber Scenario: Construction, First-Read, Single-Field Mutation, setValues subset
 *    - Aggregate Consumer Scenario: Mutation with form.values, form.dirty, form.issues active
 *    - Full Tree Validation: 1 sync validation rule per field (10, 100, 500, 1,000 rules)
 * 2. FieldArray Operations (10 & 100 items)
 *    - Construction (isolated construct + dispose)
 *    - Isolated Steady-state Operations (push, insert, remove, swap, move, alternating setValues)
 * 3. Validation & Schemas
 *    - Standard Schema Adapter Invocation Microbenchmark (Single call on valid input)
 *    - Full Form Validation Throughput (10 fields with Native Rule vs Zod 4 vs Valibot vs ArkType)
 * 4. Submission & Snapshot Lifecycle
 *    - Async Completed Submission: strictly timed await form.submit() with untimed setup/reset
 *    - Snapshot Isolation: deepCloneSnapshot on flat, nested, array
 *    - Server Issue Routing: isolated setServerIssues (100 and 1,000 issues)
 * 5. TypeScript Diagnostics across Isolated Programs (Small 10, Medium 100, Large 300, Combined)
 * 6. Bundle Footprints & Tree-shaking (adapter/core-owned bytes with externalized peers)
 */

import { performance } from "node:perf_hooks";
import { cpus, platform, arch, totalmem } from "node:os";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { z } from "zod";
import * as v from "valibot";
import { type as arkType } from "arktype";

import { createScope } from "../../packages/core/src/index.js";
import { createForm, createFieldArray, deepCloneSnapshot } from "../../research/form/form-core.ts";
import { standardSchema } from "../../research/form/standard-schema.ts";
import { measureBundles } from "../../research/form/benchmarks/bundle/measure-bundles.mjs";

// Helper: Programmatic Leaf Field Counter
export function countLeafFields(val) {
  let count = 0;
  function traverse(node) {
    if (node === null || typeof node !== "object") {
      count++;
    } else if (Array.isArray(node)) {
      for (const item of node) traverse(item);
    } else {
      for (const key of Object.keys(node)) traverse(node[key]);
    }
  }
  traverse(val);
  return count;
}

// Helper: Run synchronous benchmark with warmup, batching, and median aggregation
export function benchmark(name, fn, { iterations = 50, warmup = 10, batchSize = 1 } = {}) {
  for (let i = 0; i < warmup; i++) {
    for (let k = 0; k < batchSize; k++) {
      fn();
    }
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    for (let k = 0; k < batchSize; k++) {
      fn();
    }
    const t1 = performance.now();
    times.push((t1 - t0) / batchSize);
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const avg = times.reduce((acc, v) => acc + v, 0) / times.length;

  return { name, iterations, warmup, batchSize, min, max, median, avg, unit: "ms/op" };
}

// Helper: Run synchronous benchmark with explicit untimed setup and restore
export function benchmarkWithSetup(
  name,
  { setup, run, restore, iterations = 50, warmup = 10 } = {},
) {
  for (let i = 0; i < warmup; i++) {
    const ctx = setup ? setup() : undefined;
    run(ctx);
    if (restore) restore(ctx);
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const ctx = setup ? setup() : undefined;
    const t0 = performance.now();
    run(ctx);
    const t1 = performance.now();
    times.push(t1 - t0);
    if (restore) restore(ctx);
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const avg = times.reduce((acc, v) => acc + v, 0) / times.length;

  return { name, iterations, warmup, batchSize: 1, min, max, median, avg, unit: "ms/op" };
}

// Helper: Run asynchronous benchmark with warmup, batching, and median aggregation
export async function benchmarkAsync(
  name,
  fn,
  { iterations = 50, warmup = 10, batchSize = 1 } = {},
) {
  for (let i = 0; i < warmup; i++) {
    for (let k = 0; k < batchSize; k++) {
      await fn();
    }
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    for (let k = 0; k < batchSize; k++) {
      await fn();
    }
    const t1 = performance.now();
    times.push((t1 - t0) / batchSize);
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const avg = times.reduce((acc, v) => acc + v, 0) / times.length;

  return { name, iterations, warmup, batchSize, min, max, median, avg, unit: "ms/op" };
}

// Helper: Run asynchronous benchmark with explicit untimed setup and restore
export async function benchmarkAsyncWithSetup(
  name,
  { setup, run, restore, iterations = 50, warmup = 10 } = {},
) {
  for (let i = 0; i < warmup; i++) {
    const ctx = setup ? await setup() : undefined;
    await run(ctx);
    if (restore) await restore(ctx);
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const ctx = setup ? await setup() : undefined;
    const t0 = performance.now();
    await run(ctx);
    const t1 = performance.now();
    times.push(t1 - t0);
    if (restore) await restore(ctx);
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const avg = times.reduce((acc, v) => acc + v, 0) / times.length;

  return { name, iterations, warmup, batchSize: 1, min, max, median, avg, unit: "ms/op" };
}

// ---------------------------------------------------------------------------
// 1. Runtime Scaling: Leaf-Only vs Aggregate-Consumer Scenarios
// ---------------------------------------------------------------------------
export function runRuntimeBenchmarks() {
  const results = {};

  const sizes = [10, 100, 500, 1000];
  for (const size of sizes) {
    const initialValues = {};
    for (let i = 0; i < size; i++) {
      initialValues[`f_${i}`] = `v_${i}`;
    }

    // A. Construction (isolated construct + dispose)
    results[`construct_${size}`] = benchmark(
      `Construct (${size} fields)`,
      () => {
        const form = createForm({ initialValues });
        form.dispose();
      },
      { iterations: 100, warmup: 20 },
    );

    // B. First Read (lazy computed initialization)
    results[`first_read_${size}`] = benchmark(
      `First Read (${size} fields)`,
      () => {
        const form = createForm({ initialValues });
        form.values.get();
        form.dirty.get();
        form.dispose();
      },
      { iterations: 100, warmup: 20 },
    );

    // C. Leaf-Only Subscriber Mutation (no aggregate listeners)
    const formLeaf = createForm({ initialValues });
    const targetLeafKey = `f_${Math.floor(size / 2)}`;
    const targetLeaf = formLeaf.fields[targetLeafKey];
    let toggleLeaf = false;
    results[`mutation_leaf_only_${size}`] = benchmark(
      `Leaf-Only Mutation (${size} fields)`,
      () => {
        toggleLeaf = !toggleLeaf;
        targetLeaf.setValue(toggleLeaf ? "mutated" : "v_orig");
      },
      { iterations: 500, warmup: 50, batchSize: 100 },
    );

    // D. Aggregate-Consumer Mutation (consumer reads/subscribes form.values, dirty, issues)
    const formAgg = createForm({ initialValues });
    const targetAggKey = `f_${Math.floor(size / 2)}`;
    const targetAgg = formAgg.fields[targetAggKey];
    const unsubValues = formAgg.values.subscribe(() => {});
    const unsubDirty = formAgg.dirty.subscribe(() => {});
    const unsubIssues = formAgg.issues.subscribe(() => {});
    let toggleAgg = false;
    results[`mutation_aggregate_consumer_${size}`] = benchmark(
      `Aggregate-Consumer Mutation (${size} fields)`,
      () => {
        toggleAgg = !toggleAgg;
        targetAgg.setValue(toggleAgg ? "mutated" : "v_orig");
        formAgg.values.get();
        formAgg.dirty.get();
        formAgg.issues.get();
      },
      { iterations: 200, warmup: 20, batchSize: 10 },
    );

    // E. form.setValues on subset (10 fields) with alternating values to prevent equality fast-paths
    const subsetA = {};
    const subsetB = {};
    for (let i = 0; i < Math.min(10, size); i++) {
      subsetA[`f_${i}`] = `batch_A_${i}`;
      subsetB[`f_${i}`] = `batch_B_${i}`;
    }
    let toggleSub = false;
    results[`setValues_subset_${size}`] = benchmark(
      `setValues 10 fields (${size} fields)`,
      () => {
        toggleSub = !toggleSub;
        formLeaf.setValues(toggleSub ? subsetA : subsetB);
      },
      { iterations: 200, warmup: 20 },
    );

    // F. Full Tree Validation: 1 sync validation rule per field (Option A)
    const formForVal = createForm({
      initialValues,
      rules: Array.from(
        { length: size },
        (_, i) => (vals) => (vals[`f_${i}`]?.length > 0 ? null : { code: "req", path: [`f_${i}`] }),
      ),
    });
    results[`validate_${size}`] = benchmark(
      `Validate (${size} fields, ${size} rules)`,
      () => {
        formForVal.validate();
      },
      { iterations: 200, warmup: 20 },
    );

    // G. Form Reset
    results[`reset_${size}`] = benchmark(
      `Reset (${size} fields)`,
      () => {
        formForVal.reset();
      },
      { iterations: 200, warmup: 20 },
    );

    // Clean up all resources
    unsubValues();
    unsubDirty();
    unsubIssues();
    formLeaf.dispose();
    formAgg.dispose();
    formForVal.dispose();
  }

  // Realistic Nested Form
  const buildNested = () => {
    const initialValues = {
      profile: {
        first: "Ada",
        last: "Lovelace",
        department: "Computing",
        contact: { email: "ada@computing.org", phone: "+44 123456" },
      },
      preferences: { theme: "dark", lang: "en" },
      addresses: Array.from({ length: 20 }, (_, i) => ({
        street: `Street ${i}`,
        city: `City ${i}`,
        zip: `1000${i}`,
      })),
      history: Array.from({ length: 15 }, (_, i) => ({
        company: `Company ${i}`,
        role: `Role ${i}`,
      })),
    };
    const leafCount = countLeafFields(initialValues);
    return { form: createForm({ initialValues }), leafCount };
  };

  const { leafCount: nestedLeafCount } = buildNested();
  console.log(`Nested form actual leaf count: ${nestedLeafCount}`);

  results["nested_form_construct"] = benchmark(
    `Nested Form Construct (${nestedLeafCount} leaf fields)`,
    () => {
      const { form } = buildNested();
      form.dispose();
    },
    { iterations: 100, warmup: 20 },
  );

  const { form: nestedForm } = buildNested();
  const deepNode = nestedForm.getNode("addresses[10].city");
  let nestedToggle = false;
  results["nested_form_mutate_deep"] = benchmark(
    `Nested Form Mutate Deep Leaf (${nestedLeafCount} leaf fields)`,
    () => {
      nestedToggle = !nestedToggle;
      deepNode.setValue(nestedToggle ? "Manchester" : "London");
    },
    { iterations: 500, warmup: 50, batchSize: 100 },
  );
  nestedForm.dispose();

  return results;
}

// ---------------------------------------------------------------------------
// 2. FieldArray Operations (Separated Construction vs True Isolated Operations)
// ---------------------------------------------------------------------------
export function runArrayBenchmarks() {
  const results = {};

  for (const count of [10, 100]) {
    const initialValues = Array.from({ length: count }, (_, i) => ({
      id: `id_${i}`,
      name: `Item ${i}`,
    }));

    // Construction benchmark (isolated construct + dispose)
    results[`array_construct_${count}`] = benchmark(
      `FieldArray construct (${count} items)`,
      () => {
        const scope = createScope();
        createFieldArray({ initialValues, keyExtractor: (x) => x.id, scope });
        scope.dispose();
      },
      { iterations: 100, warmup: 20 },
    );

    // True isolated steady-state push (push timed, remove untimed in restore)
    const scopePush = createScope();
    const arrPush = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopePush,
    });
    let pushCounter = 0;
    results[`array_push_${count}`] = benchmarkWithSetup(`FieldArray push (${count} items)`, {
      setup: () => {
        pushCounter++;
        return { item: { id: `pushed_${pushCounter}`, name: "Pushed" } };
      },
      run: ({ item }) => {
        arrPush.push(item);
      },
      restore: () => {
        arrPush.remove(arrPush.items.get().length - 1);
      },
      iterations: 100,
      warmup: 20,
    });
    scopePush.dispose();

    // True isolated steady-state insert (insert at 0 timed, remove 0 untimed in restore)
    const scopeInsert = createScope();
    const arrInsert = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeInsert,
    });
    let insertCounter = 0;
    results[`array_insert_${count}`] = benchmarkWithSetup(`FieldArray insert (${count} items)`, {
      setup: () => {
        insertCounter++;
        return { item: { id: `inserted_${insertCounter}`, name: "Inserted" } };
      },
      run: ({ item }) => {
        arrInsert.insert(0, item);
      },
      restore: () => {
        arrInsert.remove(0);
      },
      iterations: 100,
      warmup: 20,
    });
    scopeInsert.dispose();

    // True isolated steady-state swap (swap timed, no length mutation)
    const scopeSwap = createScope();
    const arrSwap = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeSwap,
    });
    results[`array_swap_${count}`] = benchmark(
      `FieldArray swap (${count} items)`,
      () => {
        arrSwap.swap(0, Math.floor(count / 2));
      },
      { iterations: 100, warmup: 20 },
    );
    scopeSwap.dispose();

    // True isolated steady-state remove (setup ensures removable item, remove timed)
    const scopeRemove = createScope();
    const arrRemove = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeRemove,
    });
    let removeCounter = 0;
    results[`array_remove_${count}`] = benchmarkWithSetup(`FieldArray remove (${count} items)`, {
      setup: () => {
        removeCounter++;
        arrRemove.push({ id: `removable_${removeCounter}`, name: "Removable" });
      },
      run: () => {
        arrRemove.remove(arrRemove.items.get().length - 1);
      },
      iterations: 100,
      warmup: 20,
    });
    scopeRemove.dispose();

    // True isolated steady-state move
    const scopeMove = createScope();
    const arrMove = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeMove,
    });
    results[`array_move_${count}`] = benchmark(
      `FieldArray move (${count} items)`,
      () => {
        arrMove.move(0, Math.floor(count / 2));
      },
      { iterations: 100, warmup: 20 },
    );
    scopeMove.dispose();

    // True isolated steady-state setValues with alternating datasets A <-> B
    const scopeSet = createScope();
    const arrSet = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeSet,
    });
    const replacementA = Array.from({ length: count }, (_, i) => ({
      id: `id_${i}`,
      name: `Updated_A_${i}`,
    }));
    const replacementB = Array.from({ length: count }, (_, i) => ({
      id: `id_${i}`,
      name: `Updated_B_${i}`,
    }));
    let toggleSet = false;
    results[`array_setValues_${count}`] = benchmark(
      `FieldArray setValues alternating (${count} items)`,
      () => {
        toggleSet = !toggleSet;
        arrSet.setValues(toggleSet ? replacementA : replacementB);
      },
      { iterations: 100, warmup: 20 },
    );
    scopeSet.dispose();
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. Validation: Adapter Microbenchmarks & Full-Form Validation Throughput
// ---------------------------------------------------------------------------
export function runValidationBenchmarks() {
  const results = {};

  // A. Standard Schema Adapter Invocation Microbenchmarks (Single call path on valid string)
  const nativeRule = (val) =>
    val && val.length >= 3 ? null : { code: "too_short", message: "Too short" };
  results["schema_micro_native_rule"] = benchmark(
    "Standard Schema adapter micro: Native Vii Rule",
    () => {
      nativeRule("valid_string");
    },
    { iterations: 1000, warmup: 100, batchSize: 100 },
  );

  const zodSchema = z.string().min(3);
  const zodRule = standardSchema(zodSchema);
  results["schema_micro_zod4"] = benchmark(
    "Standard Schema adapter micro: Zod 4",
    () => {
      zodRule("valid_string", { trigger: "change" });
    },
    { iterations: 1000, warmup: 100, batchSize: 100 },
  );

  const valibotSchema = v.pipe(v.string(), v.minLength(3));
  const valibotRule = standardSchema(valibotSchema);
  results["schema_micro_valibot"] = benchmark(
    "Standard Schema adapter micro: Valibot",
    () => {
      valibotRule("valid_string", { trigger: "change" });
    },
    { iterations: 1000, warmup: 100, batchSize: 100 },
  );

  const arkSchema = arkType("string >= 3");
  const arkRule = standardSchema(arkSchema);
  results["schema_micro_arktype"] = benchmark(
    "Standard Schema adapter micro: ArkType",
    () => {
      arkRule("valid_string", { trigger: "change" });
    },
    { iterations: 1000, warmup: 100, batchSize: 100 },
  );

  // B. Full Form Validation Throughput (10 Fields across providers)
  const form10Values = {};
  for (let i = 0; i < 10; i++) form10Values[`f_${i}`] = `valid_${i}`;

  // 10 Native Rules
  const formNative = createForm({
    initialValues: form10Values,
    rules: Array.from(
      { length: 10 },
      (_, i) => (vals) =>
        vals[`f_${i}`]?.length >= 3 ? null : { code: "short", path: [`f_${i}`] },
    ),
  });
  results["form_validation_throughput_native"] = benchmark(
    "Full Form Validation (10 fields, Native Rules)",
    () => {
      formNative.validate();
    },
    { iterations: 1000, warmup: 100, batchSize: 50 },
  );
  formNative.dispose();

  // 10 Zod 4 Fields
  const formZod = createForm({
    initialValues: form10Values,
    rules: Array.from({ length: 10 }, (_, i) => {
      const rule = standardSchema(zodSchema);
      return (vals) => {
        const res = rule(vals[`f_${i}`], { trigger: "submit" });
        return res && res.length > 0 ? { ...res[0], path: [`f_${i}`] } : null;
      };
    }),
  });
  results["form_validation_throughput_zod4"] = benchmark(
    "Full Form Validation (10 fields, Zod 4)",
    () => {
      formZod.validate();
    },
    { iterations: 1000, warmup: 100, batchSize: 50 },
  );
  formZod.dispose();

  // 10 Valibot Fields
  const formValibot = createForm({
    initialValues: form10Values,
    rules: Array.from({ length: 10 }, (_, i) => {
      const rule = standardSchema(valibotSchema);
      return (vals) => {
        const res = rule(vals[`f_${i}`], { trigger: "submit" });
        return res && res.length > 0 ? { ...res[0], path: [`f_${i}`] } : null;
      };
    }),
  });
  results["form_validation_throughput_valibot"] = benchmark(
    "Full Form Validation (10 fields, Valibot)",
    () => {
      formValibot.validate();
    },
    { iterations: 1000, warmup: 100, batchSize: 50 },
  );
  formValibot.dispose();

  // 10 ArkType Fields
  const formArkType = createForm({
    initialValues: form10Values,
    rules: Array.from({ length: 10 }, (_, i) => {
      const rule = standardSchema(arkSchema);
      return (vals) => {
        const res = rule(vals[`f_${i}`], { trigger: "submit" });
        return res && res.length > 0 ? { ...res[0], path: [`f_${i}`] } : null;
      };
    }),
  });
  results["form_validation_throughput_arktype"] = benchmark(
    "Full Form Validation (10 fields, ArkType)",
    () => {
      formArkType.validate();
    },
    { iterations: 1000, warmup: 100, batchSize: 50 },
  );
  formArkType.dispose();

  return results;
}

// ---------------------------------------------------------------------------
// 4. Submission & Snapshots (Async Completed Lifecycle with Untimed Setup/Reset)
// ---------------------------------------------------------------------------
export async function runSubmissionBenchmarks() {
  const results = {};

  // Snapshot cloning benchmarks (isolated microbenchmarks)
  const flatObj = { username: "ada", role: "admin", active: true, count: 42 };
  const nestedObj = {
    profile: { first: "Ada", last: "Lovelace", contact: { email: "ada@lovelace.org" } },
    settings: { flags: [1, 2, 3] },
  };
  const arrayObj = Array.from({ length: 50 }, (_, i) => ({ id: i, label: `Item ${i}` }));

  results["snapshot_flat"] = benchmark(
    "deepCloneSnapshot (flat)",
    () => {
      deepCloneSnapshot(flatObj);
    },
    { iterations: 1000, warmup: 100, batchSize: 100 },
  );

  results["snapshot_nested"] = benchmark(
    "deepCloneSnapshot (nested)",
    () => {
      deepCloneSnapshot(nestedObj);
    },
    { iterations: 1000, warmup: 100, batchSize: 100 },
  );

  results["snapshot_array"] = benchmark(
    "deepCloneSnapshot (50 items)",
    () => {
      deepCloneSnapshot(arrayObj);
    },
    { iterations: 1000, warmup: 100, batchSize: 50 },
  );

  // A. Completed Resolved Async Submission (steady state: untimed reset in setup, strictly timed await submit)
  const formSuccess = createForm({
    initialValues: { username: "ada", role: "admin" },
    submitAction: async () => {},
  });
  results["submit_resolved_success"] = await benchmarkAsyncWithSetup(
    "Async Submit: Resolved Success (steady-state)",
    {
      setup: () => {
        formSuccess.reset();
      },
      run: async () => {
        await formSuccess.submit();
      },
      iterations: 100,
      warmup: 10,
    },
  );
  formSuccess.dispose();

  // B. Validation-Blocked Submit (fails validation before action invocation)
  const formBlocked = createForm({
    initialValues: { username: "" },
    rules: [(vals) => (vals.username.length > 0 ? null : { code: "req", path: ["username"] })],
    submitAction: async () => {},
  });
  results["submit_validation_blocked"] = await benchmarkAsync(
    "Async Submit: Validation Blocked",
    async () => {
      await formBlocked.submit();
    },
    { iterations: 100, warmup: 10 },
  );
  formBlocked.dispose();

  // C. Server Error Rejected Submit (action rejects with error: untimed reset in setup)
  const formReject = createForm({
    initialValues: { username: "ada" },
    submitAction: async () => {
      throw new Error("Server 500");
    },
  });
  results["submit_server_rejected"] = await benchmarkAsyncWithSetup(
    "Async Submit: Server Rejected",
    {
      setup: () => {
        formReject.reset();
      },
      run: async () => {
        try {
          await formReject.submit();
        } catch {
          // Expected rejection
        }
      },
      iterations: 100,
      warmup: 10,
    },
  );
  formReject.dispose();

  // D. Server Issue Routing (strictly timed setServerIssues; untimed clear in setup/restore)
  const formForIssues = createForm({
    initialValues: {
      user: { name: "Ada" },
      items: Array.from({ length: 20 }, (_, i) => ({ id: i, label: `Item ${i}` })),
    },
  });

  const issues100 = Array.from({ length: 100 }, (_, i) => ({
    code: `err_${i}`,
    message: `Error ${i}`,
    path: ["items", i % 20, "label"],
  }));

  const issues1000 = Array.from({ length: 1000 }, (_, i) => ({
    code: `err_${i}`,
    message: `Error ${i}`,
    path: ["items", i % 20, "label"],
  }));

  results["route_100_server_issues"] = benchmarkWithSetup("Route 100 Server Issues", {
    setup: () => {
      formForIssues.clearServerIssues();
    },
    run: () => {
      formForIssues.setServerIssues(issues100);
    },
    restore: () => {
      formForIssues.clearServerIssues();
    },
    iterations: 100,
    warmup: 10,
  });

  results["route_1000_server_issues"] = benchmarkWithSetup("Route 1000 Server Issues", {
    setup: () => {
      formForIssues.clearServerIssues();
    },
    run: () => {
      formForIssues.setServerIssues(issues1000);
    },
    restore: () => {
      formForIssues.clearServerIssues();
    },
    iterations: 50,
    warmup: 10,
  });

  formForIssues.dispose();

  return results;
}

// ---------------------------------------------------------------------------
// 5. TypeScript Diagnostics across Isolated Programs
// ---------------------------------------------------------------------------
export function runTypeScriptDiagnostics() {
  const configs = [
    { name: "small_10_fields", file: "tsconfig.small.json" },
    { name: "medium_100_fields", file: "tsconfig.medium.json" },
    { name: "large_300_fields", file: "tsconfig.large.json" },
    { name: "combined_program", file: "tsconfig.json" },
  ];

  const results = {};

  for (const cfg of configs) {
    const tsconfigPath = resolve(process.cwd(), "research/form/benchmarks/typescript", cfg.file);
    const res = spawnSync(
      "pnpm",
      ["exec", "tsc", "-p", tsconfigPath, "--extendedDiagnostics", "--noEmit"],
      {
        encoding: "utf-8",
      },
    );

    const output = res.stdout || "";
    const parseDiag = (label) => {
      const match = output.match(new RegExp(`${label}:\\s+([\\d\\w\\.]+)`));
      return match ? match[1] : "N/A";
    };

    results[cfg.name] = {
      files: parseDiag("Files"),
      linesOfTypeScript: parseDiag("Lines of TypeScript"),
      symbols: parseDiag("Symbols"),
      types: parseDiag("Types"),
      instantiations: parseDiag("Instantiations"),
      memoryUsed: parseDiag("Memory used"),
      parseTime: parseDiag("Parse time"),
      checkTime: parseDiag("Check time"),
      totalTime: parseDiag("Total time"),
    };
  }

  return results;
}

// ---------------------------------------------------------------------------
// Master Runner & Reporter
// ---------------------------------------------------------------------------
export async function runAllF9Evidence() {
  console.log("=== Vii Form Research Slice F9 Evidence Harness ===");
  console.log(`OS: ${platform()} ${arch()}`);
  console.log(`CPUs: ${cpus().length} cores (${cpus()[0]?.model})`);
  console.log(`RAM: ${(totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`Node: ${process.version}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  console.log("=== 1. Runtime Scaling: Leaf-Only vs Aggregate-Consumer ===");
  const runtime = runRuntimeBenchmarks();
  console.log(JSON.stringify(runtime, null, 2));

  console.log(
    "\n=== 2. FieldArray Operations (Separated Construction vs True Isolated Operations) ===",
  );
  const arrayOps = runArrayBenchmarks();
  console.log(JSON.stringify(arrayOps, null, 2));

  console.log("\n=== 3. Validation & Schemas (Micro vs Full Form Throughput) ===");
  const validation = runValidationBenchmarks();
  console.log(JSON.stringify(validation, null, 2));

  console.log("\n=== 4. Submission & Snapshots (Async-Correct Lifecycle) ===");
  const submission = await runSubmissionBenchmarks();
  console.log(JSON.stringify(submission, null, 2));

  console.log("\n=== 5. TypeScript Diagnostics (Isolated Programs) ===");
  const tsDiag = runTypeScriptDiagnostics();
  console.log(JSON.stringify(tsDiag, null, 2));

  console.log("\n=== 6. Bundle Footprints ===");
  const bundles = measureBundles();
  console.log(JSON.stringify(bundles, null, 2));

  return { runtime, arrayOps, validation, submission, tsDiag, bundles };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllF9Evidence()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("Benchmark failed:", err);
      process.exit(1);
    });
}
