import { describe, expect, test } from "vitest";
import { createField } from "../../src/core/field.js";
import type { FieldState } from "../../src/core/types.js";
import type { ValidationRuleContext } from "../../src/validation/types.js";

describe("P2c: Cross-Field Validation & Dependencies (Contract)", () => {
  test("confirm password scenario: confirmPassword revalidates when password changes", () => {
    const password = createField<string>({ initialValue: "secret123" });
    const confirmPassword = createField<string>({
      initialValue: "secret123",
      dependencies: [password],
      rules: [
        (val: string, ctx: ValidationRuleContext) => {
          const pwd = ctx.get(password);
          if (pwd !== undefined && val !== pwd) {
            return { code: "password_mismatch", message: "Passwords do not match" };
          }
          return null;
        },
      ],
    });

    expect(confirmPassword.valid.get()).toBe(true);
    expect(confirmPassword.issues.get()).toHaveLength(0);

    // Change password -> confirmPassword should revalidate and fail
    password.setValue("newSecret456");

    expect(confirmPassword.valid.get()).toBe(false);
    expect(confirmPassword.issues.get()).toHaveLength(1);
    expect(confirmPassword.issues.get()[0]!.code).toBe("password_mismatch");

    // Change confirmPassword to match -> confirmPassword becomes valid
    confirmPassword.setValue("newSecret456");

    expect(confirmPassword.valid.get()).toBe(true);
    expect(confirmPassword.issues.get()).toHaveLength(0);
  });

  test("date range scenario: endDate revalidates when startDate changes", () => {
    const start = createField<Date>({ initialValue: new Date("2026-01-01") });
    const end = createField<Date>({
      initialValue: new Date("2026-01-10"),
      dependencies: [start],
      rules: [
        (val: Date, ctx: ValidationRuleContext) => {
          const startDate = ctx.get(start);
          if (startDate && val < startDate) {
            return { code: "invalid_date_range", message: "End date must be after start date" };
          }
          return null;
        },
      ],
    });

    expect(end.valid.get()).toBe(true);

    // Push startDate past endDate
    start.setValue(new Date("2026-01-15"));

    expect(end.valid.get()).toBe(false);
    expect(end.issues.get()[0]!.code).toBe("invalid_date_range");

    // Fix endDate
    end.setValue(new Date("2026-01-20"));
    expect(end.valid.get()).toBe(true);
  });

  test("snapshot generation: async validator reads dependency snapshot captured at wave start", async () => {
    const a = createField<number>({ initialValue: 10 });
    const observedSnapshots: number[] = [];

    const b = createField<number>({
      initialValue: 20,
      dependencies: [a],
      rules: [
        async (_val: number, ctx: ValidationRuleContext) => {
          const snapBefore = ctx.get(a);
          await new Promise((r) => setTimeout(r, 20));
          const snapAfter = ctx.get(a);
          if (snapBefore !== undefined) observedSnapshots.push(snapBefore);
          if (snapAfter !== undefined) observedSnapshots.push(snapAfter);
          return null;
        },
      ],
    });

    // Trigger validation on b
    const promise = b.validate();
    // Mutate a while b is in-flight
    a.setValue(999);

    await promise;
    // Both before and after the await in that validation run, the captured snapshot was 10
    expect(observedSnapshots[0]).toBe(10);
    expect(observedSnapshots[1]).toBe(10);
  });

  test("self-dependency: a field depending on itself throws immediately", () => {
    expect(() => {
      createField({
        initialValue: "self",
        dependencies: (self) => [self],
      });
    }).toThrow(/Validation self-dependency is not allowed/);
  });

  test("direct cycle detection: A -> B -> A throws deterministically", () => {
    let b: FieldState<unknown, unknown> | undefined = undefined;
    const a = createField({
      initialValue: "a",
      dependencies: () => (b ? [b] : []),
    });
    b = createField({
      initialValue: "b",
      dependencies: [a],
    });

    expect(() => {
      a.validate();
    }).toThrow(/Validation dependency cycle detected/);
  });

  test("transitive cycle detection: A -> B -> C -> A throws deterministically", () => {
    let c: FieldState<unknown, unknown> | undefined = undefined;
    const a = createField({
      initialValue: "a",
      dependencies: () => (c ? [c] : []),
    });
    const b = createField({
      initialValue: "b",
      dependencies: [a],
    });
    c = createField({
      initialValue: "c",
      dependencies: [b],
    });

    expect(() => {
      a.validate();
    }).toThrow(/Validation dependency cycle detected/);
  });

  test("duplicate dependencies: duplicate entries in dependencies are normalized/deduplicated", () => {
    const source = createField<number>({ initialValue: 1 });
    let runCount = 0;

    const dependent = createField<number>({
      initialValue: 2,
      dependencies: [source, source, source],
      rules: [
        (_val: number, ctx: ValidationRuleContext) => {
          ctx.get(source);
          runCount++;
          return null;
        },
      ],
    });

    expect(dependent.valid.get()).toBe(true);
    expect(runCount).toBe(0);

    // Source mutates once
    source.setValue(10);

    // Dependent should only run once, not 3 times
    expect(runCount).toBe(1);
  });

  test("undeclared dependency: ctx.get() on an undeclared field throws descriptive error", () => {
    const declared = createField({ initialValue: "declared" });
    const undeclared = createField({ initialValue: "undeclared" });

    const dependent = createField<string>({
      initialValue: "test",
      dependencies: [declared],
      rules: [
        (_val: string, ctx: ValidationRuleContext) => {
          ctx.get(undeclared);
          return null;
        },
      ],
    });

    expect(() => {
      dependent.validate();
    }).toThrow(
      /Cannot read field value from validation context: field is not declared as a dependency/,
    );
  });

  test("optional dependency: ctx.get() returns undefined when dependency node is disposed or absent", () => {
    const optField = createField({ initialValue: "optional" });
    let observedValue: string | undefined = "sentinel";

    const dependent = createField<string>({
      initialValue: "test",
      dependencies: [optField],
      rules: [
        (_val: string, ctx: ValidationRuleContext) => {
          observedValue = ctx.get(optField);
          return null;
        },
      ],
    });

    dependent.validate();
    expect(observedValue).toBe("optional");

    // Dispose optField
    optField.dispose();

    // Now validate dependent again
    dependent.validate();
    expect(observedValue).toBeUndefined();
  });
});
