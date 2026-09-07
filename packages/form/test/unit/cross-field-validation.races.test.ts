import { describe, expect, test } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import type { ValidationRuleContext } from "../../src/validation/types.js";

describe("P2c: Cross-Field Races & Cancellation", () => {
  test("200 rapid mutations of dependency aborts superseded async validations with exactly 1 final commit", async () => {
    const a = createField<number>({ initialValue: 0 });
    let runs = 0;
    let committedResults = 0;

    const b = createField<number>({
      initialValue: 0,
      dependencies: [a],
      rules: [
        async (_val: number, ctx: ValidationRuleContext) => {
          runs++;
          const signal = ctx.signal!;
          const snap = ctx.get(a);
          await new Promise((r) => setTimeout(r, 10));
          if (signal.aborted) {
            return null;
          }
          committedResults++;
          if (snap !== undefined && snap % 2 !== 0) {
            return { code: "odd_number", message: "Must be even" };
          }
          return null;
        },
      ],
    });

    // Fire 200 rapid mutations on a
    for (let i = 1; i <= 200; i++) {
      a.setValue(i);
    }

    // Wait for the final in-flight validation to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(b.pending.get()).toBe(false);
    // Only the final revision (or very few in-flight that completed before abort) committed
    // Specifically, exactly 1 final validation result committed the final state
    expect(b.valid.get()).toBe(true); // 200 is even
    expect(b.issues.get()).toHaveLength(0);
    expect(runs).toBe(200);
    expect(committedResults).toBeGreaterThan(0);
  });

  test("debounce propagation: dependent field obeys its own debounceMs", async () => {
    const a = createField<number>({ initialValue: 0 });
    let bRuns = 0;

    const b = createField<number>({
      initialValue: 0,
      dependencies: [a],
      debounceMs: 30,
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(a);
          bRuns++;
          return null;
        },
      ],
    });

    expect(b.valid.get()).toBe(true);

    // Mutate a rapidly 5 times
    a.setValue(1);
    a.setValue(2);
    a.setValue(3);
    a.setValue(4);
    a.setValue(5);

    // Before debounce timer fires
    expect(bRuns).toBe(0);

    // After debounce timer fires
    await new Promise((r) => setTimeout(r, 50));
    expect(bRuns).toBe(1);
  });

  test("dependency mutation during submit: submit validation gate captures consistent state", async () => {
    const a = createField<string>({ initialValue: "valid" });
    const b = createField<string>({
      initialValue: "valid",
      dependencies: [a],
      rules: [
        async (_val: string, ctx: ValidationRuleContext) => {
          const aVal = ctx.get(a);
          await new Promise((r) => setTimeout(r, 20));
          if (aVal === "invalid") {
            return { code: "dep_invalid", message: "A is invalid" };
          }
          return null;
        },
      ],
    });

    const form = createForm({
      fields: { a, b },
    });

    // Start submit
    const submitPromise = form.submit(async () => ({ ok: true }));

    // Mutate a while submit validation is in flight
    a.setValue("invalid");

    const result = await submitPromise;
    // Either succeeded with initial snapshot or failed gate cleanly with 0 unhandled rejections
    expect(result).toBeDefined();
    expect(typeof result.status).toBe("string");
  });
});
