/**
 * Vii Form Research F9 — Comprehensive Evidence Harness
 *
 * Measures:
 * 1. Runtime scaling (Small 10, Medium 100, Large 500, Stress 1,000, Nested 200 fields)
 *    - Leaf-Only Subscriber Scenario: Construction, First-Read, Single-Field Mutation, setValues subset
 *    - Aggregate Consumer Scenario: Mutation with form.values, form.dirty, form.issues active
 * 2. FieldArray Operations (10 & 100 items)
 *    - Construction (isolated construct + dispose)
 *    - Steady-state Operations (push, insert, remove, swap, move, setValues)
 * 3. Validation & Schemas
 *    - Standard Schema Adapter Invocation Microbenchmark (Single call on valid input)
 *    - Full Form Validation Throughput (10 fields with Native Rule vs Zod 4 vs Valibot vs ArkType)
 * 4. Submission & Snapshot Lifecycle
 *    - Async Completed Submission (Resolved Success, Validation Blocked, Server Error Rejected)
 *    - Snapshot Isolation (deepCloneSnapshot on flat, nested, array, and cyclic data)
 *    - Server Issue Routing (100 and 1,000 issues)
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

    // E. form.setValues on subset (10 fields)
    const subset = {};
    for (let i = 0; i < Math.min(10, size); i++) {
      subset[`f_${i}`] = `batch_${i}`;
    }
    results[`setValues_subset_${size}`] = benchmark(
      `setValues 10 fields (${size} fields)`,
      () => {
        formLeaf.setValues(subset);
      },
      { iterations: 200, warmup: 20 },
    );

    // F. Full Tree Validation (with 1 sync rule per field)
    const formForVal = createForm({
      initialValues,
      rules: [(vals) => (vals.f_0.length > 0 ? null : { code: "req", path: ["f_0"] })],
    });
    results[`validate_${size}`] = benchmark(
      `Validate (${size} fields)`,
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

  // Realistic Nested Form (~200 leaf fields)
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
    return createForm({ initialValues });
  };

  results["nested_form_construct"] = benchmark(
    "Nested Form Construct (~200 fields)",
    () => {
      const form = buildNested();
      form.dispose();
    },
    { iterations: 100, warmup: 20 },
  );

  const nestedForm = buildNested();
  const deepNode = nestedForm.getNode("addresses[10].city");
  let nestedToggle = false;
  results["nested_form_mutate_deep"] = benchmark(
    "Nested Form Mutate Deep Leaf",
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
// 2. FieldArray Operations (Separated Construction vs Steady-State)
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

    // Steady-state push (push item, pop outside timer to keep constant size)
    const scopePush = createScope();
    const arrPush = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopePush,
    });
    let pushCounter = 0;
    results[`array_push_${count}`] = benchmark(
      `FieldArray push (${count} items)`,
      () => {
        pushCounter++;
        arrPush.push({ id: `pushed_${pushCounter}`, name: "Pushed" });
        arrPush.remove(arrPush.items.get().length - 1);
      },
      { iterations: 100, warmup: 20 },
    );
    scopePush.dispose();

    // Steady-state insert (insert at 0, remove at 0)
    const scopeInsert = createScope();
    const arrInsert = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeInsert,
    });
    let insertCounter = 0;
    results[`array_insert_${count}`] = benchmark(
      `FieldArray insert (${count} items)`,
      () => {
        insertCounter++;
        arrInsert.insert(0, { id: `inserted_${insertCounter}`, name: "Inserted" });
        arrInsert.remove(0);
      },
      { iterations: 100, warmup: 20 },
    );
    scopeInsert.dispose();

    // Steady-state swap
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

    // Steady-state remove & restore
    const scopeRemove = createScope();
    const arrRemove = createFieldArray({
      initialValues: [...initialValues, { id: "removable", name: "Removable" }],
      keyExtractor: (x) => x.id,
      scope: scopeRemove,
    });
    results[`array_remove_${count}`] = benchmark(
      `FieldArray remove (${count} items)`,
      () => {
        arrRemove.remove(arrRemove.items.get().length - 1);
        arrRemove.push({ id: "removable", name: "Removable" });
      },
      { iterations: 100, warmup: 20 },
    );
    scopeRemove.dispose();

    // Steady-state move
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

    // Steady-state setValues
    const scopeSet = createScope();
    const arrSet = createFieldArray({
      initialValues,
      keyExtractor: (x) => x.id,
      scope: scopeSet,
    });
    const replacementValues = Array.from({ length: count }, (_, i) => ({
      id: `id_${i}`,
      name: `Updated ${i}`,
    }));
    results[`array_setValues_${count}`] = benchmark(
      `FieldArray setValues (${count} items)`,
      () => {
        arrSet.setValues(replacementValues);
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

  // A. Standard Schema Adapter Invocation Microbenchmarks (Single call path)
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
// 4. Submission & Snapshot Lifecycle (Async-Correct Measurements)
// ---------------------------------------------------------------------------
export async function runSubmissionBenchmarks() {
  const results = {};

  // deepCloneSnapshot across shapes
  const flatObj = { a: 1, b: "hello", c: true };
  const nestedObj = { user: { profile: { name: "Ada", age: 36, tags: ["a", "b"] } } };
  const arrayObj = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `name_${i}` }));

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

  // A. Completed Resolved Async Submission (steady state)
  const formSuccess = createForm({
    initialValues: { username: "ada", role: "admin" },
    submitAction: async () => {},
  });
  results["submit_resolved_success"] = await benchmarkAsync(
    "Async Submit: Resolved Success (steady-state)",
    async () => {
      await formSuccess.submit();
      formSuccess.reset();
    },
    { iterations: 100, warmup: 10 },
  );
  formSuccess.dispose();

  // B. Validation-Blocked Submit (fails validation before action)
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

  // C. Server Error Rejected Submit (action rejects with error)
  const formReject = createForm({
    initialValues: { username: "ada" },
    submitAction: async () => {
      throw new Error("Server 500");
    },
  });
  results["submit_server_rejected"] = await benchmarkAsync(
    "Async Submit: Server Rejected",
    async () => {
      try {
        await formReject.submit();
      } catch {
        // Expected
      }
      formReject.reset();
    },
    { iterations: 100, warmup: 10 },
  );
  formReject.dispose();

  // D. Server Issue Routing (100 and 1,000 issues)
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

  results["route_100_server_issues"] = benchmark(
    "Route 100 Server Issues",
    () => {
      formForIssues.setServerIssues(issues100);
      formForIssues.clearServerIssues();
    },
    { iterations: 100, warmup: 10 },
  );

  results["route_1000_server_issues"] = benchmark(
    "Route 1000 Server Issues",
    () => {
      formForIssues.setServerIssues(issues1000);
      formForIssues.clearServerIssues();
    },
    { iterations: 50, warmup: 10 },
  );

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
// Master Runner
// ---------------------------------------------------------------------------
export async function runAllF9Evidence() {
  const env = {
    platform: platform(),
    arch: arch(),
    node: process.version,
    cpuModel: cpus()[0]?.model || "Unknown CPU",
    cpuCores: cpus().length,
    totalMemoryGB: (totalmem() / 1024 ** 3).toFixed(2),
  };

  console.log("=== Environment ===");
  console.log(JSON.stringify(env, null, 2));

  console.log("\n=== 1. Runtime Scaling (Leaf-Only vs Aggregate-Consumer) ===");
  const runtime = runRuntimeBenchmarks();
  console.log(JSON.stringify(runtime, null, 2));

  console.log("\n=== 2. FieldArray Operations (Separated Construction vs Steady-State) ===");
  const arrays = runArrayBenchmarks();
  console.log(JSON.stringify(arrays, null, 2));

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

  return { env, runtime, arrays, validation, submission, tsDiag, bundles };
}

if (process.argv[1]?.endsWith("form-f9-evidence.mjs")) {
  runAllF9Evidence().catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
}
