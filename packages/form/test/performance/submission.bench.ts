import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createRealisticNestedForm } from "./fixtures.js";
import { benchmarkAsyncWithSetup, benchmarkWithSetup, type BenchmarkResult } from "./helpers.js";

export interface SubmissionBenchmarkSuiteResults {
  submitSuccess: BenchmarkResult;
  submitValidationBlocked: BenchmarkResult;
  submitFailure: BenchmarkResult;
  submitCancellation: BenchmarkResult;
  snapshotCost: Record<string, BenchmarkResult>;
}

export async function runSubmissionBenchmarks(): Promise<SubmissionBenchmarkSuiteResults> {
  // 1. Submit Success
  const submitSuccess = await benchmarkAsyncWithSetup({
    name: "submit_success",
    iterations: 100,
    warmup: 5,
    setup: () => {
      return createForm({
        fields: {
          name: createField({ initialValue: "Alex" }),
          email: createField({ initialValue: "alex@example.com" }),
        },
      });
    },
    operation: async (form) => {
      await form.submit(async () => ({ ok: true }));
    },
    teardown: (form) => {
      form.dispose();
    },
  });

  // 2. Submit Validation Blocked
  const submitValidationBlocked = await benchmarkAsyncWithSetup({
    name: "submit_validation_blocked",
    iterations: 100,
    warmup: 5,
    setup: () => {
      return createForm({
        fields: {
          name: createField({
            initialValue: "",
            rules: [(v: string) => (v ? null : { code: "required", message: "Required" })],
          }),
        },
      });
    },
    operation: async (form) => {
      await form.submit(async () => ({ ok: true }));
    },
    teardown: (form) => {
      form.dispose();
    },
  });

  // 3. Submit Failure (action rejection / server failure)
  const submitFailure = await benchmarkAsyncWithSetup({
    name: "submit_failure",
    iterations: 100,
    warmup: 5,
    setup: () => {
      return createForm({
        fields: {
          name: createField({ initialValue: "Alex" }),
        },
      });
    },
    operation: async (form) => {
      await form
        .submit(async () => {
          throw new Error("Server error");
        })
        .catch(() => {});
    },
    teardown: (form) => {
      form.dispose();
    },
  });

  // 4. Submit Cancellation
  const submitCancellation = await benchmarkAsyncWithSetup({
    name: "submit_cancellation",
    iterations: 50,
    warmup: 5,
    setup: () => {
      return createForm({
        fields: {
          name: createField({
            initialValue: "Alex",
            rules: [
              async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return null;
              },
            ],
          }),
        },
      });
    },
    operation: async (form) => {
      const submitPromise = form.submit(async () => ({ ok: true }));
      // Immediately edit to trigger cancellation
      form.fields.name.setValue("Modified");
      await submitPromise;
    },
    teardown: (form) => {
      form.dispose();
    },
  });

  // 5. Snapshot Cost across Representative Structures
  const { form: realisticForm } = createRealisticNestedForm();
  const snapshotCost: Record<string, BenchmarkResult> = {
    realistic_snapshot: benchmarkWithSetup({
      name: "realistic_snapshot",
      iterations: 200,
      warmup: 10,
      setup: () => realisticForm,
      operation: (f) => {
        void f.getValue();
        void f.getRawValue();
      },
    }),
  };
  realisticForm.dispose();

  return {
    submitSuccess,
    submitValidationBlocked,
    submitFailure,
    submitCancellation,
    snapshotCost,
  };
}
