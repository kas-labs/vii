import { createField } from "../../src/core/field.js";
import { createNumberParser } from "../../src/parsers/builtins.js";
import type { ServerIssueInput } from "../../src/submission/types.js";
import { createHomogeneousForm, createRealisticNestedForm } from "./fixtures.js";
import {
  benchmarkAsyncWithSetup,
  benchmarkBatch,
  benchmarkWithSetup,
  type BenchmarkResult,
} from "./helpers.js";

export interface FormRuntimeBenchmarkSuiteResults {
  construction: Record<string, BenchmarkResult>;
  leafOnlyMutation: Record<string, BenchmarkResult>;
  siblingNotificationCount: number;
  aggregateMutation: Record<string, BenchmarkResult>;
  validationScaling: Record<string, BenchmarkResult & { ruleInvocations: number }>;
  asyncValidation: BenchmarkResult;
  parserMutation: Record<string, BenchmarkResult>;
  serverIssueRouting: Record<string, BenchmarkResult>;
}

export async function runFormRuntimeBenchmarks(): Promise<FormRuntimeBenchmarkSuiteResults> {
  const sizes = [10, 100, 500, 1000];

  // 1. Construction Scaling
  const construction: Record<string, BenchmarkResult> = {};
  for (const size of sizes) {
    construction[`construct_${size}`] = benchmarkWithSetup({
      name: `construct_${size}`,
      iterations: 50,
      warmup: 5,
      setup: () => ({}),
      operation: () => {
        const { form } = createHomogeneousForm(size);
        form.dispose();
      },
    });
  }
  construction["construct_nested_97"] = benchmarkWithSetup({
    name: "construct_nested_97",
    iterations: 50,
    warmup: 5,
    setup: () => ({}),
    operation: () => {
      const { form } = createRealisticNestedForm();
      form.dispose();
    },
  });

  // 2. Leaf-Only Mutation Scaling
  let totalSiblingNotifications = 0;
  const leafOnlyMutation: Record<string, BenchmarkResult> = {};

  for (const size of sizes) {
    const { form, fields } = createHomogeneousForm(size);
    const targetKey = "field_0";
    const siblingKey = `field_${size - 1}`;
    const targetField = fields[targetKey]!;
    const siblingField = fields[siblingKey]!;

    let siblingCallCount = 0;
    const unsubTarget = targetField.value.subscribe(() => {});
    const unsubSibling = siblingField.value.subscribe(() => {
      siblingCallCount += 1;
    });

    leafOnlyMutation[`leaf_mutation_${size}`] = benchmarkBatch({
      name: `leaf_mutation_${size}`,
      iterations: 200,
      batchSize: 50,
      warmup: 10,
      operation: (step) => {
        targetField.setValue(step % 2 === 0 ? "alpha" : "beta");
      },
    });

    unsubTarget();
    unsubSibling();
    totalSiblingNotifications += siblingCallCount;
    form.dispose();
  }

  // 3. Aggregate-Consumer Mutation Scaling
  const aggregateMutation: Record<string, BenchmarkResult> = {};
  for (const size of sizes) {
    const { form, fields } = createHomogeneousForm(size);
    const targetField = fields["field_0"]!;

    const unsubValue = form.value.subscribe(() => {});
    const unsubDirty = form.dirty.subscribe(() => {});
    const unsubIssues = form.issues.subscribe(() => {});

    aggregateMutation[`aggregate_mutation_${size}`] = benchmarkBatch({
      name: `aggregate_mutation_${size}`,
      iterations: 100,
      batchSize: 20,
      warmup: 5,
      operation: (step) => {
        targetField.setValue(step % 2 === 0 ? "apple" : "banana");
        void form.value.get();
        void form.dirty.get();
        void form.issues.get();
      },
    });

    unsubValue();
    unsubDirty();
    unsubIssues();
    form.dispose();
  }

  // 4. Full Sync Validation Scaling
  const validationScaling: Record<string, BenchmarkResult & { ruleInvocations: number }> = {};
  for (const size of sizes) {
    const counter = { count: 0 };
    const { form } = createHomogeneousForm(size, {
      withValidationRule: true,
      ruleCounter: counter,
    });

    const bench = benchmarkWithSetup({
      name: `validate_${size}`,
      iterations: 100,
      warmup: 5,
      setup: () => {
        counter.count = 0;
        return form;
      },
      operation: (f) => {
        f.validate();
      },
    });

    form.dispose();
    validationScaling[`validate_${size}`] = {
      ...bench,
      ruleInvocations: counter.count,
    };
  }

  // 5. Async Validation Overhead
  const asyncValidation = await benchmarkAsyncWithSetup({
    name: "async_validation_lifecycle",
    iterations: 100,
    warmup: 5,
    setup: () => {
      return createField({
        initialValue: "init",
        rules: [
          async (val: string) => {
            return val.length > 0 ? null : { code: "req", message: "req" };
          },
        ],
      });
    },
    operation: async (field) => {
      field.setValue("next");
      await field.validate();
    },
    teardown: (field) => {
      field.dispose();
    },
  });

  // 6. Parser-Backed Field Performance
  const parserField = createField<number, string>({
    initialValue: 0,
    initialRawValue: "0",
    parser: createNumberParser(),
  });

  const parserMutation: Record<string, BenchmarkResult> = {
    valid_raw: benchmarkBatch({
      name: "parser_valid_raw",
      iterations: 200,
      batchSize: 50,
      warmup: 5,
      operation: (step) => {
        parserField.setRawValue(step % 2 === 0 ? "42" : "100");
      },
    }),
    invalid_raw: benchmarkBatch({
      name: "parser_invalid_raw",
      iterations: 200,
      batchSize: 50,
      warmup: 5,
      operation: (step) => {
        parserField.setRawValue(step % 2 === 0 ? "not-a-number" : "invalid");
      },
    }),
    recovery: benchmarkBatch({
      name: "parser_recovery",
      iterations: 200,
      batchSize: 50,
      warmup: 5,
      operation: (step) => {
        parserField.setRawValue(step % 2 === 0 ? "invalid" : "123");
      },
    }),
  };
  parserField.dispose();

  // 7. Server Issue Routing Scaling
  const serverIssueRouting: Record<string, BenchmarkResult> = {};
  for (const count of [10, 100, 1000]) {
    const { form } = createRealisticNestedForm();
    const issues: ServerIssueInput[] = [];
    for (let i = 0; i < count; i++) {
      const target = i % 4;
      if (target === 0) {
        issues.push({
          code: `err_${i}`,
          message: `Profile error ${i}`,
          path: ["profile", "firstName"],
        });
      } else if (target === 1) {
        issues.push({
          code: `err_${i}`,
          message: `Address error ${i}`,
          path: ["addresses", i % 10, "city"],
        });
      } else if (target === 2) {
        issues.push({
          code: `err_${i}`,
          message: `History error ${i}`,
          path: ["history", i % 10, "company"],
        });
      } else {
        issues.push({
          code: `err_${i}`,
          message: `Pref error ${i}`,
          path: ["preferences", "theme"],
        });
      }
    }

    serverIssueRouting[`route_${count}`] = await benchmarkAsyncWithSetup({
      name: `route_${count}`,
      iterations: 20,
      warmup: 2,
      setup: () => form,
      operation: async (f) => {
        await f.submit(async () => ({ ok: false, issues }));
      },
    });

    form.dispose();
  }

  return {
    construction,
    leafOnlyMutation,
    siblingNotificationCount: totalSiblingNotifications,
    aggregateMutation,
    validationScaling,
    asyncValidation,
    parserMutation,
    serverIssueRouting,
  };
}
