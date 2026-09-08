import { describe, expect, test } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import type { ValidationRuleContext } from "../../src/validation/types.js";

describe("P2c: Cross-Field Dependencies & Topology", () => {
  test("diamond graph execution: A -> B, A -> C, B -> D, C -> D validates D exactly once per wave", () => {
    const a = createField<number>({ initialValue: 1 });

    let bRuns = 0;
    const b = createField<number>({
      initialValue: 1,
      dependencies: [a],
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(a);
          bRuns++;
          return null;
        },
      ],
    });

    let cRuns = 0;
    const c = createField<number>({
      initialValue: 1,
      dependencies: [a],
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(a);
          cRuns++;
          return null;
        },
      ],
    });

    let dRuns = 0;
    const d = createField<number>({
      initialValue: 1,
      dependencies: [b, c],
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(b);
          ctx.get(c);
          dRuns++;
          return null;
        },
      ],
    });

    expect(d.valid.get()).toBe(true);
    expect(bRuns).toBe(0);
    expect(cRuns).toBe(0);
    expect(dRuns).toBe(0);

    // Mutate A -> wave executes: B and C revalidate, then D revalidates exactly once
    a.setValue(10);

    expect(bRuns).toBe(1);
    expect(cRuns).toBe(1);
    expect(dRuns).toBe(1);
  });

  test("1,000-field sparse form isolation: mutating A notifies only B, 0 sibling notifications", () => {
    const fields: Record<string, ReturnType<typeof createField>> = {};
    const runCounts: Record<string, number> = {};

    const a = createField<number>({ initialValue: 0 });
    fields["a"] = a;

    let bRuns = 0;
    const b = createField<number>({
      initialValue: 0,
      dependencies: [a],
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(a);
          bRuns++;
          return null;
        },
      ],
    });
    fields["b"] = b;

    // Create 998 independent fields
    for (let i = 0; i < 998; i++) {
      const key = `sparse_${i}`;
      runCounts[key] = 0;
      fields[key] = createField<number>({
        initialValue: i,
        rules: [
          () => {
            runCounts[key] = (runCounts[key] ?? 0) + 1;
            return null;
          },
        ],
      });
    }

    createForm({ fields });

    // Mutate A
    a.setValue(42);

    expect(bRuns).toBe(1);
    // Verify 0 of the 998 siblings were notified or validated
    for (let i = 0; i < 998; i++) {
      expect(runCounts[`sparse_${i}`]).toBe(0);
    }
  });

  test("dynamic registration integration (P2b): unregister A, unregister B, re-register, verify 0 resurrection and clean disposal", () => {
    const a = createField<string>({ initialValue: "initialA" });
    let bRuns = 0;
    const b = createField<string>({
      initialValue: "initialB",
      dependencies: [a],
      rules: [
        (_val: string, ctx: ValidationRuleContext) => {
          ctx.get(a);
          bRuns++;
          return null;
        },
      ],
    });

    type FormType = {
      a?: typeof a;
      b?: typeof b;
    };

    const form = createForm<FormType>({
      fields: { a, b },
    });

    // Unregister B (which depends on A) -> B is disposed
    form.unregister("b");
    expect(bRuns).toBe(0);

    // Mutate A -> B was unregistered and disposed, must NOT run
    a.setValue("newA");
    expect(bRuns).toBe(0);

    // Register a fresh B2 depending on A
    let b2Runs = 0;
    const b2 = createField<string>({
      initialValue: "initialB2",
      dependencies: [a],
      rules: [
        (_val: string, ctx: ValidationRuleContext) => {
          ctx.get(a);
          b2Runs++;
          return null;
        },
      ],
    });
    form.register("b", b2);

    a.setValue("finalA");
    expect(bRuns).toBe(0); // old B never resurrects
    expect(b2Runs).toBe(1); // fresh B2 receives wave
  });

  test("foreign form dependency rejection: adopting into a different form tree fails closed", () => {
    const a = createField<string>({ initialValue: "a" });
    createForm({ fields: { a } });

    const b = createField<string>({
      initialValue: "b",
      dependencies: [a],
    });

    // Adopting b into a different form tree must throw because dependency a is in another form tree
    expect(() => {
      createForm({ fields: { b } });
    }).toThrow(/Cannot adopt field: dependency belongs to a different form tree/);
  });

  test("disposed dependency rejection at creation", () => {
    const a = createField<string>({ initialValue: "a" });
    a.dispose();

    expect(() => {
      createField<string>({
        initialValue: "b",
        dependencies: [a],
      });
    }).toThrow(/Cannot depend on a disposed field/);
  });

  test("deterministic factory semantics: dependencies factory executes once and is frozen for field lifetime", () => {
    const a = createField<number>({ initialValue: 10 });
    let factoryInvocations = 0;

    const b = createField<number>({
      initialValue: 20,
      dependencies: () => {
        factoryInvocations++;
        return [a];
      },
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(a);
          return null;
        },
      ],
    });

    // Factory executed exactly once on creation
    expect(factoryInvocations).toBe(1);

    // Validation runs must NOT re-evaluate dependencies factory
    b.validate();
    expect(factoryInvocations).toBe(1);

    b.setValue(25);
    expect(factoryInvocations).toBe(1);

    a.setValue(30);
    expect(factoryInvocations).toBe(1);

    b.validate();
    expect(factoryInvocations).toBe(1);
  });

  test("factory errors are never swallowed at creation", () => {
    expect(() => {
      createField({
        initialValue: "val",
        dependencies: () => {
          throw new Error("Custom factory error");
        },
      });
    }).toThrow(/Custom factory error/);
  });
});
