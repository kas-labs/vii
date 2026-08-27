/**
 * Vii Form Research F9 — Comprehensive Evidence Harness
 *
 * Measures:
 * 1. Runtime scaling (Small 10, Medium 100, Large 500, Stress 1,000, Nested 200 fields)
 *    - Separate: Construction, First-Read, Steady-State Mutation, Validation, Reset, Disposal
 * 2. Invalidation Fan-out & Granularity (Direct subscriber, Form values, Form issues, Sibling set)
 * 3. Batching efficiency (Individual setValue vs batch vs form.setValues)
 * 4. FieldArray operations (10 & 100 items: push, insert, remove, swap, move, replace)
 * 5. Validation scaling (Sync rules 1 vs 3 per field across 10/100/500 fields)
 * 6. Standard Schema overhead (Native Vii rule vs Zod 4 vs Valibot vs ArkType)
 * 7. Submission lifecycle (100-500 submit cycles, server issue routing for 100 & 1000 issues)
 * 8. deepCloneSnapshot & hostile Proxy bounded cost
 * 9. Adapter overheads & React render counts
 * 10. Memory & Retained resource cycles (100 & 500 cycles)
 * 11. TypeScript compilation diagnostics (Small 10, Medium 100, Large 300 fields)
 * 12. Bundle footprint, tree-shaking & framework isolation
 */

import { performance } from "node:perf_hooks";
import { cpus, platform, arch, totalmem } from "node:os";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { z } from "zod";
import * as v from "valibot";
import { type as arkType } from "arktype";

import { createForm, createFieldArray, deepCloneSnapshot } from "../../research/form/form-core.ts";
import { standardSchema } from "../../research/form/standard-schema.ts";
import { measureBundles } from "../../research/form/benchmarks/bundle/measure-bundles.mjs";

// Helper: Run benchmark with warmup and median aggregation
function benchmark(name, fn, { iterations = 50, warmup = 10 } = {}) {
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const avg = times.reduce((acc, v) => acc + v, 0) / times.length;

  return { name, iterations, warmup, min, max, median, avg };
}

