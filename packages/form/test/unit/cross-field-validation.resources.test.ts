import { describe, expect, it } from "vitest";
import { createField } from "../../src/core/field.js";
import { getInternalNode } from "../../src/core/internal.js";
import type { ValidationRuleContext } from "../../src/validation/types.js";

function trackSignal(signal: { subscribe(fn: (v: unknown) => void): () => void }): {
  activeCount: () => number;
} {
  let subCount = 0;
  let unsubCount = 0;
  const orig = signal.subscribe.bind(signal);
  signal.subscribe = (fn) => {
    subCount++;
    const unsub = orig(fn);
    let done = false;
    return () => {
      if (!done) {
        done = true;
        unsubCount++;
      }
      unsub();
    };
  };
  return { activeCount: () => subCount - unsubCount };
}

describe("P2c: Cross-Field Resource Leaks & Cleanup", () => {
  it("500 create/mutate/dispose cycles verify 0 residual subscriptions and clean references", () => {
    const root = createField<number>({ initialValue: 0 });
    const rootInternal = getInternalNode(root)!;
    const tracker = trackSignal(root.value);

    for (let i = 0; i < 500; i++) {
      const dep = createField<number>({
        initialValue: i,
        dependencies: [root],
        rules: [
          (_val: number, ctx: ValidationRuleContext) => {
            ctx.get(root);
            return null;
          },
        ],
      });

      // Mutate root -> triggers wave to dep
      root.setValue(i);

      // Verify dep is registered as dependent of root
      expect(rootInternal.dependents?.has(dep)).toBe(true);

      // Dispose dep
      dep.dispose();

      // Verify dep has been removed from root's dependents Set
      expect(rootInternal.dependents?.has(dep)).toBe(false);
    }

    // After all 500 cycles, root has 0 dependents left
    expect(rootInternal.dependents?.size ?? 0).toBe(0);
    expect(tracker.activeCount()).toBe(0);

    root.dispose();
  });

  it("source disposal: disposing source A removes A from B.dependencies, removes B from A.dependents, leaves B usable", () => {
    const a = createField<string>({ initialValue: "sourceA" });
    const aInternal = getInternalNode(a)!;
    let observedAVal: string | undefined = "sentinel";

    const b = createField<string>({
      initialValue: "depB",
      dependencies: [a],
      rules: [
        (_val: string, ctx: ValidationRuleContext) => {
          observedAVal = ctx.get(a);
          return null;
        },
      ],
    });
    const bInternal = getInternalNode(b)!;

    // Verify initial edges exist on both endpoints
    expect(aInternal.dependents?.has(b)).toBe(true);
    expect(bInternal.dependencies?.has(a)).toBe(true);

    // Initial validation on b reads a
    b.validate();
    expect(observedAVal).toBe("sourceA");

    // Dispose source A while B lives
    a.dispose();

    // Symmetrical edge check: A does not retain B, B does not retain A
    expect(aInternal.dependents?.has(b)).toBe(false);
    expect(aInternal.dependents?.size ?? 0).toBe(0);
    expect(bInternal.dependencies?.has(a)).toBe(false);
    expect(bInternal.dependencies?.size ?? 0).toBe(0);

    // B remains fully usable
    b.setValue("depB_updated");
    expect(b.getValue()).toBe("depB_updated");

    // Subsequent validation on B sees ctx.get(A) === undefined
    b.validate();
    expect(observedAVal).toBeUndefined();

    // Mutating/disposing A again causes 0 effects or resurrection on B
    expect(() => a.setValue("should_fail")).toThrow();
    expect(b.getValue()).toBe("depB_updated");

    b.dispose();
    expect(bInternal.dependencies?.size ?? 0).toBe(0);
  });

  it("500 create/mutate/dispose-source cycles verify source-disposal direction with 0 retention", () => {
    const b = createField<number>({
      initialValue: 0,
      rules: [() => null],
    });
    const bInternal = getInternalNode(b)!;

    for (let i = 0; i < 500; i++) {
      const source = createField<number>({ initialValue: i });
      const sourceInternal = getInternalNode(source)!;

      // Create dependent depending on source
      const dep = createField<number>({
        initialValue: i,
        dependencies: [source],
        rules: [
          (_val: number, ctx: ValidationRuleContext) => {
            ctx.get(source);
            return null;
          },
        ],
      });
      const depInternal = getInternalNode(dep)!;

      // Verify mutual edges
      expect(sourceInternal.dependents?.has(dep)).toBe(true);
      expect(depInternal.dependencies?.has(source)).toBe(true);

      // Mutate source
      source.setValue(i + 1);

      // Dispose SOURCE while dependent lives
      source.dispose();

      // Verify source does not retain dep, and dep does not retain source
      expect(sourceInternal.dependents?.has(dep)).toBe(false);
      expect(depInternal.dependencies?.has(source)).toBe(false);
      expect(depInternal.dependencies?.size ?? 0).toBe(0);

      // Dependent remains usable
      dep.validate();
      expect(dep.valid.get()).toBe(true);

      dep.dispose();
    }

    expect(bInternal.dependencies?.size ?? 0).toBe(0);
    b.dispose();
  });
});