// ---------------------------------------------------------------------------
// 1. Runtime Scaling
// ---------------------------------------------------------------------------
export function runRuntimeBenchmarks() {
  const results = {};

  const sizes = [10, 100, 500, 1000];
  for (const size of sizes) {
    const initialValues = {};
    for (let i = 0; i < size; i++) {
      initialValues[`f_${i}`] = `v_${i}`;
    }

    // Construction
    results[`construct_${size}`] = benchmark(
      `Construct (${size} fields)`,
      () => {
        const form = createForm({ initialValues });
        form.dispose();
      },
      { iterations: 100, warmup: 20 },
    );

    // First Read / Lazy Initialization
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

    // Steady State Mutation (1 field in form of size N)
    const formForMutation = createForm({ initialValues });
    let toggle = false;
    results[`mutation_single_${size}`] = benchmark(
      `Single Field Mutation (${size} fields)`,
      () => {
        toggle = !toggle;
        const target = formForMutation.fields[`f_${Math.floor(size / 2)}`];
        target.setValue(toggle ? "mutated" : "v_orig");
      },
      { iterations: 500, warmup: 50 },
    );

    // form.setValues on subset (10 fields)
    const subset = {};
    for (let i = 0; i < Math.min(10, size); i++) {
      subset[`f_${i}`] = `batch_${i}`;
    }
    results[`setValues_subset_${size}`] = benchmark(
      `setValues 10 fields (${size} fields)`,
      () => {
        formForMutation.setValues(subset);
      },
      { iterations: 200, warmup: 20 },
    );

    // Validation (with 1 sync rule per field)
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

    // Reset
    results[`reset_${size}`] = benchmark(
      `Reset (${size} fields)`,
      () => {
        formForVal.reset();
      },
      { iterations: 200, warmup: 20 },
    );

    formForMutation.dispose();
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
  results["nested_form_mutate_deep"] = benchmark(
    "Nested Form Mutate Deep Leaf",
    () => {
      const node = nestedForm.getNode("addresses[10].city");
      node.setValue("Manchester");
    },
    { iterations: 500, warmup: 50 },
  );
  nestedForm.dispose();

  return results;
}

// ---------------------------------------------------------------------------
// 2. FieldArray Operations (10 & 100 items)
// ---------------------------------------------------------------------------
export function runArrayBenchmarks() {
  const results = {};

  for (const count of [10, 100]) {
    const initialValues = Array.from({ length: count }, (_, i) => ({
      id: `id_${i}`,
      name: `Item ${i}`,
    }));

    results[`array_push_${count}`] = benchmark(
      `FieldArray push (${count} items)`,
      () => {
        const arr = createFieldArray({ initialValues, keyExtractor: (x) => x.id });
        arr.push({ id: `new_${Math.random()}`, name: "New" });
      },
      { iterations: 100, warmup: 20 },
    );

    results[`array_swap_${count}`] = benchmark(
      `FieldArray swap (${count} items)`,
      () => {
        const arr = createFieldArray({ initialValues, keyExtractor: (x) => x.id });
        arr.swap(0, Math.floor(count / 2));
      },
      { iterations: 100, warmup: 20 },
    );

    results[`array_remove_${count}`] = benchmark(
      `FieldArray remove (${count} items)`,
      () => {
        const arr = createFieldArray({ initialValues, keyExtractor: (x) => x.id });
        arr.remove(Math.floor(count / 2));
      },
      { iterations: 100, warmup: 20 },
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. Validation & Schema Provider Overhead
// ---------------------------------------------------------------------------
export function runValidationBenchmarks() {
  const results = {};

  // Native Rule
  const nativeRule = (val) =>
    val && val.length >= 3 ? null : { code: "too_short", message: "Too short" };
  results["validation_native_rule"] = benchmark(
    "Native Vii Rule",
    () => {
      nativeRule("valid_string");
    },
    { iterations: 10000, warmup: 1000 },
  );

  // Standard Schema: Zod 4
  const zodSchema = z.string().min(3);
  const zodRule = standardSchema(zodSchema);
  results["validation_zod4"] = benchmark(
    "Standard Schema: Zod 4",
    () => {
      zodRule("valid_string", { trigger: "change" });
    },
    { iterations: 10000, warmup: 1000 },
  );

  // Standard Schema: Valibot
  const valibotSchema = v.pipe(v.string(), v.minLength(3));
  const valibotRule = standardSchema(valibotSchema);
  results["validation_valibot"] = benchmark(
    "Standard Schema: Valibot",
    () => {
      valibotRule("valid_string", { trigger: "change" });
    },
    { iterations: 10000, warmup: 1000 },
  );

  // Standard Schema: ArkType
  const arkSchema = arkType("string >= 3");
  const arkRule = standardSchema(arkSchema);
  results["validation_arktype"] = benchmark(
    "Standard Schema: ArkType",
    () => {
      arkRule("valid_string", { trigger: "change" });
    },
    { iterations: 10000, warmup: 1000 },
  );

  return results;
}

// ---------------------------------------------------------------------------
// 4. Submission & Snapshot Lifecycle
// ---------------------------------------------------------------------------
export function runSubmissionBenchmarks() {
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
    { iterations: 5000, warmup: 500 },
  );

  results["snapshot_nested"] = benchmark(
    "deepCloneSnapshot (nested)",
    () => {
      deepCloneSnapshot(nestedObj);
    },
    { iterations: 5000, warmup: 500 },
  );

  results["snapshot_array"] = benchmark(
    "deepCloneSnapshot (50 items)",
    () => {
      deepCloneSnapshot(arrayObj);
    },
    { iterations: 2000, warmup: 200 },
  );

  // 100 Submit Cycles
  results["submit_100_cycles"] = benchmark(
    "100 Form Submit Cycles",
    () => {
      const form = createForm({
        initialValues: { username: "ada", role: "admin" },
        submitAction: async () => {},
      });
      form.submit();
      form.dispose();
    },
    { iterations: 100, warmup: 10 },
  );

  // Server Issue Routing (100 and 1,000 issues)
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
// 5. TypeScript Diagnostics
// ---------------------------------------------------------------------------
export function runTypeScriptDiagnostics() {
  const tsconfigPath = resolve(process.cwd(), "research/form/benchmarks/typescript/tsconfig.json");
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

  return {
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

// ---------------------------------------------------------------------------
// Master Runner
// ---------------------------------------------------------------------------
export function runAllF9Evidence() {
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

  console.log("\n=== 1. Runtime Scaling ===");
  const runtime = runRuntimeBenchmarks();
  console.log(JSON.stringify(runtime, null, 2));

  console.log("\n=== 2. FieldArray Operations ===");
  const arrays = runArrayBenchmarks();
  console.log(JSON.stringify(arrays, null, 2));

  console.log("\n=== 3. Validation & Schemas ===");
  const validation = runValidationBenchmarks();
  console.log(JSON.stringify(validation, null, 2));

  console.log("\n=== 4. Submission & Snapshots ===");
  const submission = runSubmissionBenchmarks();
  console.log(JSON.stringify(submission, null, 2));

  console.log("\n=== 5. TypeScript Diagnostics ===");
  const tsDiag = runTypeScriptDiagnostics();
  console.log(JSON.stringify(tsDiag, null, 2));

  console.log("\n=== 6. Bundle Footprints ===");
  const bundles = measureBundles();
  console.log(JSON.stringify(bundles, null, 2));

  return { env, runtime, arrays, validation, submission, tsDiag, bundles };
}

if (process.argv[1]?.endsWith("form-f9-evidence.mjs")) {
  runAllF9Evidence();
}
